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

  const { decisionId, acceptedOrRejected } = await req.json();

  if (!decisionId || typeof acceptedOrRejected !== 'boolean') {
    return new Response(JSON.stringify({ error: 'Invalid input for decision feedback.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  const { data, error } = await supabaseClient
    .from('finance.decisions')
    .update({ accepted_or_rejected: acceptedOrRejected })
    .eq('id', decisionId)
    .eq('user_id', user.id) // Ensure only the owner can update their decision
    .select()
    .single();

  if (error) {
    console.error('Error updating decision feedback:', error);
    return new Response(JSON.stringify({ error: 'Failed to update decision feedback.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }

  if (!data) {
    return new Response(JSON.stringify({ error: 'Decision not found or unauthorized.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 404,
    });
  }

  return new Response(JSON.stringify({ message: 'Feedback updated successfully.', decision: data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
})