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

  const { user_id, context } = await req.json(); // Expect user_id and optional context

  if (!user_id || user_id !== user.id) {
    return new Response('Forbidden: user_id in payload must match authenticated user.', { status: 403, headers: corsHeaders });
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
    financial_health_score: mockScore,
    score_interpretation: mockInterpretation,
    breakdown: breakdown,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
})