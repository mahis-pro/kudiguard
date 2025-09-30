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
    'inventory', 
    'equipment', // Added equipment intent
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
    // Fields for inventory management
    estimated_inventory_cost: z.number().min(0).optional(),
    inventory_turnover_days: z.number().min(0).optional(),
    supplier_credit_terms_days: z.number().min(0).optional(),
    average_receivables_turnover_days: z.number().min(0).optional(),
    outstanding_supplier_debts: z.number().min(0).optional(),
    supplier_discount_percentage: z.number().min(0).max(100).optional(),
    storage_cost_percentage_of_order: z.number().min(0).max(100).optional(),
    // New fields for equipment and assets
    estimated_equipment_cost: z.number().min(0).optional(),
    expected_revenue_increase_monthly: z.number().min(0).optional(),
    expected_expense_decrease_monthly: z.number().min(0).optional(),
    equipment_lifespan_months: z.number().min(1).optional(),
    is_critical_replacement: z.boolean().optional(),
    is_power_solution: z.boolean().optional(),
    current_energy_cost_monthly: z.number().min(0).optional(),
    has_diversified_revenue_streams: z.boolean().optional(),
    existing_debt_load_monthly_repayments: z.number().min(0).optional(),
    financing_required: z.boolean().optional(),
    financing_interest_rate_annual_percentage: z.number().min(0).max(100).optional(),
    financing_term_months: z.number().min(1).optional(),
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
    console.log(`[${requestId}] User authenticated: ${user.id}`);

    // 2. Input Validation
    const body = await req.json();
    console.log(`[${requestId}] Received request body:`, redactSensitiveData(body));
    const validationResult = DecisionEngineInputSchema.safeParse(body);
    if (!validationResult.success) {
      throw new InputValidationError("Invalid input.", validationResult.error.toString());
    }
    let currentPayload = validationResult.data.payload || {}; // Make payload mutable and initialize safely
    const { intent, question } = validationResult.data;
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

    // 4. Decision Logic (Vertical Slice for 'hiring', 'inventory', and 'equipment')
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
    // New equipment-related variables
    let estimatedEquipmentCost: number | undefined;
    let expectedRevenueIncreaseMonthly: number | undefined;
    let expectedExpenseDecreaseMonthly: number | undefined;
    let equipmentLifespanMonths: number | undefined;
    let isCriticalReplacement: boolean | undefined;
    let isPowerSolution: boolean | undefined;
    let currentEnergyCostMonthly: number | undefined;
    let hasDiversifiedRevenueStreams: boolean | undefined;
    let existingDebtLoadMonthlyRepayments: number | undefined;
    let financingRequired: boolean | undefined;
    let financingInterestRateAnnualPercentage: number | undefined;
    let financingTermMonths: number | undefined;


    if (intent === 'hiring') {
      estimatedSalary = currentPayload?.estimated_salary;

      // If estimated_salary is not provided, request it from the user
      if (estimatedSalary === undefined || estimatedSalary === null) {
        console.log(`[${requestId}] Data needed: estimated_salary`);
        return new Response(JSON.stringify({
          success: true,
          data: {
            data_needed: {
              field: "estimated_salary",
              prompt: "What is the estimated monthly salary for the new hire (in ₦)?",
              intent_context: { 
                intent, 
                decision_type: "hiring_affordability",
                current_payload: currentPayload // Pass the current accumulated payload
              },
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
      estimatedInventoryCost = currentPayload?.estimated_inventory_cost;
      inventoryTurnoverDays = currentPayload?.inventory_turnover_days;
      outstandingSupplierDebts = currentPayload?.outstanding_supplier_debts;
      supplierCreditTermsDays = currentPayload?.supplier_credit_terms_days;
      averageReceivablesTurnoverDays = currentPayload?.average_receivables_turnover_days;
      supplierDiscountPercentage = currentPayload?.supplier_discount_percentage;
      storageCostPercentageOfOrder = currentPayload?.storage_cost_percentage_of_order;

      const { monthly_revenue, monthly_expenses, current_savings } = financialData;
      const net_income = monthly_revenue - monthly_expenses;
      
      const reasons = [];
      let approveScore = 0;
      let waitScore = 0;
      let rejectScore = 0;
      actionable_steps = [];

      // --- Data Gathering Sequence for Inventory ---
      if (estimatedInventoryCost === undefined || estimatedInventoryCost === null) {
        console.log(`[${requestId}] Data needed: estimated_inventory_cost`);
        return new Response(JSON.stringify({
          success: true,
          data: {
            data_needed: {
              field: "estimated_inventory_cost",
              prompt: "What is the estimated cost of the new inventory you want to purchase (in ₦)?",
              intent_context: { 
                intent, 
                decision_type: "inventory_purchase",
                current_payload: currentPayload // Pass the current accumulated payload
              },
            }
          },
          error: null,
          meta: { requestId, timestamp: new Date().toISOString(), version: API_VERSION },
        }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, status: 200 });
      }
      if (inventoryTurnoverDays === undefined || inventoryTurnoverDays === null) {
        console.log(`[${requestId}] Data needed: inventory_turnover_days`);
        return new Response(JSON.stringify({
          success: true,
          data: {
            data_needed: {
              field: "inventory_turnover_days",
              prompt: "What is your average inventory turnover in days (how long it takes to sell all your stock)?",
              intent_context: { 
                intent, 
                decision_type: "inventory_purchase",
                current_payload: currentPayload // Pass the current accumulated payload
              },
            }
          },
          error: null,
          meta: { requestId, timestamp: new Date().toISOString(), version: API_VERSION },
        }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, status: 200 });
      }
      if (outstandingSupplierDebts === undefined || outstandingSupplierDebts === null) {
        console.log(`[${requestId}] Data needed: outstanding_supplier_debts`);
        return new Response(JSON.stringify({
          success: true,
          data: {
            data_needed: {
              field: "outstanding_supplier_debts",
              prompt: "What is your total outstanding debt to suppliers (in ₦)?",
              intent_context: { 
                intent, 
                decision_type: "inventory_purchase",
                current_payload: currentPayload // Pass the current accumulated payload
              },
            }
          },
          error: null,
          meta: { requestId, timestamp: new Date().toISOString(), version: API_VERSION },
        }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, status: 200 });
      }

      // Conditional data requests for Rule 2 (FMCG specific)
      if (isFmcgVendor) {
        if (supplierCreditTermsDays === undefined || supplierCreditTermsDays === null) {
          console.log(`[${requestId}] Data needed: supplier_credit_terms_days (FMCG)`);
          return new Response(JSON.stringify({
            success: true,
            data: {
              data_needed: {
                field: "supplier_credit_terms_days",
                prompt: "What are your supplier's credit terms in days (how long do you have to pay)?",
                intent_context: { 
                  intent, 
                  decision_type: "inventory_purchase",
                  current_payload: currentPayload // Pass the current accumulated payload
                },
              }
            },
            error: null,
            meta: { requestId, timestamp: new Date().toISOString(), version: API_VERSION },
          }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, status: 200 });
        }
        if (averageReceivablesTurnoverDays === undefined || averageReceivablesTurnoverDays === null) {
          console.log(`[${requestId}] Data needed: average_receivables_turnover_days (FMCG)`);
          return new Response(JSON.stringify({
            success: true,
            data: {
              data_needed: {
                field: "average_receivables_turnover_days",
                prompt: "What is your average receivables turnover in days (how long customers take to pay you)?",
                intent_context: { 
                  intent, 
                  decision_type: "inventory_purchase",
                  current_payload: currentPayload // Pass the current accumulated payload
                },
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
          console.log(`[${requestId}] Data needed: storage_cost_percentage_of_order (Bulk Purchase)`);
          return new Response(JSON.stringify({
            success: true,
            data: {
              data_needed: {
                field: "storage_cost_percentage_of_order",
                prompt: "What is the estimated storage cost for this bulk order as a percentage of the order value (e.g., '5' for 5%)?",
                intent_context: { 
                  intent, 
                  decision_type: "inventory_purchase",
                  current_payload: currentPayload // Pass the current accumulated payload
                },
              }
            },
            error: null,
            meta: { requestId, timestamp: new Date().toISOString(), version: API_VERSION },
          }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, status: 200 });
        }
      }
      // --- End Data Gathering Sequence ---

      // --- Final Validation before Rule Evaluation ---
      if (estimatedInventoryCost === undefined || inventoryTurnoverDays === undefined || outstandingSupplierDebts === undefined ||
          (isFmcgVendor && (supplierCreditTermsDays === undefined || averageReceivablesTurnoverDays === undefined)) ||
          (supplierDiscountPercentage !== undefined && storageCostPercentageOfOrder === undefined)) {
        throw new CustomError(
          ERROR_CODES.MISSING_REQUIRED_FIELD,
          "Critical inventory data is missing after collection. Please restart the conversation.",
          SEVERITY.HIGH,
          500
        );
      }
      console.log(`[${requestId}] All required inventory data collected.`);

      // Type assertion after validation
      const finalEstimatedInventoryCost = estimatedInventoryCost!;
      const finalInventoryTurnoverDays = inventoryTurnoverDays!;
      const finalOutstandingSupplierDebts = outstandingSupplierDebts!;
      const finalSupplierCreditTermsDays = isFmcgVendor ? supplierCreditTermsDays! : undefined;
      const finalAverageReceivablesTurnoverDays = isFmcgVendor ? averageReceivablesTurnoverDays! : undefined;
      const finalSupplierDiscountPercentage = supplierDiscountPercentage;
      const finalStorageCostPercentageOfOrder = storageCostPercentageOfOrder;


      // --- Rule Evaluation ---

      // Rule 3: Reject conditions (highest priority)
      if (finalOutstandingSupplierDebts > (0.40 * monthly_revenue)) { // Outstanding supplier debts > 40% of monthly revenue
        rejectScore++;
        reasons.push(`Your outstanding supplier debts (₦${finalOutstandingSupplierDebts.toLocaleString()}) are more than 40% of your monthly revenue (₦${monthly_revenue.toLocaleString()}).`);
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
        const cashReservesCoverOrder = current_savings >= (1.20 * finalEstimatedInventoryCost);
        if (finalInventoryTurnoverDays < 30 && cashReservesCoverOrder) {
          approveScore++;
          reasons.push(`Your inventory turnover is fast (${finalInventoryTurnoverDays} days) and your cash reserves (₦${current_savings.toLocaleString()}) comfortably cover 120% of the order value (₦${(1.20 * finalEstimatedInventoryCost).toLocaleString()}).`);
        } else {
          if (finalInventoryTurnoverDays >= 30) reasons.push(`Your inventory turnover is slow (${finalInventoryTurnoverDays} days).`);
          if (!cashReservesCoverOrder) reasons.push(`Your cash reserves (₦${current_savings.toLocaleString()}) do not cover 120% of the order value (₦${(1.20 * finalEstimatedInventoryCost).toLocaleString()}).`);
          waitScore++;
        }

        // Rule 2: For FMCG vendors, allow restock on credit if supplier terms ≤ 30 days and average receivables turnover < 25 days.
        if (isFmcgVendor && finalSupplierCreditTermsDays !== undefined && finalAverageReceivablesTurnoverDays !== undefined) {
          if (finalSupplierCreditTermsDays <= 30 && finalAverageReceivablesTurnoverDays < 25) {
            approveScore++; // This rule can also contribute to approval
            reasons.push(`As an FMCG vendor, your supplier credit terms (${finalSupplierCreditTermsDays} days) are favorable and your receivables turnover is efficient (${finalAverageReceivablesTurnoverDays} days).`);
          } else {
            if (finalSupplierCreditTermsDays > 30) reasons.push(`As an FMCG vendor, your supplier credit terms (${finalSupplierCreditTermsDays} days) are longer than ideal.`);
            if (finalAverageReceivablesTurnoverDays >= 25) reasons.push(`As an FMCG vendor, your average receivables turnover (${finalAverageReceivablesTurnoverDays} days) is slower than recommended.`);
            waitScore++;
          }
        }

        // Additional Case: Bulk-purchase recommendation if supplier discount ≥ 15% and storage cost ≤ 5% of order value.
        if (finalSupplierDiscountPercentage !== undefined && finalStorageCostPercentageOfOrder !== undefined) {
          if (finalSupplierDiscountPercentage >= 15 && finalStorageCostPercentageOfOrder <= 5) {
            // This is a positive indicator, but might not directly lead to APPROVE if other rules fail
            reasons.push(`Consider a bulk purchase due to a significant supplier discount (${finalSupplierDiscountPercentage}%) and low storage costs (${finalStorageCostPercentageOfOrder}%).`);
            actionable_steps.push('Explore the possibility of a bulk purchase to maximize savings from the supplier discount.');
          } else {
            if (finalSupplierDiscountPercentage < 15) reasons.push(`The supplier discount (${finalSupplierDiscountPercentage}%) is not substantial enough for a bulk purchase recommendation.`);
            if (finalStorageCostPercentageOfOrder > 5) reasons.push(`Storage costs (${finalStorageCostPercentageOfOrder}%) are too high to justify a bulk purchase at this time.`);
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
      console.log(`[${requestId}] Decision made - Recommendation: ${recommendation}, Reasoning: "${reasoning}", Steps:`, actionable_steps);

    } else if (intent === 'equipment') {
      const { monthly_revenue, monthly_expenses, current_savings } = financialData; // Need these for checks

      // Step 1: Determine is_power_solution (can be inferred from question or explicitly provided)
      if (currentPayload.is_power_solution === undefined || currentPayload.is_power_solution === null) {
        if (question.toLowerCase().includes('generator') || question.toLowerCase().includes('solar') || question.toLowerCase().includes('inverter') || question.toLowerCase().includes('power')) {
          currentPayload.is_power_solution = true;
        } else {
          currentPayload.is_power_solution = false;
        }
      }

      // Step 2: Prompt for estimated_equipment_cost if missing
      if (currentPayload.estimated_equipment_cost === undefined || currentPayload.estimated_equipment_cost === null) {
        return new Response(JSON.stringify({
          success: true,
          data: {
            data_needed: {
              field: "estimated_equipment_cost",
              prompt: "What is the estimated cost of the equipment (in ₦)?",
              intent_context: { intent, decision_type: "equipment_purchase", current_payload: currentPayload },
            }
          },
          error: null,
          meta: { requestId, timestamp: new Date().toISOString(), version: API_VERSION },
        }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, status: 200 });
      }

      // Step 3: Prompt for is_critical_replacement if missing
      if (currentPayload.is_critical_replacement === undefined || currentPayload.is_critical_replacement === null) {
        return new Response(JSON.stringify({
          success: true,
          data: {
            data_needed: {
              field: "is_critical_replacement",
              prompt: "Is this equipment a critical replacement for something broken that currently stops or severely impedes core business operations? (true/false)",
              intent_context: { intent, decision_type: "equipment_purchase", current_payload: currentPayload },
            }
          },
          error: null,
          meta: { requestId, timestamp: new Date().toISOString(), version: API_VERSION },
        }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, status: 200 });
      }

      // Step 4: Prompt for expected_revenue_increase_monthly if missing
      if (currentPayload.expected_revenue_increase_monthly === undefined || currentPayload.expected_revenue_increase_monthly === null) {
        return new Response(JSON.stringify({
          success: true,
          data: {
            data_needed: {
              field: "expected_revenue_increase_monthly",
              prompt: "How much do you expect this equipment to increase your monthly revenue (in ₦)?",
              intent_context: { intent, decision_type: "equipment_purchase", current_payload: currentPayload },
            }
          },
          error: null,
          meta: { requestId, timestamp: new Date().toISOString(), version: API_VERSION },
        }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, status: 200 });
      }

      // Step 5: Prompt for expected_expense_decrease_monthly if missing
      if (currentPayload.expected_expense_decrease_monthly === undefined || currentPayload.expected_expense_decrease_monthly === null) {
        return new Response(JSON.stringify({
          success: true,
          data: {
            data_needed: {
              field: "expected_expense_decrease_monthly",
              prompt: "How much do you expect this equipment to decrease your monthly expenses (in ₦)?",
              intent_context: { intent, decision_type: "equipment_purchase", current_payload: currentPayload },
            }
          },
          error: null,
          meta: { requestId, timestamp: new Date().toISOString(), version: API_VERSION },
        }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, status: 200 });
      }

      // Step 6: Prompt for existing_debt_load_monthly_repayments if missing
      if (currentPayload.existing_debt_load_monthly_repayments === undefined || currentPayload.existing_debt_load_monthly_repayments === null) {
        return new Response(JSON.stringify({
          success: true,
          data: {
            data_needed: {
              field: "existing_debt_load_monthly_repayments",
              prompt: "What are your total monthly repayments for existing business loans or significant debts (in ₦)?",
              intent_context: { intent, decision_type: "equipment_purchase", current_payload: currentPayload },
            }
          },
          error: null,
          meta: { requestId, timestamp: new Date().toISOString(), version: API_VERSION },
        }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, status: 200 });
      }

      // Step 7: Conditional prompt for current_energy_cost_monthly if it's a power solution and missing
      if (currentPayload.is_power_solution && (currentPayload.current_energy_cost_monthly === undefined || currentPayload.current_energy_cost_monthly === null)) {
        return new Response(JSON.stringify({
          success: true,
          data: {
            data_needed: {
              field: "current_energy_cost_monthly",
              prompt: "What is your current average monthly energy cost (in ₦)?",
              intent_context: { intent, decision_type: "equipment_purchase", current_payload: currentPayload },
            }
          },
          error: null,
          meta: { requestId, timestamp: new Date().toISOString(), version: API_VERSION },
        }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, status: 200 });
      }

      // Step 8: Conditional prompt for has_diversified_revenue_streams if estimated_equipment_cost is high and missing
      if (currentPayload.estimated_equipment_cost > 1000000 && (currentPayload.has_diversified_revenue_streams === undefined || currentPayload.has_diversified_revenue_streams === null)) {
        return new Response(JSON.stringify({
          success: true,
          data: {
            data_needed: {
              field: "has_diversified_revenue_streams",
              prompt: "Does your business have at least two distinct, significant revenue streams? (true/false)",
              intent_context: { intent, decision_type: "equipment_purchase", current_payload: currentPayload },
            }
          },
          error: null,
          meta: { requestId, timestamp: new Date().toISOString(), version: API_VERSION },
        }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, status: 200 });
      } else if (currentPayload.has_diversified_revenue_streams === undefined) {
        // Default to true if not capital intensive and not explicitly set
        currentPayload.has_diversified_revenue_streams = true;
      }

      // Step 9: Conditional prompt for financing_required if estimated_equipment_cost is high relative to savings and missing
      if (currentPayload.estimated_equipment_cost > (0.5 * current_savings) && (currentPayload.financing_required === undefined || currentPayload.financing_required === null)) {
        return new Response(JSON.stringify({
          success: true,
          data: {
            data_needed: {
              field: "financing_required",
              prompt: "Will you need external financing (e.g., a loan) for this purchase? (true/false)",
              intent_context: { intent, decision_type: "equipment_purchase", current_payload: currentPayload },
            }
          },
          error: null,
          meta: { requestId, timestamp: new Date().toISOString(), version: API_VERSION },
        }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, status: 200 });
      } else if (currentPayload.financing_required === undefined) {
        // Default to false if not high relative to savings and not explicitly set
        currentPayload.financing_required = false;
      }

      // Step 10: Conditional prompts for financing details if financing_required is true and missing
      if (currentPayload.financing_required) {
        if (currentPayload.financing_interest_rate_annual_percentage === undefined || currentPayload.financing_interest_rate_annual_percentage === null) {
          return new Response(JSON.stringify({
            success: true,
            data: {
              data_needed: {
                field: "financing_interest_rate_annual_percentage",
                prompt: "What is the estimated annual interest rate (%) for the financing?",
                intent_context: { intent, decision_type: "equipment_purchase", current_payload: currentPayload },
              }
            },
            error: null,
            meta: { requestId, timestamp: new Date().toISOString(), version: API_VERSION },
          }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, status: 200 });
        }
        if (currentPayload.financing_term_months === undefined || currentPayload.financing_term_months === null) {
          return new Response(JSON.stringify({
            success: true,
            data: {
              data_needed: {
                field: "financing_term_months",
                prompt: "What is the estimated loan term in months for the financing?",
                intent_context: { intent, decision_type: "equipment_purchase", current_payload: currentPayload },
              }
            },
            error: null,
            meta: { requestId, timestamp: new Date().toISOString(), version: API_VERSION },
          }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, status: 200 });
        }
      }

      // After all prompts, assign local variables from the final currentPayload for decision logic
      estimatedEquipmentCost = currentPayload.estimated_equipment_cost;
      expectedRevenueIncreaseMonthly = currentPayload.expected_revenue_increase_monthly;
      expectedExpenseDecreaseMonthly = currentPayload.expected_expense_decrease_monthly;
      equipmentLifespanMonths = currentPayload.equipment_lifespan_months;
      isCriticalReplacement = currentPayload.is_critical_replacement;
      isPowerSolution = currentPayload.is_power_solution; 
      currentEnergyCostMonthly = currentPayload.current_energy_cost_monthly;
      hasDiversifiedRevenueStreams = currentPayload.has_diversified_revenue_streams; 
      existingDebtLoadMonthlyRepayments = currentPayload.existing_debt_load_monthly_repayments;
      financingRequired = currentPayload.financing_required;
      financingInterestRateAnnualPercentage = currentPayload.financing_interest_rate_annual_percentage;
      financingTermMonths = currentPayload.financing_term_months;

      const net_income = monthly_revenue - monthly_expenses;
      const profit_margin = monthly_revenue > 0 ? (net_income / monthly_revenue) * 100 : 0;
      const savings_buffer_months = monthly_expenses > 0 ? current_savings / monthly_expenses : Infinity;

      const reasons: string[] = [];
      actionable_steps = [];
      let rejectConditionsMet = 0;
      let approveConditionsMet = 0;
      let waitConditionsMet = 0;

      const monthly_profit_increase = (expectedRevenueIncreaseMonthly ?? 0) + (expectedExpenseDecreaseMonthly ?? 0);
      const payback_months = monthly_profit_increase > 0 ? (estimatedEquipmentCost ?? 0) / monthly_profit_increase : Infinity;
      const productivity_gain_percentage = net_income > 0 ? (monthly_profit_increase / net_income) * 100 : 0;
      const energy_cost_percentage_of_expenses = monthly_expenses > 0 ? (currentEnergyCostMonthly ?? 0) / monthly_expenses * 100 : 0;

      // --- A. Immediate REJECT Conditions (Highest Priority) ---
      // Rule 3: Capital-Intensive & Undiversified (Refined)
      if ((estimatedEquipmentCost ?? 0) > 1000000 && !hasDiversifiedRevenueStreams && !isCriticalReplacement) {
        rejectConditionsMet++;
        reasons.push(`Investing over ₦1,000,000 without diversified revenue streams is too risky, as it concentrates your business's financial exposure and could jeopardize stability if one stream falters.`);
        actionable_steps.push("Focus on developing at least one additional significant and stable revenue stream before considering such a large, non-critical investment.");
      }

      // Severe Negative Net Income (Non-Critical)
      if (net_income < 0 && !isCriticalReplacement) {
        rejectConditionsMet++;
        reasons.push(`Your business is currently unprofitable (Net Income: ₦${net_income.toLocaleString()}). Adding new costs for non-critical equipment would worsen your financial situation.`);
        actionable_steps.push("Prioritize increasing revenue and aggressively cutting non-essential expenses to achieve consistent profitability before any new investments.");
      }

      // Overwhelming Existing Debt (Non-Critical)
      if ((existingDebtLoadMonthlyRepayments ?? 0) > (0.30 * monthly_revenue) && !isCriticalReplacement) {
        rejectConditionsMet++;
        reasons.push(`Your existing debt burden (₦${(existingDebtLoadMonthlyRepayments ?? 0).toLocaleString()} monthly) is already high, exceeding 30% of your monthly revenue. Taking on more debt for non-critical equipment could lead to severe cash flow problems.`);
        actionable_steps.push("Focus on significantly reducing your current debt load to improve financial stability and free up cash flow for future investments.");
      }

      if (rejectConditionsMet > 0) {
        recommendation = 'REJECT';
        reasoning = `Based on critical financial indicators, this investment is currently too risky for your business. ${reasons.join(' ')}`;
      } else {
        // --- B. Strong APPROVE Conditions ---
        // Critical Replacement Override
        if (isCriticalReplacement && (current_savings >= (estimatedEquipmentCost ?? 0) || (current_savings + net_income * 2) >= (estimatedEquipmentCost ?? 0))) {
          approveConditionsMet++;
          reasons.push(`This equipment is a critical replacement essential for your business operations. Your financials, while potentially tight, can support this necessary investment.`);
          actionable_steps.push("Proceed with the purchase. Ensure minimal downtime during installation. If cash flow is tight, explore short-term, low-interest financing options or temporary solutions.");
        }

        // Rule 1: High ROI / Quick Payback
        if (monthly_profit_increase > 0 && (payback_months <= 12 || (net_income > 0 && productivity_gain_percentage >= 20))) {
          approveConditionsMet++;
          reasons.push(`The equipment offers a rapid return on investment (payback in ${payback_months.toFixed(1)} months) or a significant boost to your business's profitability (${productivity_gain_percentage.toFixed(1)}% productivity gain).`);
          actionable_steps.push("Confirm current market demand to ensure the expected revenue increase is realistic.", "Negotiate best possible terms with suppliers.");
        }

        // Rule 2: Small Equipment, Healthy Business
        if ((estimatedEquipmentCost ?? 0) <= 200000 && profit_margin >= 15 && savings_buffer_months >= 2) {
          approveConditionsMet++;
          reasons.push(`This small investment (₦${(estimatedEquipmentCost ?? 0).toLocaleString()}) is well within your business's capacity, given your healthy profit margins (${profit_margin.toFixed(1)}%) and strong savings buffer (${savings_buffer_months.toFixed(1)} months).`);
          actionable_steps.push("Ensure the equipment aligns with your long-term business goals.", "Consider potential maintenance costs.");
        }

        // Additional Case: Prioritized Power Solution (Nigerian Context)
        if (isPowerSolution && energy_cost_percentage_of_expenses > 15) {
          // This acts as a strong positive factor. It can upgrade a 'WAIT' to an 'APPROVE' or solidify an 'APPROVE'
          approveConditionsMet++; // Give it a strong weight
          reasons.push(`Your high energy costs (currently ${energy_cost_percentage_of_expenses.toFixed(1)}% of monthly expenses) are a significant drain. This power solution investment is highly prioritized as it will likely lead to substantial operational savings and improved stability.`);
          actionable_steps.push("Calculate the exact ROI from energy savings over the equipment's lifespan.", "Ensure proper installation and regular maintenance for longevity.");
        }

        if (approveConditionsMet > 0) {
          recommendation = 'APPROVE';
          if (reasons.length === 0) reasons.push("Your business is in a strong position for this investment."); // Fallback if no specific reasons added yet
        } else {
          // --- C. WAIT Conditions (Default if not REJECT or strong APPROVE) ---
          recommendation = 'WAIT';
          if (monthly_profit_increase <= 0) {
            reasons.push("The expected financial impact (revenue increase + expense decrease) is not positive, indicating the investment might not pay for itself.");
            actionable_steps.push("Re-evaluate the potential benefits of this equipment. Can it truly increase revenue or decrease expenses significantly?");
          } else if (payback_months > 12) {
            reasons.push(`The estimated payback period of ${payback_months.toFixed(1)} months is longer than ideal, suggesting a slower return on investment.`);
            actionable_steps.push("Explore ways to accelerate the return on investment, such as increasing sales targets or finding more cost-effective equipment.");
          }
          if (profit_margin < 15) {
            reasons.push(`Your current profit margin (${profit_margin.toFixed(1)}%) is below the recommended threshold for new investments.`);
            actionable_steps.push("Focus on improving your overall business profitability before committing to new equipment.");
          }
          if (savings_buffer_months < 2) {
            reasons.push(`Your savings buffer (${savings_buffer_months.toFixed(1)} months) is less than the recommended 2 months of expenses, making new investments risky.`);
            actionable_steps.push("Build up your emergency savings to at least 2 months of operational expenses.");
          }
          if ((existingDebtLoadMonthlyRepayments ?? 0) > (0.15 * monthly_revenue) && (existingDebtLoadMonthlyRepayments ?? 0) <= (0.30 * monthly_revenue)) {
            reasons.push(`Your existing debt load (₦${(existingDebtLoadMonthlyRepayments ?? 0).toLocaleString()} monthly) is moderate. Adding more debt might strain your cash flow.`);
            actionable_steps.push("Consider reducing existing debts or exploring financing options with more favorable terms.");
          }
          if (financingRequired && (financingInterestRateAnnualPercentage ?? 0) > 25) {
            reasons.push(`The estimated annual interest rate for financing (${(financingInterestRateAnnualPercentage ?? 0)}%) is quite high, significantly increasing the total cost of the equipment.`);
            actionable_steps.push("Seek alternative financing options with lower interest rates or consider delaying the purchase until better terms are available.");
          }
          if (financingRequired && (financingTermMonths ?? 0) > 36) { // Example: long term for small business
            reasons.push(`A long financing term of ${(financingTermMonths ?? 0)} months could tie up your cash flow for an extended period.`);
            actionable_steps.push("Explore options for a shorter loan term or consider a smaller, more affordable equipment purchase.");
          }
          if (reasons.length === 0) {
            reasons.push("The current financial conditions suggest caution. While not immediately risky, there are areas for improvement before this investment.");
            actionable_steps.push("Review your business plan and financial projections. Consider a phased approach to investment.");
          }
        }
      }

      // Ensure actionable steps are unique and relevant
      actionable_steps = Array.from(new Set(actionable_steps));
      console.log(`[${requestId}] Decision made - Recommendation: ${recommendation}, Reasoning: "${reasoning}", Steps:`, actionable_steps);

    } else {
      throw new InputValidationError("Unsupported Intent", `Intent '${intent}' is not yet supported.`);
    }

    // 5. Save Decision to Database
    const decisionToSave = {
      user_id: user.id,
      question: question,
      recommendation: recommendation,
      reasoning: reasoning,
      actionable_steps: actionable_steps,
      financial_snapshot: financialData,
      estimated_salary: estimatedSalary,
      estimated_inventory_cost: estimatedInventoryCost, // Save inventory fields
      inventory_turnover_days: inventoryTurnoverDays,
      supplier_credit_terms_days: supplierCreditTermsDays,
      average_receivables_turnover_days: averageReceivablesTurnoverDays,
      outstanding_supplier_debts: outstandingSupplierDebts,
      supplier_discount_percentage: supplierDiscountPercentage,
      storage_cost_percentage_of_order: storageCostPercentageOfOrder,
      // Save new equipment fields
      estimated_equipment_cost: estimatedEquipmentCost,
      expected_revenue_increase_monthly: expectedRevenueIncreaseMonthly,
      expected_expense_decrease_monthly: expectedExpenseDecreaseMonthly,
      equipment_lifespan_months: equipmentLifespanMonths,
      is_critical_replacement: isCriticalReplacement,
      is_power_solution: isPowerSolution,
      current_energy_cost_monthly: currentEnergyCostMonthly,
      has_diversified_revenue_streams: hasDiversifiedRevenueStreams,
      existing_debt_load_monthly_repayments: existingDebtLoadMonthlyRepayments,
      financing_required: financingRequired,
      financing_interest_rate_annual_percentage: financingInterestRateAnnualPercentage,
      financing_term_months: financingTermMonths,
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
    return handleError(error, requestId, user ? user.id : null, supabase, API_VERSION, req.body);
  }
});