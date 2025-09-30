// supabase/functions/_shared/mod.ts

// Re-export from constants.ts
export { API_VERSION, CORS_HEADERS, ERROR_CODES, SEVERITY } from './constants.ts';
export type { ErrorCode, Severity } from './constants.ts';

// Re-export from utils.ts
export { generateRequestId, redactSensitiveData, getSupabaseClient } from './utils.ts';

// Re-export from errors.ts
export { CustomError, InputValidationError, AuthError, ForbiddenError, handleError } from './errors.ts';

// Re-export from schemas.ts
export {
  DecisionEngineInputSchema,
} from './schemas.ts';

// Re-export SupabaseClient type for convenience
export type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';