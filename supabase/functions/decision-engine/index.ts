// supabase/functions/decision-engine/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { v4 as uuidv4 } from 'https://esm.sh/uuid@9.0.1';
import { z } from 'https://deno.land/x/zod@v3.23.0/mod.ts';

// --- constants.ts content ---
export const API_VERSION = "v1.0";

export const ERROR_CODES = {
  INVALID_INPUT: "INVALID_INPUT",
  UNAUTHORIZED_ACCESS: "UNAUTHORIZED_ACCESS",
  DB_CONNECTION_FAILED: "DB_CONNECTION_FAILED",
  UNHANDLED_EXCEPTION: "UNHANDLED_EXCEPTION",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  CALC_RULE_NOT_FOUND: "CALC_RULE_NOT_FOUND",
  DECISION_NOT_FOUND: "DECISION_NOT_FOUND",
  RECOMMENDATION_INSERT_FAILED: "RECOMMENDATION_INSERT_FAILED",
  DECISION_UPDATE_FAILED: "DECISION_UPDATE_FAILED",
  FEEDBACK_UPSERT_FAILED: "FEEDBACK_UPSERT_FAILED",
  PROFILE_FETCH_FAILED: "PROFILE_FETCH_FAILED",
  PROFILE_UPDATE_FAILED: "PROFILE_UPDATE_FAILED",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",
  ML_ENGINE_ERROR: "ML_ENGINE_ERROR",
  WEBHOOK_INVALID_SIGNATURE: "WEBHOOK_INVALID_SIGNATURE",
  WEBHOOK_MISSING_PAYLOAD: "WEBHOOK_MISSING_PAYLOAD",
  WEBHOOK_DECISION_NOT_FOUND: "WEBHOOK_DECISION_NOT_FOUND",
  WEBHOOK_RECOMMENDATION_INSERT_FAILED: "WEBHOOK_RECOMMENDATION_INSERT_FAILED",
  WEBHOOK_DECISION_UPDATE_FAILED: "WEBHOOK_DECISION_UPDATE_FAILED",
  FORBIDDEN_ACCESS: "FORBIDDEN_ACCESS",
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

export const SEVERITY = {
  LOW: "LOW", // User error, invalid input
  MEDIUM: "MEDIUM", // Non-critical rule error, external service issue with fallback
  HIGH: "HIGH", // DB/system failure, unhandled exception
} as const;

export type Severity = typeof SEVERITY[keyof typeof SEVERITY];

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
} as const;

// --- utils.ts content ---
export function generateRequestId(): string {
  return uuidv4();
}

// Simple PII redaction for logging. Extend as needed.
export function redactSensitiveData(data: any): any {
  if (!data) return data;

  const sensitiveKeys = ['password', 'email', 'authHeader', 'access_token', 'refresh_token', 'jwt', 'api_key'];
  const redactedData = { ...data };

  for (const key of sensitiveKeys) {
    if (redactedData[key]) {
      redactedData[key] = '[REDACTED]';
    }
  }

  // Recursively redact if data is an object
  for (const key in redactedData) {
    if (typeof redactedData[key] === 'object' && redactedData[key] !== null) {
      redactedData[key] = redactSensitiveData(redactedData[key]);
    }
  }

  return redactedData;
}

export function getSupabaseClient(authHeader: string, serviceRole = false) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseKey = serviceRole 
    ? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' 
    : Deno.env.get('SUPABASE_ANON_KEY') ?? '';

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL and Key must be provided as environment variables.');
  }

  return createClient(
    supabaseUrl,
    supabaseKey,
    {
      global: {
        headers: { Authorization: authHeader },
      },
      auth: {
        persistSession: false, // Important for stateless Edge Functions
      }
    }
  );
}

// --- errors.ts content ---
// Re-using types and functions from above (constants.ts, utils.ts)
export class CustomError extends Error {
  code: ErrorCode;
  severity: Severity;
  statusCode: number;
  details: string;
  originalError?: any;

  constructor(
    code: ErrorCode,
    message: string,
    severity: Severity = SEVERITY.HIGH,
    statusCode: number = 500,
    originalError?: any
  ) {
    super(message);
    this.name = 'CustomError';
    this.code = code;
    this.severity = severity;
    this.statusCode = statusCode;
    this.details = message;
    this.originalError = originalError;
    Object.setPrototypeOf(this, CustomError.prototype);
  }
}

export class InputValidationError extends CustomError {
  constructor(message: string, details: string, originalError?: any) {
    super(ERROR_CODES.INVALID_INPUT, message, SEVERITY.LOW, 400, originalError);
    this.name = 'InputValidationError';
    this.details = details; // Overwrite details with more specific validation message
    Object.setPrototypeOf(this, InputValidationError.prototype);
  }
}

export class AuthError extends CustomError {
  constructor(message: string = "Unauthorized", originalError?: any) {
    super(ERROR_CODES.UNAUTHORIZED_ACCESS, message, SEVERITY.LOW, 401, originalError);
    this.name = 'AuthError';
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

export class ForbiddenError extends CustomError {
  constructor(message: string = "Forbidden", originalError?: any) {
    super(ERROR_CODES.FORBIDDEN_ACCESS, message, SEVERITY.LOW, 403, originalError);
    this.name = 'ForbiddenError';
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

interface ErrorResponse {
  success: false;
  data: null;
  error: {
    code: ErrorCode;
    severity: Severity;
    details: string;
  };
  meta: {
    requestId: string;
    timestamp: string;
    fallback: boolean;
    version: string;
  };
}

interface LogEntry {
  requestId: string;
  vendorId: string | null;
  errorCode: ErrorCode;
  severity: Severity;
  errorSummary: string;
  timestamp: string;
  stack?: string;
  payload?: any; // Redacted payload
  originalError?: any;
}

async function logError(
  supabaseClient: SupabaseClient,
  logEntry: LogEntry
) {
  const { requestId, vendorId, errorCode, severity, errorSummary, timestamp, stack, payload, originalError } = logEntry;

  console.error(JSON.stringify({
    level: severity === SEVERITY.HIGH ? 'error' : 'warn',
    message: errorSummary,
    requestId,
    vendorId,
    errorCode,
    severity,
    timestamp,
    stack: stack || (originalError instanceof Error ? originalError.stack : undefined),
    payload: redactSensitiveData(payload),
    originalError: originalError ? String(originalError) : undefined,
  }));

  try {
    const { error: dbError } = await supabaseClient
      .from('decision_audit')
      .insert({
        request_id: requestId,
        vendor_id: vendorId,
        error_code: errorCode,
        severity: severity,
        error_summary: errorSummary,
        timestamp: timestamp,
      });

    if (dbError) {
      console.error(`Failed to insert audit log for request ${requestId}:`, dbError.message);
    }
  } catch (e) {
    console.error(`Exception while inserting audit log for request ${requestId}:`, e);
  }
}

export async function handleError(
  error: any,
  requestId: string,
  vendorId: string | null,
  supabaseClient: SupabaseClient,
  apiVersion: string,
  requestPayload: any = {},
  fallbackRecommendation: any = null
): Promise<Response> {
  let customError: CustomError;
  let statusCode: number;
  let isFallback = false;

  if (error instanceof CustomError) {
    customError = error;
    statusCode = error.statusCode;
  } else if (error instanceof Error) {
    customError = new CustomError(
      ERROR_CODES.UNHANDLED_EXCEPTION,
      `An unexpected error occurred: ${error.message}`,
      SEVERITY.HIGH,
      500,
      error
    );
    statusCode = 500;
  } else {
    customError = new CustomError(
      ERROR_CODES.UNHANDLED_EXCEPTION,
      `An unknown error occurred: ${String(error)}`,
      SEVERITY.HIGH,
      500,
      error
    );
    statusCode = 500;
  }

  await logError(supabaseClient, {
    requestId,
    vendorId,
    errorCode: customError.code,
    severity: customError.severity,
    errorSummary: customError.details,
    timestamp: new Date().toISOString(),
    stack: customError.stack,
    payload: requestPayload,
    originalError: customError.originalError,
  });

  if (fallbackRecommendation && customError.severity !== SEVERITY.HIGH) {
    isFallback = true;
    return new Response(JSON.stringify({
      success: true,
      data: fallbackRecommendation,
      error: null,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        fallback: true,
        version: apiVersion,
      },
    }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      status: 200,
    });
  }

  const errorResponse: ErrorResponse = {
    success: false,
    data: null,
    error: {
      code: customError.code,
      severity: customError.severity,
      details: customError.details,
    },
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
      fallback: isFallback,
      version: apiVersion,
    },
  };

  return new Response(JSON.stringify(errorResponse), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    status: statusCode,
  });
}

// --- schemas.ts content ---
export const DecisionEngineInputSchema = z.object({
  intent: z.enum([
    'hiring', 
    'inventory', // Added inventory intent
    // Future intents will be added here:
    // 'equipment', 
    // 'marketing', 
    // 'savings', 
    // 'debt', 
    // 'expansion'
  ]),
  question: z.string(),
  payload: z.object({
    estimated_salary: z.number().min(0).optional(),
    // New fields for inventory management
    estimated_inventory_cost: z.number().min(0).optional(),
    inventory_turnover_days: z.number().min(0).optional(),
    supplier_credit_terms_days: z.number().min(0).optional(),
    average_receivables_turnover_days: z.number().min(0).optional(),
    outstanding_supplier_debts: z.number().min(0).optional(),
    supplier_discount_percentage: z.number().min(0).max(100).optional(),
    storage_cost_percentage_of_order: z.number().min(0).max(100).optional(),
  }).optional(),
});

// --- Main decision-engine logic ---

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

    // 2. Input Validation
    const body = await req.json();
    const validationResult = DecisionEngineInputSchema.safeParse(body);
    if (!validationResult.success) {
      throw new InputValidationError("Invalid input.", validationResult.error.toString());
    }
    const { intent, question, payload } = validationResult.data;

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

    const isFmcgVendor = profileData.is_fmcg_vendor;

    // 4. Decision Logic (Vertical Slice for 'hiring' and 'inventory')
    let recommendation: 'APPROVE' | 'WAIT' | 'REJECT';
    let reasoning: string;
    let actionable_steps: string[];
    let estimatedSalary: number | undefined;
    let estimatedInventoryCost: number | undefined;
    let inventoryTurnoverDays: number | undefined;
    let supplierCreditTermsDays: number | undefined;
    let averageReceivablesTurnoverDays: number | undefined;
    let outstandingSupplierDebts: number | undefined;
    let supplierDiscountPercentage: number | undefined;
    let storageCostPercentageOfOrder: number | undefined;

    if (intent === 'hiring') {
      estimatedSalary = payload?.estimated_salary;

      // If estimated_salary is not provided, request it from the user
      if (estimatedSalary === undefined || estimatedSalary === null) {
        return new Response(JSON.stringify({
          success: true,
          data: {
            data_needed: {
              field: "estimated_salary",
              prompt: "What is the estimated monthly salary for the new hire (in ₦)?",
              intent_context: { intent, decision_type: "hiring_affordability" },
            }
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
      if (net_income >= 3 * estimatedSalary) {
        score += 1;
      } else {
        reasons.push(`Your net income (₦${net_income.toLocaleString()}) is not at least 3x the estimated salary (₦${(3 * estimatedSalary).toLocaleString()}) for a new hire.`);
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
    } else if (intent === 'inventory') {
      estimatedInventoryCost = payload?.estimated_inventory_cost;
      inventoryTurnoverDays = payload?.inventory_turnover_days;
      supplierCreditTermsDays = payload?.supplier_credit_terms_days;
      averageReceivablesTurnoverDays = payload?.average_receivables_turnover_days;
      outstandingSupplierDebts = payload?.outstanding_supplier_debts;
      supplierDiscountPercentage = payload?.supplier_discount_percentage;
      storageCostPercentageOfOrder = payload?.storage_cost_percentage_of_order;

      const { monthly_revenue, monthly_expenses, current_savings } = financialData;
      const net_income = monthly_revenue - monthly_expenses;
      
      const reasons = [];
      let approveScore = 0;
      let waitScore = 0;
      let rejectScore = 0;
      actionable_steps = [];

      // --- Data Gathering Sequence for Inventory ---
      if (estimatedInventoryCost === undefined || estimatedInventoryCost === null) {
        return new Response(JSON.stringify({
          success: true,
          data: {
            data_needed: {
              field: "estimated_inventory_cost",
              prompt: "What is the estimated cost of the new inventory you want to purchase (in ₦)?",
              intent_context: { intent, decision_type: "inventory_purchase" },
            }
          },
          error: null,
          meta: { requestId, timestamp: new Date().toISOString(), version: API_VERSION },
        }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, status: 200 });
      }
      if (inventoryTurnoverDays === undefined || inventoryTurnoverDays === null) {
        return new Response(JSON.stringify({
          success: true,
          data: {
            data_needed: {
              field: "inventory_turnover_days",
              prompt: "What is your average inventory turnover in days (how long it takes to sell all your stock)?",
              intent_context: { intent, decision_type: "inventory_purchase" },
            }
          },
          error: null,
          meta: { requestId, timestamp: new Date().toISOString(), version: API_VERSION },
        }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, status: 200 });
      }
      if (outstandingSupplierDebts === undefined || outstandingSupplierDebts === null) {
        return new Response(JSON.stringify({
          success: true,
          data: {
            data_needed: {
              field: "outstanding_supplier_debts",
              prompt: "What is your total outstanding debt to suppliers (in ₦)?",
              intent_context: { intent, decision_type: "inventory_purchase" },
            }
          },
          error: null,
          meta: { requestId, timestamp: new Date().toISOString(), version: API_VERSION },
        }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, status: 200 });
      }

      // Conditional data requests for Rule 2 (FMCG specific)
      if (isFmcgVendor) {
        if (supplierCreditTermsDays === undefined || supplierCreditTermsDays === null) {
          return new Response(JSON.stringify({
            success: true,
            data: {
              data_needed: {
                field: "supplier_credit_terms_days",
                prompt: "What are your supplier's credit terms in days (how long do you have to pay)?",
                intent_context: { intent, decision_type: "inventory_purchase" },
              }
            },
            error: null,
            meta: { requestId, timestamp: new Date().toISOString(), version: API_VERSION },
          }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, status: 200 });
        }
        if (averageReceivablesTurnoverDays === undefined || averageReceivablesTurnoverDays === null) {
          return new Response(JSON.stringify({
            success: true,
            data: {
              data_needed: {
                field: "average_receivables_turnover_days",
                prompt: "What is your average receivables turnover in days (how long customers take to pay you)?",
                intent_context: { intent, decision_type: "inventory_purchase" },
              }
            },
            error: null,
            meta: { requestId, timestamp: new Date().toISOString(), version: API_VERSION },
          }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, status: 200 });
        }
      }

      // Conditional data requests for Additional Case (Bulk Purchase)
      // We'll assume if the user mentions "discount" or "bulk" in the question, we ask for these.
      // For simplicity, let's assume if supplier_discount_percentage is provided, we ask for storage cost.
      if (supplierDiscountPercentage !== undefined && supplierDiscountPercentage !== null) {
        if (storageCostPercentageOfOrder === undefined || storageCostPercentageOfOrder === null) {
          return new Response(JSON.stringify({
            success: true,
            data: {
              data_needed: {
                field: "storage_cost_percentage_of_order",
                prompt: "What is the estimated storage cost for this bulk order as a percentage of the order value (e.g., '5' for 5%)?",
                intent_context: { intent, decision_type: "inventory_purchase" },
              }
            },
            error: null,
            meta: { requestId, timestamp: new Date().toISOString(), version: API_VERSION },
          }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, status: 200 });
        }
      }
      // --- End Data Gathering Sequence ---

      // --- Rule Evaluation ---

      // Rule 3: Reject conditions (highest priority)
      if (outstandingSupplierDebts > (0.40 * monthly_revenue)) { // Outstanding supplier debts > 40% of monthly revenue
        rejectScore++;
        reasons.push(`Your outstanding supplier debts (₦${outstandingSupplierDebts.toLocaleString()}) are more than 40% of your monthly revenue (₦${monthly_revenue.toLocaleString()}).`);
      }
      // Simplified: Cash flow shows 2 consecutive negative months -> check if latest net income is negative
      if (net_income < 0) {
        rejectScore++;
        reasons.push(`Your business currently has a negative net income (₦${net_income.toLocaleString()}).`);
      }

      if (rejectScore > 0) {
        recommendation = 'REJECT';
        reasoning = `Purchasing new inventory now would be too risky for your business. Key reasons: ${reasons.join(' ')}.`;
        actionable_steps = [
          'Prioritize paying down outstanding supplier debts.',
          'Focus on increasing revenue and reducing expenses to achieve positive net income.',
          'Review your current inventory to identify slow-moving items and clear them out.'
        ];
      } else {
        // If not rejected, evaluate other rules for APPROVE/WAIT
        
        // Rule 1: Restock if inventory turnover < 30 days AND cash reserves cover 120% of order value.
        const cashReservesCoverOrder = current_savings >= (1.20 * estimatedInventoryCost);
        if (inventoryTurnoverDays < 30 && cashReservesCoverOrder) {
          approveScore++;
          reasons.push(`Your inventory turnover is fast (${inventoryTurnoverDays} days) and your cash reserves (₦${current_savings.toLocaleString()}) comfortably cover 120% of the order value (₦${(1.20 * estimatedInventoryCost).toLocaleString()}).`);
        } else {
          if (inventoryTurnoverDays >= 30) reasons.push(`Your inventory turnover is slow (${inventoryTurnoverDays} days).`);
          if (!cashReservesCoverOrder) reasons.push(`Your cash reserves (₦${current_savings.toLocaleString()}) do not cover 120% of the order value (₦${(1.20 * estimatedInventoryCost).toLocaleString()}).`);
          waitScore++;
        }

        // Rule 2: For FMCG vendors, allow restock on credit if supplier terms ≤ 30 days and average receivables turnover < 25 days.
        if (isFmcgVendor && supplierCreditTermsDays !== undefined && averageReceivablesTurnoverDays !== undefined) {
          if (supplierCreditTermsDays <= 30 && averageReceivablesTurnoverDays < 25) {
            approveScore++; // This rule can also contribute to approval
            reasons.push(`As an FMCG vendor, your supplier credit terms (${supplierCreditTermsDays} days) are favorable and your receivables turnover is efficient (${averageReceivablesTurnoverDays} days).`);
          } else {
            if (supplierCreditTermsDays > 30) reasons.push(`As an FMCG vendor, your supplier credit terms (${supplierCreditTermsDays} days) are longer than ideal.`);
            if (averageReceivablesTurnoverDays >= 25) reasons.push(`As an FMCG vendor, your average receivables turnover (${averageReceivablesTurnoverDays} days) is slower than recommended.`);
            waitScore++;
          }
        }

        // Additional Case: Bulk-purchase recommendation if supplier discount ≥ 15% and storage cost ≤ 5% of order value.
        if (supplierDiscountPercentage !== undefined && storageCostPercentageOfOrder !== undefined) {
          if (supplierDiscountPercentage >= 15 && storageCostPercentageOfOrder <= 5) {
            // This is a positive indicator, but might not directly lead to APPROVE if other rules fail
            reasons.push(`Consider a bulk purchase due to a significant supplier discount (${supplierDiscountPercentage}%) and low storage costs (${storageCostPercentageOfOrder}%).`);
            actionable_steps.push('Explore the possibility of a bulk purchase to maximize savings from the supplier discount.');
          } else {
            if (supplierDiscountPercentage < 15) reasons.push(`The supplier discount (${supplierDiscountPercentage}%) is not substantial enough for a bulk purchase recommendation.`);
            if (storageCostPercentageOfOrder > 5) reasons.push(`Storage costs (${storageCostPercentageOfOrder}%) are too high to justify a bulk purchase at this time.`);
          }
        }

        if (approveScore > 0 && waitScore === 0) { // If at least one approve condition met and no wait conditions
          recommendation = 'APPROVE';
          reasoning = `Your business is in a strong position to restock. ${reasons.join(' ')}.`;
          actionable_steps.unshift('Confirm current market demand to avoid overstocking.', 'Negotiate best possible terms with suppliers.');
        } else {
          recommendation = 'WAIT';
          reasoning = `It's advisable to wait before restocking. Key considerations: ${reasons.join(' ')}.`;
          actionable_steps.unshift('Review your sales data to understand demand fluctuations.', 'Improve cash flow by collecting receivables faster or reducing non-essential expenses.');
        }
      }

      // Ensure actionable steps are unique and relevant
      actionable_steps = Array.from(new Set(actionable_steps));

    } else {
      throw new InputValidationError("Unsupported Intent", `Intent '${intent}' is not yet supported.`);
    }

    // 5. Save Decision to Database
    const { data: savedDecision, error: insertError } = await supabase
      .from('decisions')
      .insert({
        user_id: user.id,
        question: question,
        recommendation: recommendation,
        reasoning: reasoning,
        actionable_steps: actionable_steps,
        financial_snapshot: financialData,
        estimated_salary: estimatedSalary,
        estimated_inventory_cost: estimatedInventoryCost, // Save new fields
        inventory_turnover_days: inventoryTurnoverDays,
        supplier_credit_terms_days: supplierCreditTermsDays,
        average_receivables_turnover_days: averageReceivablesTurnoverDays,
        outstanding_supplier_debts: outstandingSupplierDebts,
        supplier_discount_percentage: supplierDiscountPercentage,
        storage_cost_percentage_of_order: storageCostPercentageOfOrder,
      })
      .select()
      .single();

    if (insertError) {
      throw new CustomError(
        ERROR_CODES.RECOMMENDATION_INSERT_FAILED,
        `Failed to save decision: ${insertError.message}`,
        SEVERITY.HIGH,
        500,
        insertError
      );
    }

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

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return handleError(error, requestId, user ? user.id : null, supabase, API_VERSION, req.body);
  }
});