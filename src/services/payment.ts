interface PaymentConfig {
  merchantId: string;
  token: string;
  sandboxMode: boolean;
}

interface MembershipTier {
  name: string;
  monthlyPrice: number;
  annualPrice: number;
}

interface CustomerInfo {
  firstName: string;
  lastName: string;
  companyName?: string;
  email: string;
  mobile: string;
  address: {
    street: string;
    unitNumber?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

// For testing purposes, use hardcoded values
const PAYMENT_CONFIG: PaymentConfig = {
  merchantId: '245225431765',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0cG4iOiIyNDUyMjU0MzE3NjUiLCJlbWFpbCI6ImZjaHVrd3VlZG9AZ21haWwuY29tIiwiaWF0IjoxNzQ0OTQyNjE2fQ.s2J_gsm0Z3z0bTDw297DJZHUqOomsWyvn8200ljWn3w',
  sandboxMode: true
};

const BASE_URL = PAYMENT_CONFIG.sandboxMode 
  ? 'https://payment.ipospays.tech/api/v1'
  : 'https://payment.ipospays.com/api/v1';

export async function getPaymentPageUrl(
  tier: MembershipTier,
  isAnnual: boolean,
  customerInfo: CustomerInfo,
  amount: number
) {
  try {
    // Validate required fields
    if (!PAYMENT_CONFIG.merchantId || !PAYMENT_CONFIG.token) {
      console.error('Payment configuration missing:', {
        merchantId: PAYMENT_CONFIG.merchantId,
        token: PAYMENT_CONFIG.token ? 'present' : 'missing'
      });
      throw new Error('Payment configuration is missing');
    }

    if (!customerInfo.firstName || !customerInfo.lastName || !customerInfo.email || !customerInfo.mobile) {
      throw new Error('Customer information is incomplete');
    }

    // Format mobile number to include country code
    const formattedMobile = customerInfo.mobile.startsWith('+') 
      ? customerInfo.mobile 
      : `+1${customerInfo.mobile}`;

    const payload = {
      merchantAuthentication: {
        merchantId: PAYMENT_CONFIG.merchantId,
        transactionReferenceId: generateTransactionId()
      },
      transactionRequest: {
        transactionType: 1, // SALE
        amount: Math.round(amount * 100), // Convert to cents
        calculateFee: false,
        tipsInputPrompt: false,
        calculateTax: false,
        txReferenceTag1: {
          tagLabel: "Membership Tier",
          tagValue: tier.name,
          isTagMandate: true
        },
        txReferenceTag2: {
          tagLabel: "Billing Cycle",
          tagValue: isAnnual ? "Annual" : "Monthly",
          isTagMandate: true
        },
        txReferenceTag3: {
          tagLabel: "Transaction Fee",
          tagValue: "0.04",
          isTagMandate: true
        }
      },
      notificationOption: {
        notifyByRedirect: true,
        returnUrl: 'https://76eb-205-250-244-156.ngrok-free.app/membership/success',
        failureUrl: 'https://76eb-205-250-244-156.ngrok-free.app/membership/failure',
        cancelUrl: 'https://76eb-205-250-244-156.ngrok-free.app/membership',
        notifyBySMS: false,
        notifyByPOST: true,
        postAPI: 'https://76eb-205-250-244-156.ngrok-free.app/api/payment/webhook',
        mobileNumber: formattedMobile,
        authHeader: PAYMENT_CONFIG.token
      },
      preferences: {
        integrationType: 1, // E-Commerce portal
        avsVerification: true,
        eReceipt: true,
        eReceiptInputPrompt: false,
        customerName: `${customerInfo.firstName} ${customerInfo.lastName}`,
        customerEmail: customerInfo.email,
        customerMobile: formattedMobile,
        requestCardToken: true,
        shortenURL: true,
        integrationVersion: "v2",
        billingAddress: {
          street: customerInfo.address.street,
          unitNumber: customerInfo.address.unitNumber,
          city: customerInfo.address.city,
          state: customerInfo.address.state,
          zipCode: customerInfo.address.zipCode,
          country: customerInfo.address.country
        }
      },
      personalization: {
        merchantName: "Wholesalers Advantage",
        logoUrl: 'https://76eb-205-250-244-156.ngrok-free.app/logo.png',
        themeColor: "#0c96d6",
        description: "Membership Payment",
        payNowButtonText: "Pay Now",
        buttonColor: "#0c96d6",
        cancelButtonText: "Cancel",
        disclaimer: "Secure payment processing by iPOS"
      }
    };

    console.log('Sending payment request to:', `${BASE_URL}/external-payment-transaction`);
    console.log('Request payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(`${BASE_URL}/external-payment-transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': PAYMENT_CONFIG.token,
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log('Payment API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Payment API error response:', errorText);
      throw new Error(`Payment API returned ${response.status}: ${errorText}`);
    }

    const responseText = await response.text();
    console.log('Payment API response text:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse payment API response:', e);
      throw new Error('Invalid response from payment API');
    }

    console.log('Payment API response data:', JSON.stringify(data, null, 2));

    if (data.information) {
      return data.information;
    } else if (data.errors && data.errors.length > 0) {
      throw new Error(data.errors[0].message || 'Failed to generate payment URL');
    } else {
      throw new Error('Invalid response from payment API');
    }
  } catch (error) {
    console.error('Payment URL generation failed:', error);
    throw error;
  }
}

function generateTransactionId(): string {
  return `MEM${Date.now()}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
}

export async function verifyPaymentStatus(transactionReferenceId: string) {
  try {
    const response = await fetch(
      `${BASE_URL}/queryPaymentStatus?tpn=${PAYMENT_CONFIG.merchantId}&transactionReferenceId=${transactionReferenceId}`,
      {
        headers: {
          'Authorization': PAYMENT_CONFIG.token,
          'Accept': 'application/json'
        }
      }
    );

    const data = await response.json();
    return data.iposHPResponse;
  } catch (error) {
    console.error('Payment verification failed:', error);
    throw error;
  }
} 