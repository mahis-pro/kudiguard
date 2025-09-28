import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { z } from 'https://deno.land/x/zod@v3.23.0/mod.ts';

import { generateRequestId, getSupabaseClient } from '../../../src/lib/edge-functions/utils.ts';
import { handleError, AuthError, InputValidationError, CustomError } from '../../../src/lib/edge-functions/errors.ts';
import { API_VERSION, CORS_HEADERS, ERROR_CODES, SEVERITY } from '../../../src/lib/edge-functions/constants.ts';
import { UpdateFeedbackInputSchema } from '../../../src/lib/edge-functions/schemas.ts';

serve(async (req) => {
  const requestId = generateRequestId();
  let supabaseClient: SupabaseClient | null = null;
  let vendorId: string | null = null;
  let requestPayload: any = {};

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new AuthError("Authorization header missing.");
    }

    supabaseClient = getSupabaseClient(authHeader);
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new AuthError("User not authenticated.", userError);
    }
    vendorId = user.id;

    requestPayload = await req.json();

    // --- Input Validation with Zod ---
    const validatedInput = UpdateFeedbackInputSchema.safeParse(requestPayload);
    if (!validatedInput.success) {
      const errorDetails = validatedInput.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('; ');
      throw new InputValidationError("Invalid input for feedback update.", errorDetails, validatedInput.error);
    }
    const { recommendationId, acceptedOrRejected, comment, rating } = validatedInput.data;

    // Check if feedback already exists for this recommendation and user
    const { data: existingFeedback, error: fetchError } = await supabaseClient
      .from('feedback')
      .select('id')
      .eq('recommendation_id', recommendationId)
      .eq('user_id', user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
      throw new CustomError(
        ERROR_CODES.PROFILE_FETCH_FAILED, // Reusing code, could be more specific like FEEDBACK_FETCH_FAILED
        `Failed to check existing feedback for recommendation ${recommendationId}.`,
        SEVERITY.HIGH,
        500,
        fetchError
      );
    }

    let feedbackData: { rating?: number; comment?: string; used_for_training?: boolean } = {
      rating: rating ?? (acceptedOrRejected ? 5 : 1), // Use provided rating or derive from accepted/rejected
      comment: comment,
      used_for_training: false, // Default to false, can be set to true by admin later
    };

    let upsertError;
    let upsertData;

    if (existingFeedback) {
      // Update existing feedback
      const { data, error } = await supabaseClient
        .from('feedback')
        .update(feedbackData)
        .eq('id', existingFeedback.id)
        .select()
        .single();
      upsertData = data;
      upsertError = error;
    } else {
      // Insert new feedback
      const { data, error } = await supabaseClient
        .from('feedback')
        .insert({
          recommendation_id: recommendationId,
          user_id: user.id,
          ...feedbackData,
        })
        .select()
        .single();
      upsertData = data;
      upsertError = error;
    }

    if (upsertError) {
      throw new CustomError(
        ERROR_CODES.FEEDBACK_UPSERT_FAILED,
        `Failed to save feedback for recommendation ${recommendationId}.`,
        SEVERITY.HIGH,
        500,
        upsertError
      );
    }

    return new Response(JSON.stringify({
      success: true,
      data: { message: 'Feedback saved successfully.', feedback: upsertData },
      error: null,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        fallback: false,
        version: API_VERSION,
      },
    }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    // Centralized error handling
    return handleError(error, requestId, vendorId, supabaseClient!, API_VERSION, requestPayload);
  }
});