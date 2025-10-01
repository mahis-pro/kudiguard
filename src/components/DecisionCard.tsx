import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, Info, DollarSign, TrendingUp, PiggyBank, CalendarDays, Percent, Clock, BarChart, Target } from 'lucide-react';

interface DecisionCardProps {
  data: {
    recommendation: 'APPROVE' | 'WAIT' | 'REJECT';
    reasoning: string;
    actionable_steps: string[];
    financial_snapshot: {
      monthly_revenue: number;
      monthly_expenses: number;
      current_savings: number;
    };
    estimated_salary?: number | null; // Allow null
    // New fields for inventory management
    estimated_inventory_cost?: number | null; // Allow null
    inventory_turnover_days?: number | null; // Allow null
    supplier_credit_terms_days?: number | null; // Allow null
    average_receivables_turnover_days?: number | null; // Allow null
    outstanding_supplier_debts?: number | null; // Allow null
    supplier_discount_percentage?: number | null; // Allow null
    storage_cost_percentage_of_order?: number | null; // Allow null
    // New fields for marketing & customer growth
    proposed_marketing_budget?: number | null;
    is_localized_promotion?: boolean | null;
    historic_foot_traffic_increase_observed?: boolean | null;
    sales_increase_last_campaign_1?: number | null;
    sales_increase_last_campaign_2?: number | null;
  };
}

const DecisionCard = ({ data }: DecisionCardProps) => {
  const { 
    recommendation, 
    reasoning, 
    actionable_steps, 
    financial_snapshot, 
    estimated_salary,
    estimated_inventory_cost,
    inventory_turnover_days,
    supplier_credit_terms_days,
    average_receivables_turnover_days,
    outstanding_supplier_debts,
    supplier_discount_percentage,
    storage_cost_percentage_of_order,
    // Marketing fields
    proposed_marketing_budget,
    is_localized_promotion,
    historic_foot_traffic_increase_observed,
    sales_increase_last_campaign_1,
    sales_increase_last_campaign_2,
  } = data;

  const getRecommendationDetails = () => {
    switch (recommendation) {
      case 'APPROVE':
        return {
          Icon: CheckCircle,
          title: 'Recommendation: Approve',
          badgeVariant: 'default',
          cardClasses: 'bg-success-light border-success/20',
          iconClasses: 'text-success',
        };
      case 'WAIT':
        return {
          Icon: AlertTriangle,
          title: 'Recommendation: Wait',
          badgeVariant: 'secondary',
          cardClasses: 'bg-warning-light border-warning/20',
          iconClasses: 'text-warning',
        };
      case 'REJECT':
        return {
          Icon: XCircle,
          title: 'Recommendation: Reject',
          badgeVariant: 'destructive',
          cardClasses: 'bg-destructive/10 border-destructive/20',
          iconClasses: 'text-destructive',
        };
      default:
        return {
          Icon: Info,
          title: 'Recommendation',
          badgeVariant: 'outline',
          cardClasses: 'bg-muted',
          iconClasses: 'text-muted-foreground',
        };
    }
  };

  const { Icon, title, badgeVariant, cardClasses, iconClasses } = getRecommendationDetails();

  const hasDecisionParameters = 
    (estimated_salary !== null && estimated_salary !== undefined) || 
    (estimated_inventory_cost !== null && estimated_inventory_cost !== undefined) ||
    (inventory_turnover_days !== null && inventory_turnover_days !== undefined) ||
    (supplier_credit_terms_days !== null && supplier_credit_terms_days !== undefined) ||
    (average_receivables_turnover_days !== null && average_receivables_turnover_days !== undefined) ||
    (outstanding_supplier_debts !== null && outstanding_supplier_debts !== undefined) ||
    (supplier_discount_percentage !== null && supplier_discount_percentage !== undefined) ||
    (storage_cost_percentage_of_order !== null && storage_cost_percentage_of_order !== undefined) ||
    (proposed_marketing_budget !== null && proposed_marketing_budget !== undefined) ||
    (is_localized_promotion !== null && is_localized_promotion !== undefined) ||
    (historic_foot_traffic_increase_observed !== null && historic_foot_traffic_increase_observed !== undefined) ||
    (sales_increase_last_campaign_1 !== null && sales_increase_last_campaign_1 !== undefined) ||
    (sales_increase_last_campaign_2 !== null && sales_increase_last_campaign_2 !== undefined);

  return (
    <Card className={`shadow-md mt-2 ${cardClasses}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg">
          <Icon className={`mr-3 h-6 w-6 ${iconClasses}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold text-foreground mb-1">Reasoning:</h4>
          <p className="text-sm text-foreground/90">{reasoning}</p>
        </div>

        {hasDecisionParameters ? (
          <div>
            <h4 className="font-semibold text-foreground mb-2">Decision Parameters:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {estimated_salary !== null && estimated_salary !== undefined && (
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Estimated New Hire Salary: <span className="font-medium text-foreground currency">{estimated_salary.toLocaleString()}</span>/month</span>
                </div>
              )}
              {estimated_inventory_cost !== null && estimated_inventory_cost !== undefined && (
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Estimated Inventory Cost: <span className="font-medium text-foreground currency">{estimated_inventory_cost.toLocaleString()}</span></span>
                </div>
              )}
              {inventory_turnover_days !== null && inventory_turnover_days !== undefined && (
                <div className="flex items-center">
                  <CalendarDays className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Inventory Turnover: <span className="font-medium text-foreground">{inventory_turnover_days}</span> days</span>
                </div>
              )}
              {supplier_credit_terms_days !== null && supplier_credit_terms_days !== undefined && (
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Supplier Credit Terms: <span className="font-medium text-foreground">{supplier_credit_terms_days}</span> days</span>
                </div>
              )}
              {average_receivables_turnover_days !== null && average_receivables_turnover_days !== undefined && (
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Receivables Turnover: <span className="font-medium text-foreground">{average_receivables_turnover_days}</span> days</span>
                </div>
              )}
              {outstanding_supplier_debts !== null && outstanding_supplier_debts !== undefined && (
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Outstanding Debts: <span className="font-medium text-foreground currency">{outstanding_supplier_debts.toLocaleString()}</span></span>
                </div>
              )}
              {supplier_discount_percentage !== null && supplier_discount_percentage !== undefined && (
                <div className="flex items-center">
                  <Percent className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Supplier Discount: <span className="font-medium text-foreground">{supplier_discount_percentage}%</span></span>
                </div>
              )}
              {storage_cost_percentage_of_order !== null && storage_cost_percentage_of_order !== undefined && (
                <div className="flex items-center">
                  <Percent className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Storage Cost: <span className="font-medium text-foreground">{storage_cost_percentage_of_order}%</span></span>
                </div>
              )}
              {/* Marketing Fields */}
              {proposed_marketing_budget !== null && proposed_marketing_budget !== undefined && (
                <div className="flex items-center">
                  <BarChart className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Proposed Marketing Budget: <span className="font-medium text-foreground currency">{proposed_marketing_budget.toLocaleString()}</span></span>
                </div>
              )}
              {is_localized_promotion !== null && is_localized_promotion !== undefined && (
                <div className="flex items-center">
                  <Target className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Localized Promotion: <span className="font-medium text-foreground">{is_localized_promotion ? 'Yes' : 'No'}</span></span>
                </div>
              )}
              {historic_foot_traffic_increase_observed !== null && historic_foot_traffic_increase_observed !== undefined && (
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Historic Foot Traffic Increase: <span className="font-medium text-foreground">{historic_foot_traffic_increase_observed ? 'Yes' : 'No'}</span></span>
                </div>
              )}
              {sales_increase_last_campaign_1 !== null && sales_increase_last_campaign_1 !== undefined && (
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Sales Increase (Last Campaign 1): <span className="font-medium text-foreground">{sales_increase_last_campaign_1}%</span></span>
                </div>
              )}
              {sales_increase_last_campaign_2 !== null && sales_increase_last_campaign_2 !== undefined && (
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Sales Increase (Last Campaign 2): <span className="font-medium text-foreground">{sales_increase_last_campaign_2}%</span></span>
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div>
          <h4 className="font-semibold text-foreground mb-2">Financial Snapshot Used:</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-primary mr-2 flex-shrink-0" />
              <span className="text-muted-foreground">Revenue: <span className="font-medium text-foreground currency">{financial_snapshot.monthly_revenue.toLocaleString()}</span></span>
            </div>
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 text-destructive mr-2 flex-shrink-0" />
              <span className="text-muted-foreground">Expenses: <span className="font-medium text-foreground currency">{financial_snapshot.monthly_expenses.toLocaleString()}</span></span>
            </div>
            <div className="flex items-center">
              <PiggyBank className="h-4 w-4 text-success mr-2 flex-shrink-0" />
              <span className="text-muted-foreground">Savings: <span className="font-medium text-foreground currency">{financial_snapshot.current_savings.toLocaleString()}</span></span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-foreground mb-2">Actionable Steps:</h4>
          <ul className="space-y-1">
            {actionable_steps.map((step, index) => (
              <li key={index} className="flex items-start text-sm">
                <CheckCircle className="h-4 w-4 text-success mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-foreground/90">{step}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default DecisionCard;