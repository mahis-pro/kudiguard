import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { z } from 'https://deno.land/x/zod@v3.23.0/mod.ts';

// Import everything from the shared module
import {
  generateRequestId,
  getSupabaseClient,
  handleError,
  AuthError,
  ForbiddenError,
  InputValidationError,
  API_VERSION,
  CORS_HEADERS,
  CalculateScoreInputSchema,
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
    const validatedInput = CalculateScoreInputSchema.safeParse(requestPayload);
    if (!validatedInput.success) {
      const errorDetails = validatedInput.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('; ');
      throw new InputValidationError("Invalid input for score calculation.", errorDetails, validatedInput.error);
    }
    const { user_id, context } = validatedInput.data;

    if (user_id !== user.id) {
      throw new ForbiddenError('Forbidden: user_id in payload must match authenticated user.');
    }

    // --- Placeholder Logic for Financial Health Score Calculation ---
    // In a real scenario, this would involve:
    // 1. Fetching recent transactions from `public.transactions` for the user.
    // 2. Fetching recent recommendations/decisions from `public.recommendations` for the user.
    // 3. Applying a scoring model based on revenue, expenses, savings, debt, etc.
    // 4. Potentially using the `context` for specific scenarios (e.g., 'monthly_review').

    // For now, we'll return a mock score and explanation.
    // This function could also update a 'financial_health_score' in the profiles table
    // or insert into a dedicated 'financial_scores' table if one were created.

    const mockScore = Math.floor(Math.random() * 60) + 40; // Score between 40 and 100
    let mockInterpretation = "Your financial health is generally good, but there's always room for improvement.";
    let breakdown = {
      revenue_stability: 70,
      expense_management: 60,
      savings_adequacy: 80,
      debt_level: 50,
    };

    if (mockScore < 60) {
      mockInterpretation = "Your business financial health requires attention. Focus on improving cash flow and reducing unnecessary expenses.";
    } else if (mockScore >= 80) {
      mockInterpretation = "Excellent financial health! Your business is well-managed and resilient.";
    }

    // This function could also be responsible for updating the `financial_health_score`
    // and `score_interpretation` fields in the latest recommendation or a dedicated profile field.

    return new Response(JSON.stringify({
      success: true,
      data: {
        financial_health_score: mockScore,
        score_interpretation: mockInterpretation,
        breakdown: breakdown,
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
      status: 200,
    });
  } catch (error: any) {
    return handleError(error, requestId, vendorId, supabaseClient!, API_VERSION, requestPayload);
  }
})