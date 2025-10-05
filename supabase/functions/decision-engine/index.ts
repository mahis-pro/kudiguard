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
  DECISION_UPDATE: "DECISION_UPDATE",
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
    'marketing',
    'savings', 
    'equipment',
    'loan_management',
    'business_expansion', // Added new intent: business_expansion
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
    // Fields for savings management
    is_volatile_industry: z.boolean().optional(),
    is_growth_stage: z.boolean().optional(),
    is_seasonal_windfall_month: z.boolean().optional(),
    debt_apr: z.number().min(0).optional(), // Annual Percentage Rate for debt
    consecutive_negative_cash_flow_months: z.number().min(0).optional(),
    current_reserve_allocation_percentage_emergency: z.number().min(0).max(100).optional(), // For Rule 4.1, 5.1
    current_reserve_allocation_percentage_growth: z.number().min(0).max(100).optional(), // For Rule 5.1
    // Fields for equipment purchase
    equipment_cost: z.number().min(0).optional(),
    estimated_roi_percentage: z.number().min(0).max(1000).optional(), // ROI can be high
    is_essential_replacement: z.boolean().optional(),
    current_equipment_utilization_percentage: z.number().min(0).max(100).optional(),
    // New fields for loan_management
    total_business_liabilities: z.number().min(0).optional(),
    total_business_assets: z.number().min(0).optional(),
    total_monthly_debt_repayments: z.number().min(0).optional(),
    loan_purpose_is_revenue_generating: z.boolean().optional(),
    // New fields for business_expansion
    profit_growth_consistent_6_months: z.boolean().optional(),
    market_research_validates_demand: z.boolean().optional(),
    capital_available_percentage_of_cost: z.number().min(0).max(100).optional(),
    expansion_cost: z.number().min(0).optional(),
    profit_margin_trend: z.enum(['consistent_growth', 'positive_fluctuating', 'declining_unstable']).optional(),
    revenue_growth_trend: z.enum(['consistent_growth', 'positive_fluctuating', 'declining_unstable']).optional(),
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
  business_type: string; // Added business_type for sector-specific adjustments
};

// Define a type for the decision result
export type DecisionResult = {
  recommendation: 'APPROVE' | 'WAIT' | 'REJECT';
  reasoning: string | string[]; // Changed to allow array of strings
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
  // New fields for savings management
  is_volatile_industry?: boolean | null;
  is_growth_stage?: boolean | null;
  is_seasonal_windfall_month?: boolean | null;
  debt_apr?: number | null;
  consecutive_negative_cash_flow_months?: number | null;
  current_reserve_allocation_percentage_emergency?: number | null;
  current_reserve_allocation_percentage_growth?: number | null;
  fixed_operating_expenses?: number | null; // Derived from monthly_expenses for savings rules
  net_profit?: number | null; // Derived for savings rules
  // New fields for equipment purchase
  equipment_cost?: number | null;
  estimated_roi_percentage?: number | null;
  is_essential_replacement?: boolean | null;
  current_equipment_utilization_percentage?: number | null;
  // New fields for loan_management
  total_business_liabilities?: number | null;
  total_business_assets?: number | null;
  total_monthly_debt_repayments?: number | null;
  loan_purpose_is_revenue_generating?: boolean | null;
  // New fields for business_expansion
  profit_growth_consistent_6_months?: boolean | null;
  market_research_validates_demand?: boolean | null;
  capital_available_percentage_of_cost?: number | null;
  expansion_cost?: number | null;
  profit_margin_trend?: 'consistent_growth' | 'positive_fluctuating' | 'declining_unstable' | null;
  revenue_growth_trend?: 'consistent_growth' | 'positive_fluctuating' | 'declining_unstable' | null;
};

// Define a type for the data needed response
export type DataNeededResponse = {
  field: string;
  prompt: string;
  type: 'number' | 'boolean' | 'text_enum'; // Added 'text_enum' type
  options?: string[]; // Added options for 'text_enum'
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
const getStringOrDefault = (value: string | null | undefined): string => value ?? '';


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
  
  const reasons: string[] = []; // Changed to string array
  let score = 0;
  let recommendation: 'APPROVE' | 'WAIT' | 'REJECT';
  let reasoning: string | string[]; // Changed to allow array of strings
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
    reasoning = reasons; // Return array of reasons
    actionable_steps = [
      'Focus on increasing revenue or decreasing non-essential costs to improve net income.',
      'Build your emergency savings to cover at least 1-3 months of expenses.',
      'Re-evaluate your hiring needs in 1-2 months.'
    ];
  } else {
    recommendation = 'REJECT';
    reasoning = reasons; // Return array of reasons
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
  
  const reasons: string[] = []; // Changed to string array
  let approveScore = 0;
  let waitScore = 0;
  let rejectScore = 0;
  let actionable_steps: string[] = [];
  let recommendation: 'APPROVE' | 'WAIT' | 'REJECT';
  let reasoning: string | string[]; // Changed to allow array of strings

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
    reasoning = reasons; // Return array of reasons
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
      reasoning = `Your business is in a strong position to restock. ${reasons.join(' ')}.`; // Keep as string for APPROVE
      actionable_steps.unshift('Confirm current market demand to avoid overstocking.', 'Negotiate best possible terms with suppliers.');
    } else {
      recommendation = 'WAIT';
      reasoning = reasons; // Return array of reasons
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

  const reasons: string[] = []; // Changed to string array
  let recommendation: 'APPROVE' | 'WAIT' | 'REJECT';
  let reasoning: string | string[]; // Changed to allow array of strings
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
    reasoning = reasons; // Return array of reasons
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
    reasoning = `Your business is in a good position to proceed with this marketing initiative. ${reasons.join(' ')}.`; // Keep as string for APPROVE
    actionable_steps.unshift('Define clear, measurable goals for your marketing campaign.', 'Track the return on investment (ROI) of your marketing spend.');
  } else {
    recommendation = 'WAIT';
    reasoning = reasons; // Return array of reasons
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

// --- decisions/savings.ts content ---
export function makeSavingsDecision(
  financialData: FinancialData,
  profileData: ProfileData,
  currentPayload: Record<string, any>,
  question: string,
  requestId: string,
): DecisionFunctionReturn {
  console.log(`[${requestId}] makeSavingsDecision: Start. currentPayload:`, currentPayload);

  let isVolatileIndustry: boolean | null = currentPayload.hasOwnProperty('is_volatile_industry') ? currentPayload.is_volatile_industry : null;
  let isGrowthStage: boolean | null = currentPayload.hasOwnProperty('is_growth_stage') ? currentPayload.is_growth_stage : null;
  let isSeasonalWindfallMonth: boolean | null = currentPayload.hasOwnProperty('is_seasonal_windfall_month') ? currentPayload.is_seasonal_windfall_month : null;
  let debtApr: number | null = currentPayload.hasOwnProperty('debt_apr') ? currentPayload.debt_apr : null;
  let outstandingSupplierDebts: number | null = currentPayload.hasOwnProperty('outstanding_supplier_debts') ? currentPayload.outstanding_supplier_debts : null;
  let consecutiveNegativeCashFlowMonths: number | null = currentPayload.hasOwnProperty('consecutive_negative_cash_flow_months') ? currentPayload.consecutive_negative_cash_flow_months : null;
  let currentReserveAllocationPercentageEmergency: number | null = currentPayload.hasOwnProperty('current_reserve_allocation_percentage_emergency') ? currentPayload.current_reserve_allocation_percentage_emergency : null;
  let currentReserveAllocationPercentageGrowth: number | null = currentPayload.hasOwnProperty('current_reserve_allocation_percentage_growth') ? currentPayload.current_reserve_allocation_percentage_growth : null;

  const { monthly_revenue, monthly_expenses, current_savings } = financialData;
  const net_profit = monthly_revenue - monthly_expenses;
  const profit_margin = monthly_revenue > 0 ? (net_profit / monthly_revenue) * 100 : 0;
  const fixed_operating_expenses = monthly_expenses; // Assuming all monthly_expenses are fixed for simplicity in this context

  console.log(`[${requestId}] makeSavingsDecision: Initial financial and profile data:`, { financialData, profileData });
  console.log(`[${requestId}] makeSavingsDecision: Derived financial metrics:`, { net_profit, profit_margin, fixed_operating_expenses });

  const reasons: string[] = []; // Use an array to collect reasons
  let recommendation: 'APPROVE' | 'WAIT' | 'REJECT' = 'APPROVE'; // Default to APPROVE
  let actionable_steps: string[] = [];

  // --- Data Gathering Sequence for Savings ---
  if (isVolatileIndustry === null) {
    return {
      decision: null,
      dataNeeded: {
        field: "is_volatile_industry",
        prompt: "Is your business in a volatile industry (e.g., agriculture, imports, event businesses)?",
        type: 'boolean',
        intent_context: {
          intent: "savings",
          decision_type: "savings_strategy",
          current_payload: currentPayload
        },
        canBeZeroOrNone: false,
      }
    };
  }
  if (isGrowthStage === null) {
    return {
      decision: null,
      dataNeeded: {
        field: "is_growth_stage",
        prompt: "Is your business currently in a growth stage (e.g., actively expanding, increasing market share)?",
        type: 'boolean',
        intent_context: {
          intent: "savings",
          decision_type: "savings_strategy",
          current_payload: currentPayload
        },
        canBeZeroOrNone: false,
      }
    };
  }
  if (isSeasonalWindfallMonth === null) {
    return {
      decision: null,
      dataNeeded: {
        field: "is_seasonal_windfall_month",
        prompt: "Is this month a seasonal windfall period for your business (e.g., festive sales, harvest period)?",
        type: 'boolean',
        intent_context: {
          intent: "savings",
          decision_type: "savings_strategy",
          current_payload: currentPayload
        },
        canBeZeroOrNone: false,
      }
    };
  }
  if (debtApr === null) {
    return {
      decision: null,
      dataNeeded: {
        field: "debt_apr",
        prompt: "What is the Annual Percentage Rate (APR) of your highest interest debt (e.g., '20' for 20%)? (Type '0' if no debt)",
        type: 'number',
        intent_context: {
          intent: "savings",
          decision_type: "savings_strategy",
          current_payload: currentPayload
        },
        canBeZeroOrNone: true,
      }
    };
  }
  if (outstandingSupplierDebts === null) {
    return {
      decision: null,
      dataNeeded: {
        field: "outstanding_supplier_debts",
        prompt: "What is your total outstanding debt to suppliers (in ₦)? (Type '0' if none)",
        type: 'number',
        intent_context: {
          intent: "savings",
          decision_type: "savings_strategy",
          current_payload: currentPayload
        },
        canBeZeroOrNone: true,
      }
    };
  }
  if (consecutiveNegativeCashFlowMonths === null) {
    return {
      decision: null,
      dataNeeded: {
        field: "consecutive_negative_cash_flow_months",
        prompt: "How many consecutive months have you had negative cash flow? (Type '0' if none)",
        type: 'number',
        intent_context: {
          intent: "savings",
          decision_type: "savings_strategy",
          current_payload: currentPayload
        },
        canBeZeroOrNone: true,
      }
    };
  }

  console.log(`[${requestId}] makeSavingsDecision: After Data Gathering. currentPayload:`, currentPayload);

  // --- Final Validation and Defaulting ---
  const finalIsVolatileIndustry = getBooleanOrDefault(isVolatileIndustry);
  const finalIsGrowthStage = getBooleanOrDefault(isGrowthStage);
  const finalIsSeasonalWindfallMonth = getBooleanOrDefault(isSeasonalWindfallMonth);
  const finalDebtApr = getNumberOrDefault(debtApr);
  const finalOutstandingSupplierDebts = getNumberOrDefault(outstandingSupplierDebts);
  const finalConsecutiveNegativeCashFlowMonths = getNumberOrDefault(consecutiveNegativeCashFlowMonths);

  console.log(`[${requestId}] makeSavingsDecision: Final defaulted payload values:`, {
    finalIsVolatileIndustry,
    finalIsGrowthStage,
    finalIsSeasonalWindfallMonth,
    finalDebtApr,
    finalOutstandingSupplierDebts,
    finalConsecutiveNegativeCashFlowMonths,
    currentReserveAllocationPercentageEmergency,
    currentReserveAllocationPercentageGrowth,
    fixed_operating_expenses,
    net_profit,
    profit_margin
  });

  // Calculate debt ratio for Rule 3
  const debt_ratio = monthly_revenue > 0 ? (finalOutstandingSupplierDebts / monthly_revenue) : 0;
  console.log(`[${requestId}] makeSavingsDecision: Calculated debt_ratio: ${debt_ratio}`);

  // --- Rule Evaluation ---

  console.log(`[${requestId}] makeSavingsDecision: Starting rule evaluation. Initial recommendation: ${recommendation}`);

  // Rule 6.1: Suspend extra savings allocations if 2 consecutive months of negative cash flow. (Highest priority for "WAIT")
  if (finalConsecutiveNegativeCashFlowMonths >= 2) {
    recommendation = 'WAIT';
    reasons.push(`You've had negative cash flow for ${finalConsecutiveNegativeCashFlowMonths} consecutive months. Prioritize stabilizing cash flow before increasing savings.`);
    actionable_steps.push('Focus on increasing revenue and reducing non-essential expenses immediately.', 'Review all outgoing payments and negotiate terms if possible.', 'Avoid new investments until cash flow is positive for at least one month.');
    console.log(`[${requestId}] Rule 6.1 triggered. Recommendation: ${recommendation}`);
  }

  // Rule 1.3: Critical alert if reserves fall below 1 month of expenses. (Highest priority for "REJECT")
  if (current_savings < fixed_operating_expenses) {
    recommendation = 'REJECT';
    reasons.push(`Your current savings (₦${current_savings.toLocaleString()}) are below 1 month of fixed operating expenses (₦${fixed_operating_expenses.toLocaleString()}). This is a critical alert.`);
    actionable_steps.push('Immediately cut non-essential expenses.', 'Explore short-term revenue generation strategies.', 'Prioritize building your emergency fund to at least 1 month of expenses.');
    console.log(`[${requestId}] Rule 1.3 triggered. Recommendation: ${recommendation}`);
  }

  // If not REJECTED by critical alert or WAIT by negative cash flow, proceed with other rules
  if (recommendation !== 'REJECT' && recommendation !== 'WAIT') {
    console.log(`[${requestId}] Proceeding with non-critical rules. Current recommendation: ${recommendation}`);
    // Rule 1.1 & 1.2: Minimum Reserve Thresholds
    let requiredReserveMonths = 2;
    if (finalIsVolatileIndustry) {
      requiredReserveMonths = 4;
      reasons.push(`As your business is in a volatile industry, a higher reserve buffer is recommended.`);
    }
    const requiredReserveAmount = requiredReserveMonths * fixed_operating_expenses;

    if (current_savings < requiredReserveAmount) {
      recommendation = 'WAIT';
      reasons.push(`Your current savings (₦${current_savings.toLocaleString()}) are below the recommended minimum of ${requiredReserveMonths} months of fixed operating expenses (₦${requiredReserveAmount.toLocaleString()}).`);
      actionable_steps.push(`Prioritize building your savings to at least ₦${requiredReserveAmount.toLocaleString()}.`);
      console.log(`[${requestId}] Rule 1.1/1.2 triggered. Recommendation: ${recommendation}`);
    }

    // Rule 3.1 & 3.2 & 3.3: Debt vs. Savings Balance
    if (finalDebtApr > 15 && debt_ratio > 0.3) {
      if (recommendation === 'APPROVE') recommendation = 'WAIT'; // Downgrade if not already REJECT/WAIT
      reasons.push(`Your debt APR (${finalDebtApr}%) is high and your debt ratio (${(debt_ratio * 100).toFixed(1)}%) is above 30%. Prioritize debt repayment.`);
      actionable_steps.push('Focus on aggressively paying down high-interest debt.', 'Maintain a minimum 10% of net profit allocation to savings even while servicing debt to preserve liquidity.');
      console.log(`[${requestId}] Rule 3.1/3.2 triggered. Recommendation: ${recommendation}`);
    } else if (finalDebtApr > 0 && debt_ratio > 0.3) {
      if (recommendation === 'APPROVE') recommendation = 'WAIT'; // Downgrade if not already REJECT/WAIT
      reasons.push(`Your debt ratio (${(debt_ratio * 100).toFixed(1)}%) is above 30%. Consider prioritizing debt repayment.`);
      actionable_steps.push('Review debt repayment strategies.', 'Maintain a minimum 10% of net profit allocation to savings.');
      console.log(`[${requestId}] Rule 3.2 triggered (non-critical). Recommendation: ${recommendation}`);
    }

    // Rule 2: Monthly Allocation
    let targetAllocationPercentage = 0.10;
    if (finalIsGrowthStage && profit_margin >= 20) {
      targetAllocationPercentage = 0.15;
      reasons.push(`Your business is in a growth stage with a healthy profit margin (${profit_margin.toFixed(1)}%).`);
    }
    if (finalIsSeasonalWindfallMonth) {
      targetAllocationPercentage = Math.max(targetAllocationPercentage, 0.30);
      reasons.push(`This is a seasonal windfall month. Allocate a higher percentage of profit to savings.`);
    }

    const recommendedMonthlySavings = net_profit * targetAllocationPercentage;
    if (net_profit > 0) {
      actionable_steps.push(`Allocate at least ₦${recommendedMonthlySavings.toLocaleString()} (${(targetAllocationPercentage * 100).toFixed(0)}% of net profit) to savings this month.`);
    } else {
      reasons.push(`Your business currently has a negative net profit (₦${net_profit.toLocaleString()}), making monthly savings allocation difficult.`);
      if (recommendation === 'APPROVE') recommendation = 'WAIT';
      console.log(`[${requestId}] Rule 2 triggered (negative profit). Recommendation: ${recommendation}`);
    }

    // Rule 4.1: Emergency Fund Strategy
    const dedicatedEmergencyFundTarget = current_savings * 0.30;
    actionable_steps.push(`Carve out ₦${dedicatedEmergencyFundTarget.toLocaleString()} (30% of current savings) as a dedicated emergency fund.`);
    actionable_steps.push('Keep emergency reserves in liquid or low-risk instruments (bank deposits, treasury bills).');

    // Rule 5.1: Growth & Investment Reserves
    if (current_savings >= requiredReserveAmount) {
      const growthFundAllocation = current_savings * 0.40;
      actionable_steps.push(`Consider allocating ₦${growthFundAllocation.toLocaleString()} (40% of current savings) to a dedicated Growth/Expansion Fund.`);
    }

    // Rule 5.2 & 5.3: Growth reserves usage conditions
    if (current_savings >= requiredReserveAmount && profit_margin >= 15) {
      actionable_steps.push('Growth reserves can be used for expansion if your profit margin remains above 15% and your overall financial health is strong.');
    } else {
      reasons.push('Growth reserves should not be used for expansion if your profit margin is below 15% or if it would deplete your emergency buffer.');
      console.log(`[${requestId}] Rule 5.2/5.3 triggered (conditions not met).`);
    }

    // Rule 7: Sector-Specific Adjustments
    switch (profileData.business_type) {
      case 'Retail (e.g., shop, stall)':
      case 'Food & Beverage (e.g., restaurant, street food)':
        actionable_steps.push('Consider implementing frequent micro-savings (daily/weekly) due to the cash-heavy nature of your business.');
        break;
      case 'Agriculture':
        actionable_steps.push('Increase your pre-harvest saving rate to prepare for lean months.');
        break;
      case 'Service (e.g., barber, tailor)':
        actionable_steps.push('Maintain higher liquidity (aim for ≥ 3 months of expenses in savings) due to potentially irregular client payments.');
        break;
    }
    console.log(`[${requestId}] Sector-specific adjustments applied.`);
  }

  // Construct final reasoning string
  let finalReasoning: string | string[]; // Changed to allow array of strings
  if (recommendation === 'APPROVE') {
    finalReasoning = 'Your business is in excellent financial health and is well-positioned to optimize its savings strategy.';
    if (reasons.length > 0) { // If there were some "positive" reasons collected
      finalReasoning += ` Key strengths: ${reasons.join(' ')}.`;
    }
  } else if (recommendation === 'WAIT') {
    finalReasoning = reasons; // Return array of reasons
  } else { // REJECT
    finalReasoning = reasons; // Return array of reasons
  }

  // Ensure actionable steps are unique
  actionable_steps = Array.from(new Set(actionable_steps));
  console.log(`[${requestId}] Final actionable steps:`, actionable_steps);

  console.log(`[${requestId}] makeSavingsDecision: Before final decision return. Recommendation: ${recommendation}`);

  return {
    decision: {
      recommendation,
      reasoning: finalReasoning, // Use the constructed finalReasoning
      actionable_steps,
      financial_snapshot: financialData,
      is_volatile_industry: finalIsVolatileIndustry,
      is_growth_stage: finalIsGrowthStage,
      is_seasonal_windfall_month: finalIsSeasonalWindfallMonth,
      debt_apr: finalDebtApr,
      outstanding_supplier_debts: finalOutstandingSupplierDebts,
      consecutive_negative_cash_flow_months: finalConsecutiveNegativeCashFlowMonths,
      fixed_operating_expenses: fixed_operating_expenses,
      net_profit: net_profit,
    }
  };
}

// --- decisions/equipment.ts content ---
export function makeEquipmentDecision(
  financialData: FinancialData,
  profileData: ProfileData, // Added profileData for consistency, though not strictly used in current rules
  currentPayload: Record<string, any>,
  question: string,
  requestId: string,
): DecisionFunctionReturn {
  console.log(`[${requestId}] makeEquipmentDecision: Start. currentPayload:`, currentPayload);

  let equipmentCost: number | null = currentPayload.hasOwnProperty('equipment_cost') ? currentPayload.equipment_cost : null;
  let estimatedRoiPercentage: number | null = currentPayload.hasOwnProperty('estimated_roi_percentage') ? currentPayload.estimated_roi_percentage : null;
  let isEssentialReplacement: boolean | null = currentPayload.hasOwnProperty('is_essential_replacement') ? currentPayload.is_essential_replacement : null;
  let currentEquipmentUtilizationPercentage: number | null = currentPayload.hasOwnProperty('current_equipment_utilization_percentage') ? currentPayload.current_equipment_utilization_percentage : null;

  const { monthly_revenue, monthly_expenses, current_savings } = financialData;
  const net_income = monthly_revenue - monthly_expenses;
  const savings_buffer_months = monthly_expenses > 0 ? (current_savings / monthly_expenses) : (current_savings > 0 ? 999 : 0); // Handle zero expenses

  const reasons: string[] = [];
  let recommendation: 'APPROVE' | 'WAIT' | 'REJECT' = 'APPROVE'; // Default to APPROVE
  let actionable_steps: string[] = [];

  // --- Data Gathering Sequence for Equipment ---
  if (equipmentCost === null || equipmentCost <= 0) {
    return {
      decision: null,
      dataNeeded: {
        field: "equipment_cost",
        prompt: "What is the total cost of the equipment you are considering (in ₦)? (Must be greater than 0)",
        type: 'number',
        intent_context: {
          intent: "equipment",
          decision_type: "equipment_purchase",
          current_payload: currentPayload
        },
        canBeZeroOrNone: false,
      }
    };
  }
  if (estimatedRoiPercentage === null) {
    return {
      decision: null,
      dataNeeded: {
        field: "estimated_roi_percentage",
        prompt: "What is the estimated Return on Investment (ROI) percentage you expect from this equipment within 12 months? (e.g., '20' for 20%. Type '0' if unsure or none)",
        type: 'number',
        intent_context: {
          intent: "equipment",
          decision_type: "equipment_purchase",
          current_payload: currentPayload
        },
        canBeZeroOrNone: true,
      }
    };
  }
  if (isEssentialReplacement === null) {
    return {
      decision: null,
      dataNeeded: {
        field: "is_essential_replacement",
        prompt: "Is this equipment a critical replacement for existing, failing equipment? (Yes/No)",
        type: 'boolean',
        intent_context: {
          intent: "equipment",
          decision_type: "equipment_purchase",
          current_payload: currentPayload
        },
        canBeZeroOrNone: false,
      }
    };
  }
  if (currentEquipmentUtilizationPercentage === null) {
    return {
      decision: null,
      dataNeeded: {
        field: "current_equipment_utilization_percentage",
        prompt: "What is the current utilization percentage of your existing equipment (if applicable, e.g., '70' for 70%)? (Type '0' if no existing equipment or not applicable)",
        type: 'number',
        intent_context: {
          intent: "equipment",
          decision_type: "equipment_purchase",
          current_payload: currentPayload
        },
        canBeZeroOrNone: true,
      }
    };
  }
  console.log(`[${requestId}] makeEquipmentDecision: After Data Gathering. currentPayload:`, currentPayload);

  // --- Final Validation and Defaulting ---
  const finalEquipmentCost = getNumberOrDefault(equipmentCost);
  const finalEstimatedRoiPercentage = getNumberOrDefault(estimatedRoiPercentage);
  const finalIsEssentialReplacement = getBooleanOrDefault(isEssentialReplacement);
  const finalCurrentEquipmentUtilizationPercentage = getNumberOrDefault(currentEquipmentUtilizationPercentage);

  // --- Rule Evaluation ---

  // 1. REJECT (Highest Priority)
  if (net_income <= 0) {
    recommendation = 'REJECT';
    reasons.push(`Your business is currently not profitable (Net Income: ₦${net_income.toLocaleString()}).`);
  } else if (savings_buffer_months < 0.5 && !finalIsEssentialReplacement) {
    recommendation = 'REJECT';
    reasons.push(`Your savings (₦${current_savings.toLocaleString()}) are less than half a month of expenses (₦${monthly_expenses.toLocaleString()}), and this is not a critical replacement.`);
  } else if (finalEstimatedRoiPercentage < 5 && !finalIsEssentialReplacement) {
    recommendation = 'REJECT';
    reasons.push(`The estimated ROI (${finalEstimatedRoiPercentage}%) is very low, and this is not a critical replacement.`);
  }

  if (recommendation === 'REJECT') {
    actionable_steps = [
      'Focus on increasing your monthly revenue and aggressively cutting non-essential expenses to achieve consistent profitability.',
      'Build your emergency savings to cover at least 1 month of operating expenses.',
      'Re-evaluate the necessity and potential cost-savings of this equipment, or explore more affordable alternatives like leasing.'
    ];
  } else {
    // If not REJECTED, evaluate for APPROVE or WAIT
    let approveConditionsMet = 0;
    let waitConditionsTriggered = 0;

    // Condition: Positive cash flow (already checked by net_income > 0)
    // Condition: Savings buffer >= 2 months
    if (savings_buffer_months >= 2) {
      approveConditionsMet++;
    } else {
      reasons.push(`Your savings buffer (${savings_buffer_months.toFixed(1)} months) is less than 2 months of operating expenses.`);
      waitConditionsTriggered++;
    }

    // Condition: ROI >= 20%
    if (finalEstimatedRoiPercentage >= 20) {
      approveConditionsMet++;
    } else {
      reasons.push(`The estimated ROI (${finalEstimatedRoiPercentage}%) is below the target of 20%.`);
      waitConditionsTriggered++;
    }

    // Condition: Equipment utilization >= 70% (or 0 if new/not applicable)
    if (finalCurrentEquipmentUtilizationPercentage >= 70 || finalCurrentEquipmentUtilizationPercentage === 0) {
      approveConditionsMet++;
    } else {
      reasons.push(`Your existing equipment utilization (${finalCurrentEquipmentUtilizationPercentage}%) is below 70%.`);
      waitConditionsTriggered++;
    }

    // Special APPROVE condition for essential replacement
    if (finalIsEssentialReplacement && net_income > 0 && savings_buffer_months >= 1) {
      recommendation = 'APPROVE';
      reasons.push(`This is a critical replacement, and your business has positive net income (₦${net_income.toLocaleString()}) with at least 1 month of savings buffer (₦${current_savings.toLocaleString()}).`);
      actionable_steps.push(
        'Thoroughly research suppliers and negotiate the best possible terms and warranties.',
        'Develop a clear plan for integrating the new equipment into your operations and training staff.',
        'Monitor the actual revenue increase and cost savings to track the real ROI against your estimates.'
      );
    } else if (approveConditionsMet >= 3) { // All primary APPROVE conditions met
      recommendation = 'APPROVE';
      actionable_steps.push(
        'Thoroughly research suppliers and negotiate the best possible terms and warranties.',
        'Develop a clear plan for integrating the new equipment into your operations and training staff.',
        'Monitor the actual revenue increase and cost savings to track the real ROI against your estimates.'
      );
    } else {
      recommendation = 'WAIT';
      actionable_steps.push(
        'Increase your net income to build a stronger financial base.',
        'Boost your savings buffer to cover at least 2 months of operating expenses.',
        'Re-evaluate the estimated ROI. Can you find ways to increase the revenue impact or reduce the cost?',
        'If existing equipment utilization is low, focus on maximizing its use before investing in new assets.',
        'Consider alternative financing options or a smaller, less costly equipment model.',
        'If it\'s an essential replacement, explore temporary solutions or more cost-effective options to maintain operations while improving finances.'
      );
    }
  }

  // Construct final reasoning string
  let finalReasoning: string | string[];
  if (recommendation === 'APPROVE') {
    finalReasoning = 'Your business is in a strong financial position with healthy profitability, sufficient reserves, and a clear return on investment. This equipment purchase is likely to strengthen productivity without endangering liquidity.';
    if (reasons.length > 0) {
      finalReasoning += ` Key strengths: ${reasons.join(' ')}.`;
    }
  } else {
    finalReasoning = reasons; // For WAIT/REJECT, return array of specific reasons
  }

  // Ensure actionable steps are unique
  actionable_steps = Array.from(new Set(actionable_steps));
  console.log(`[${requestId}] Final actionable steps:`, actionable_steps);

  console.log(`[${requestId}] makeEquipmentDecision: Before final decision return. Recommendation: ${recommendation}`);

  return {
    decision: {
      recommendation,
      reasoning: finalReasoning,
      actionable_steps,
      financial_snapshot: financialData,
      equipment_cost: finalEquipmentCost,
      estimated_roi_percentage: finalEstimatedRoiPercentage,
      is_essential_replacement: finalIsEssentialReplacement,
      current_equipment_utilization_percentage: finalCurrentEquipmentUtilizationPercentage,
    }
  };
}

// --- decisions/debt_loan.ts content ---
export function makeDebtLoanDecision(
  financialData: FinancialData,
  profileData: ProfileData,
  currentPayload: Record<string, any>,
  question: string,
  requestId: string,
): DecisionFunctionReturn {
  console.log(`[${requestId}] makeDebtLoanDecision: Start. currentPayload:`, currentPayload);

  let totalBusinessLiabilities: number | null = currentPayload.hasOwnProperty('total_business_liabilities') ? currentPayload.total_business_liabilities : null;
  let totalBusinessAssets: number | null = currentPayload.hasOwnProperty('total_business_assets') ? currentPayload.total_business_assets : null;
  let totalMonthlyDebtRepayments: number | null = currentPayload.hasOwnProperty('total_monthly_debt_repayments') ? currentPayload.total_monthly_debt_repayments : null;
  let debtApr: number | null = currentPayload.hasOwnProperty('debt_apr') ? currentPayload.debt_apr : null; // Re-using existing debt_apr
  let loanPurposeIsRevenueGenerating: boolean | null = currentPayload.hasOwnProperty('loan_purpose_is_revenue_generating') ? currentPayload.loan_purpose_is_revenue_generating : null;
  let consecutiveNegativeCashFlowMonths: number | null = currentPayload.hasOwnProperty('consecutive_negative_cash_flow_months') ? currentPayload.consecutive_negative_cash_flow_months : null; // Re-using existing

  const { monthly_revenue, monthly_expenses, current_savings } = financialData;
  const net_profit = monthly_revenue - monthly_expenses;

  const reasons: string[] = [];
  let recommendation: 'APPROVE' | 'WAIT' | 'REJECT' = 'APPROVE'; // Default to APPROVE
  let actionable_steps: string[] = [];

  // --- Data Gathering Sequence for Debt Management / Loans ---
  if (totalBusinessLiabilities === null) {
    return {
      decision: null,
      dataNeeded: {
        field: "total_business_liabilities",
        prompt: "What is your total business liabilities (all debts, in ₦)? (Type '0' if none)",
        type: 'number',
        intent_context: {
          intent: "loan_management",
          decision_type: "debt_assessment",
          current_payload: currentPayload
        },
        canBeZeroOrNone: true,
      }
    };
  }
  if (totalBusinessAssets === null || totalBusinessAssets <= 0) {
    return {
      decision: null,
      dataNeeded: {
        field: "total_business_assets",
        prompt: "What is your total business assets (cash, inventory, equipment, etc., in ₦)? (Must be greater than 0)",
        type: 'number',
        intent_context: {
          intent: "loan_management",
          decision_type: "debt_assessment",
          current_payload: currentPayload
        },
        canBeZeroOrNone: false,
      }
    };
  }
  if (totalMonthlyDebtRepayments === null) {
    return {
      decision: null,
      dataNeeded: {
        field: "total_monthly_debt_repayments",
        prompt: "What are your total monthly debt repayments (for all existing loans, in ₦)? (Type '0' if none)",
        type: 'number',
        intent_context: {
          intent: "loan_management",
          decision_type: "debt_assessment",
          current_payload: currentPayload
        },
        canBeZeroOrNone: true,
      }
    };
  }
  if (debtApr === null) {
    return {
      decision: null,
      dataNeeded: {
        field: "debt_apr",
        prompt: "What is the Annual Percentage Rate (APR) of your highest interest debt (e.g., '20' for 20%)? (Type '0' if no debt)",
        type: 'number',
        intent_context: {
          intent: "loan_management",
          decision_type: "debt_assessment",
          current_payload: currentPayload
        },
        canBeZeroOrNone: true,
      }
    };
  }
  if (loanPurposeIsRevenueGenerating === null) {
    return {
      decision: null,
      dataNeeded: {
        field: "loan_purpose_is_revenue_generating",
        prompt: "Is the purpose of this loan (or your current debt) to generate more revenue for your business? (Yes/No)",
        type: 'boolean',
        intent_context: {
          intent: "loan_management",
          decision_type: "debt_assessment",
          current_payload: currentPayload
        },
        canBeZeroOrNone: false,
      }
    };
  }
  if (consecutiveNegativeCashFlowMonths === null) {
    return {
      decision: null,
      dataNeeded: {
        field: "consecutive_negative_cash_flow_months",
        prompt: "How many consecutive months have you had negative cash flow? (Type '0' if none)",
        type: 'number',
        intent_context: {
          intent: "loan_management",
          decision_type: "debt_assessment",
          current_payload: currentPayload
        },
        canBeZeroOrNone: true,
      }
    };
  }
  console.log(`[${requestId}] makeDebtLoanDecision: After Data Gathering. currentPayload:`, currentPayload);

  // --- Final Validation and Defaulting ---
  const finalTotalBusinessLiabilities = getNumberOrDefault(totalBusinessLiabilities);
  const finalTotalBusinessAssets = getNumberOrDefault(totalBusinessAssets);
  const finalTotalMonthlyDebtRepayments = getNumberOrDefault(totalMonthlyDebtRepayments);
  const finalDebtApr = getNumberOrDefault(debtApr);
  const finalLoanPurposeIsRevenueGenerating = getBooleanOrDefault(loanPurposeIsRevenueGenerating);
  const finalConsecutiveNegativeCashFlowMonths = getNumberOrDefault(consecutiveNegativeCashFlowMonths);

  // Calculate Debt-to-Equity Ratio
  const totalEquity = finalTotalBusinessAssets - finalTotalBusinessLiabilities;
  const debtToEquityRatio = totalEquity > 0 ? (finalTotalBusinessLiabilities / totalEquity) : (finalTotalBusinessLiabilities > 0 ? Infinity : 0);

  // Calculate Repayment Capacity Percentage
  const repaymentCapacityPercentage = net_profit > 0 ? (finalTotalMonthlyDebtRepayments / net_profit) * 100 : (finalTotalMonthlyDebtRepayments > 0 ? Infinity : 0);

  console.log(`[${requestId}] makeDebtLoanDecision: Calculated metrics:`, {
    debtToEquityRatio,
    repaymentCapacityPercentage,
    net_profit,
    finalDebtApr,
    finalConsecutiveNegativeCashFlowMonths
  });

  // --- Rule Evaluation ---

  // Not Advisable (REJECT) Conditions (Highest Priority)
  if (debtToEquityRatio > 2.0) {
    recommendation = 'REJECT';
    reasons.push(`Your Debt-to-Equity ratio (${debtToEquityRatio.toFixed(2)}) is very high (above 2.0), indicating significant over-leverage.`);
  }
  if (finalDebtApr > 25) {
    recommendation = 'REJECT';
    reasons.push(`Your highest debt APR (${finalDebtApr}%) is extremely high (above 25%), making debt very costly.`);
  }
  if (repaymentCapacityPercentage > 40) {
    recommendation = 'REJECT';
    reasons.push(`Your total monthly debt repayments (${repaymentCapacityPercentage.toFixed(1)}% of net profit) are too high (above 40%), risking a severe cash flow squeeze.`);
  }
  if (finalConsecutiveNegativeCashFlowMonths > 0) {
    recommendation = 'REJECT';
    reasons.push(`You have experienced negative cash flow for ${finalConsecutiveNegativeCashFlowMonths} consecutive months, indicating income instability and high repayment risk.`);
  }

  if (recommendation === 'REJECT') {
    actionable_steps = [
      'Immediately focus on aggressive debt reduction, starting with the highest interest debts.',
      'Implement strict cash flow management to improve profitability and build reserves.',
      'Avoid taking on any new debt until your financial stability significantly improves.',
      'Explore options for debt restructuring or negotiation with creditors.'
    ];
  } else {
    // If not REJECTED, evaluate for CAUTIOUS or RECOMMENDED
    let cautiousConditionsMet = 0;

    // Cautious (WAIT) Conditions
    if (debtToEquityRatio >= 1.0 && debtToEquityRatio <= 2.0) {
      cautiousConditionsMet++;
      reasons.push(`Your Debt-to-Equity ratio (${debtToEquityRatio.toFixed(2)}) is between 1.0 and 2.0, suggesting a moderate level of leverage.`);
    }
    if (finalDebtApr > 15 && finalDebtApr <= 20) {
      cautiousConditionsMet++;
      reasons.push(`Your highest debt APR (${finalDebtApr}%) is between 15% and 20%, which is manageable but requires careful monitoring.`);
    }
    if (repaymentCapacityPercentage >= 20 && repaymentCapacityPercentage <= 35) {
      cautiousConditionsMet++;
      reasons.push(`Your total monthly debt repayments (${repaymentCapacityPercentage.toFixed(1)}% of net profit) are between 20% and 35% of your net profit, indicating some repayment stress.`);
    }

    if (cautiousConditionsMet > 0) {
      recommendation = 'WAIT';
      actionable_steps = [
        'Develop a clear, short-term repayment plan to reduce your debt burden.',
        'Monitor your cash flow closely to ensure you can meet repayment obligations.',
        'Ensure any new debt is for a clear, revenue-generating purpose with a solid growth plan.',
        'Explore options to reduce interest rates or consolidate debts if possible.'
      ];
    } else {
      // Recommended (APPROVE) Conditions (Default if no other rules triggered)
      recommendation = 'APPROVE';
      reasons.push(`Your Debt-to-Equity ratio (${debtToEquityRatio.toFixed(2)}) is healthy (below 1.0).`);
      reasons.push(`Your highest debt APR (${finalDebtApr}%) is favorable (below 15%).`);
      reasons.push(`Your total monthly debt repayments (${repaymentCapacityPercentage.toFixed(1)}% of net profit) are well within your capacity (below 20%).`);
      if (finalLoanPurposeIsRevenueGenerating) {
        reasons.push(`The loan purpose is revenue-generating, which supports strategic growth.`);
      } else {
        reasons.push(`The loan purpose is not explicitly revenue-generating, but your strong financial position allows for it.`);
      }
      reasons.push(`You have consistent positive cash flow.`);

      actionable_steps = [
        'Negotiate the most favorable interest rates and repayment terms for any new loans.',
        'Create a detailed budget and plan for how the loan funds will be used to generate revenue.',
        'Regularly review the impact of new debt on your business\'s profitability and cash flow.',
        'Maintain a healthy emergency fund to mitigate unexpected financial challenges.'
      ];
    }
  }

  // Construct final reasoning string
  let finalReasoning: string | string[];
  if (recommendation === 'APPROVE') {
    finalReasoning = `Your business is in a strong financial position to manage debt or take on a new loan. ${reasons.join(' ')}.`;
  } else {
    finalReasoning = reasons; // For WAIT/REJECT, return array of specific reasons
  }

  // Ensure actionable steps are unique
  actionable_steps = Array.from(new Set(actionable_steps));
  console.log(`[${requestId}] Final actionable steps:`, actionable_steps);

  console.log(`[${requestId}] makeDebtLoanDecision: Before final decision return. Recommendation: ${recommendation}`);

  return {
    decision: {
      recommendation,
      reasoning: finalReasoning,
      actionable_steps,
      financial_snapshot: financialData,
      total_business_liabilities: finalTotalBusinessLiabilities,
      total_business_assets: finalTotalBusinessAssets,
      total_monthly_debt_repayments: finalTotalMonthlyDebtRepayments,
      debt_apr: finalDebtApr,
      loan_purpose_is_revenue_generating: finalLoanPurposeIsRevenueGenerating,
      consecutive_negative_cash_flow_months: finalConsecutiveNegativeCashFlowMonths,
    }
  };
}

// --- decisions/business_expansion.ts content ---
export function makeBusinessExpansionDecision(
  financialData: FinancialData,
  profileData: ProfileData,
  currentPayload: Record<string, any>,
  question: string,
  requestId: string,
): DecisionFunctionReturn {
  console.log(`[${requestId}] makeBusinessExpansionDecision: Start. currentPayload:`, currentPayload);

  let profitGrowthConsistent6Months: boolean | null = currentPayload.hasOwnProperty('profit_growth_consistent_6_months') ? currentPayload.profit_growth_consistent_6_months : null;
  let marketResearchValidatesDemand: boolean | null = currentPayload.hasOwnProperty('market_research_validates_demand') ? currentPayload.market_research_validates_demand : null;
  let capitalAvailablePercentageOfCost: number | null = currentPayload.hasOwnProperty('capital_available_percentage_of_cost') ? currentPayload.capital_available_percentage_of_cost : null;
  let expansionCost: number | null = currentPayload.hasOwnProperty('expansion_cost') ? currentPayload.expansion_cost : null;
  let profitMarginTrend: 'consistent_growth' | 'positive_fluctuating' | 'declining_unstable' | null = currentPayload.hasOwnProperty('profit_margin_trend') ? currentPayload.profit_margin_trend : null;
  let revenueGrowthTrend: 'consistent_growth' | 'positive_fluctuating' | 'declining_unstable' | null = currentPayload.hasOwnProperty('revenue_growth_trend') ? currentPayload.revenue_growth_trend : null;

  const { monthly_revenue, monthly_expenses, current_savings } = financialData;
  const net_profit = monthly_revenue - monthly_expenses;

  const reasons: string[] = [];
  let recommendation: 'APPROVE' | 'WAIT' | 'REJECT' = 'APPROVE'; // Default to APPROVE
  let actionable_steps: string[] = [];

  // --- Data Gathering Sequence for Business Expansion ---
  if (expansionCost === null || expansionCost <= 0) {
    return {
      decision: null,
      dataNeeded: {
        field: "expansion_cost",
        prompt: "What is the estimated total cost for this business expansion (in ₦)? (Must be greater than 0)",
        type: 'number',
        intent_context: {
          intent: "business_expansion",
          decision_type: "expansion_assessment",
          current_payload: currentPayload
        },
        canBeZeroOrNone: false,
      }
    };
  }
  if (capitalAvailablePercentageOfCost === null) {
    return {
      decision: null,
      dataNeeded: {
        field: "capital_available_percentage_of_cost",
        prompt: "What percentage of the expansion cost do you currently have available in capital (e.g., '60' for 60%)? (Type '0' if none)",
        type: 'number',
        intent_context: {
          intent: "business_expansion",
          decision_type: "expansion_assessment",
          current_payload: currentPayload
        },
        canBeZeroOrNone: true,
      }
    };
  }
  if (profitGrowthConsistent6Months === null) {
    return {
      decision: null,
      dataNeeded: {
        field: "profit_growth_consistent_6_months",
        prompt: "Have you experienced consistent profit growth (at least 15% increase) for the last 6 months? (Yes/No)",
        type: 'boolean',
        intent_context: {
          intent: "business_expansion",
          decision_type: "expansion_assessment",
          current_payload: currentPayload
        },
        canBeZeroOrNone: false,
      }
    };
  }
  if (marketResearchValidatesDemand === null) {
    return {
      decision: null,
      dataNeeded: {
        field: "market_research_validates_demand",
        prompt: "Does your market research clearly validate demand for this expansion (e.g., new products, new location)? (Yes/No)",
        type: 'boolean',
        intent_context: {
          intent: "business_expansion",
          decision_type: "expansion_assessment",
          current_payload: currentPayload
        },
        canBeZeroOrNone: false,
      }
    };
  }
  if (profitMarginTrend === null) {
    return {
      decision: null,
      dataNeeded: {
        field: "profit_margin_trend",
        prompt: "What is your current profit margin trend?",
        type: 'text_enum',
        options: ['consistent_growth', 'positive_fluctuating', 'declining_unstable'],
        intent_context: {
          intent: "business_expansion",
          decision_type: "expansion_assessment",
          current_payload: currentPayload
        },
        canBeZeroOrNone: false,
      }
    };
  }
  if (revenueGrowthTrend === null) {
    return {
      decision: null,
      dataNeeded: {
        field: "revenue_growth_trend",
        prompt: "What is your current revenue growth trend?",
        type: 'text_enum',
        options: ['consistent_growth', 'positive_fluctuating', 'declining_unstable'],
        intent_context: {
          intent: "business_expansion",
          decision_type: "expansion_assessment",
          current_payload: currentPayload
        },
        canBeZeroOrNone: false,
      }
    };
  }
  console.log(`[${requestId}] makeBusinessExpansionDecision: After Data Gathering. currentPayload:`, currentPayload);

  // --- Final Validation and Defaulting ---
  const finalProfitGrowthConsistent6Months = getBooleanOrDefault(profitGrowthConsistent6Months);
  const finalMarketResearchValidatesDemand = getBooleanOrDefault(marketResearchValidatesDemand);
  const finalCapitalAvailablePercentageOfCost = getNumberOrDefault(capitalAvailablePercentageOfCost);
  const finalExpansionCost = getNumberOrDefault(expansionCost);
  const finalProfitMarginTrend = getStringOrDefault(profitMarginTrend);
  const finalRevenueGrowthTrend = getStringOrDefault(revenueGrowthTrend);

  // --- Rule Evaluation ---

  // Not Advisable (REJECT) Conditions (Highest Priority)
  if (net_profit <= 0) {
    recommendation = 'REJECT';
    reasons.push(`Your business is currently not profitable (Net Income: ₦${net_profit.toLocaleString()}). Expansion would add further strain.`);
  } else if (finalProfitMarginTrend === 'declining_unstable' || finalRevenueGrowthTrend === 'declining_unstable') {
    recommendation = 'REJECT';
    reasons.push(`Your profit margin trend is ${finalProfitMarginTrend} and/or revenue growth trend is ${finalRevenueGrowthTrend}. This indicates instability.`);
  } else if (!finalMarketResearchValidatesDemand) {
    recommendation = 'REJECT';
    reasons.push(`There is no validated market research data to support demand for this expansion.`);
  } else if (finalCapitalAvailablePercentageOfCost < 50) {
    recommendation = 'REJECT';
    reasons.push(`You only have ${finalCapitalAvailablePercentageOfCost}% of the required capital (₦${finalExpansionCost.toLocaleString()}) available, which is less than 50%.`);
  }

  if (recommendation === 'REJECT') {
    actionable_steps = [
      'Focus on stabilizing and improving your current business profitability and cash flow.',
      'Conduct thorough market research to validate demand and identify potential risks.',
      'Build up your capital reserves to at least 50% of the estimated expansion cost before reconsidering.',
      'Explore smaller, less capital-intensive growth strategies first.'
    ];
  } else {
    // If not REJECTED, evaluate for CAUTIOUS or RECOMMENDED
    let recommendedConditionsMet = 0;
    let cautiousConditionsMet = 0;

    // Recommended Conditions
    if (finalProfitGrowthConsistent6Months) {
      recommendedConditionsMet++;
      reasons.push(`You have experienced consistent profit growth (≥ 15% for 6 months).`);
    }
    if (finalMarketResearchValidatesDemand) { // Already checked above, but for positive reinforcement
      recommendedConditionsMet++;
      reasons.push(`Market research clearly validates demand for this expansion.`);
    }
    if (finalCapitalAvailablePercentageOfCost >= 70) {
      recommendedConditionsMet++;
      reasons.push(`You have ${finalCapitalAvailablePercentageOfCost}% of the required capital (₦${finalExpansionCost.toLocaleString()}) available, which is ≥ 70%.`);
    }
    if (finalProfitMarginTrend === 'consistent_growth' && finalRevenueGrowthTrend === 'consistent_growth') {
      recommendedConditionsMet++;
      reasons.push(`Both your profit margin and revenue growth trends show consistent growth.`);
    }

    // Cautious Conditions
    if (finalProfitMarginTrend === 'positive_fluctuating' || finalRevenueGrowthTrend === 'positive_fluctuating') {
      cautiousConditionsMet++;
      reasons.push(`Your profit margin trend is ${finalProfitMarginTrend} and/or revenue growth trend is ${finalRevenueGrowthTrend}, indicating some fluctuation.`);
    }
    if (finalCapitalAvailablePercentageOfCost >= 50 && finalCapitalAvailablePercentageOfCost < 70) {
      cautiousConditionsMet++;
      reasons.push(`You have ${finalCapitalAvailablePercentageOfCost}% of the required capital (₦${finalExpansionCost.toLocaleString()}) available, which is between 50% and 69%.`);
    }

    if (recommendedConditionsMet >= 3) { // Strong approval
      recommendation = 'APPROVE';
      actionable_steps = [
        'Develop a detailed business plan for the expansion, including financial projections and timelines.',
        'Secure any remaining capital needed and finalize funding arrangements.',
        'Implement the expansion in phases, if possible, to manage risk and learn along the way.',
        'Continuously monitor key performance indicators (KPIs) to track the success of the expansion.'
      ];
    } else if (cautiousConditionsMet > 0 || recommendedConditionsMet > 0) { // Some positive signs, but also caution
      recommendation = 'WAIT';
      actionable_steps = [
        'Refine your market research to gain clearer insights into demand and competitive landscape.',
        'Explore ways to increase your capital availability or reduce the initial expansion cost.',
        'Consider a pilot program or a smaller-scale test of the expansion idea before a full rollout.',
        'Strengthen your operational efficiency and financial controls in your existing business.'
      ];
    } else { // Default to WAIT if no strong signals for APPROVE or REJECT
      recommendation = 'WAIT';
      reasons.push('More data or stronger financial indicators are needed to recommend expansion.');
      actionable_steps = [
        'Focus on achieving consistent profit and revenue growth for at least 6 months.',
        'Invest in comprehensive market research to validate demand for your expansion idea.',
        'Increase your capital reserves to comfortably cover the majority of the expansion cost.',
        'Review your current business operations for areas of improvement and efficiency.'
      ];
    }
  }

  // Construct final reasoning string
  let finalReasoning: string | string[];
  if (recommendation === 'APPROVE') {
    finalReasoning = `Your business demonstrates strong readiness and financial strength for this expansion. ${reasons.join(' ')}.`;
  } else {
    finalReasoning = reasons; // For WAIT/REJECT, return array of specific reasons
  }

  // Ensure actionable steps are unique
  actionable_steps = Array.from(new Set(actionable_steps));
  console.log(`[${requestId}] Final actionable steps:`, actionable_steps);

  console.log(`[${requestId}] makeBusinessExpansionDecision: Before final decision return. Recommendation: ${recommendation}`);

  return {
    decision: {
      recommendation,
      reasoning: finalReasoning,
      actionable_steps,
      financial_snapshot: financialData,
      profit_growth_consistent_6_months: finalProfitGrowthConsistent6Months,
      market_research_validates_demand: finalMarketResearchValidatesDemand,
      capital_available_percentage_of_cost: finalCapitalAvailablePercentageOfCost,
      expansion_cost: finalExpansionCost,
      profit_margin_trend: finalProfitMarginTrend === '' ? null : finalProfitMarginTrend,
      revenue_growth_trend: finalRevenueGrowthTrend === '' ? null : finalRevenueGrowthTrend,
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
      .select('is_fmcg_vendor, business_type') // Include business_type
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
    const businessType = profileData.business_type || 'Other'; // Default if not set
    console.log(`[${requestId}] Fetched profile data - isFmcgVendor: ${isFmcgVendor}, business_type: ${businessType}`);

    // 4. Call appropriate Decision Logic
    let decisionResult: DecisionFunctionReturn;

    switch (intent) {
      case 'hiring':
        decisionResult = makeHiringDecision(financialData, currentPayload, question, requestId);
        break;
      case 'inventory':
        decisionResult = makeInventoryDecision(financialData, { is_fmcg_vendor: isFmcgVendor, business_type: businessType }, currentPayload, question, requestId);
        break;
      case 'marketing': // New marketing decision
        decisionResult = makeMarketingDecision(financialData, currentPayload, question, requestId);
        break;
      case 'savings': // New savings decision
        decisionResult = makeSavingsDecision(financialData, { is_fmcg_vendor: isFmcgVendor, business_type: businessType }, currentPayload, question, requestId);
        break;
      case 'equipment': // New equipment decision
        decisionResult = makeEquipmentDecision(financialData, { is_fmcg_vendor: isFmcgVendor, business_type: businessType }, currentPayload, question, requestId);
        break;
      case 'loan_management': // New loan_management decision
        decisionResult = makeDebtLoanDecision(financialData, { is_fmcg_vendor: isFmcgVendor, business_type: businessType }, currentPayload, question, requestId);
        break;
      case 'business_expansion': // New business_expansion decision
        decisionResult = makeBusinessExpansionDecision(financialData, { is_fmcg_vendor: isFmcgVendor, business_type: businessType }, currentPayload, question, requestId);
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
      reasoning: Array.isArray(decision.reasoning) ? JSON.stringify(decision.reasoning) : decision.reasoning, // Stringify if array
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
      // New savings fields
      is_volatile_industry: decision.is_volatile_industry ?? null,
      is_growth_stage: decision.is_growth_stage ?? null,
      is_seasonal_windfall_month: decision.is_seasonal_windfall_month ?? null,
      debt_apr: decision.debt_apr ?? null,
      consecutive_negative_cash_flow_months: decision.consecutive_negative_cash_flow_months ?? null,
      current_reserve_allocation_percentage_emergency: decision.current_reserve_allocation_percentage_emergency ?? null,
      current_reserve_allocation_percentage_growth: decision.current_reserve_allocation_percentage_growth ?? null,
      fixed_operating_expenses: decision.fixed_operating_expenses ?? null,
      net_profit: decision.net_profit ?? null,
      // New equipment fields
      equipment_cost: decision.equipment_cost ?? null,
      estimated_roi_percentage: decision.estimated_roi_percentage ?? null,
      is_essential_replacement: decision.is_essential_replacement ?? null,
      current_equipment_utilization_percentage: decision.current_equipment_utilization_percentage ?? null,
      // New loan_management fields
      total_business_liabilities: decision.total_business_liabilities ?? null,
      total_business_assets: decision.total_business_assets ?? null,
      total_monthly_debt_repayments: decision.total_monthly_debt_repayments ?? null,
      loan_purpose_is_revenue_generating: decision.loan_purpose_is_revenue_generating ?? null,
      // New business_expansion fields
      profit_growth_consistent_6_months: decision.profit_growth_consistent_6_months ?? null,
      market_research_validates_demand: decision.market_research_validates_demand ?? null,
      capital_available_percentage_of_cost: decision.capital_available_percentage_of_cost ?? null,
      expansion_cost: decision.expansion_cost ?? null,
      profit_margin_trend: decision.profit_margin_trend ?? null,
      revenue_growth_trend: decision.revenue_growth_trend ?? null,
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
    console.error(`[${requestId}] RAW ERROR CAUGHT IN MAIN HANDLER:`, error);
    return handleError(error, requestId, user ? user.id : null, supabase, req.body);
  }
});