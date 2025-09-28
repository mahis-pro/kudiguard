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

  const { decision_id, intent, inputs } = await req.json();

  if (!decision_id || !intent || !inputs) {
    return new Response(JSON.stringify({ error: 'Missing decision_id, intent, or inputs.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  // Fetch rule configuration for the given intent
  const { data: ruleConfigData, error: ruleConfigError } = await supabaseClient
    .from('rule_config')
    .select('config')
    .eq('intent', intent)
    .single();

  let ruleConfig = ruleConfigData?.config || {};

  if (ruleConfigError && ruleConfigError.code !== 'PGRST116') { // PGRST116 means no rows found
    console.error('Error fetching rule config:', ruleConfigError);
    // Proceed with default rules if config fetch fails
  }

  // --- Rules-based Decision Logic ---
  let decision_result = "Wait";
  let decision_status: 'success' | 'warning' | 'danger' = 'warning';
  let explanation = "Based on your current financial inputs, it's advisable to wait. Your net income is low relative to your expenses.";
  let next_steps = [
    "Focus on increasing monthly revenue by 20% for the next 3 months.",
    "Reduce non-essential monthly expenses by 10%.",
    "Build your emergency savings to cover at least 3 months of expenses."
  ];
  let financial_health_score = 50;
  let score_interpretation = "Your business shows some areas of concern. Focus on improving cash flow and building reserves.";
  let confidence = 0.7; // Default confidence

  const {
    monthlyRevenue = 0,
    monthlyExpenses = 0,
    currentSavings = 0,
    staffPayroll = 0,
    ownerWithdrawals = 0,
    // Add other inputs as needed for rules
  } = inputs;

  const netIncome = monthlyRevenue - monthlyExpenses - ownerWithdrawals;

  // Example rule for 'hire_staff' intent
  if (intent === 'hire_staff') {
    const multiplierNetIncome = ruleConfig.hire_staff?.params?.multiplier_net_income || 2;
    const savingsBufferMultiplier = ruleConfig.hire_staff?.params?.savings_buffer_multiplier || 3;

    if (netIncome > (multiplierNetIncome * staffPayroll) && currentSavings > (savingsBufferMultiplier * staffPayroll)) {
      decision_result = "Do it";
      decision_status = 'success';
      explanation = "Your business has a healthy net income and strong savings, comfortably covering the new staff payroll. You are in a good position to hire.";
      next_steps = [
        "Proceed with hiring confidently.",
        "Continue to monitor your cash flow and savings regularly.",
        "Ensure the new hire contributes to revenue growth or efficiency."
      ];
      financial_health_score = 85;
      score_interpretation = "Your business is financially stable and well-positioned for growth. Hiring staff is a recommended step.";
      confidence = 0.9;
    } else if (netIncome > staffPayroll && currentSavings >= staffPayroll) {
      decision_result = "Cautious";
      decision_status = 'warning';
      explanation = "Your business can cover the staff payroll, but your savings buffer is not as strong as recommended. Proceed with caution.";
      next_steps = [
        "Consider hiring part-time or on a contract basis initially.",
        "Focus on increasing monthly revenue by 10% in the next 2 months.",
        "Build your emergency savings to cover at least 3 months of staff payroll."
      ];
      financial_health_score = 65;
      score_interpretation = "Your business is stable but has limited buffer. Proceed with caution and focus on strengthening reserves.";
      confidence = 0.7;
    } else {
      decision_result = "Don't do it";
      decision_status = 'danger';
      explanation = "Your current net income or savings are insufficient to comfortably cover the new staff payroll. Hiring now could put your business at significant risk.";
      next_steps = [
        "Immediately review and cut unnecessary expenses.",
        "Develop strategies to increase revenue quickly.",
        "Prioritize building an emergency fund before considering new hires."
      ];
      financial_health_score = 30;
      score_interpretation = "Your business is facing financial challenges. Urgent action is required to stabilize your finances before hiring.";
      confidence = 0.5;
    }
  } else {
    // Default rules for other intents or if no specific rule config is found
    if (netIncome > 0 && currentSavings >= (monthlyExpenses * 2)) {
      decision_result = "Do it";
      decision_status = 'success';
      explanation = "Your business has a healthy net income and strong savings. You are in a good position to proceed with your decision.";
      next_steps = [
        "Proceed with your decision confidently.",
        "Continue to monitor your cash flow and savings regularly.",
        "Consider reinvesting a portion of profits back into the business for further growth."
      ];
      financial_health_score = 80;
      score_interpretation = "Your business is financially stable and well-positioned for growth. Keep up the good work!";
      confidence = 0.8;
    } else if (netIncome <= 0 || currentSavings < monthlyExpenses) {
      decision_result = "Don't do it";
      decision_status = 'danger';
      explanation = "Your business is currently operating at a loss or has insufficient savings. Taking this decision now could put your business at significant risk.";
      next_steps = [
        "Immediately review and cut unnecessary expenses.",
        "Develop strategies to increase revenue quickly.",
        "Prioritize building an emergency fund before making new investments."
      ];
      financial_health_score = 35;
      score_interpretation = "Your business is facing significant financial challenges. Urgent action is required to stabilize your finances.";
      confidence = 0.6;
    }
  }
  // --- End Rules-based Decision Logic ---

  const recommendationPayload = {
    decision_result,
    decision_status,
    explanation,
    next_steps,
    financial_health_score,
    score_interpretation,
    numeric_breakdown: { // Include a numeric breakdown as per API contract
      monthly_revenue: monthlyRevenue,
      monthly_expenses: monthlyExpenses,
      current_savings: currentSavings,
      net_income: netIncome,
      staff_payroll: staffPayroll,
      // Add other relevant inputs here
    }
  };

  // Insert the generated recommendation into the public.recommendations table
  const { data: newRecommendation, error: insertRecommendationError } = await supabaseClient
    .from('recommendations')
    .insert({
      decision_id,
      user_id: user.id,
      recommendation: recommendationPayload,
      financial_health_score,
      engine_used: 'rules',
      confidence,
    })
    .select()
    .single();

  if (insertRecommendationError) {
    console.error('Error inserting recommendation:', insertRecommendationError);
    // Update decision status to error
    await supabaseClient
      .from('decisions')
      .update({ status: 'error' })
      .eq('id', decision_id);

    return new Response(JSON.stringify({ error: 'Failed to save recommendation.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }

  // Update the status of the original decision to 'processed'
  const { error: updateDecisionError } = await supabaseClient
    .from('decisions')
    .update({ status: 'processed' })
    .eq('id', decision_id);

  if (updateDecisionError) {
    console.error('Error updating decision status:', updateDecisionError);
    // This is a non-critical error for the user, but important for auditing
  }

  return new Response(JSON.stringify({ recommendation: newRecommendation.recommendation, saved: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
})