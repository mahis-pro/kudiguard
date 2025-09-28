// supabase/functions/_shared/errors.ts

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { ErrorCode, SEVERITY, Severity, CORS_HEADERS, ERROR_CODES } from './constants.ts';
import { redactSensitiveData } from './utils.ts';

// --- Custom Error Classes ---
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

// --- Centralized Error Handling ---
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

// Function to persist structured logs and audit records safely
async function logError(
  supabaseClient: SupabaseClient,
  logEntry: LogEntry
) {
  const { requestId, vendorId, errorCode, severity, errorSummary, timestamp, stack, payload, originalError } = logEntry;

  // Log to Deno console (which goes to Supabase logs)
  console.error(JSON.stringify({
    level: severity === SEVERITY.HIGH ? 'error' : 'warn',
    message: errorSummary,
    requestId,
    vendorId,
    errorCode,
    severity,
    timestamp,
    stack: stack || (originalError instanceof Error ? originalError.stack : undefined),
    payload: redactSensitiveData(payload), // Ensure payload is redacted
    originalError: originalError ? String(originalError) : undefined,
  }));

  // Persist immutable audit record in decision_audit table
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
  fallbackRecommendation: any = null // For fail-soft
): Promise<Response> {
  let customError: CustomError;
  let statusCode: number;
  let isFallback = false;

  if (error instanceof CustomError) {
    customError = error;
    statusCode = error.statusCode;
  } else if (error instanceof Error) {
    // Catch unexpected system errors
    customError = new CustomError(
      ERROR_CODES.UNHANDLED_EXCEPTION,
      `An unexpected error occurred: ${error.message}`,
      SEVERITY.HIGH,
      500,
      error
    );
    statusCode = 500;
  } else {
    // Catch non-Error thrown objects
    customError = new CustomError(
      ERROR_CODES.UNHANDLED_EXCEPTION,
      `An unknown error occurred: ${String(error)}`,
      SEVERITY.HIGH,
      500,
      error
    );
    statusCode = 500;
  }

  // Log the detailed error internally
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

  // If a fallback is provided and the error is not HIGH severity, use it
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
      status: 200, // Still a success from the client's perspective, but with fallback
    });
  }

  // Prepare the public-facing error response
  const errorResponse: ErrorResponse = {
    success: false,
    data: null,
    error: {
      code: customError.code,
      severity: customError.severity,
      details: customError.details, // User-friendly message
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