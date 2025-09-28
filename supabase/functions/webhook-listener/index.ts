import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { z } from 'https://deno.land/x/zod@v3.23.0/mod.ts'; // Import Zod

import { generateRequestId } from '../_shared/utils.ts'; // Updated path
import { handleError, CustomError } from '../_shared/errors.ts'; // Import error handlers
import { API_VERSION, CORS_HEADERS, ERROR_CODES, SEVERITY } from '../_shared/constants.ts'; // Import constants
import { WebhookListenerInputSchema } from '../_shared/schemas.ts'; // Import schema

serve(async (req) => {
  const requestId = generateRequestId();
  let supabaseClient: createClient | null = null; // Use createClient type
  let requestPayload: any = {};

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    // IMPORTANT: For a webhook, authentication might be via a shared secret or API key,
    // not necessarily a user JWT. For now, we'll allow unauthenticated access
    // but in a real scenario, you'd verify a signature or API key.
    // const authHeader = req.headers.get('Authorization')
    // if (!authHeader) {
    //   return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    // }

    // For webhooks, we typically use the service role key to bypass RLS for internal updates
    supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    requestPayload = await req.json();

    // --- Input Validation with Zod ---
    const validatedInput = WebhookListenerInputSchema.safeParse(requestPayload);
    if (!validatedInput.success) {
      const errorDetails = validatedInput.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('; ');
      throw new CustomError(ERROR_CODES.WEBHOOK_MISSING_PAYLOAD, `Invalid webhook payload: ${errorDetails}`, SEVERITY.LOW, 400, validatedInput.error);
    }
    const { decision_id, ml_response, signature } = validatedInput.data;

    // TODO: Implement signature verification for security
    // if (!verifySignature(req.headers, req.body, Deno.env.get('ML_ENGINE_SECRET'))) {
    //   throw new CustomError(ERROR_CODES.WEBHOOK_INVALID_SIGNATURE, "Unauthorized: Invalid signature", SEVERITY.HIGH, 401);
    // }

    // Fetch the original decision to get user_id
    const { data: decisionData, error: decisionError } = await supabaseClient
      .from('decisions')
      .select('user_id')
      .eq('id', decision_id)
      .single();

    if (decisionError || !decisionData) {
      throw new CustomError(ERROR_CODES.WEBHOOK_DECISION_NOT_FOUND, `Original decision not found for ID: ${decision_id}.`, SEVERITY.MEDIUM, 404, decisionError);
    }

    const user_id = decisionData.user_id;

    // Extract relevant fields from ML response to fit recommendation schema
    const {
      status: decision_result,
      confidence,
      explanation,
      next_steps,
      score: financial_health_score,
      numeric_breakdown,
      score_interpretation,
      // Add other fields from ML response as needed
    } = ml_response;

    const recommendationPayload = {
      decision_result,
      decision_status: ml_response.status === 'Recommended' ? 'success' : (ml_response.status === 'Cautious' ? 'warning' : 'danger'),
      explanation,
      next_steps,
      financial_health_score,
      score_interpretation: score_interpretation || "ML-driven financial health assessment.",
      numeric_breakdown,
    };

    // Insert the ML-generated recommendation into the public.recommendations table
    const { data: newRecommendation, error: insertRecommendationError } = await supabaseClient
      .from('recommendations')
      .insert({
        decision_id,
        user_id,
        recommendation: recommendationPayload,
        financial_health_score,
        engine_used: 'ml', // Mark as ML-generated
        confidence,
        // Optionally store raw ML response for auditing: ml_payload: ml_response
      })
      .select()
      .single();

    if (insertRecommendationError) {
      throw new CustomError(ERROR_CODES.WEBHOOK_RECOMMENDATION_INSERT_FAILED, `Failed to save ML recommendation for decision ${decision_id}.`, SEVERITY.HIGH, 500, insertRecommendationError);
    }

    // Update the status of the original decision to 'processed'
    const { error: updateDecisionError } = await supabaseClient
      .from('decisions')
      .update({ status: 'processed' })
      .eq('id', decision_id);

    if (updateDecisionError) {
      // This is a non-critical error for the user, but important for auditing
      await handleError(
        new CustomError(
          ERROR_CODES.WEBHOOK_DECISION_UPDATE_FAILED,
          `Failed to update decision status for ${decision_id}.`,
          SEVERITY.MEDIUM,
          500,
          updateDecisionError
        ),
        requestId,
        user_id, // Use user_id from decisionData
        supabaseClient,
        API_VERSION,
        requestPayload
      );
    }

    return new Response(JSON.stringify({
      success: true,
      data: { ack: true, recommendation_id: newRecommendation.id },
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
    // For webhooks, vendorId might not be directly available from auth.getUser()
    // We pass null for vendorId if not explicitly set.
    return handleError(error, requestId, null, supabaseClient!, API_VERSION, requestPayload);
  }
})