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

  const { 
    question,
    monthlyRevenue,
    monthlyExpenses,
    currentSavings,
    staffPayroll,
    inventoryValue,
    outstandingDebts,
    receivables,
    equipmentInvestment,
    marketingSpend,
    ownerWithdrawals,
    businessAge,
    industryType,
  } = await req.json();

  // --- Placeholder AI Logic (to be replaced with actual AI/rule-based engine) ---
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

  const netIncome = monthlyRevenue - monthlyExpenses - (ownerWithdrawals || 0);

  if (netIncome > 0 && currentSavings >= (monthlyExpenses * 2)) {
    decision_result = "Do it";
    decision_status = 'success';
    explanation = "Your business has a healthy net income and strong savings. You are in a good position to proceed with your decision.";
    next_steps = [
      "Proceed with your decision confidently.",
      "Continue to monitor your cash flow and savings regularly.",
      "Consider reinvesting a portion of profits back into the business for further growth."
    ];
    financial_health_score = 85;
    score_interpretation = "Your business is financially stable and well-positioned for growth. Keep up the good work!";
  } else if (netIncome <= 0 || currentSavings < monthlyExpenses) {
    decision_result = "Don't do it";
    decision_status = 'danger';
    explanation = "Your business is currently operating at a loss or has insufficient savings. Taking this decision now could put your business at significant risk.";
    next_steps = [
      "Immediately review and cut unnecessary expenses.",
      "Develop strategies to increase revenue quickly.",
      "Prioritize building an emergency fund before making new investments."
    ];
    financial_health_score = 30;
    score_interpretation = "Your business is facing significant financial challenges. Urgent action is required to stabilize your finances.";
  }
  // --- End Placeholder AI Logic ---

  // Save the generated decision to the finance.decisions table
  const { data: newDecision, error: insertError } = await supabaseClient
    .from('finance.decisions')
    .insert({
      user_id: user.id,
      question,
      monthly_revenue: monthlyRevenue,
      monthly_expenses: monthlyExpenses,
      current_savings: currentSavings,
      staff_payroll: staffPayroll,
      inventory_value: inventoryValue,
      outstanding_debts: outstandingDebts,
      receivables: receivables,
      equipment_investment: equipmentInvestment,
      marketing_spend: marketingSpend,
      owner_withdrawals: ownerWithdrawals,
      business_age: businessAge,
      industry_type: industryType,
      decision_result,
      decision_status,
      explanation,
      next_steps,
      financial_health_score,
      score_interpretation,
    })
    .select()
    .single();

  if (insertError) {
    console.error('Error inserting decision:', insertError);
    return new Response(JSON.stringify({ error: 'Failed to save decision.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }

  return new Response(JSON.stringify(newDecision), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
})