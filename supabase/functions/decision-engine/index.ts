import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0' // Import SupabaseClient directly
import { z } from 'https://deno.land/x/zod@v3.23.0/mod.ts';

import { generateRequestId, getSupabaseClient } from '../_shared/utils.ts';
import { handleError, AuthError, InputValidationError, CustomError } from '../_shared/errors.ts';
import { API_VERSION, CORS_HEADERS, ERROR_CODES, SEVERITY } from '../_shared/constants.ts';
import { DecisionEngineInputSchema } from '../_shared/schemas.ts';

serve(async (req) => {
  const requestId = generateRequestId();
  let supabaseClient: SupabaseClient | null = null;
  let vendorId: string | null = null;
  let requestPayload: any = {};

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get('Authorization');
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
    const validatedInput = DecisionEngineInputSchema.safeParse(requestPayload);
    if (!validatedInput.success) {
      const errorDetails = validatedInput.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('; ');
      throw new InputValidationError("Invalid input for decision engine.", errorDetails, validatedInput.error);
    }
    const { decision_id, intent, inputs } = validatedInput.data;

    // Fetch rule configuration for the given intent
    const { data: ruleConfigData, error: ruleConfigError } = await supabaseClient
      .from('rule_config')
      .select('config')
      .eq('intent', intent)
      .single();

    let ruleConfig = ruleConfigData?.config || {};

    if (ruleConfigError && ruleConfigError.code !== 'PGRST116') { // PGRST116 means no rows found
      // Log this as a medium severity error, but don't block execution
      await handleError(
        new CustomError(
          ERROR_CODES.CALC_RULE_NOT_FOUND,
          `Rule config for intent '${intent}' not found or error fetching. Using default rules.`,
          SEVERITY.MEDIUM,
          500,
          ruleConfigError
        ),
        requestId,
        vendorId,
        supabaseClient,
        API_VERSION,
        requestPayload
      );
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
    let isFallback = false;

    const {
      monthlyRevenue,
      monthlyExpenses,
      currentSavings,
      staffPayroll = 0, // Default to 0 if not provided
      ownerWithdrawals = 0, // Default to 0 if not provided
      // Add other inputs as needed for rules
    } = inputs;

    const netIncome = monthlyRevenue - monthlyExpenses - ownerWithdrawals;

    try {
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
    } catch (ruleError) {
      // Fail-soft: If a specific rule evaluation fails, log it and use a generic fallback
      await handleError(
        new CustomError(
          ERROR_CODES.CALC_RULE_NOT_FOUND,
          `Error during rule evaluation for intent '${intent}'. Providing a general recommendation.`,
          SEVERITY.MEDIUM,
          500,
          ruleError
        ),
        requestId,
        vendorId,
        supabaseClient,
        API_VERSION,
        requestPayload
      );
      isFallback = true;
      decision_result = "Wait";
      decision_status = 'warning';
      explanation = "KudiGuard encountered an issue processing your specific request. Based on general financial principles, it's advisable to wait and review your finances.";
      next_steps = [
        "Ensure all financial inputs are accurate.",
        "Review your monthly revenue and expenses.",
        "Consider consulting a financial advisor for complex situations."
      ];
      financial_health_score = 45;
      score_interpretation = "A general assessment indicates caution. Focus on foundational financial health.";
      confidence = 0.4;
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
      throw new CustomError(
        ERROR_CODES.RECOMMENDATION_INSERT_FAILED,
        `Failed to save recommendation for decision ${decision_id}.`,
        SEVERITY.HIGH,
        500,
        insertRecommendationError
      );
    }

    // Update the status of the original decision to 'processed'
    const { error: updateDecisionError } = await supabaseClient
      .from('decisions')
      .update({ status: 'processed' })
      .eq('id', decision_id);

    if (updateDecisionError) {
      // This is a non-critical error for the user, but important for auditing
      await handleError(
        new CustomError(
          ERROR_CODES.DECISION_UPDATE_FAILED,
          `Failed to update decision status for ${decision_id}.`,
          SEVERITY.MEDIUM,
          500,
          updateDecisionError
        ),
        requestId,
        vendorId,
        supabaseClient,
        API_VERSION,
        requestPayload
      );
    }

    return new Response(JSON.stringify({
      success: true,
      data: { recommendation: newRecommendation.recommendation, saved: true },
      error: null,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        fallback: isFallback,
        version: API_VERSION,
      },
    }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    // Centralized error handling
    return handleError(error, requestId, vendorId, supabaseClient!, API_VERSION, requestPayload);
  }
});