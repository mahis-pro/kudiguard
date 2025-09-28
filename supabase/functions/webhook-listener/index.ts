import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // IMPORTANT: For a webhook, authentication might be via a shared secret or API key,
  // not necessarily a user JWT. For now, we'll allow unauthenticated access
  // but in a real scenario, you'd verify a signature or API key.
  // const authHeader = req.headers.get('Authorization')
  // if (!authHeader) {
  //   return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  // }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role key for webhooks if updating sensitive data
    {
      auth: {
        persistSession: false,
      },
    }
  );

  try {
    const { decision_id, ml_response, signature } = await req.json();

    if (!decision_id || !ml_response) {
      return new Response(JSON.stringify({ error: 'Missing decision_id or ml_response.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // TODO: Implement signature verification for security
    // if (!verifySignature(req.headers, req.body, Deno.env.get('ML_ENGINE_SECRET'))) {
    //   return new Response('Unauthorized: Invalid signature', { status: 401, headers: corsHeaders });
    // }

    // Fetch the original decision to get user_id
    const { data: decisionData, error: decisionError } = await supabaseClient
      .from('decisions')
      .select('user_id')
      .eq('id', decision_id)
      .single();

    if (decisionError || !decisionData) {
      console.error('Decision not found for webhook:', decisionError);
      return new Response(JSON.stringify({ error: 'Original decision not found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
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
      // Add other fields from ML response as needed
    } = ml_response;

    const recommendationPayload = {
      decision_result,
      decision_status: ml_response.status === 'Recommended' ? 'success' : (ml_response.status === 'Cautious' ? 'warning' : 'danger'),
      explanation,
      next_steps,
      financial_health_score,
      score_interpretation: ml_response.score_interpretation || "ML-driven financial health assessment.",
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
      console.error('Error inserting ML recommendation:', insertRecommendationError);
      await supabaseClient
        .from('decisions')
        .update({ status: 'error' })
        .eq('id', decision_id);
      return new Response(JSON.stringify({ error: 'Failed to save ML recommendation.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Update the status of the original decision to 'processed'
    await supabaseClient
      .from('decisions')
      .update({ status: 'processed' })
      .eq('id', decision_id);

    return new Response(JSON.stringify({ ack: true, recommendation_id: newRecommendation.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})