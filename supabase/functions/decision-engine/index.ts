// supabase/functions/decision-engine/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

import { API_VERSION, CORS_HEADERS, ERROR_CODES, SEVERITY } from './constants.ts';
import { generateRequestId, redactSensitiveData, getSupabaseClient } from './utils.ts';
import { CustomError, InputValidationError, AuthError, handleError } from './errors.ts';
import { DecisionEngineInputSchema, FinancialData, ProfileData, DecisionFunctionReturn } from './schemas.ts';

// Import decision logic modules
import { makeHiringDecision } from './decisions/hiring.ts';
import { makeInventoryDecision } from './decisions/inventory.ts';
import { makeEquipmentDecision } from './decisions/equipment.ts';

serve(async (req) => {
  const requestId = generateRequestId();
  let user: any = null;
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const authHeader = req.headers.get('Authorization')!;
  const supabase = getSupabaseClient(authHeader);

  try {
    // 1. Authentication & Authorization
    const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
    if (userError || !authUser) {
      throw new AuthError("User not authenticated.");
    }
    user = authUser;
    console.log(`[${requestId}] User authenticated: ${user.id}`);

    // 2. Input Validation
    const body = await req.json();
    console.log(`[${requestId}] Received request body:`, redactSensitiveData(body));
    const validationResult = DecisionEngineInputSchema.safeParse(body);
    if (!validationResult.success) {
      throw new InputValidationError("Invalid input.", validationResult.error.toString());
    }
    const { intent, question } = validationResult.data;
    let currentPayload = validationResult.data.payload || {}; // Make payload mutable and initialize safely
    console.log(`[${requestId}] Validated input - Intent: ${intent}, Question: "${question}", Payload:`, currentPayload);

    // 3. Fetch Latest Financial Data and User Profile
    const { data: financialData, error: financialError } = await supabase
      .from('financial_entries')
      .select('monthly_revenue, monthly_expenses, current_savings')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (financialError || !financialData) {
      throw new CustomError(
        ERROR_CODES.DECISION_NOT_FOUND,
        "No financial data found. Please add your financial information first.",
        SEVERITY.LOW,
        404
      );
    }
    console.log(`[${requestId}] Fetched financial data:`, financialData);

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('is_fmcg_vendor')
      .eq('id', user.id)
      .single();

    if (profileError || !profileData) {
      throw new CustomError(
        ERROR_CODES.PROFILE_FETCH_FAILED,
        "User profile not found. Please complete your onboarding.",
        SEVERITY.LOW,
        404
      );
    }
    const isFmcgVendor = profileData.is_fmcg_vendor === true; // Ensure it's a boolean
    console.log(`[${requestId}] Fetched profile data - isFmcgVendor: ${isFmcgVendor}`);

    // 4. Call appropriate Decision Logic
    let decisionResult: DecisionFunctionReturn;

    switch (intent) {
      case 'hiring':
        decisionResult = makeHiringDecision(financialData, currentPayload, question, requestId);
        break;
      case 'inventory':
        decisionResult = makeInventoryDecision(financialData, { is_fmcg_vendor: isFmcgVendor }, currentPayload, question, requestId);
        break;
      case 'equipment':
        decisionResult = makeEquipmentDecision(financialData, currentPayload, question, requestId);
        break;
      default:
        throw new InputValidationError("Unsupported Intent", `Intent '${intent}' is not yet supported.`);
    }

    // If data is needed, return the data_needed response
    if (decisionResult.dataNeeded) {
      return new Response(JSON.stringify({
        success: true,
        data: {
          data_needed: decisionResult.dataNeeded,
        },
        error: null,
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
          version: API_VERSION,
        },
      }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // If a full decision is made, save it
    const decision = decisionResult.decision!; // Assert non-null as dataNeeded is false
    console.log(`[${requestId}] Decision made - Recommendation: ${decision.recommendation}, Reasoning: "${decision.reasoning}", Steps:`, decision.actionable_steps);

    // 5. Save Decision to Database
    const decisionToSave = {
      user_id: user.id,
      question: question,
      recommendation: decision.recommendation,
      reasoning: decision.reasoning,
      actionable_steps: decision.actionable_steps,
      financial_snapshot: decision.financial_snapshot,
      estimated_salary: decision.estimated_salary,
      estimated_inventory_cost: decision.estimated_inventory_cost,
      inventory_turnover_days: decision.inventory_turnover_days,
      supplier_credit_terms_days: decision.supplier_credit_terms_days,
      average_receivables_turnover_days: decision.average_receivables_turnover_days,
      outstanding_supplier_debts: decision.outstanding_supplier_debts,
      supplier_discount_percentage: decision.supplier_discount_percentage,
      storage_cost_percentage_of_order: decision.storage_cost_percentage_of_order,
      estimated_equipment_cost: decision.estimated_equipment_cost,
      expected_revenue_increase_monthly: decision.expected_revenue_increase_monthly,
      expected_expense_decrease_monthly: decision.expected_expense_decrease_monthly,
      equipment_lifespan_months: decision.equipment_lifespan_months,
      is_critical_replacement: decision.is_critical_replacement,
      is_power_solution: decision.is_power_solution,
      current_energy_cost_monthly: decision.current_energy_cost_monthly,
      has_diversified_revenue_streams: decision.has_diversified_revenue_streams,
      existing_debt_load_monthly_repayments: decision.existing_debt_load_monthly_repayments,
      financing_required: decision.financing_required,
      financing_interest_rate_annual_percentage: decision.financing_interest_rate_annual_percentage,
      financing_term_months: decision.financing_term_months,
    };
    console.log(`[${requestId}] Attempting to save decision:`, decisionToSave);

    const { data: savedDecision, error: insertError } = await supabase
      .from('decisions')
      .insert(decisionToSave)
      .select()
      .single();

    if (insertError) {
      console.error(`[${requestId}] Database insert error:`, insertError);
      throw new CustomError(
        ERROR_CODES.RECOMMENDATION_INSERT_FAILED,
        `Failed to save decision: ${insertError.message}`,
        SEVERITY.HIGH,
        500,
        insertError
      );
    }
    console.log(`[${requestId}] Decision saved successfully:`, savedDecision);

    // 6. Format and Return Response
    const responsePayload = {
      success: true,
      data: savedDecision, // Return the saved decision data
      error: null,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        version: API_VERSION,
      },
    };
    console.log(`[${requestId}] Returning success response.`);

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error(`[${requestId}] Caught error in main handler:`, error);
    return handleError(error, requestId, user ? user.id : null, supabase, req.body);
  }
});