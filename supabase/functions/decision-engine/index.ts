// supabase/functions/decision-engine/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { v4 as uuidv4 } from "https://esm.sh/uuid@9.0.1";
import { z } from "https://deno.land/x/zod@v3.23.0/mod.ts";

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
    'marketing', // Added new intent
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
    // Fields for marketing & customer growth
    proposed_marketing_budget: z.number().min(0).optional(),
    is_localized_promotion: z.boolean().optional(),
    historic_foot_traffic_increase_observed: z.boolean().optional(),
    sales_increase_last_campaign_1: z.number().min(0).optional(),
    sales_increase_last_campaign_2: z.number().min(0).optional(),
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
  // New fields for marketing & customer growth
  proposed_marketing_budget?: number | null;
  is_localized_promotion?: boolean | null;
  historic_foot_traffic_increase_observed?: boolean | null;
  sales_increase_last_campaign_1?: number | null;
  sales_increase_last_campaign_2?: number | null;
};

// Define a type for the data needed response
export type DataNeededResponse = {
  field: string;
  prompt: string;
  type: 'number' | 'boolean'; // Added type field
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
const getBooleanOrDefault = (value: boolean | null | undefined): boolean => value ?? false;


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
        type: 'number', // Specify type
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
  console.log(`[${requestId}] makeInventoryDecision: Start. currentPayload:`, currentPayload);

  let estimatedInventoryCost: number | null = currentPayload.hasOwnProperty('estimated_inventory_cost') ? currentPayload.estimated_inventory_cost : null;
  let inventoryTurnoverDays: number | null = currentPayload.hasOwnProperty('inventory_turnover_days') ? currentPayload.inventory_turnover_days : null;
  let outstandingSupplierDebts: number | null = currentPayload.hasOwnProperty('outstanding_supplier_debts') ? currentPayload.outstanding_supplier_debts : null;
  let supplierCreditTermsDays: number | null = currentPayload.hasOwnProperty('supplier_credit_terms_days') ? currentPayload.supplier_credit_terms_days : null;
  let averageReceivablesTurnoverDays: number | null = currentPayload.hasOwnProperty('average_receivables_turnover_days') ? currentPayload.average_receivables_turnover_days : null;
  let supplierDiscountPercentage: number | null = currentPayload.hasOwnProperty('supplier_discount_percentage') ? currentPayload.supplier_discount_percentage : null;
  let storageCostPercentageOfOrder: number | null = currentPayload.hasOwnProperty('storage_cost_percentage_of_order') ? currentPayload.storage_cost_percentage_of_order : null;

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
  if (estimatedInventoryCost === null || estimatedInventoryCost <= 0) {
    return {
      decision: null,
      dataNeeded: {
        field: "estimated_inventory_cost",
        prompt: "What is the estimated cost of the new inventory you want to purchase (in ₦)? (Must be greater than 0)",
        type: 'number', // Specify type
        intent_context: { 
          intent: "inventory", 
          decision_type: "inventory_purchase",
          current_payload: currentPayload 
        },
        canBeZeroOrNone: false,
      }
    };
  }
  if (inventoryTurnoverDays === null || inventoryTurnoverDays <= 0) {
    return {
      decision: null,
      dataNeeded: {
        field: "inventory_turnover_days",
        prompt: "What is your average inventory turnover in days (how long it takes to sell all your stock)? (Must be greater than 0)",
        type: 'number', // Specify type
        intent_context: { 
          intent: "inventory", 
          decision_type: "inventory_purchase",
          current_payload: currentPayload 
        },
        canBeZeroOrNone: false,
      }
    };
  }
  if (outstandingSupplierDebts === null) { // Check against null
    return {
      decision: null,
      dataNeeded: {
        field: "outstanding_supplier_debts",
        prompt: "What is your total outstanding debt to suppliers (in ₦)? (Type '0' if none)",
        type: 'number', // Specify type
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
    if (supplierCreditTermsDays === null || supplierCreditTermsDays <= 0) {
      return {
        decision: null,
      dataNeeded: {
        field: "supplier_credit_terms_days",
        prompt: "What are your supplier's credit terms in days (how long do you have to pay)? (Must be greater than 0)",
        type: 'number', // Specify type
        intent_context: { 
          intent: "inventory", 
          decision_type: "inventory_purchase",
          current_payload: currentPayload 
        },
        canBeZeroOrNone: false,
      }
    };
    }
    if (averageReceivablesTurnoverDays === null || averageReceivablesTurnoverDays <= 0) {
      return {
        decision: null,
      dataNeeded: {
        field: "average_receivables_turnover_days",
        prompt: "What is your average receivables turnover in days (how long customers take to pay you)? (Must be greater than 0)",
        type: 'number', // Specify type
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
  if (supplierDiscountPercentage !== null && supplierDiscountPercentage > 0) { // Only ask for storage cost if there's a discount
    if (storageCostPercentageOfOrder === null) {
      return {
        decision: null,
      dataNeeded: {
        field: "storage_cost_percentage_of_order",
        prompt: "What is the estimated storage cost for this bulk order as a percentage of the order value (e.g., '5' for 5%)? (Type '0' or 'none' if no storage cost)",
        type: 'number', // Specify type
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
  console.log(`[${requestId}] makeInventoryDecision: After Data Gathering. currentPayload:`, currentPayload);

  // --- Final Validation before Rule Evaluation ---
  // After all data collection, ensure critical fields are valid numbers (not 0 if they shouldn't be)
  if (estimatedInventoryCost === null || estimatedInventoryCost <= 0) {
    throw new InputValidationError(
      "Estimated inventory cost must be a positive number.",
      "The estimated inventory cost must be greater than 0."
    );
  }
  if (inventoryTurnoverDays === null || inventoryTurnoverDays <= 0) {
    throw new InputValidationError(
      "Inventory turnover days must be a positive number.",
      "The inventory turnover days must be greater than 0."
    );
  }
  if (isFmcgVendor && (supplierCreditTermsDays === null || supplierCreditTermsDays <= 0)) {
    throw new InputValidationError(
      "Supplier credit terms must be a positive number for FMCG vendors.",
      "The supplier credit terms must be greater than 0."
    );
  }
  if (isFmcgVendor && (averageReceivablesTurnoverDays === null || averageReceivablesTurnoverDays <= 0)) {
    throw new InputValidationError(
      "Average receivables turnover days must be a positive number for FMCG vendors.",
      "The average receivables turnover days must be greater than 0."
    );
  }
  console.log(`[${requestId}] makeInventoryDecision: After Final Validation.`);

  // --- Rule Evaluation ---
  // Use getNumberOrDefault for calculations where 0 is a valid input
  const finalEstimatedInventoryCost = estimatedInventoryCost;
  const finalInventoryTurnoverDays = inventoryTurnoverDays;
  const finalOutstandingSupplierDebts = getNumberOrDefault(outstandingSupplierDebts);
  const finalSupplierCreditTermsDays = getNumberOrDefault(supplierCreditTermsDays);
  const finalAverageReceivablesTurnoverDays = getNumberOrDefault(averageReceivablesTurnoverDays);
  const finalSupplierDiscountPercentage = getNumberOrDefault(supplierDiscountPercentage);
  const finalStorageCostPercentageOfOrder = getNumberOrDefault(storageCostPercentageOfOrder);


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
    if (isFmcgVendor && finalSupplierCreditTermsDays > 0 && finalAverageReceivablesTurnoverDays > 0) { // Ensure these are valid numbers
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
    if (finalSupplierDiscountPercentage > 0 && finalStorageCostPercentageOfOrder >= 0) { // Ensure these are valid numbers
      if (finalSupplierDiscountPercentage >= 15 && finalStorageCostPercentageOfOrder <= 5) {
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

  console.log(`[${requestId}] makeInventoryDecision: Before final decision return. Recommendation: ${recommendation}`);

  return {
    decision: {
      recommendation,
      reasoning,
      actionable_steps,
      financial_snapshot: financialData,
      estimated_inventory_cost: finalEstimatedInventoryCost,
      inventory_turnover_days: finalInventoryTurnoverDays,
      supplier_credit_terms_days: supplierCreditTermsDays, 
      average_receivables_turnover_days: averageReceivablesTurnoverDays, 
      outstanding_supplier_debts: outstandingSupplierDebts,
      supplier_discount_percentage: supplierDiscountPercentage, 
      storage_cost_percentage_of_order: storageCostPercentageOfOrder, 
    }
  };
}

// --- decisions/marketing.ts content ---
export function makeMarketingDecision(
  financialData: FinancialData,
  currentPayload: Record<string, any>,
  question: string,
  requestId: string,
): DecisionFunctionReturn {
  console.log(`[${requestId}] makeMarketingDecision: Start. currentPayload:`, currentPayload);

  let proposedMarketingBudget: number | null = currentPayload.hasOwnProperty('proposed_marketing_budget') ? currentPayload.proposed_marketing_budget : null;
  let salesIncreaseLastCampaign1: number | null = currentPayload.hasOwnProperty('sales_increase_last_campaign_1') ? currentPayload.sales_increase_last_campaign_1 : null;
  let salesIncreaseLastCampaign2: number | null = currentPayload.hasOwnProperty('sales_increase_last_campaign_2') ? currentPayload.sales_increase_last_campaign_2 : null;
  let isLocalizedPromotion: boolean | null = currentPayload.hasOwnProperty('is_localized_promotion') ? currentPayload.is_localized_promotion : null;
  let historicFootTrafficIncreaseObserved: boolean | null = currentPayload.hasOwnProperty('historic_foot_traffic_increase_observed') ? currentPayload.historic_foot_traffic_increase_observed : null;

  const { monthly_revenue, monthly_expenses, current_savings } = financialData;
  const net_income = monthly_revenue - monthly_expenses;
  const profit_margin = monthly_revenue > 0 ? (net_income / monthly_revenue) : 0;

  const reasons = [];
  let recommendation: 'APPROVE' | 'WAIT' | 'REJECT';
  let reasoning: string;
  let actionable_steps: string[] = [];

  // --- Data Gathering Sequence for Marketing ---
  // Numerical data first
  if (proposedMarketingBudget === null || proposedMarketingBudget < 0) { // Allow 0 for budget
    return {
      decision: null,
      dataNeeded: {
        field: "proposed_marketing_budget",
        prompt: "What is your proposed marketing budget for this initiative (in ₦)? (Type '0' if you don't have a specific budget yet)",
        type: 'number',
        intent_context: {
          intent: "marketing",
          decision_type: "marketing_growth",
          current_payload: currentPayload
        },
        canBeZeroOrNone: true,
      }
    };
  }

  // Check if the question implies scaling or past campaigns
  const lowerCaseQuestion = question.toLowerCase();
  const impliesScaling = lowerCaseQuestion.includes('scale') || lowerCaseQuestion.includes('expand campaign') || lowerCaseQuestion.includes('more marketing');

  if (impliesScaling) {
    if (salesIncreaseLastCampaign1 === null || salesIncreaseLastCampaign1 < 0) { // Allow 0 for sales increase
      return {
        decision: null,
        dataNeeded: {
          field: "sales_increase_last_campaign_1",
          prompt: "What was the percentage increase in sales from your last marketing campaign? (e.g., '10' for 10%. Type '0' if no increase or no campaign)",
          type: 'number',
          intent_context: {
            intent: "marketing",
            decision_type: "marketing_growth",
            current_payload: currentPayload
          },
          canBeZeroOrNone: true,
        }
      };
    }
    if (salesIncreaseLastCampaign2 === null || salesIncreaseLastCampaign2 < 0) { // Allow 0 for sales increase
      return {
        decision: null,
        dataNeeded: {
          field: "sales_increase_last_campaign_2",
          prompt: "What was the percentage increase in sales from your second-to-last marketing campaign? (e.g., '10' for 10%. Type '0' if no increase or no campaign)",
          type: 'number',
          intent_context: {
            intent: "marketing",
            decision_type: "marketing_growth",
            current_payload: currentPayload
          },
          canBeZeroOrNone: true,
        }
      };
    }
  }

  // Boolean data next
  if (isLocalizedPromotion === null) {
    return {
      decision: null,
      dataNeeded: {
        field: "is_localized_promotion",
        prompt: "Is this marketing initiative for a localized promotion (e.g., market-day event, local flyer distribution)?",
        type: 'boolean',
        intent_context: {
          intent: "marketing",
          decision_type: "marketing_growth",
          current_payload: currentPayload
        },
        canBeZeroOrNone: false, // Boolean, so not applicable
      }
    };
  }

  if (isLocalizedPromotion) { // Only ask if it's a localized promotion
    if (historicFootTrafficIncreaseObserved === null) {
      return {
        decision: null,
        dataNeeded: {
          field: "historic_foot_traffic_increase_observed",
          prompt: "Have you observed historic foot traffic increases from similar localized promotions?",
          type: 'boolean',
          intent_context: {
            intent: "marketing",
            decision_type: "marketing_growth",
            current_payload: currentPayload
          },
          canBeZeroOrNone: false, // Boolean, so not applicable
        }
      };
    }
  }
  console.log(`[${requestId}] makeMarketingDecision: After Data Gathering. currentPayload:`, currentPayload);

  // --- Final Validation before Rule Evaluation ---
  const finalProposedMarketingBudget = getNumberOrDefault(proposedMarketingBudget);
  const finalSalesIncreaseLastCampaign1 = getNumberOrDefault(salesIncreaseLastCampaign1);
  const finalSalesIncreaseLastCampaign2 = getNumberOrDefault(salesIncreaseLastCampaign2);
  const finalIsLocalizedPromotion = getBooleanOrDefault(isLocalizedPromotion);
  const finalHistoricFootTrafficIncreaseObserved = getBooleanOrDefault(historicFootTrafficIncreaseObserved);

  // --- Rule Evaluation ---

  // Rule 3: Block if debt ratio > 0.4 or if cash buffer < 2 months. (Highest priority - REJECT)
  const debtRatio = monthly_revenue > 0 ? (getNumberOrDefault(currentPayload.outstanding_supplier_debts) / monthly_revenue) : 0;
  const cashBufferMonths = monthly_expenses > 0 ? (current_savings / monthly_expenses) : 0;

  if (debtRatio > 0.4) {
    reasons.push(`Your debt ratio (${(debtRatio * 100).toFixed(1)}%) is high (above 40% of monthly revenue).`);
    recommendation = 'REJECT';
  } else if (cashBufferMonths < 2) {
    reasons.push(`Your cash buffer (${cashBufferMonths.toFixed(1)} months) is less than 2 months of expenses.`);
    recommendation = 'REJECT';
  }

  if (recommendation === 'REJECT') {
    reasoning = `Investing in marketing now would be too risky. Key reasons: ${reasons.join(' ')}.`;
    actionable_steps = [
      'Prioritize reducing outstanding debts.',
      'Build your emergency savings to cover at least 2-3 months of expenses.',
      'Focus on improving core profitability before new investments.'
    ];
    return {
      decision: {
        recommendation,
        reasoning,
        actionable_steps,
        financial_snapshot: financialData,
        proposed_marketing_budget: finalProposedMarketingBudget,
        is_localized_promotion: finalIsLocalizedPromotion,
        historic_foot_traffic_increase_observed: finalHistoricFootTrafficIncreaseObserved,
        sales_increase_last_campaign_1: finalSalesIncreaseLastCampaign1,
        sales_increase_last_campaign_2: finalSalesIncreaseLastCampaign2,
      }
    };
  }

  // If not rejected, proceed with other rules
  let approveScore = 0;
  let waitScore = 0;

  // Additional Case: Approve localized promotions
  if (finalIsLocalizedPromotion && finalProposedMarketingBudget <= (0.05 * monthly_revenue) && finalHistoricFootTrafficIncreaseObserved) {
    approveScore++;
    reasons.push(`This is a localized promotion with a budget within 5% of revenue and historic success in increasing foot traffic.`);
    actionable_steps.push('Monitor foot traffic and sales closely during the promotion.', 'Gather customer feedback to refine future localized efforts.');
  } else if (finalIsLocalizedPromotion) {
    if (finalProposedMarketingBudget > (0.05 * monthly_revenue)) reasons.push(`The budget for this localized promotion (₦${finalProposedMarketingBudget.toLocaleString()}) exceeds 5% of your monthly revenue (₦${(0.05 * monthly_revenue).toLocaleString()}).`);
    if (!finalHistoricFootTrafficIncreaseObserved) reasons.push(`No historic foot traffic increase observed for similar localized promotions.`);
    waitScore++;
  }

  // Rule 2: Approve scaling if last 2 campaigns → ≥ 10% increase in sales.
  if (impliesScaling && finalSalesIncreaseLastCampaign1 >= 10 && finalSalesIncreaseLastCampaign2 >= 10) {
    approveScore++;
    reasons.push(`Your last two campaigns showed strong sales growth (Campaign 1: ${finalSalesIncreaseLastCampaign1}%, Campaign 2: ${finalSalesIncreaseLastCampaign2}%).`);
    actionable_steps.push('Analyze what made the previous campaigns successful and replicate those elements.', 'Consider A/B testing new marketing channels or messages.');
  } else if (impliesScaling) {
    if (finalSalesIncreaseLastCampaign1 < 10) reasons.push(`Sales increase from last campaign (${finalSalesIncreaseLastCampaign1}%) was less than 10%.`);
    if (finalSalesIncreaseLastCampaign2 < 10) reasons.push(`Sales increase from second-to-last campaign (${finalSalesIncreaseLastCampaign2}%) was less than 10%.`);
    waitScore++;
  }

  // Rule 1: Allocate ≤ 15% of revenue to marketing unless profit margin > 20%.
  const marketingBudgetPercentage = monthly_revenue > 0 ? (finalProposedMarketingBudget / monthly_revenue) : 0;
  if (marketingBudgetPercentage <= 0.15 || profit_margin > 0.20) {
    approveScore++;
    reasons.push(`Your proposed marketing budget is within 15% of revenue (${(marketingBudgetPercentage * 100).toFixed(1)}%) or your profit margin is healthy (${(profit_margin * 100).toFixed(1)}%).`);
  } else {
    reasons.push(`Your proposed marketing budget (${(marketingBudgetPercentage * 100).toFixed(1)}%) exceeds 15% of revenue and your profit margin (${(profit_margin * 100).toFixed(1)}%) is not yet above 20%.`);
    waitScore++;
  }

  // Determine final recommendation based on scores
  if (approveScore > 0 && waitScore === 0) {
    recommendation = 'APPROVE';
    reasoning = `Your business is in a good position to proceed with this marketing initiative. ${reasons.join(' ')}.`;
    actionable_steps.unshift('Define clear, measurable goals for your marketing campaign.', 'Track the return on investment (ROI) of your marketing spend.');
  } else {
    recommendation = 'WAIT';
    reasoning = `It's advisable to wait or re-evaluate your marketing plan. Key considerations: ${reasons.join(' ')}.`;
    actionable_steps.unshift('Refine your marketing strategy to target specific customer segments.', 'Explore lower-cost marketing tactics or partnerships.', 'Re-evaluate your budget and ensure it aligns with your current financial capacity.');
  }

  // Ensure actionable steps are unique and relevant
  actionable_steps = Array.from(new Set(actionable_steps));

  console.log(`[${requestId}] makeMarketingDecision: Before final decision return. Recommendation: ${recommendation}`);

  return {
    decision: {
      recommendation,
      reasoning,
      actionable_steps,
      financial_snapshot: financialData,
      proposed_marketing_budget: finalProposedMarketingBudget,
      is_localized_promotion: finalIsLocalizedPromotion,
      historic_foot_traffic_increase_observed: finalHistoricFootTrafficIncreaseObserved,
      sales_increase_last_campaign_1: finalSalesIncreaseLastCampaign1,
      sales_increase_last_campaign_2: finalSalesIncreaseLastCampaign2,
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
      case 'marketing': // New marketing decision
        decisionResult = makeMarketingDecision(financialData, currentPayload, question, requestId);
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
      // New marketing fields
      proposed_marketing_budget: decision.proposed_marketing_budget ?? null,
      is_localized_promotion: decision.is_localized_promotion ?? null,
      historic_foot_traffic_increase_observed: decision.historic_foot_traffic_increase_observed ?? null,
      sales_increase_last_campaign_1: decision.sales_increase_last_campaign_1 ?? null,
      sales_increase_last_campaign_2: decision.sales_increase_last_campaign_2 ?? null,
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