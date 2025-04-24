import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing required Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

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
    merchantId: '243625791533',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0cG4iOiIyNDM2MjU3OTE1MzMiLCJlbWFpbCI6InN0ZXZlQHdob2xlc2FsZXJzYWR2YW50YWdlLmNvbSIsImlhdCI6MTc0NDk0MjMwOH0.HN1J98Izy2r4od9e0pBLatpbBJYtNCIFt3ZUGj-Ou00',
    sandboxMode: false
  };

// Add fee configuration
const FEE_CONFIG = {
  enabled: import.meta.env.PUBLIC_ENABLE_TRANSACTION_FEE === 'true',
  percentage: 4 // 4% transaction fee
};

const BASE_URL = PAYMENT_CONFIG.sandboxMode 
  ? 'https://payment.ipospays.tech/api/v1'
  : 'https://payment.ipospays.com/api/v1';

export async function getPaymentPageUrl(
  tier: MembershipTier,
  isAnnual: boolean,
  customerInfo: CustomerInfo,
  amount: number,
  promoCode?: string
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

    // Validate address data
    if (customerInfo.address.city === customerInfo.address.state) {
      throw new Error('City and state cannot be the same');
    }

    if (customerInfo.address.country.length < 2) {
      throw new Error('Country code must be at least 2 characters');
    }

    // Validate state and country format
    const validCountryCodes = ['US', 'CA', 'MX'] as const;
    type CountryCode = typeof validCountryCodes[number];
    
    const formattedCountry = customerInfo.address.country.toUpperCase() as CountryCode;
    if (!validCountryCodes.includes(formattedCountry)) {
      throw new Error('Invalid country code. Please use a valid 2-letter country code (e.g., US, CA, MX)');
    }

    // Validate state format
    const validStates: Record<CountryCode, string[]> = {
      'US': ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'],
      'CA': ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'],
      'MX': ['AGU', 'BCN', 'BCS', 'CAM', 'CHP', 'CHH', 'CMX', 'COA', 'COL', 'DUR', 'GUA', 'GRO', 'HID', 'JAL', 'MEX', 'MIC', 'MOR', 'NAY', 'NLE', 'OAX', 'PUE', 'QUE', 'ROO', 'SLP', 'SIN', 'SON', 'TAB', 'TAM', 'TLA', 'VER', 'YUC', 'ZAC']
    };

    const formattedState = customerInfo.address.state.toUpperCase();
    if (!validStates[formattedCountry]?.includes(formattedState)) {
      throw new Error(`Invalid state code for ${formattedCountry}. Please use a valid 2-letter state code.`);
    }

    // Format mobile number to include country code
    const formattedMobile = customerInfo.mobile.startsWith('+') 
      ? customerInfo.mobile 
      : `+1${customerInfo.mobile.replace(/\D/g, '')}`; // Remove any non-digit characters

    // Format amount to cents (multiply by 100 and round to ensure no decimal places)
    // According to docs: "Amount should be multiplied by 100 and sent. For example: If the requesting amount is $100 then the amount that should be sent is $10000"
    const amountInCents = Math.round(amount * 100);
    const amountInCentsStr = amountInCents.toString();
    
    // Calculate final amount with promo code discount if applicable
    let finalAmount = amountInCentsStr;
    let discountPercentage = 0;

    if (promoCode) {
      const { data: promoCodeData, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', promoCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error) {
        throw new Error('Error validating promo code');
      }

      if (!promoCodeData) {
        throw new Error('Invalid or inactive promo code');
      }

      if (promoCodeData.expiry_date && new Date(promoCodeData.expiry_date) < new Date()) {
        throw new Error('Promo code has expired');
      }

      discountPercentage = promoCodeData.discount_percentage;
      finalAmount = Math.round(amountInCents * (1 - discountPercentage / 100)).toString();

      // Store payment record with promo code
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert([{
          amount: finalAmount,
          customer_email: customerInfo.email
        }])
        .select()
        .single();

      if (paymentError) {
        console.error('Error storing payment record:', paymentError);
      } else if (paymentData) {
        const { error: usedPromoError } = await supabase
          .from('used_promo_codes')
          .insert([{
            promo_code_id: promoCodeData.id,
            payment_id: paymentData.id
          }]);

        if (usedPromoError) {
          console.error('Error storing used promo code:', usedPromoError);
        }
      }
    }

    // Apply transaction fee if enabled
    if (FEE_CONFIG.enabled) {
      finalAmount = Math.round(amountInCents * (1 + FEE_CONFIG.percentage / 100)).toString();
    }

    console.log('Payment configuration:', {
      merchantId: PAYMENT_CONFIG.merchantId,
      token: PAYMENT_CONFIG.token,
      sandboxMode: PAYMENT_CONFIG.sandboxMode
    });

    const payload = {
      merchantAuthentication: {
        merchantId: PAYMENT_CONFIG.merchantId,
        transactionReferenceId: generateTransactionId()
      },
      transactionRequest: {
        transactionType: 1,
        amount: amountInCentsStr, // Send amount in cents as string
        calculateFee: FEE_CONFIG.enabled,
        ...(FEE_CONFIG.enabled && {
          feePercentage: FEE_CONFIG.percentage,
          txReferenceTag3: {
            tagLabel: "Transaction Fee",
            tagValue: FEE_CONFIG.percentage.toString(),
            isTagMandate: true
          }
        }),
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
        txReferenceTag4: {
          tagLabel: "Plan Cost",
          tagValue: amountInCentsStr,
          isTagMandate: true
        }
      },
      notificationOption: {
        notifyByRedirect: true,
        returnUrl: `${import.meta.env.PUBLIC_URL}/membership/success`,
        failureUrl: `${import.meta.env.PUBLIC_URL}/membership/failure`,
        cancelUrl: `${import.meta.env.PUBLIC_URL}/membership`,
        notifyBySMS: false,
        notifyByPOST: true,
        postAPI: `${import.meta.env.PUBLIC_URL}/api/payment/webhook`,
        mobileNumber: formattedMobile,
        authHeader: PAYMENT_CONFIG.token
      },
      preferences: {
        integrationType: 1,
        avsVerification: true,
        eReceipt: true,
        eReceiptInputPrompt: false,
        customerName: `${customerInfo.firstName} ${customerInfo.lastName}`,
        customerEmail: customerInfo.email,
        customerMobile: formattedMobile,
        requestCardToken: true,
        shortenURL: true,
        integrationVersion: "v2",
        dba: customerInfo.companyName || ""
      },
      personalization: {
        merchantName: "Wholesalers Advantage",
        logoUrl: `${import.meta.env.PUBLIC_URL}/logo.png`,
        themeColor: "#0c96d6",
        description: "Membership Payment",
        payNowButtonText: "Pay Now",
        buttonColor: "#0c96d6",
        cancelButtonText: "Cancel",
        disclaimer: "Secure payment processing by iPOS"
      }
    };

    // Try different token formats
    const tokenFormats = [
      PAYMENT_CONFIG.token,
      `Bearer ${PAYMENT_CONFIG.token}`,
      PAYMENT_CONFIG.token.replace('Bearer ', '')
    ];

    for (const tokenFormat of tokenFormats) {
      console.log('Trying token format:', tokenFormat);
      
      const response = await fetch(`${BASE_URL}/external-payment-transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': tokenFormat,
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      console.log('Payment API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Generated payment URL:', data);
        
        if (data.information) {
          return {
            success: true,
            paymentUrl: data.information
          };
        } else {
          throw new Error('Invalid response format from payment API');
        }
      } else {
        const errorText = await response.text();
        console.error('Payment API error response:', errorText);
        
        if (tokenFormat === tokenFormats[tokenFormats.length - 1]) {
          throw new Error(`Payment API returned ${response.status}: ${errorText}`);
        }
      }
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
          'token': PAYMENT_CONFIG.token,
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