// supabase/functions/decision-engine/index.ts

import {
  serve,
} from "https://deno.land/std@0.190.0/http/server.ts";
import {
  CORS_HEADERS,
  DecisionEngineInputSchema,
  generateRequestId,
  getSupabaseClient,
  handleError,
  AuthError,
  InputValidationError,
  CustomError,
  ERROR_CODES,
  SEVERITY,
  API_VERSION
} from 'shared/mod.ts';

const ESTIMATED_SALARY = 50000; // Hardcoded for now, will be dynamic later

serve(async (req) => {
  const requestId = generateRequestId();
  let user: any = null; // Declare user here to be available in the catch block
  
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
    user = authUser; // Assign user to the outer scope variable

    // 2. Input Validation
    const body = await req.json();
    const validationResult = DecisionEngineInputSchema.safeParse(body);
    if (!validationResult.success) {
      throw new InputValidationError("Invalid input.", validationResult.error.toString());
    }
    const { intent } = validationResult.data;

    // 3. Fetch Latest Financial Data
    const { data: financialData, error: dbError } = await supabase
      .from('financial_entries')
      .select('monthly_revenue, monthly_expenses, current_savings')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (dbError || !financialData) {
      throw new CustomError(
        ERROR_CODES.DECISION_NOT_FOUND, // Using a generic code for now
        "No financial data found. Please add your financial information first.",
        SEVERITY.LOW,
        404
      );
    }

    // 4. Decision Logic (Vertical Slice for 'hiring')
    let recommendation, reasoning, actionable_steps;

    if (intent === 'hiring') {
      const { monthly_revenue, monthly_expenses, current_savings } = financialData;
      const net_income = monthly_revenue - monthly_expenses;
      
      const reasons = [];
      let score = 0;

      // Rule 1: Positive Net Income
      if (net_income > 0) {
        score += 1;
      } else {
        reasons.push(`Your business is not currently profitable (Net Income: ₦${net_income.toLocaleString()}).`);
      }

      // Rule 2: Savings Buffer
      if (current_savings >= monthly_expenses) {
        score += 1;
      } else {
        reasons.push(`Your savings (₦${current_savings.toLocaleString()}) are less than one month of expenses (₦${monthly_expenses.toLocaleString()}). Build a stronger safety net first.`);
      }

      // Rule 3: Affordability
      if (net_income >= 3 * ESTIMATED_SALARY) {
        score += 1;
      } else {
        reasons.push(`Your net income (₦${net_income.toLocaleString()}) is not at least 3x the estimated salary (₦${(3 * ESTIMATED_SALARY).toLocaleString()}) for a new hire.`);
      }

      // Determine final recommendation
      if (score === 3) {
        recommendation = 'APPROVE';
        reasoning = 'Your business shows strong financial health to support a new hire. You have positive net income, a sufficient savings buffer, and can comfortably afford the estimated salary.';
        actionable_steps = [
          'Start by hiring on a contract or part-time basis to test the impact.',
          'Create a clear job description with defined responsibilities.',
          'Ensure you have a process for payroll and tax compliance.'
        ];
      } else if (score >= 1) {
        recommendation = 'WAIT';
        reasoning = `While your business has some strengths, it's not fully ready for a new hire. The key reasons to wait are: ${reasons.join(' ')}`;
        actionable_steps = [
          'Focus on increasing revenue or decreasing non-essential costs to improve net income.',
          'Build your emergency savings to cover at least 1-3 months of expenses.',
          'Re-evaluate your hiring needs in 1-2 months.'
        ];
      } else {
        recommendation = 'REJECT';
        reasoning = `Hiring a new staff member now would be too risky for your business. The key reasons for this are: ${reasons.join(' ')}`;
        actionable_steps = [
          'Conduct a full review of your business expenses to find savings.',
          'Explore strategies to boost your monthly revenue.',
          'Focus on stabilizing the business before considering new fixed costs.'
        ];
      }
    } else {
      // Handle other intents in the future
      throw new InputValidationError("Unsupported Intent", `Intent '${intent}' is not yet supported.`);
    }

    // 5. Format and Return Response
    const responsePayload = {
      success: true,
      data: {
        recommendation,
        reasoning,
        actionable_steps,
        financial_snapshot: financialData,
      },
      error: null,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        version: API_VERSION,
      },
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    // Centralized error handling
    return handleError(error, requestId, user ? user.id : null, supabase, API_VERSION, req.body);
  }
});