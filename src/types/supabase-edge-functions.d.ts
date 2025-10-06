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

// Self-contained declaration for Supabase client from esm.sh
declare module "https://esm.sh/@supabase/supabase-js@2.45.0" {
  // Define a minimal SupabaseClient interface directly for the Edge Function context
  interface SupabaseClient {
    auth: {
      getUser(): Promise<{ data: { user: any | null }; error: any | null }>;
      signOut(): Promise<{ error: any | null }>;
      onAuthStateChange(callback: (event: string, session: any | null) => void): { data: { subscription: any } };
      getSession(): Promise<{ data: { session: any | null }; error: any | null }>;
      signInWithPassword(credentials: any): Promise<{ data: any; error: any }>;
      resetPasswordForEmail(email: string, options: any): Promise<{ data: any; error: any }>;
      updateUser(updates: any): Promise<{ data: any; error: any }>;
      signUp(credentials: any): Promise<{ data: any; error: any }>;
    };
    from(tableName: string): any; // Simplified for common usage
    functions: {
      invoke(functionName: string, options: { body: any }): Promise<{ data: any; error: any }>;
    };
  }
  export function createClient(supabaseUrl: string, supabaseKey: string, options?: any): SupabaseClient;
  export type { SupabaseClient };
}

// Self-contained declaration for uuid from esm.sh
declare module "https://esm.sh/uuid@9.0.1" {
  export function v4(): string;
}

// Self-contained declaration for zod from deno.land/x
declare module "https://deno.land/x/zod@v3.23.0/mod.ts" {
  // Re-exporting from 'zod' npm package, assuming it's installed locally
  // If 'zod' npm package is NOT installed, these types would need to be defined manually.
  // Given the project's package.json, 'zod' is installed, so this should work.
  export * from 'zod';
}

// Self-contained declaration for GoogleGenerativeAI from esm.sh
declare module "https://esm.sh/@google/generative-ai@0.15.0" {
  // Define a minimal interface for GoogleGenerativeAI
  export class GoogleGenerativeAI {
    constructor(apiKey: string);
    getGenerativeModel(options: { model: string }): {
      generateContent(prompt: string): Promise<{ response: { text(): string } }>;
    };
  }
}

// Type definitions for KudiGuard decision engine
export type FinancialData = {
  monthly_revenue: number;
  monthly_expenses: number;
  current_savings: number;
};

export type ProfileData = {
  is_fmcg_vendor: boolean;
  business_type: string;
};

export type DecisionResult = {
  recommendation: 'APPROVE' | 'WAIT' | 'REJECT';
  reasoning: string | string[];
  actionable_steps: string[];
  financial_snapshot: FinancialData;
  estimated_salary?: number | null;
  estimated_inventory_cost?: number | null;
  inventory_turnover_days?: number | null;
  supplier_credit_terms_days?: number | null;
  average_receivables_turnover_days?: number | null;
  outstanding_supplier_debts?: number | null;
  supplier_discount_percentage?: number | null;
  storage_cost_percentage_of_order?: number | null;
  proposed_marketing_budget?: number | null;
  is_localized_promotion?: boolean | null;
  historic_foot_traffic_increase_observed?: boolean | null;
  sales_increase_last_campaign_1?: number | null;
  sales_increase_last_campaign_2?: number | null;
  is_volatile_industry?: boolean | null;
  is_growth_stage?: boolean | null;
  is_seasonal_windfall_month?: boolean | null;
  debt_apr?: number | null;
  consecutive_negative_cash_flow_months?: number | null;
  current_reserve_allocation_percentage_emergency?: number | null;
  current_reserve_allocation_percentage_growth?: number | null;
  fixed_operating_expenses?: number | null;
  net_profit?: number | null;
  equipment_cost?: number | null;
  estimated_roi_percentage?: number | null;
  is_essential_replacement?: boolean | null;
  current_equipment_utilization_percentage?: number | null;
  total_business_liabilities?: number | null;
  total_business_assets?: number | null;
  total_monthly_debt_repayments?: number | null;
  loan_purpose_is_revenue_generating?: boolean | null;
  profit_growth_consistent_6_months?: boolean | null;
  market_research_validates_demand?: boolean | null;
  capital_available_percentage_of_cost?: number | null;
  expansion_cost?: number | null;
  profit_margin_trend?: 'consistent_growth' | 'positive_fluctuating' | 'declining_unstable' | null;
  revenue_growth_trend?: 'consistent_growth' | 'positive_fluctuating' | 'declining_unstable' | null;
  feedback?: number | null; // Updated to number | null for star rating
};

export type DataNeededResponse = {
  field: string;
  prompt: string;
  type: 'number' | 'boolean' | 'text_enum';
  options?: string[];
  intent_context: { intent: string; decision_type: string; current_payload?: Record<string, any>; };
  canBeZeroOrNone?: boolean;
};

export type DecisionFunctionReturn = {
  decision: DecisionResult | null;
  dataNeeded?: DataNeededResponse;
};

// New types for intent-parser
export type IntentParserInput = {
  user_query: string;
};

export type ParsedIntent = {
  intent: 'hiring' | 'inventory' | 'marketing' | 'savings' | 'equipment' | 'loan_management' | 'business_expansion' | 'unknown';
  question: string;
  payload: Record<string, any>;
};

export type IntentParserResponse = {
  success: boolean;
  data: ParsedIntent | null;
  error: {
    code: string;
    severity: string;
    details: string;
  } | null;
  meta: {
    requestId: string;
    timestamp: string;
    version: string;
  };
};

// Extend ERROR_CODES with GEMINI_API_ERROR
declare module "https://deno.land/x/zod@v3.23.0/mod.ts" {
  interface ZodIssueCode {
    GEMINI_API_ERROR: "GEMINI_API_ERROR";
  }
}