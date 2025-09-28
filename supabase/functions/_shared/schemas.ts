// supabase/functions/_shared/schemas.ts

import { z } from 'https://deno.land/x/zod@v3.23.0/mod.ts';

// --- Shared Schemas ---
export const FinancialDataSchema = z.object({
  monthlyRevenue: z.number().min(0, "Monthly Revenue cannot be negative.").default(0),
  monthlyExpenses: z.number().min(0, "Monthly Expenses cannot be negative.").default(0),
  currentSavings: z.number().min(0, "Current Savings cannot be negative.").default(0),
  staffPayroll: z.number().min(0, "Staff Payroll cannot be negative.").default(0),
  inventoryValue: z.number().min(0, "Current Inventory Value cannot be negative.").default(0),
  outstandingDebts: z.number().min(0, "Outstanding Debts cannot be negative.").default(0),
  receivables: z.number().min(0, "Pending Payments (Receivables) cannot be negative.").default(0),
  equipmentInvestment: z.number().min(0, "Planned Equipment/Asset Purchase cannot be negative.").default(0),
  marketingSpend: z.number().min(0, "Monthly Marketing Spend cannot be negative.").default(0),
  ownerWithdrawals: z.number().min(0, "Personal Withdrawals from Business cannot be negative.").default(0),
  businessAge: z.number().min(0, "Business Age cannot be negative.").default(0),
  industryType: z.string().optional().default('General'),
}).partial(); // Make all fields optional for partial updates or flexible input

// --- Specific Edge Function Schemas ---

// Schema for decision-engine function
export const DecisionEngineInputSchema = z.object({
  decision_id: z.string().uuid("Invalid decision_id format. Must be a UUID."),
  intent: z.string().min(1, "Intent is required."),
  inputs: FinancialDataSchema.extend({
    // Ensure required fields for decision-engine are present and positive
    monthlyRevenue: z.number().min(1, "Monthly Revenue is required and must be greater than zero."),
    monthlyExpenses: z.number().min(1, "Monthly Expenses is required and must be greater than zero."),
  }),
});

// Schema for update-decision-feedback function
export const UpdateFeedbackInputSchema = z.object({
  recommendationId: z.string().uuid("Invalid recommendationId format. Must be a UUID."),
  acceptedOrRejected: z.boolean({ invalid_type_error: "acceptedOrRejected must be a boolean." }), // FIX: Corrected Zod boolean validation
  comment: z.string().optional().nullable(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
});

// Schema for validate-inputs function
export const ValidateInputsSchema = z.object({
  decision_id: z.string().uuid("Invalid decision_id format. Must be a UUID.").optional(),
  intent: z.string().min(1, "Intent is required."),
  raw_inputs: z.record(z.any()), // raw_inputs can be anything, we'll parse it later
});

// Schema for calculate_score function
export const CalculateScoreInputSchema = z.object({
  user_id: z.string().uuid("Invalid user_id format. Must be a UUID."),
  context: z.string().optional().nullable(),
});

// Schema for webhook-listener function
export const WebhookListenerInputSchema = z.object({
  decision_id: z.string().uuid("Invalid decision_id format. Must be a UUID."),
  ml_response: z.object({
    status: z.string(),
    confidence: z.number().min(0).max(1),
    explanation: z.string(),
    next_steps: z.array(z.string()),
    score: z.number().int().min(0).max(100),
    score_interpretation: z.string(),
    numeric_breakdown: z.object({
      monthly_revenue: z.number(),
      monthly_expenses: z.number(),
      current_savings: z.number(),
      net_income: z.number(),
      staff_payroll: z.number().optional(),
    }).passthrough(), // Allow other fields in numeric_breakdown
  }).passthrough(), // Allow other fields in ml_response
  signature: z.string().optional(), // For future signature verification
});