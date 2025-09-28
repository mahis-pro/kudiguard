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

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: authHeader },
      },
    }
  );

  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }

  const { recommendationId, acceptedOrRejected, comment, rating } = await req.json();

  if (!recommendationId || typeof acceptedOrRejected !== 'boolean') {
    return new Response(JSON.stringify({ error: 'Invalid input: recommendationId and acceptedOrRejected are required.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  // Check if feedback already exists for this recommendation and user
  const { data: existingFeedback, error: fetchError } = await supabaseClient
    .from('feedback')
    .select('id')
    .eq('recommendation_id', recommendationId)
    .eq('user_id', user.id)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
    console.error('Error checking existing feedback:', fetchError);
    return new Response(JSON.stringify({ error: 'Failed to check existing feedback.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }

  let feedbackData: { rating?: number; comment?: string; used_for_training?: boolean } = {
    rating: acceptedOrRejected ? 5 : 1, // Simple rating based on accepted/rejected
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
    console.error('Error upserting feedback:', upsertError);
    return new Response(JSON.stringify({ error: 'Failed to save feedback.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }

  return new Response(JSON.stringify({ message: 'Feedback saved successfully.', feedback: upsertData }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
})