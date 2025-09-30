import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, Info, DollarSign, TrendingUp, PiggyBank, CalendarDays, Percent, Clock, Zap, Banknote, Layers, ShieldCheck } from 'lucide-react';

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
    // New fields for inventory
    estimated_inventory_cost?: number | null; // Allow null
    inventory_turnover_days?: number | null; // Allow null
    supplier_credit_terms_days?: number | null; // Allow null
    average_receivables_turnover_days?: number | null; // Allow null
    outstanding_supplier_debts?: number | null; // Allow null
    supplier_discount_percentage?: number | null; // Allow null
    storage_cost_percentage_of_order?: number | null; // Allow null
    // New fields for equipment
    estimated_equipment_cost?: number | null;
    expected_revenue_increase_monthly?: number | null;
    expected_expense_decrease_monthly?: number | null;
    equipment_lifespan_months?: number | null;
    is_critical_replacement?: boolean | null;
    is_power_solution?: boolean | null;
    current_energy_cost_monthly?: number | null;
    has_diversified_revenue_streams?: boolean | null;
    existing_debt_load_monthly_repayments?: number | null;
    financing_required?: boolean | null;
    financing_interest_rate_annual_percentage?: number | null;
    financing_term_months?: number | null;
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
    // Equipment fields
    estimated_equipment_cost,
    expected_revenue_increase_monthly,
    expected_expense_decrease_monthly,
    equipment_lifespan_months,
    is_critical_replacement,
    is_power_solution,
    current_energy_cost_monthly,
    has_diversified_revenue_streams,
    existing_debt_load_monthly_repayments,
    financing_required,
    financing_interest_rate_annual_percentage,
    financing_term_months,
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

  const hasEquipmentData = 
    estimated_equipment_cost !== null && estimated_equipment_cost !== undefined ||
    expected_revenue_increase_monthly !== null && expected_revenue_increase_monthly !== undefined ||
    expected_expense_decrease_monthly !== null && expected_expense_decrease_monthly !== undefined ||
    equipment_lifespan_months !== null && equipment_lifespan_months !== undefined ||
    is_critical_replacement !== null && is_critical_replacement !== undefined ||
    is_power_solution !== null && is_power_solution !== undefined ||
    current_energy_cost_monthly !== null && current_energy_cost_monthly !== undefined ||
    has_diversified_revenue_streams !== null && has_diversified_revenue_streams !== undefined ||
    existing_debt_load_monthly_repayments !== null && existing_debt_load_monthly_repayments !== undefined ||
    financing_required !== null && financing_required !== undefined ||
    financing_interest_rate_annual_percentage !== null && financing_interest_rate_annual_percentage !== undefined ||
    financing_term_months !== null && financing_term_months !== undefined;

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

        {(estimated_salary !== null && estimated_salary !== undefined) || 
         (estimated_inventory_cost !== null && estimated_inventory_cost !== undefined) ||
         (inventory_turnover_days !== null && inventory_turnover_days !== undefined) ||
         (supplier_credit_terms_days !== null && supplier_credit_terms_days !== undefined) ||
         (average_receivables_turnover_days !== null && average_receivables_turnover_days !== undefined) ||
         (outstanding_supplier_debts !== null && outstanding_supplier_debts !== undefined) ||
         (supplier_discount_percentage !== null && supplier_discount_percentage !== undefined) ||
         (storage_cost_percentage_of_order !== null && storage_cost_percentage_of_order !== undefined) ||
         hasEquipmentData ? (
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

              {/* New Equipment Fields */}
              {estimated_equipment_cost !== null && estimated_equipment_cost !== undefined && (
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Equipment Cost: <span className="font-medium text-foreground currency">{estimated_equipment_cost.toLocaleString()}</span></span>
                </div>
              )}
              {expected_revenue_increase_monthly !== null && expected_revenue_increase_monthly !== undefined && (
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Expected Revenue Increase: <span className="font-medium text-foreground currency">{expected_revenue_increase_monthly.toLocaleString()}</span>/month</span>
                </div>
              )}
              {expected_expense_decrease_monthly !== null && expected_expense_decrease_monthly !== undefined && (
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Expected Expense Decrease: <span className="font-medium text-foreground currency">{expected_expense_decrease_monthly.toLocaleString()}</span>/month</span>
                </div>
              )}
              {equipment_lifespan_months !== null && equipment_lifespan_months !== undefined && (
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Equipment Lifespan: <span className="font-medium text-foreground">{equipment_lifespan_months}</span> months</span>
                </div>
              )}
              {is_critical_replacement !== null && is_critical_replacement !== undefined && (
                <div className="flex items-center">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Critical Replacement: <span className="font-medium text-foreground">{is_critical_replacement ? 'Yes' : 'No'}</span></span>
                </div>
              )}
              {is_power_solution !== null && is_power_solution !== undefined && (
                <div className="flex items-center">
                  <Zap className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Power Solution: <span className="font-medium text-foreground">{is_power_solution ? 'Yes' : 'No'}</span></span>
                </div>
              )}
              {current_energy_cost_monthly !== null && current_energy_cost_monthly !== undefined && (
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Current Monthly Energy Cost: <span className="font-medium text-foreground currency">{current_energy_cost_monthly.toLocaleString()}</span></span>
                </div>
              )}
              {has_diversified_revenue_streams !== null && has_diversified_revenue_streams !== undefined && (
                <div className="flex items-center">
                  <Layers className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Diversified Revenue: <span className="font-medium text-foreground">{has_diversified_revenue_streams ? 'Yes' : 'No'}</span></span>
                </div>
              )}
              {existing_debt_load_monthly_repayments !== null && existing_debt_load_monthly_repayments !== undefined && (
                <div className="flex items-center">
                  <Banknote className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Existing Monthly Debt Repayments: <span className="font-medium text-foreground currency">{existing_debt_load_monthly_repayments.toLocaleString()}</span></span>
                </div>
              )}
              {financing_required !== null && financing_required !== undefined && (
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Financing Required: <span className="font-medium text-foreground">{financing_required ? 'Yes' : 'No'}</span></span>
                </div>
              )}
              {financing_interest_rate_annual_percentage !== null && financing_interest_rate_annual_percentage !== undefined && (
                <div className="flex items-center">
                  <Percent className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Annual Interest Rate: <span className="font-medium text-foreground">{financing_interest_rate_annual_percentage}%</span></span>
                </div>
              )}
              {financing_term_months !== null && financing_term_months !== undefined && (
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Financing Term: <span className="font-medium text-foreground">{financing_term_months}</span> months</span>
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