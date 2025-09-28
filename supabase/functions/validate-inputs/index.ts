import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { z } from 'https://deno.land/x/zod@v3.23.0/mod.ts';

// Import everything from the shared module
import {
  generateRequestId,
  getSupabaseClient,
  handleError,
  AuthError,
  InputValidationError,
  API_VERSION,
  CORS_HEADERS,
  ValidateInputsSchema,
  SupabaseClient // Explicitly import SupabaseClient type
} from '../_shared/mod.ts';

serve(async (req) => {
  const requestId = generateRequestId();
  let supabaseClient: SupabaseClient | null = null;
  let vendorId: string | null = null;
  let requestPayload: any = {};

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new AuthError("Authorization header missing.");
    }

    supabaseClient = getSupabaseClient(authHeader);
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new AuthError("User not authenticated.", userError);
    }
    vendorId = user.id;

    requestPayload = await req.json();

    // --- Input Validation with Zod ---
    const validatedInput = ValidateInputsSchema.safeParse(requestPayload);
    if (!validatedInput.success) {
      const errorDetails = validatedInput.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('; ');
      throw new InputValidationError("Invalid input for validation.", errorDetails, validatedInput.error);
    }
    const { decision_id, intent, raw_inputs } = validatedInput.data;

    const errors: string[] = [];
    const missing_fields: string[] = [];
    const normalized_inputs: { [key: string]: number | string | null } = {}; // Allow null for optional fields

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
      success: true,
      data: {
        valid: isValid,
        normalized_inputs,
        missing_fields,
        errors,
      },
      error: null,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        fallback: false,
        version: API_VERSION,
      },
    }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      status: isValid ? 200 : 400,
    });
  } catch (error: any) {
    return handleError(error, requestId, vendorId, supabaseClient!, API_VERSION, requestPayload);
  }
})