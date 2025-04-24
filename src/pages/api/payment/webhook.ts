import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing required Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface WebhookError extends Error {
  message: string;
}

export async function POST({ request }: { request: Request }) {
  try {
    const data = await request.json();
    console.log('Webhook received:', data);

    // Save the complete webhook payload
    const { error: webhookError } = await supabase
      .from('payment_webhooks')
      .insert({
        payload: data,
        received_at: new Date().toISOString(),
        status: 'received'
      });

    if (webhookError) {
      console.error('Error saving webhook data:', webhookError);
      throw webhookError;
    }

    if (data.iposHPResponse?.responseCode === '200') {
      const paymentData = {
        transaction_id: data.iposHPResponse.transactionId,
        card_token: data.iposHPResponse.cardToken,
        card_last_four: data.iposHPResponse.cardLast4Digit,
        card_type: data.iposHPResponse.cardType,
        amount: data.iposHPResponse.amount,
        billing_cycle: data.iposHPResponse.txReferenceTag2?.tagValue,
        status: 'success',
        processed_at: new Date().toISOString()
      };

      // Save payment details
      const { error: paymentError } = await supabase
        .from('payments')
        .insert(paymentData);

      if (paymentError) {
        console.error('Error saving payment data:', paymentError);
        throw paymentError;
      }

      console.log('Payment data saved successfully:', paymentData);
    } else {
      // Log failed payment attempt
      const { error: failedPaymentError } = await supabase
        .from('payments')
        .insert({
          status: 'failed',
          error_message: data.iposHPResponse?.responseMessage || 'Unknown error',
          processed_at: new Date().toISOString()
        });

      if (failedPaymentError) {
        console.error('Error saving failed payment data:', failedPaymentError);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: unknown) {
    console.error('Webhook error:', error);
    
    // Log the error to Supabase
    try {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await supabase
        .from('payment_webhooks')
        .insert({
          payload: { error: errorMessage },
          received_at: new Date().toISOString(),
          status: 'error',
          error_message: errorMessage
        });
    } catch (logError) {
      console.error('Error logging webhook error:', logError);
    }

    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 