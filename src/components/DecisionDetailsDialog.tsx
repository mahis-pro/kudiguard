import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import DecisionCard from '@/components/DecisionCard';

interface DecisionDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  decision: {
    id: string;
    question: string;
    recommendation: 'APPROVE' | 'WAIT' | 'REJECT';
    reasoning: string | string[]; // Updated to allow array of strings
    actionable_steps: string[];
    financial_snapshot: {
      monthly_revenue: number;
      monthly_expenses: number;
      current_savings: number;
    };
    estimated_salary?: number;
    estimated_inventory_cost?: number | null;
    inventory_turnover_days?: number | null;
    supplier_credit_terms_days?: number | null;
    average_receivables_turnover_days?: number | null;
    outstanding_supplier_debts?: number | null;
    supplier_discount_percentage?: number | null;
    storage_cost_percentage_of_order?: number | null;
    // New fields for marketing & customer growth
    proposed_marketing_budget?: number | null;
    is_localized_promotion?: boolean | null;
    historic_foot_traffic_increase_observed?: boolean | null;
    sales_increase_last_campaign_1?: number | null;
    sales_increase_last_campaign_2?: number | null;
    revenue_gain_last_campaign?: number | null;
    marketing_spend_last_campaign?: number | null;
    customer_acquisition_cost?: number | null;
    customer_lifetime_value?: number | null;
    is_festive_or_peak_season?: boolean | null;
    projected_demand_increase_factor?: number | null;
    digital_cac?: number | null;
    offline_cac?: number | null;
    experimental_channel_spend?: number | null;
    has_tested_multiple_channels?: boolean | null;
    low_performing_channel_spend?: number | null;
    high_performing_channel_roi?: number | null;
    // New fields for savings management
    is_volatile_industry?: boolean | null;
    is_growth_stage?: boolean | null;
    is_seasonal_windfall_month?: boolean | null;
    debt_apr?: number | null;
    consecutive_negative_cash_flow_months?: number | null;
    current_reserve_allocation_percentage_emergency?: number | null;
    current_reserve_allocation_percentage_growth?: number | null;
    fixed_operating_expenses?: number | null;
    net_profit?: number | null;
    created_at: string;
  } | null;
}

const DecisionDetailsDialog = ({ isOpen, onClose, decision }: DecisionDetailsDialogProps) => {
  if (!decision) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-primary">Decision Details</DialogTitle>
          <DialogDescription>
            Review the full analysis and recommendation for your question.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <h3 className="text-lg font-semibold text-foreground mb-2">Question:</h3>
          <p className="text-muted-foreground mb-4">{decision.question}</p>
          
          <DecisionCard data={decision} />

          <p className="text-sm text-muted-foreground mt-4 text-right">
            Decision made on: {new Date(decision.created_at).toLocaleDateString()}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DecisionDetailsDialog;