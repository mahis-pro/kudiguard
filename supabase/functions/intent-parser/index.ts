/// <reference path="../../../src/types/supabase-edge-functions.d.ts" />
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { v4 as uuidv4 } from "https://esm.sh/uuid@9.0.1";
import { z } from "https://deno.land/x/zod@v3.23.0/mod.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.15.0"; // Import Gemini

// --- constants.ts content (re-declared for self-containment) ---
export const API_VERSION = "v1.0";

export const ERROR_CODES = {
  INVALID_INPUT: "INVALID_INPUT",
  UNAUTHORIZED_ACCESS: "UNAUTHORIZED_ACCESS",
  DB_CONNECTION_FAILED: "DB_CONNECTION_FAILED",
  UNHANDLED_EXCEPTION: "UNHANDLED_EXCEPTION",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  GEMINI_API_ERROR: "GEMINI_API_ERROR", // New error code for Gemini issues
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

// --- utils.ts content (re-declared for self-containment) ---
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

// --- errors.ts content (re-declared for self-containment) ---
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

  // Note: For intent-parser, we might not need to log to decision_audit table
  // as it's a pre-processing step. If detailed logging is needed, a separate
  // 'intent_audit' table could be created. For now, console.error is sufficient.
}

export async function handleError(
  error: any,
  requestId: string,
  vendorId: string | null,
  requestPayload: any = {},
): Promise<Response> {
  let customError: CustomError;
  let statusCode: number;

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

  await logError({ // Updated call to logError
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
      version: API_VERSION,
    },
  };

  return new Response(JSON.stringify(errorResponse), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    status: statusCode,
  });
}

// --- schemas.ts content (for intent-parser input) ---
export const IntentParserInputSchema = z.object({
  user_query: z.string().min(1, "User query cannot be empty."),
});

// Define the expected output schema from Gemini
const GeminiOutputSchema = z.object({
  intent: z.enum([
    'hiring', 
    'inventory', 
    'marketing',
    'savings', 
    'equipment',
    'loan_management',
    'business_expansion',
    'unknown', // Allow 'unknown' intent
  ]),
  question: z.string(),
  payload: z.record(z.string(), z.any()).optional(), // Flexible payload
});

// Initialize Gemini
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is not set in environment variables. This function will not work without it.");
  throw new CustomError(
    ERROR_CODES.SERVICE_UNAVAILABLE,
    "AI service is not configured. Please ensure GEMINI_API_KEY is set.",
    SEVERITY.HIGH,
    500
  );
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Changed model to gemini-1.5-flash

// Main Edge Function Logic
serve(async (req: Request) => {
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
    const validationResult = IntentParserInputSchema.safeParse(body);
    if (!validationResult.success) {
      throw new InputValidationError("Invalid input.", validationResult.error.toString());
    }
    const { user_query } = validationResult.data;
    console.log(`[${requestId}] Validated user query: "${user_query}"`);

    // 3. Gemini API Call for Intent Parsing
    const prompt = `
      You are an AI assistant for KudiGuard, a financial advisor for Nigerian small businesses.
      Your task is to analyze a user's query and extract their primary financial intent and any relevant numerical or boolean data.
      
      Possible intents are: 'hiring', 'inventory', 'marketing', 'savings', 'equipment', 'loan_management', 'business_expansion', or 'unknown'.
      
      Extract the following fields into a JSON object. If a field is not present or cannot be confidently extracted, omit it from the payload.
      Numerical values should be extracted as numbers, booleans as true/false.
      
      Output format MUST be a JSON object with 'intent', 'question', and an optional 'payload' field.
      
      Example Intents and Payload fields:
      - 'hiring': estimated_salary (number)
      - 'inventory': estimated_inventory_cost (number), inventory_turnover_days (number), outstanding_supplier_debts (number), supplier_credit_terms_days (number), average_receivables_turnover_days (number), supplier_discount_percentage (number), storage_cost_percentage_of_order (number)
      - 'marketing': proposed_marketing_budget (number), is_localized_promotion (boolean), historic_foot_traffic_increase_observed (boolean), sales_increase_last_campaign_1 (number), sales_increase_last_campaign_2 (number)
      - 'savings': is_volatile_industry (boolean), is_growth_stage (boolean), is_seasonal_windfall_month (boolean), debt_apr (number), outstanding_supplier_debts (number), consecutive_negative_cash_flow_months (number)
      - 'equipment': equipment_cost (number), estimated_roi_percentage (number), is_essential_replacement (boolean), current_equipment_utilization_percentage (number)
      - 'loan_management': total_business_liabilities (number), total_business_assets (number), total_monthly_debt_repayments (number), debt_apr (number), loan_purpose_is_revenue_generating (boolean), consecutive_negative_cash_flow_months (number)
      - 'business_expansion': profit_growth_consistent_6_months (boolean), market_research_validates_demand (boolean), capital_available_percentage_of_cost (number), expansion_cost (number), profit_margin_trend (string: 'consistent_growth', 'positive_fluctuating', 'declining_unstable'), revenue_growth_trend (string: 'consistent_growth', 'positive_fluctuating', 'declining_unstable')
      
      If the intent is 'unknown', the payload should be empty.
      
      Here are some examples:
      User Query: "Should I hire a new staff member for ₦50,000 per month?"
      JSON Output: {"intent": "hiring", "question": "Should I hire a new staff member?", "payload": {"estimated_salary": 50000}}
      
      User Query: "I want to buy new inventory for ₦200,000. My inventory turnover is 45 days."
      JSON Output: {"intent": "inventory", "question": "Should I buy new inventory?", "payload": {"estimated_inventory_cost": 200000, "inventory_turnover_days": 45}}
      
      User Query: "Is it a good idea to spend ₦10,000 on a local marketing campaign? I've seen foot traffic increase from similar past events."
      JSON Output: {"intent": "marketing", "question": "Is it a good idea to spend on a local marketing campaign?", "payload": {"proposed_marketing_budget": 10000, "is_localized_promotion": true, "historic_foot_traffic_increase_observed": true}}
      
      User Query: "How can I improve my savings? My industry is volatile."
      JSON Output: {"intent": "savings", "question": "How can I improve my savings?", "payload": {"is_volatile_industry": true}}
      
      User Query: "Should I buy new equipment for ₦150,000? It's an essential replacement."
      JSON Output: {"intent": "equipment", "question": "Should I buy new equipment?", "payload": {"equipment_cost": 150000, "is_essential_replacement": true}}
      
      User Query: "I'm considering a loan. My total liabilities are ₦500,000 and assets are ₦1,200,000. Monthly repayments are ₦50,000."
      JSON Output: {"intent": "loan_management", "question": "Should I take a loan?", "payload": {"total_business_liabilities": 500000, "total_business_assets": 1200000, "total_monthly_debt_repayments": 50000}}
      
      User Query: "I want to expand my business. My profit growth has been consistent for 6 months and market research validates demand. The expansion will cost ₦1,000,000 and I have 75% of the capital."
      JSON Output: {"intent": "business_expansion", "question": "Should I expand my business?", "payload": {"profit_growth_consistent_6_months": true, "market_research_validates_demand": true, "expansion_cost": 1000000, "capital_available_percentage_of_cost": 75}}

      User Query: "What is the weather like today?"
      JSON Output: {"intent": "unknown", "question": "What is the weather like today?", "payload": {}}
      
      User Query: "${user_query}"
      
      JSON Output:
    `;
    console.log(`[${requestId}] Prompt sent to Gemini:`, prompt); // Log the full prompt

    let geminiResponseText: string;
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      geminiResponseText = response.text();
      console.log(`[${requestId}] Raw Gemini response:`, geminiResponseText);
    } catch (geminiError) {
      console.error(`[${requestId}] Gemini API error:`, geminiError);
      throw new CustomError(
        ERROR_CODES.GEMINI_API_ERROR,
        "Failed to get a response from the AI. Please try again.",
        SEVERITY.MEDIUM,
        502, // Bad Gateway or Service Unavailable
        geminiError
      );
    }

    let parsedIntent: z.infer<typeof GeminiOutputSchema>;
    try {
      // Attempt to clean up the response if it contains markdown code blocks
      let cleanedResponse = geminiResponseText.replace(/```json\n|```/g, '').trim();
      console.log(`[${requestId}] Cleaned Gemini response (after markdown removal):`, cleanedResponse);

      // Further attempt to extract JSON if there's surrounding text
      const jsonStartIndex = cleanedResponse.indexOf('{');
      const jsonEndIndex = cleanedResponse.lastIndexOf('}');

      if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
        cleanedResponse = cleanedResponse.substring(jsonStartIndex, jsonEndIndex + 1);
        console.log(`[${requestId}] Extracted JSON string:`, cleanedResponse);
      } else {
        console.warn(`[${requestId}] Could not find valid JSON delimiters in cleaned response.`);
      }

      parsedIntent = GeminiOutputSchema.parse(JSON.parse(cleanedResponse));
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse Gemini response as JSON or validate schema:`, parseError);
      throw new CustomError(
        ERROR_CODES.INVALID_INPUT,
        "AI returned an unparseable response. Please try rephrasing your question.",
        SEVERITY.MEDIUM,
        500,
        parseError
      );
    }

    console.log(`[${requestId}] Parsed Intent from Gemini:`, parsedIntent);

    const responsePayload = {
      success: true,
      data: parsedIntent,
      error: null,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        version: API_VERSION,
      },
    };
    console.log(`[${requestId}] Returning parsed intent response.`);

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error(`[${requestId}] RAW ERROR CAUGHT IN MAIN HANDLER:`, error);
    return handleError(error, requestId, user ? user.id : null, req.body);
  }
});