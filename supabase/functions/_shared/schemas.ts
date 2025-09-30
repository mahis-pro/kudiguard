// supabase/functions/_shared/schemas.ts

import { z } from 'https://deno.land/x/zod@v3.23.0/mod.ts';

// Schema for the input to the main decision-engine function.
// This is the "contract" that the frontend (or intent-parser in the future) must adhere to.
export const DecisionEngineInputSchema = z.object({
  intent: z.enum([
    'hiring', 
    // Future intents will be added here:
    // 'inventory', 
    // 'equipment', 
    // 'marketing', 
    // 'savings', 
    // 'debt', 
    // 'expansion'
  ]),
  decision_type: z.string(), // e.g., "hiring_affordability"
  payload: z.record(z.any()).optional(), // For any extra data needed in the future
});

// We will add more schemas here as we build out the engine.