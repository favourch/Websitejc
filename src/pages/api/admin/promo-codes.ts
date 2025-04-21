import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing required Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface RequestParams {
  request: Request;
}

interface PatchParams extends RequestParams {
  params: {
    id: string;
  };
}

export async function POST({ request }: RequestParams) {
  try {
    const body = await request.json();
    const { code, discount_percentage, expiry_date, is_active } = body;

    // Validate input
    if (!code || !discount_percentage) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if promo code already exists
    const { data: existingCode } = await supabase
      .from('promo_codes')
      .select('id')
      .eq('code', code)
      .single();

    if (existingCode) {
      return new Response(JSON.stringify({ error: 'Promo code already exists' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create new promo code
    const { data, error } = await supabase
      .from('promo_codes')
      .insert([{
        code,
        discount_percentage,
        expiry_date,
        is_active,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify(data), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error creating promo code:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function PATCH({ request, params }: PatchParams) {
  try {
    const { id } = params;
    const body = await request.json();
    const { is_active } = body;

    if (typeof is_active !== 'boolean') {
      return new Response(JSON.stringify({ error: 'Invalid status value' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data, error } = await supabase
      .from('promo_codes')
      .update({ is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating promo code:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 