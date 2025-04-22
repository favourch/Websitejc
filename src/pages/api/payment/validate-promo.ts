import { createClient } from '@supabase/supabase-js';
import type { APIRoute } from 'astro';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing required Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export const POST: APIRoute = async ({ request }) => {
  try {
    const { promoCode } = await request.json();

    if (!promoCode) {
      return new Response(JSON.stringify({ isValid: false }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', promoCode)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error validating promo code:', error);
      return new Response(JSON.stringify({ error: 'Error validating promo code' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    if (!data) {
      return new Response(JSON.stringify({ isValid: false }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Check if promo code has expired
    if (data.expiry_date && new Date(data.expiry_date) < new Date()) {
      return new Response(JSON.stringify({ isValid: false }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    return new Response(JSON.stringify({ 
      isValid: true,
      discountPercentage: data.discount_percentage
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Promo code validation failed:', error);
    return new Response(JSON.stringify({ error: 'Failed to validate promo code' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}; 