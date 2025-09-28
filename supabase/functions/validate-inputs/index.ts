import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: authHeader },
      },
    }
  );

  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }

  const { decision_id, intent, raw_inputs } = await req.json();

  if (!intent || !raw_inputs) {
    return new Response(JSON.stringify({ error: 'Missing intent or raw_inputs.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  const errors: string[] = [];
  const missing_fields: string[] = [];
  const normalized_inputs: { [key: string]: number | string } = {};

  // Define required fields and their types/validation rules
  const validationRules: { [key: string]: { type: 'number' | 'string', required?: boolean, min?: number } } = {
    monthlyRevenue: { type: 'number', required: true, min: 0 },
    monthlyExpenses: { type: 'number', required: true, min: 0 },
    currentSavings: { type: 'number', required: false, min: 0 },
    staffPayroll: { type: 'number', required: false, min: 0 },
    inventoryValue: { type: 'number', required: false, min: 0 },
    outstandingDebts: { type: 'number', required: false, min: 0 },
    receivables: { type: 'number', required: false, min: 0 },
    equipmentInvestment: { type: 'number', required: false, min: 0 },
    marketingSpend: { type: 'number', required: false, min: 0 },
    ownerWithdrawals: { type: 'number', required: false, min: 0 },
    businessAge: { type: 'number', required: false, min: 0 },
    industryType: { type: 'string', required: false },
  };

  for (const field in validationRules) {
    const rule = validationRules[field];
    let value = raw_inputs[field];

    if (rule.required && (value === undefined || value === null || value === '')) {
      missing_fields.push(field);
      continue;
    }

    if (value !== undefined && value !== null && value !== '') {
      if (rule.type === 'number') {
        // Attempt to parse number, handle '10k' -> 10000
        if (typeof value === 'string') {
          value = value.toLowerCase().replace(/,/g, ''); // Remove commas
          if (value.endsWith('k')) {
            value = parseFloat(value.slice(0, -1)) * 1000;
          } else if (value.endsWith('m')) {
            value = parseFloat(value.slice(0, -1)) * 1000000;
          } else {
            value = parseFloat(value);
          }
        }
        if (isNaN(value)) {
          errors.push(`${field} must be a valid number.`);
        } else {
          normalized_inputs[field] = value;
          if (rule.min !== undefined && value < rule.min) {
            errors.push(`${field} cannot be negative.`);
          }
        }
      } else if (rule.type === 'string') {
        normalized_inputs[field] = String(value).trim();
      }
    } else if (!rule.required) {
      // If not required and empty, set to default or null
      normalized_inputs[field] = rule.type === 'number' ? 0 : null;
    }
  }

  const isValid = errors.length === 0 && missing_fields.length === 0;

  return new Response(JSON.stringify({
    valid: isValid,
    normalized_inputs,
    missing_fields,
    errors,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: isValid ? 200 : 400,
  });
})