import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing required Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST({ request }: { request: Request }) {
  try {
    const data = await request.json();
    console.log('Webhook received:', data);

    if (data.iposHPResponse?.responseCode === '200') {
      console.log('Payment successful:', {
        transactionId: data.iposHPResponse.transactionId,
        cardToken: data.iposHPResponse.cardToken,
        cardLastFour: data.iposHPResponse.cardLast4Digit,
        cardType: data.iposHPResponse.cardType,
        amount: data.iposHPResponse.amount,
        billingCycle: data.iposHPResponse.txReferenceTag2?.tagValue
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 