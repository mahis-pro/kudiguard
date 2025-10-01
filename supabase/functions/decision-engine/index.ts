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

export function getSupabaseClient(authHeader: string, serviceRole = false): SupabaseClient {
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
        version: API_VERSION,
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
      version: API_VERSION,
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
    'equipment',
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

// Define types for the financial data and profile data
export type FinancialData = {
  monthly_revenue: number;
  monthly_expenses: number;
  current_savings: number;
};

export type ProfileData = {
  is_fmcg_vendor: boolean;
};

// Define a type for the decision result
export type DecisionResult = {
  recommendation: 'APPROVE' | 'WAIT' | 'REJECT';
  reasoning: string;
  actionable_steps: string[];
  financial_snapshot: FinancialData;
  estimated_salary?: number | null;
  estimated_inventory_cost?: number | null;
  inventory_turnover_days?: number | null;
  supplier_credit_terms_days?: number | null;
  average_receivables_turnover_days?: number | null;
  outstanding_supplier_debts?: number | null;
  supplier_discount_percentage?: number | null;
  storage_cost_percentage_of_order?: number | null;
  estimated_equipment_cost?: number | null;
  expected_revenue_increase_monthly?: number | null;
  expected_expense_decrease_monthly?: number | null;
  equipment_lifespan_months?: number | null;
  is_critical_replacement?: boolean | null;
  is_power_solution?: boolean | null;
  current_energy_cost_monthly?: number | null;
  has_diversified_revenue_streams?: boolean | null;
  existing_debt_load_monthly_repayments?: number | null;
  financing_required?: boolean | null;
  financing_interest_rate_annual_percentage?: number | null;
  financing_term_months?: number | null;
};

// Define a type for the data needed response
export type DataNeededResponse = {
  field: string;
  prompt: string;
  intent_context: { intent: string; decision_type: string; current_payload?: Record<string, any>; };
  canBeZeroOrNone?: boolean; // New field to indicate if '0' or 'none' is a valid input
};

// Define the return type for decision functions
export type DecisionFunctionReturn = {
  decision: DecisionResult | null; // Allow decision to be null when dataNeeded is present
  dataNeeded?: DataNeededResponse;
};

// Helper to safely get a number, treating null/undefined as 0
const getNumberOrDefault = (value: number | null | undefined): number => value ?? 0;

// --- decisions/hiring.ts content ---
export function makeHiringDecision(
  financialData: FinancialData,
  currentPayload: Record<string, any>,
  question: string,
  requestId: string,
): DecisionFunctionReturn {
  let estimatedSalary = getNumberOrDefault(currentPayload?.estimated_salary);

  // If estimated_salary is not provided, request it from the user
  if (estimatedSalary <= 0) { // Check for 0 or less, as salary must be positive
    console.log(`[${requestId}] Data needed: estimated_salary`);
    return {
      decision: null, // Placeholder, actual decision not made yet
      dataNeeded: {
        field: "estimated_salary",
        prompt: "What is the estimated monthly salary for the new hire (in ₦)? (Must be greater than 0)",
        intent_context: { 
          intent: "hiring", 
          decision_type: "hiring_affordability",
          current_payload: currentPayload 
        },
        canBeZeroOrNone: false,
      }
    };
  }

  const { monthly_revenue, monthly_expenses, current_savings } = financialData;
  const net_income = monthly_revenue - monthly_expenses;
  
  const reasons = [];
  let score = 0;
  let recommendation: 'APPROVE' | 'WAIT' | 'REJECT';
  let reasoning: string;
  let actionable_steps: string[];

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

  return {
    decision: {
      recommendation,
      reasoning,
      actionable_steps: Array.from(new Set(actionable_steps)), // Ensure unique steps
      financial_snapshot: financialData,
      estimated_salary: estimatedSalary,
    }
  };
}

// --- decisions/inventory.ts content ---
export function makeInventoryDecision(
  financialData: FinancialData,
  profileData: ProfileData,
  currentPayload: Record<string, any>,
  question: string,
  requestId: string,
): DecisionFunctionReturn {
  let estimatedInventoryCost = getNumberOrDefault(currentPayload?.estimated_inventory_cost);
  let inventoryTurnoverDays = getNumberOrDefault(currentPayload?.inventory_turnover_days);
  let outstandingSupplierDebts = getNumberOrDefault(currentPayload?.outstanding_supplier_debts);
  let supplierCreditTermsDays = getNumberOrDefault(currentPayload?.supplier_credit_terms_days);
  let averageReceivablesTurnoverDays = getNumberOrDefault(currentPayload?.average_receivables_turnover_days);
  let supplierDiscountPercentage = getNumberOrDefault(currentPayload?.supplier_discount_percentage);
  let storageCostPercentageOfOrder = getNumberOrDefault(currentPayload?.storage_cost_percentage_of_order);

  const { monthly_revenue, monthly_expenses, current_savings } = financialData;
  const net_income = monthly_revenue - monthly_expenses;
  const isFmcgVendor = profileData.is_fmcg_vendor;
  
  const reasons = [];
  let approveScore = 0;
  let waitScore = 0;
  let rejectScore = 0;
  let actionable_steps: string[] = [];
  let recommendation: 'APPROVE' | 'WAIT' | 'REJECT';
  let reasoning: string;

  // --- Data Gathering Sequence for Inventory ---
  if (estimatedInventoryCost <= 0) {
    return {
      decision: null,
      dataNeeded: {
        field: "estimated_inventory_cost",
        prompt: "What is the estimated cost of the new inventory you want to purchase (in ₦)? (Must be greater than 0)",
        intent_context: { 
          intent: "inventory", 
          decision_type: "inventory_purchase",
          current_payload: currentPayload 
        },
        canBeZeroOrNone: false,
      }
    };
  }
  if (inventoryTurnoverDays <= 0) {
    return {
      decision: null,
      dataNeeded: {
        field: "inventory_turnover_days",
        prompt: "What is your average inventory turnover in days (how long it takes to sell all your stock)? (Must be greater than 0)",
        intent_context: { 
          intent: "inventory", 
          decision_type: "inventory_purchase",
          current_payload: currentPayload 
        },
        canBeZeroOrNone: false,
      }
    };
  }
  if (currentPayload?.outstanding_supplier_debts === undefined || currentPayload?.outstanding_supplier_debts === null) { // Check original payload for undefined/null
    return {
      decision: null,
      dataNeeded: {
        field: "outstanding_supplier_debts",
        prompt: "What is your total outstanding debt to suppliers (in ₦)? (Type '0' if none)",
        intent_context: { 
          intent: "inventory", 
          decision_type: "inventory_purchase",
          current_payload: currentPayload 
        },
        canBeZeroOrNone: true, // Outstanding debts can be 0
      }
    };
  }

  // Conditional data requests for Rule 2 (FMCG specific)
  if (isFmcgVendor) {
    if (supplierCreditTermsDays <= 0) {
      return {
        decision: null,
      dataNeeded: {
        field: "supplier_credit_terms_days",
        prompt: "What are your supplier's credit terms in days (how long do you have to pay)? (Must be greater than 0)",
        intent_context: { 
          intent: "inventory", 
          decision_type: "inventory_purchase",
          current_payload: currentPayload 
        },
        canBeZeroOrNone: false,
      }
    };
    }
    if (averageReceivablesTurnoverDays <= 0) {
      return {
        decision: null,
      dataNeeded: {
        field: "average_receivables_turnover_days",
        prompt: "What is your average receivables turnover in days (how long customers take to pay you)? (Must be greater than 0)",
        intent_context: { 
          intent: "inventory", 
          decision_type: "inventory_purchase",
          current_payload: currentPayload 
        },
        canBeZeroOrNone: false,
      }
    };
    }
  }

  // Conditional data requests for Additional Case (Bulk Purchase)
  if (supplierDiscountPercentage > 0) { // Only ask for storage cost if there's a discount
    if (currentPayload?.storage_cost_percentage_of_order === undefined || currentPayload?.storage_cost_percentage_of_order === null) {
      return {
        decision: null,
      dataNeeded: {
        field: "storage_cost_percentage_of_order",
        prompt: "What is the estimated storage cost for this bulk order as a percentage of the order value (e.g., '5' for 5%)? (Type '0' or 'none' if no storage cost)",
        intent_context: { 
          intent: "inventory", 
          decision_type: "inventory_purchase",
          current_payload: currentPayload 
        },
        canBeZeroOrNone: true,
      }
    };
    }
  }
  // --- End Data Gathering Sequence ---

  // --- Final Validation before Rule Evaluation ---
  // After all data collection, ensure critical fields are valid numbers (not 0 if they shouldn't be)
  if (estimatedInventoryCost <= 0 || inventoryTurnoverDays <= 0 ||
      (isFmcgVendor && (supplierCreditTermsDays <= 0 || averageReceivablesTurnoverDays <= 0))) {
    throw new CustomError(
      ERROR_CODES.MISSING_REQUIRED_FIELD,
      "Critical inventory data is missing or invalid after collection. Please restart the conversation.",
      SEVERITY.HIGH,
      500
    );
  }

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
    if (isFmcgVendor && supplierCreditTermsDays > 0 && averageReceivablesTurnoverDays > 0) { // Ensure these are valid numbers
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
    if (supplierDiscountPercentage > 0 && storageCostPercentageOfOrder >= 0) { // Ensure these are valid numbers
      if (supplierDiscountPercentage >= 15 && storageCostPercentageOfOrder <= 5) {
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

  return {
    decision: {
      recommendation,
      reasoning,
      actionable_steps,
      financial_snapshot: financialData,
      estimated_inventory_cost: estimatedInventoryCost,
      inventory_turnover_days: inventoryTurnoverDays,
      supplier_credit_terms_days: supplierCreditTermsDays > 0 ? supplierCreditTermsDays : null, // Store as null if 0 or not applicable
      average_receivables_turnover_days: averageReceivablesTurnoverDays > 0 ? averageReceivablesTurnoverDays : null, // Store as null if 0 or not applicable
      outstanding_supplier_debts: outstandingSupplierDebts,
      supplier_discount_percentage: supplierDiscountPercentage > 0 ? supplierDiscountPercentage : null, // Store as null if 0 or not applicable
      storage_cost_percentage_of_order: storageCostPercentageOfOrder >= 0 ? storageCostPercentageOfOrder : null, // Store as null if 0 or not applicable
    }
  };
}

// --- decisions/equipment.ts content ---
export function makeEquipmentDecision(
  financialData: FinancialData,
  currentPayload: Record<string, any>,
  question: string,
  requestId: string,
): DecisionFunctionReturn {
  const { monthly_revenue, monthly_expenses, current_savings } = financialData;
  const net_income = monthly_revenue - monthly_expenses;
  const profit_margin = monthly_revenue > 0 ? (net_income / monthly_revenue) * 100 : 0;
  const savings_buffer_months = monthly_expenses > 0 ? current_savings / monthly_expenses : Infinity;

  let estimatedEquipmentCost = getNumberOrDefault(currentPayload.estimated_equipment_cost);
  let expectedRevenueIncreaseMonthly = getNumberOrDefault(currentPayload.expected_revenue_increase_monthly);
  let expectedExpenseDecreaseMonthly = getNumberOrDefault(currentPayload.expected_expense_decrease_monthly);
  let equipmentLifespanMonths = getNumberOrDefault(currentPayload.equipment_lifespan_months);
  let isCriticalReplacement = currentPayload.is_critical_replacement;
  let isPowerSolution = currentPayload.is_power_solution; 
  let currentEnergyCostMonthly = getNumberOrDefault(currentPayload.current_energy_cost_monthly);
  let hasDiversifiedRevenueStreams = currentPayload.has_diversified_revenue_streams; 
  let existingDebtLoadMonthlyRepayments = getNumberOrDefault(currentPayload.existing_debt_load_monthly_repayments);
  let financingRequired = currentPayload.financing_required;
  let financingInterestRateAnnualPercentage = getNumberOrDefault(currentPayload.financing_interest_rate_annual_percentage);
  let financingTermMonths = getNumberOrDefault(currentPayload.financing_term_months);

  let recommendation: 'APPROVE' | 'WAIT' | 'REJECT';
  let reasoning: string;
  let actionable_steps: string[] = [];
  const reasons: string[] = [];
  let rejectConditionsMet = 0;
  let approveConditionsMet = 0;

  // --- Data Gathering Sequence for Equipment ---

  // Infer is_power_solution if not explicitly set
  if (isPowerSolution === undefined || isPowerSolution === null) {
    if (question.toLowerCase().includes('generator') || question.toLowerCase().includes('solar') || question.toLowerCase().includes('inverter') || question.toLowerCase().includes('power')) {
      currentPayload.is_power_solution = true;
      isPowerSolution = true;
    } else {
      currentPayload.is_power_solution = false;
      isPowerSolution = false;
    }
  }

  if (estimatedEquipmentCost <= 0) {
    return {
      decision: null,
      dataNeeded: {
        field: "estimated_equipment_cost",
        prompt: "What is the estimated cost of the equipment (in ₦)? (Must be greater than 0)",
        intent_context: { intent: "equipment", decision_type: "equipment_purchase", current_payload: currentPayload },
        canBeZeroOrNone: false,
      }
    };
  }

  if (isCriticalReplacement === undefined || isCriticalReplacement === null) {
    return {
      decision: null,
      dataNeeded: {
        field: "is_critical_replacement",
        prompt: "Is this equipment a critical replacement for something broken that currently stops or severely impedes core business operations? (true/false)",
        intent_context: { intent: "equipment", decision_type: "equipment_purchase", current_payload: currentPayload },
        canBeZeroOrNone: false, // Must be true/false
      }
    };
  }

  if (currentPayload.expected_revenue_increase_monthly === undefined || currentPayload.expected_revenue_increase_monthly === null) {
    return {
      decision: null,
      dataNeeded: {
        field: "expected_revenue_increase_monthly",
        prompt: "How much do you expect this equipment to increase your monthly revenue (in ₦)? (Type '0' if no increase)",
        intent_context: { intent: "equipment", decision_type: "equipment_purchase", current_payload: currentPayload },
        canBeZeroOrNone: true,
      }
    };
  }

  if (currentPayload.expected_expense_decrease_monthly === undefined || currentPayload.expected_expense_decrease_monthly === null) {
    return {
      decision: null,
      dataNeeded: {
        field: "expected_expense_decrease_monthly",
        prompt: "How much do you expect this equipment to decrease your monthly expenses (in ₦)? (Type '0' if no decrease)",
        intent_context: { intent: "equipment", decision_type: "equipment_purchase", current_payload: currentPayload },
        canBeZeroOrNone: true,
      }
    };
  }

  if (currentPayload.existing_debt_load_monthly_repayments === undefined || currentPayload.existing_debt_load_monthly_repayments === null) {
    return {
      decision: null,
      dataNeeded: {
        field: "existing_debt_load_monthly_repayments",
        prompt: "What are your total monthly repayments for existing business loans or significant debts (in ₦)? (Type '0' if none)",
        intent_context: { intent: "equipment", decision_type: "equipment_purchase", current_payload: currentPayload },
        canBeZeroOrNone: true,
      }
    };
  }

  // Conditional prompt for current_energy_cost_monthly if it's a power solution
  if (isPowerSolution && (currentPayload.current_energy_cost_monthly === undefined || currentPayload.current_energy_cost_monthly === null)) {
    return {
      decision: null,
      dataNeeded: {
        field: "current_energy_cost_monthly",
        prompt: "What is your current average monthly energy cost (in ₦)? (Type '0' if none)",
        intent_context: { intent: "equipment", decision_type: "equipment_purchase", current_payload: currentPayload },
        canBeZeroOrNone: true,
      }
    };
  }

  // Conditional prompt for has_diversified_revenue_streams if estimated_equipment_cost is high
  if (estimatedEquipmentCost > 1000000 && (hasDiversifiedRevenueStreams === undefined || hasDiversifiedRevenueStreams === null)) {
    return {
      decision: null,
      dataNeeded: {
        field: "has_diversified_revenue_streams",
        prompt: "Does your business have at least two distinct, significant revenue streams? (true/false)",
        intent_context: { intent: "equipment", decision_type: "equipment_purchase", current_payload: currentPayload },
        canBeZeroOrNone: false, // Must be true/false
      }
    };
  } else if (hasDiversifiedRevenueStreams === undefined) {
    // Default to false if not capital intensive and not explicitly set
    currentPayload.has_diversified_revenue_streams = false; // Ensure payload is updated
    hasDiversifiedRevenueStreams = false;
  }

  // Conditional prompt for financing_required if estimated_equipment_cost is high relative to savings
  if (estimatedEquipmentCost > (0.5 * current_savings) && (financingRequired === undefined || financingRequired === null)) {
    return {
      decision: null,
      dataNeeded: {
        field: "financing_required",
        prompt: "Will you need external financing (e.g., a loan) for this purchase? (true/false)",
        intent_context: { intent: "equipment", decision_type: "equipment_purchase", current_payload: currentPayload },
        canBeZeroOrNone: false, // Must be true/false
      }
    };
  } else if (financingRequired === undefined) {
    // Default to false if not high relative to savings and not explicitly set
    currentPayload.financing_required = false; // Ensure payload is updated
    financingRequired = false;
  }

  // Conditional prompts for financing details if financing_required is true
  if (financingRequired) {
    if (currentPayload.financing_interest_rate_annual_percentage === undefined || currentPayload.financing_interest_rate_annual_percentage === null) {
      return {
        decision: null,
      dataNeeded: {
        field: "financing_interest_rate_annual_percentage",
        prompt: "What is the estimated annual interest rate (%) for the financing? (Type '0' if interest-free)",
        intent_context: { intent: "equipment", decision_type: "equipment_purchase", current_payload: currentPayload },
        canBeZeroOrNone: true,
      }
    };
    }
    if (financingTermMonths <= 0) {
      return {
        decision: null,
      dataNeeded: {
        field: "financing_term_months",
        prompt: "What is the estimated loan term in months for the financing? (Must be greater than 0)",
        intent_context: { intent: "equipment", decision_type: "equipment_purchase", current_payload: currentPayload },
        canBeZeroOrNone: false,
      }
    };
    }
  }

  // --- Explicitly set conditional optional fields to null if not collected or not applicable ---
  // This ensures that the final decision object always has these properties,
  // with null if they were not applicable or not prompted for.

  // If not a power solution, energy cost should be null
  if (!isPowerSolution) {
    currentEnergyCostMonthly = null;
  }

  // If not capital intensive, diversified revenue streams should be null
  if (estimatedEquipmentCost <= 1000000) {
    hasDiversifiedRevenueStreams = null;
  }

  // If financing is not required, financing details should be null
  if (!financingRequired) {
    financingInterestRateAnnualPercentage = null;
    financingTermMonths = null;
  }

  // equipmentLifespanMonths is never prompted, so ensure it's null if 0 (meaning not provided)
  if (equipmentLifespanMonths === 0) {
    equipmentLifespanMonths = null;
  }
  // --- End explicit null setting ---


  // --- Final Validation before Rule Evaluation ---
  // Re-check after explicit null setting, ensuring critical fields have valid values.
  if (estimatedEquipmentCost <= 0) {
    throw new InputValidationError(
      "Estimated equipment cost must be a positive number.",
      "The estimated equipment cost must be greater than 0."
    );
  }
  if (isCriticalReplacement === undefined || isCriticalReplacement === null) {
    throw new InputValidationError(
      "Critical replacement status is required.",
      "Please specify if this is a critical replacement (true/false)."
    );
  }
  // If capital intensive, diversified revenue streams must be explicitly true/false or null if not applicable
  if (estimatedEquipmentCost > 1000000 && (hasDiversifiedRevenueStreams === undefined || hasDiversifiedRevenueStreams === null)) {
    throw new InputValidationError(
      "Diversified revenue streams status is required for large investments.",
      "Please specify if your business has diversified revenue streams (true/false)."
    );
  }
  // If financing is required, term must be positive
  if (financingRequired && (financingTermMonths === null || financingTermMonths <= 0)) {
    throw new InputValidationError(
      "Financing term is required and must be a positive number if financing is needed.",
      "Please provide a valid financing term in months (greater than 0)."
    );
  }

  // Type assertion after validation and explicit null setting
  const finalEstimatedEquipmentCost = estimatedEquipmentCost!;
  const finalExpectedRevenueIncreaseMonthly = expectedRevenueIncreaseMonthly!;
  const finalExpectedExpenseDecreaseMonthly = expectedExpenseDecreaseMonthly!;
  const finalIsCriticalReplacement = isCriticalReplacement!;
  const finalIsPowerSolution = isPowerSolution!;
  const finalHasDiversifiedRevenueStreams = hasDiversifiedRevenueStreams; // Can be boolean or null
  const finalExistingDebtLoadMonthlyRepayments = existingDebtLoadMonthlyRepayments!;
  const finalFinancingRequired = financingRequired!;
  
  // Ensure optional fields are explicitly null if not provided or not applicable
  const finalCurrentEnergyCostMonthly = currentEnergyCostMonthly;
  const finalEquipmentLifespanMonths = equipmentLifespanMonths;
  const finalFinancingInterestRateAnnualPercentage = financingInterestRateAnnualPercentage;
  const finalFinancingTermMonths = financingTermMonths;

  const monthly_profit_increase = finalExpectedRevenueIncreaseMonthly + finalExpectedExpenseDecreaseMonthly;
  const payback_months = monthly_profit_increase > 0 ? finalEstimatedEquipmentCost / monthly_profit_increase : Infinity;
  const productivity_gain_percentage = net_income > 0 ? (monthly_profit_increase / net_income) * 100 : 0;
  const energy_cost_percentage_of_expenses = monthly_expenses > 0 && finalCurrentEnergyCostMonthly !== null ? (finalCurrentEnergyCostMonthly / monthly_expenses) * 100 : 0;

  // --- A. Immediate REJECT Conditions (Highest Priority) ---
  // Rule 3: Capital-Intensive & Undiversified (Refined)
  if (finalEstimatedEquipmentCost > 1000000 && finalHasDiversifiedRevenueStreams === false && !finalIsCriticalReplacement) {
    rejectConditionsMet++;
    reasons.push(`Investing over ₦1,000,000 without diversified revenue streams is too risky, as it concentrates your business's financial exposure and could jeopardize stability if one stream falters.`);
    actionable_steps.push("Focus on developing at least one additional significant and stable revenue stream before considering such a large, non-critical investment.");
  }

  // Severe Negative Net Income (Non-Critical)
  if (net_income < 0 && !finalIsCriticalReplacement) {
    rejectConditionsMet++;
    reasons.push(`Your business is currently unprofitable (Net Income: ₦${net_income.toLocaleString()}). Adding new costs for non-critical equipment would worsen your financial situation.`);
    actionable_steps.push("Prioritize increasing revenue and aggressively cutting non-essential expenses to achieve consistent profitability before any new investments.");
  }

  // Overwhelming Existing Debt (Non-Critical)
  if (finalExistingDebtLoadMonthlyRepayments > (0.30 * monthly_revenue) && !finalIsCriticalReplacement) {
    rejectConditionsMet++;
    reasons.push(`Your existing debt burden (₦${finalExistingDebtLoadMonthlyRepayments.toLocaleString()} monthly) is already high, exceeding 30% of your monthly revenue. Taking on more debt for non-critical equipment could lead to severe cash flow problems.`);
    actionable_steps.push("Focus on significantly reducing your current debt load to improve financial stability and free up cash flow for future investments.");
  }

  if (rejectConditionsMet > 0) {
    recommendation = 'REJECT';
    reasoning = `Based on critical financial indicators, this investment is currently too risky for your business. ${reasons.join(' ')}`;
  } else {
    // --- B. Strong APPROVE Conditions ---
    // Critical Replacement Override
    if (finalIsCriticalReplacement && (current_savings >= finalEstimatedEquipmentCost || (current_savings + net_income * 2) >= finalEstimatedEquipmentCost)) {
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
    if (finalEstimatedEquipmentCost <= 200000 && profit_margin >= 15 && savings_buffer_months >= 2) {
      approveConditionsMet++;
      reasons.push(`This small investment (₦${finalEstimatedEquipmentCost.toLocaleString()}) is well within your business's capacity, given your healthy profit margins (${profit_margin.toFixed(1)}%) and strong savings buffer (${savings_buffer_months.toFixed(1)} months).`);
      actionable_steps.push("Ensure the equipment aligns with your long-term business goals.", "Consider potential maintenance costs.");
    }

    // Additional Case: Prioritized Power Solution (Nigerian Context)
    if (finalIsPowerSolution && finalCurrentEnergyCostMonthly !== null && energy_cost_percentage_of_expenses > 15) {
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
      if (finalExistingDebtLoadMonthlyRepayments > (0.15 * monthly_revenue) && finalExistingDebtLoadMonthlyRepayments <= (0.30 * monthly_revenue)) {
        reasons.push(`Your existing debt load (₦${finalExistingDebtLoadMonthlyRepayments.toLocaleString()} monthly) is moderate. Adding more debt might strain your cash flow.`);
        actionable_steps.push("Consider reducing existing debts or exploring financing options with more favorable terms.");
      }
      if (finalFinancingRequired && finalFinancingInterestRateAnnualPercentage !== null && finalFinancingInterestRateAnnualPercentage > 25) {
        reasons.push(`The estimated annual interest rate for financing (${finalFinancingInterestRateAnnualPercentage}%) is quite high, significantly increasing the total cost of the equipment.`);
        actionable_steps.push("Seek alternative financing options with lower interest rates or consider delaying the purchase until better terms are available.");
      }
      if (finalFinancingRequired && finalFinancingTermMonths !== null && finalFinancingTermMonths > 36) { // Example: long term for small business
        reasons.push(`A long financing term of ${finalFinancingTermMonths} months could tie up your cash flow for an extended period.`);
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

  // Log the final decision before returning
  console.log(`[${requestId}] Final Equipment Decision:`, {
    recommendation,
    reasoning,
    actionable_steps,
    financial_snapshot: financialData,
    estimated_equipment_cost: finalEstimatedEquipmentCost,
    expected_revenue_increase_monthly: finalExpectedRevenueIncreaseMonthly,
    expected_expense_decrease_monthly: finalExpectedExpenseDecreaseMonthly,
    equipment_lifespan_months: finalEquipmentLifespanMonths,
    is_critical_replacement: finalIsCriticalReplacement,
    is_power_solution: finalIsPowerSolution,
    current_energy_cost_monthly: finalCurrentEnergyCostMonthly,
    has_diversified_revenue_streams: finalHasDiversifiedRevenueStreams,
    existing_debt_load_monthly_repayments: finalExistingDebtLoadMonthlyRepayments,
    financing_required: finalFinancingRequired,
    financing_interest_rate_annual_percentage: finalFinancingInterestRateAnnualPercentage,
    financing_term_months: finalFinancingTermMonths,
  });

  return {
    decision: {
      recommendation,
      reasoning,
      actionable_steps,
      financial_snapshot: financialData,
      estimated_equipment_cost: finalEstimatedEquipmentCost,
      expected_revenue_increase_monthly: finalExpectedRevenueIncreaseMonthly,
      expected_expense_decrease_monthly: finalExpectedExpenseDecreaseMonthly,
      equipment_lifespan_months: finalEquipmentLifespanMonths,
      is_critical_replacement: finalIsCriticalReplacement,
      is_power_solution: finalIsPowerSolution,
      current_energy_cost_monthly: finalCurrentEnergyCostMonthly,
      has_diversified_revenue_streams: finalHasDiversifiedRevenueStreams,
      existing_debt_load_monthly_repayments: finalExistingDebtLoadMonthlyRepayments,
      financing_required: finalFinancingRequired,
      financing_interest_rate_annual_percentage: finalFinancingInterestRateAnnualPercentage,
      financing_term_months: finalFinancingTermMonths,
    }
  };
}

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
      estimated_salary: decision.estimated_salary ?? null,
      estimated_inventory_cost: decision.estimated_inventory_cost ?? null,
      inventory_turnover_days: decision.inventory_turnover_days ?? null,
      supplier_credit_terms_days: decision.supplier_credit_terms_days ?? null,
      average_receivables_turnover_days: decision.average_receivables_turnover_days ?? null,
      outstanding_supplier_debts: decision.outstanding_supplier_debts ?? null,
      supplier_discount_percentage: decision.supplier_discount_percentage ?? null,
      storage_cost_percentage_of_order: decision.storage_cost_percentage_of_order ?? null,
      estimated_equipment_cost: decision.estimated_equipment_cost ?? null,
      expected_revenue_increase_monthly: decision.expected_revenue_increase_monthly ?? null,
      expected_expense_decrease_monthly: decision.expected_expense_decrease_monthly ?? null,
      equipment_lifespan_months: decision.equipment_lifespan_months ?? null,
      is_critical_replacement: decision.is_critical_replacement ?? null,
      is_power_solution: decision.is_power_solution ?? null,
      current_energy_cost_monthly: decision.current_energy_cost_monthly ?? null,
      has_diversified_revenue_streams: decision.has_diversified_revenue_streams ?? null,
      existing_debt_load_monthly_repayments: decision.existing_debt_load_monthly_repayments ?? null,
      financing_required: decision.financing_required ?? null,
      financing_interest_rate_annual_percentage: decision.financing_interest_rate_annual_percentage ?? null,
      financing_term_months: decision.financing_term_months ?? null,
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
    console.error(`[${requestId}] RAW ERROR CAUGHT IN MAIN HANDLER:`, error); // Added this line
    return handleError(error, requestId, user ? user.id : null, supabase, req.body);
  }
});