// supabase/functions/decision-engine/schemas.ts

import { z } from 'https://deno.land/x/zod@v3.23.0/mod.ts';

export const DecisionEngineInputSchema = z.object({
  intent: z.enum([
    'hiring', 
    'inventory', 
    'equipment',
  ]),
  question: z.string(),
  payload: z.object({
    estimated_salary: z.number().min(0).optional(),
    // Fields for inventory management
    estimated_inventory_cost: z.number().min(0).optional(),
    inventory_turnover_days: z.number().min(0).optional(),
    supplier_credit_terms_days: z.number().min(0).optional(),
    average_receivables_turnover_days: z.number().min(0).optional(),
    outstanding_supplier_debts: z.number().min(0).optional(),
    supplier_discount_percentage: z.number().min(0).max(100).optional(),
    storage_cost_percentage_of_order: z.number().min(0).max(100).optional(),
    // New fields for equipment and assets
    estimated_equipment_cost: z.number().min(0).optional(),
    expected_revenue_increase_monthly: z.number().min(0).optional(),
    expected_expense_decrease_monthly: z.number().min(0).optional(),
    equipment_lifespan_months: z.number().min(1).optional(),
    is_critical_replacement: z.boolean().optional(),
    is_power_solution: z.boolean().optional(),
    current_energy_cost_monthly: z.number().min(0).optional(),
    has_diversified_revenue_streams: z.boolean().optional(),
    existing_debt_load_monthly_repayments: z.number().min(0).optional(),
    financing_required: z.boolean().optional(),
    financing_interest_rate_annual_percentage: z.number().min(0).max(100).optional(),
    financing_term_months: z.number().min(1).optional(),
  }).optional(),
});

// Define types for the financial data and profile data
export type FinancialData = {
  monthly_revenue: number;
  monthly_expenses: number;
  current_savings: number;
};

export type ProfileData = {
  is_fmcg_vendor: boolean;
};

// Define a type for the decision result
export type DecisionResult = {
  recommendation: 'APPROVE' | 'WAIT' | 'REJECT';
  reasoning: string;
  actionable_steps: string[];
  financial_snapshot: FinancialData; // Added this line
  estimated_salary?: number;
  estimated_inventory_cost?: number;
  inventory_turnover_days?: number;
  supplier_credit_terms_days?: number;
  average_receivables_turnover_days?: number;
  outstanding_supplier_debts?: number;
  supplier_discount_percentage?: number;
  storage_cost_percentage_of_order?: number;
  estimated_equipment_cost?: number;
  expected_revenue_increase_monthly?: number;
  expected_expense_decrease_monthly?: number;
  equipment_lifespan_months?: number;
  is_critical_replacement?: boolean;
  is_power_solution?: boolean;
  current_energy_cost_monthly?: number;
  has_diversified_revenue_streams?: boolean;
  existing_debt_load_monthly_repayments?: number;
  financing_required?: boolean;
  financing_interest_rate_annual_percentage?: number;
  financing_term_months?: number;
};

// Define a type for the data needed response
export type DataNeededResponse = {
  field: string;
  prompt: string;
  intent_context: { intent: string; decision_type: string; current_payload?: Record<string, any>; };
};

// Define the return type for decision functions
export type DecisionFunctionReturn = {
  decision: DecisionResult | null; // Allow decision to be null when dataNeeded is present
  dataNeeded?: DataNeededResponse;
};