// Type declarations for Supabase Edge Functions environment

// Declare Deno global object
declare namespace Deno {
  namespace env {
    function get(key: string): string | undefined;
  }
}

// Declare modules imported via URL
declare module "https://deno.land/std@0.190.0/http/server.ts" {
  export function serve(handler: (req: Request) => Promise<Response> | Response): Promise<void>;
}

declare module "https://esm.sh/@supabase/supabase-js@2.45.0" {
  import { SupabaseClient } from '@supabase/supabase-js';
  export { SupabaseClient };
  export function createClient(supabaseUrl: string, supabaseKey: string, options?: any): SupabaseClient;
}

declare module "https://esm.land/uuid@9.0.1" {
  export { v4 } from 'uuid';
}

declare module "https://deno.land/x/zod@v3.23.0/mod.ts" {
  export * from 'zod';
}