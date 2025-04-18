import type { APIRoute } from 'astro';
import { getPaymentPageUrl } from '../../../services/payment';

// Log environment variables for debugging
console.log('API Endpoint Environment variables:', {
  merchantId: process.env.IPOS_MERCHANT_ID,
  token: process.env.IPOS_AUTH_TOKEN,
  nodeEnv: process.env.NODE_ENV,
  publicUrl: process.env.PUBLIC_URL
});

type MembershipTier = {
  name: string;
  monthlyPrice: number;
  annualPrice: number;
};

type MembershipTiers = {
  silver: MembershipTier;
  gold: MembershipTier;
  platinum: MembershipTier;
};

const MEMBERSHIP_TIERS: MembershipTiers = {
  silver: {
    name: 'Silver',
    monthlyPrice: 45,
    annualPrice: 500
  },
  gold: {
    name: 'Gold',
    monthlyPrice: 65,
    annualPrice: 750
  },
  platinum: {
    name: 'Platinum',
    monthlyPrice: 85,
    annualPrice: 1000
  }
};

type PaymentRequest = {
  tier: keyof MembershipTiers;
  isAnnual: boolean;
  amount: number;
  customerInfo: {
    firstName: string;
    lastName: string;
    companyName?: string;
    email: string;
    mobile: string;
    promoCode?: string;
    address: {
      street: string;
      unitNumber?: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
  };
};

export const POST: APIRoute = async ({ request }) => {
  try {
    // Log the raw request
    console.log('Raw request headers:', Object.fromEntries(request.headers.entries()));
    
    // Get the raw body text first
    const rawBody = await request.text();
    console.log('Raw request body:', rawBody);

    if (!rawBody) {
      return new Response(JSON.stringify({
        error: 'Request body is empty'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    let data: PaymentRequest;
    try {
      data = JSON.parse(rawBody);
    } catch (e) {
      console.error('Failed to parse request body:', e);
      return new Response(JSON.stringify({
        error: 'Invalid JSON in request body'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    const { tier, isAnnual, amount, customerInfo } = data;

    console.log('Parsed request data:', { tier, isAnnual, amount, customerInfo });

    if (!tier || !customerInfo || !amount) {
      return new Response(JSON.stringify({
        error: 'Missing required fields'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    if (!MEMBERSHIP_TIERS[tier]) {
      return new Response(JSON.stringify({
        error: 'Invalid membership tier'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Validate required customer information
    if (!customerInfo.firstName || !customerInfo.lastName || !customerInfo.email || !customerInfo.mobile) {
      return new Response(JSON.stringify({
        error: 'Missing required customer information'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Validate required address information
    if (!customerInfo.address.street || !customerInfo.address.city || !customerInfo.address.state || 
        !customerInfo.address.zipCode || !customerInfo.address.country) {
      return new Response(JSON.stringify({
        error: 'Missing required address information'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    const paymentUrl = await getPaymentPageUrl(
      {
        ...MEMBERSHIP_TIERS[tier],
        monthlyPrice: isAnnual ? amount / 12 : amount,
        annualPrice: isAnnual ? amount : amount * 12
      },
      isAnnual,
      customerInfo,
      amount
    );

    if (!paymentUrl) {
      return new Response(JSON.stringify({
        error: 'Failed to generate payment URL'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    console.log('Generated payment URL:', paymentUrl);

    return new Response(JSON.stringify({
      url: paymentUrl
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Payment initiation failed:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Failed to initiate payment'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}; 