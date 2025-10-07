import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, AlertTriangle, Info, DollarSign, TrendingUp, TrendingDown, BarChart, Target, Users, LineChart, HandCoins, Scale, Wallet, HardHat, Banknote, Landmark, Store, Search, Star, CalendarDays, Clock, Percent, PiggyBank } from 'lucide-react';
import { useSession } from '@/components/auth/SessionContextProvider';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils'; // Import cn utility

// Define DecisionCardProps interface here so it can be imported
export interface DecisionCardProps {
  data: {
    id: string; // Added id for feedback
    recommendation: 'APPROVE' | 'WAIT' | 'REJECT';
    reasoning: string | string[]; // Updated to allow array of strings
    actionable_steps: string[];
    financial_snapshot: {
      monthly_revenue: number;
      monthly_expenses: number;
      current_savings: number;
    };
    estimated_salary?: number | null; // Allow null
    // Fields for inventory management
    estimated_inventory_cost?: number | null; // Allow null
    inventory_turnover_days?: number | null; // Allow null
    supplier_credit_terms_days?: number | null; // Allow null
    average_receivables_turnover_days?: number | null; // Allow null
    outstanding_supplier_debts?: number | null; // Allow null
    supplier_discount_percentage?: number | null; // Allow null
    storage_cost_percentage_of_order?: number | null; // Allow null
    // Fields for marketing & customer growth
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
    // Fields for savings management
    is_volatile_industry?: boolean | null;
    is_growth_stage?: boolean | null;
    is_seasonal_windfall_month?: boolean | null;
    debt_apr?: number | null;
    consecutive_negative_cash_flow_months?: number | null;
    current_reserve_allocation_percentage_emergency?: number | null;
    current_reserve_allocation_percentage_growth?: number | null;
    fixed_operating_expenses?: number | null;
    net_profit?: number | null;
    // New fields for equipment purchase
    equipment_cost?: number | null;
    estimated_roi_percentage?: number | null;
    is_essential_replacement?: boolean | null;
    current_equipment_utilization_percentage?: number | null;
    // New fields for loan_management
    total_business_liabilities?: number | null;
    total_business_assets?: number | null;
    total_monthly_debt_repayments?: number | null;
    loan_purpose_is_revenue_generating?: boolean | null;
    // New fields for business_expansion
    profit_growth_consistent_6_months?: boolean | null;
    market_research_validates_demand?: boolean | null;
    capital_available_percentage_of_cost?: number | null;
    expansion_cost?: number | null;
    profit_margin_trend?: 'consistent_growth' | 'positive_fluctuating' | 'declining_unstable' | null;
    revenue_growth_trend?: 'consistent_growth' | 'positive_fluctuating' | 'declining_unstable' | null;
    feedback?: number | null; // Added feedback field
  };
  chatId?: string; // New optional prop
  messageId?: string; // New optional prop
  onFeedbackSuccess?: (messageId: string, newFeedbackValue: number) => void; // New optional callback
}

// StarRating Component
interface StarRatingProps {
  rating: number | null;
  onRatingChange: (newRating: number) => void;
  disabled?: boolean;
}

const StarRating = ({ rating, onRatingChange, disabled = false }: StarRatingProps) => {
  const [hoverRating, setHoverRating] = useState<number>(0);

  return (
    <div className="flex space-x-1">
      {[1, 2, 3, 4, 5].map((starValue) => (
        <Star
          key={starValue}
          className={cn(
            "h-5 w-5 cursor-pointer transition-colors",
            (starValue <= (hoverRating || rating || 0)) ? "fill-yellow-400 text-yellow-400" : "fill-muted text-muted-foreground",
            disabled && "cursor-not-allowed opacity-70"
          )}
          onClick={() => !disabled && onRatingChange(starValue)}
          onMouseEnter={() => !disabled && setHoverRating(starValue)}
          onMouseLeave={() => !disabled && setHoverRating(0)}
        />
      ))}
    </div>
  );
};

const DecisionCard = ({ data, messageId, onFeedbackSuccess }: DecisionCardProps) => {
  const { supabase, session } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [feedbackStatus, setFeedbackStatus] = useState<number | null>(data.feedback ?? null); // Local state for feedback

  const { 
    id, // Destructure id
    recommendation, 
    reasoning, 
    actionable_steps, 
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
    revenue_gain_last_campaign,
    marketing_spend_last_campaign,
    customer_acquisition_cost,
    customer_lifetime_value,
    is_festive_or_peak_season,
    projected_demand_increase_factor,
    digital_cac,
    offline_cac,
    experimental_channel_spend,
    has_tested_multiple_channels,
    low_performing_channel_spend,
    high_performing_channel_roi,
    // Savings fields
    is_volatile_industry,
    is_growth_stage,
    is_seasonal_windfall_month,
    debt_apr,
    consecutive_negative_cash_flow_months,
    current_reserve_allocation_percentage_emergency,
    current_reserve_allocation_percentage_growth,
    fixed_operating_expenses,
    net_profit,
    // Equipment fields
    equipment_cost,
    estimated_roi_percentage,
    is_essential_replacement,
    current_equipment_utilization_percentage,
    // Loan Management fields
    total_business_liabilities,
    total_business_assets,
    total_monthly_debt_repayments,
    loan_purpose_is_revenue_generating,
    // Business Expansion fields
    profit_growth_consistent_6_months,
    market_research_validates_demand,
    capital_available_percentage_of_cost,
    expansion_cost,
    profit_margin_trend,
    revenue_growth_trend,
  } = data;

  const getRecommendationDetails = () => {
    switch (recommendation) {
      case 'APPROVE':
        return {
          Icon: CheckCircle,
          title: 'Recommendation: Approve',
          cardClasses: 'bg-success-light border-success/20',
          iconClasses: 'text-success',
          shadowClass: 'shadow-success-glow',
        };
      case 'WAIT':
        return {
          Icon: AlertTriangle,
          title: 'Recommendation: Wait',
          cardClasses: 'bg-warning-light border-warning/20',
          iconClasses: 'text-warning',
          shadowClass: 'shadow-warning-glow',
        };
      case 'REJECT':
        return {
          Icon: XCircle,
          title: 'Recommendation: Reject',
          cardClasses: 'bg-destructive/10 border-destructive/20',
          iconClasses: 'text-destructive',
          shadowClass: 'shadow-destructive-glow',
        };
      default:
        return {
          Icon: Info,
          title: 'Recommendation',
          cardClasses: 'bg-muted',
          iconClasses: 'text-muted-foreground',
          shadowClass: 'shadow-card',
        };
    }
  };

  const { Icon, title, cardClasses, iconClasses, shadowClass } = getRecommendationDetails();

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
    (sales_increase_last_campaign_2 !== null && sales_increase_last_campaign_2 !== undefined) ||
    (revenue_gain_last_campaign !== null && revenue_gain_last_campaign !== undefined) ||
    (marketing_spend_last_campaign !== null && marketing_spend_last_campaign !== undefined) ||
    (customer_acquisition_cost !== null && customer_acquisition_cost !== undefined) ||
    (customer_lifetime_value !== null && customer_lifetime_value !== undefined) ||
    (is_festive_or_peak_season !== null && is_festive_or_peak_season !== undefined) ||
    (projected_demand_increase_factor !== null && projected_demand_increase_factor !== undefined) ||
    (digital_cac !== null && digital_cac !== undefined) ||
    (offline_cac !== null && offline_cac !== undefined) ||
    (experimental_channel_spend !== null && experimental_channel_spend !== undefined) ||
    (has_tested_multiple_channels !== null && has_tested_multiple_channels !== undefined) ||
    (low_performing_channel_spend !== null && low_performing_channel_spend !== undefined) ||
    (high_performing_channel_roi !== null && high_performing_channel_roi !== undefined) ||
    (is_volatile_industry !== null && is_volatile_industry !== undefined) ||
    (is_growth_stage !== null && is_growth_stage !== undefined) ||
    (is_seasonal_windfall_month !== null && is_seasonal_windfall_month !== undefined) ||
    (debt_apr !== null && debt_apr !== undefined) ||
    (consecutive_negative_cash_flow_months !== null && consecutive_negative_cash_flow_months !== undefined) ||
    (current_reserve_allocation_percentage_emergency !== null && current_reserve_allocation_percentage_emergency !== undefined) ||
    (current_reserve_allocation_percentage_growth !== null && current_reserve_allocation_percentage_growth !== undefined) ||
    (fixed_operating_expenses !== null && fixed_operating_expenses !== undefined) ||
    (net_profit !== null && net_profit !== undefined) ||
    (equipment_cost !== null && equipment_cost !== undefined) ||
    (estimated_roi_percentage !== null && estimated_roi_percentage !== undefined) ||
    (is_essential_replacement !== null && is_essential_replacement !== undefined) ||
    (current_equipment_utilization_percentage !== null && current_equipment_utilization_percentage !== undefined) ||
    (total_business_liabilities !== null && total_business_liabilities !== undefined) || // New debt fields
    (total_business_assets !== null && total_business_assets !== undefined) ||
    (total_monthly_debt_repayments !== null && total_monthly_debt_repayments !== undefined) ||
    (loan_purpose_is_revenue_generating !== null && loan_purpose_is_revenue_generating !== undefined) ||
    (profit_growth_consistent_6_months !== null && profit_growth_consistent_6_months !== undefined) || // New expansion fields
    (market_research_validates_demand !== null && market_research_validates_demand !== undefined) ||
    (capital_available_percentage_of_cost !== null && capital_available_percentage_of_cost !== undefined) ||
    (expansion_cost !== null && expansion_cost !== undefined) ||
    (profit_margin_trend !== null && profit_margin_trend !== undefined) ||
    (revenue_growth_trend !== null && revenue_growth_trend !== undefined);

  const formatCurrency = (value: number | null | undefined) => 
    value !== null && value !== undefined ? `₦${value.toLocaleString()}` : 'N/A';
  const formatPercentage = (value: number | null | undefined) => 
    value !== null && value !== undefined ? `${value}%` : 'N/A';
  const formatBoolean = (value: boolean | null | undefined) => 
    value !== null && value !== undefined ? (value ? 'Yes' : 'No') : 'N/A';
  const formatFactor = (value: number | null | undefined) =>
    value !== null && value !== undefined ? `${value}x` : 'N/A';
  const formatTrend = (value: 'consistent_growth' | 'positive_fluctuating' | 'declining_unstable' | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    switch (value) {
      case 'consistent_growth': return 'Consistent Growth';
      case 'positive_fluctuating': return 'Positive but Fluctuating';
      case 'declining_unstable': return 'Declining or Unstable';
      default: return 'N/A';
    }
  };

  const roi = (revenue_gain_last_campaign && marketing_spend_last_campaign && marketing_spend_last_campaign > 0) 
    ? (revenue_gain_last_campaign / marketing_spend_last_campaign) 
    : null;
  const cacLtvRatio = (customer_acquisition_cost && customer_lifetime_value && customer_acquisition_cost > 0)
    ? (customer_lifetime_value / customer_acquisition_cost)
    : null;

  // Parse reasoning: it could be a string or a JSON stringified array
  let parsedReasoning: string | string[];
  try {
    const parsed = JSON.parse(reasoning as string);
    if (Array.isArray(parsed)) {
      parsedReasoning = parsed;
    } else {
      parsedReasoning = reasoning as string;
    }
  } catch (e) {
    parsedReasoning = reasoning as string;
  }

  const handleFeedback = async (value: number) => {
    if (!session?.user?.id) {
      toast({ title: "Authentication Required", description: "Please log in to provide feedback.", variant: "destructive" });
      return;
    }

    try {
      const { data: edgeFunctionResult, error: invokeError } = await supabase.functions.invoke('feedback', {
        body: { decisionId: id, feedbackValue: value },
      });

      if (invokeError) {
        throw invokeError;
      }

      if (!edgeFunctionResult || !edgeFunctionResult.success) {
        throw new Error(edgeFunctionResult?.error?.details || "Failed to submit feedback.");
      }

      setFeedbackStatus(value); // Update local state immediately
      toast({
        title: "Feedback Submitted",
        description: `Thank you for your ${value}-star feedback! We'll use it to improve.`,
        variant: "default",
      });
      // Invalidate relevant queries to refetch data and update UI
      queryClient.invalidateQueries({ queryKey: ['recentDecisions', session.user.id] });
      queryClient.invalidateQueries({ queryKey: ['decisionHistory', session.user.id] });

      // Call the callback to update the chat message in ChatPage
      if (messageId && onFeedbackSuccess) {
        onFeedbackSuccess(messageId, value);
      }

    } catch (error: any) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Feedback Submission Failed",
        description: error.message || "An error occurred while submitting your feedback.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className={`shadow-md mt-2 ${cardClasses} ${shadowClass}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg">
          <Icon className={`mr-3 h-6 w-6 ${iconClasses}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold text-foreground mb-1">Reasoning:</h4>
          {Array.isArray(parsedReasoning) ? (
            <ul className="list-disc list-inside space-y-1 text-sm text-foreground/90">
              {parsedReasoning.map((reason, index) => (
                <li key={index}>{reason}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-foreground/90">{parsedReasoning}</p>
          )}
        </div>

        {hasDecisionParameters ? (
          <div>
            <h4 className="font-semibold text-foreground mb-2">Decision Parameters:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {estimated_salary !== null && estimated_salary !== undefined && (
                <div className="flex items-center">
                  <Users className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Estimated New Hire Salary: <span className="font-medium text-foreground">{formatCurrency(estimated_salary)}/month</span></span>
                </div>
              )}
              {estimated_inventory_cost !== null && estimated_inventory_cost !== undefined && (
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Estimated Inventory Cost: <span className="font-medium text-foreground">{formatCurrency(estimated_inventory_cost)}</span></span>
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
                  <HandCoins className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Outstanding Debts: <span className="font-medium text-foreground">{formatCurrency(outstanding_supplier_debts)}</span></span>
                </div>
              )}
              {supplier_discount_percentage !== null && supplier_discount_percentage !== undefined && (
                <div className="flex items-center">
                  <Percent className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Supplier Discount: <span className="font-medium text-foreground">{formatPercentage(supplier_discount_percentage)}</span></span>
                </div>
              )}
              {storage_cost_percentage_of_order !== null && storage_cost_percentage_of_order !== undefined && (
                <div className="flex items-center">
                  <Percent className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Storage Cost: <span className="font-medium text-foreground">{formatPercentage(storage_cost_percentage_of_order)}</span></span>
                </div>
              )}
              {/* Marketing Fields */}
              {proposed_marketing_budget !== null && proposed_marketing_budget !== undefined && (
                <div className="flex items-center">
                  <BarChart className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Proposed Marketing Budget: <span className="font-medium text-foreground">{formatCurrency(proposed_marketing_budget)}</span></span>
                </div>
              )}
              {is_localized_promotion !== null && is_localized_promotion !== undefined && (
                <div className="flex items-center">
                  <Target className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Localized Promotion: <span className="font-medium text-foreground">{formatBoolean(is_localized_promotion)}</span></span>
                </div>
              )}
              {historic_foot_traffic_increase_observed !== null && historic_foot_traffic_increase_observed !== undefined && (
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Historic Foot Traffic Increase: <span className="font-medium text-foreground">{formatBoolean(historic_foot_traffic_increase_observed)}</span></span>
                </div>
              )}
              {sales_increase_last_campaign_1 !== null && sales_increase_last_campaign_1 !== undefined && (
                <div className="flex items-center">
                  <LineChart className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Sales Increase (Last Campaign 1): <span className="font-medium text-foreground">{formatPercentage(sales_increase_last_campaign_1)}</span></span>
                </div>
              )}
              {sales_increase_last_campaign_2 !== null && sales_increase_last_campaign_2 !== undefined && (
                <div className="flex items-center">
                  <LineChart className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Sales Increase (Last Campaign 2): <span className="font-medium text-foreground">{formatPercentage(sales_increase_last_campaign_2)}</span></span>
                </div>
              )}
              {revenue_gain_last_campaign !== null && revenue_gain_last_campaign !== undefined && (
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Revenue Gain (Last Campaign): <span className="font-medium text-foreground">{formatCurrency(revenue_gain_last_campaign)}</span></span>
                </div>
              )}
              {marketing_spend_last_campaign !== null && marketing_spend_last_campaign !== undefined && (
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Marketing Spend (Last Campaign): <span className="font-medium text-foreground">{formatCurrency(marketing_spend_last_campaign)}</span></span>
                </div>
              )}
              {roi !== null && roi !== undefined && (
                <div className="flex items-center">
                  <Scale className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">ROI (Last Campaign): <span className="font-medium text-foreground">{roi.toFixed(1)}x</span></span>
                </div>
              )}
              {customer_acquisition_cost !== null && customer_acquisition_cost !== undefined && (
                <div className="flex items-center">
                  <Users className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Customer Acquisition Cost (CAC): <span className="font-medium text-foreground">{formatCurrency(customer_acquisition_cost)}</span></span>
                </div>
              )}
              {customer_lifetime_value !== null && customer_lifetime_value !== undefined && (
                <div className="flex items-center">
                  <PiggyBank className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Customer Lifetime Value (LTV): <span className="font-medium text-foreground">{formatCurrency(customer_lifetime_value)}</span></span>
                </div>
              )}
              {cacLtvRatio !== null && cacLtvRatio !== undefined && (
                <div className="flex items-center">
                  <Scale className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">LTV/CAC Ratio: <span className="font-medium text-foreground">{cacLtvRatio.toFixed(1)}x</span></span>
                </div>
              )}
              {is_festive_or_peak_season !== null && is_festive_or_peak_season !== undefined && (
                <div className="flex items-center">
                  <CalendarDays className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Festive/Peak Season: <span className="font-medium text-foreground">{formatBoolean(is_festive_or_peak_season)}</span></span>
                </div>
              )}
              {projected_demand_increase_factor !== null && projected_demand_increase_factor !== undefined && (
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Projected Demand Increase: <span className="font-medium text-foreground">{formatFactor(projected_demand_increase_factor)}</span></span>
                </div>
              )}
              {digital_cac !== null && digital_cac !== undefined && (
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Digital CAC: <span className="font-medium text-foreground">{formatCurrency(digital_cac)}</span></span>
                </div>
              )}
              {offline_cac !== null && offline_cac !== undefined && (
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Offline CAC: <span className="font-medium text-foreground">{formatCurrency(offline_cac)}</span></span>
                </div>
              )}
              {experimental_channel_spend !== null && experimental_channel_spend !== undefined && (
                <div className="flex items-center">
                  <BarChart className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Experimental Channel Spend: <span className="font-medium text-foreground">{formatCurrency(experimental_channel_spend)}</span></span>
                </div>
              )}
              {has_tested_multiple_channels !== null && has_tested_multiple_channels !== undefined && (
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Tested Multiple Channels: <span className="font-medium text-foreground">{formatBoolean(has_tested_multiple_channels)}</span></span>
                </div>
              )}
              {low_performing_channel_spend !== null && low_performing_channel_spend !== undefined && (
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Low-Performing Channel Spend: <span className="font-medium text-foreground">{formatCurrency(low_performing_channel_spend)}</span></span>
                </div>
              )}
              {high_performing_channel_roi !== null && high_performing_channel_roi !== undefined && (
                <div className="flex items-center">
                  <Scale className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">High-Performing Channel ROI: <span className="font-medium text-foreground">{high_performing_channel_roi.toFixed(1)}x</span></span>
                </div>
              )}
              {/* Savings Fields */}
              {is_volatile_industry !== null && is_volatile_industry !== undefined && (
                <div className="flex items-center">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Volatile Industry: <span className="font-medium text-foreground">{formatBoolean(is_volatile_industry)}</span></span>
                </div>
              )}
              {is_growth_stage !== null && is_growth_stage !== undefined && (
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Growth Stage: <span className="font-medium text-foreground">{formatBoolean(is_growth_stage)}</span></span>
                </div>
              )}
              {is_seasonal_windfall_month !== null && is_seasonal_windfall_month !== undefined && (
                <div className="flex items-center">
                  <CalendarDays className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Seasonal Windfall Month: <span className="font-medium text-foreground">{formatBoolean(is_seasonal_windfall_month)}</span></span>
                </div>
              )}
              {debt_apr !== null && debt_apr !== undefined && (
                <div className="flex items-center">
                  <Percent className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Highest Debt APR: <span className="font-medium text-foreground">{formatPercentage(debt_apr)}</span></span>
                </div>
              )}
              {consecutive_negative_cash_flow_months !== null && consecutive_negative_cash_flow_months !== undefined && (
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Consecutive Negative Cash Flow Months: <span className="font-medium text-foreground">{consecutive_negative_cash_flow_months}</span></span>
                </div>
              )}
              {current_reserve_allocation_percentage_emergency !== null && current_reserve_allocation_percentage_emergency !== undefined && (
                <div className="flex items-center">
                  <Wallet className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Emergency Reserve Allocation: <span className="font-medium text-foreground">{formatPercentage(current_reserve_allocation_percentage_emergency)}</span></span>
                </div>
              )}
              {current_reserve_allocation_percentage_growth !== null && current_reserve_allocation_percentage_growth !== undefined && (
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Growth Reserve Allocation: <span className="font-medium text-foreground">{formatPercentage(current_reserve_allocation_percentage_growth)}</span></span>
                </div>
              )}
              {fixed_operating_expenses !== null && fixed_operating_expenses !== undefined && (
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Fixed Operating Expenses: <span className="font-medium text-foreground">{formatCurrency(fixed_operating_expenses)}</span></span>
                </div>
              )}
              {net_profit !== null && net_profit !== undefined && (
                <div className="flex items-center">
                  <PiggyBank className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Net Profit: <span className="font-medium text-foreground">{formatCurrency(net_profit)}</span></span>
                </div>
              )}
              {/* Equipment Fields */}
              {equipment_cost !== null && equipment_cost !== undefined && (
                <div className="flex items-center">
                  <HardHat className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Equipment Cost: <span className="font-medium text-foreground">{formatCurrency(equipment_cost)}</span></span>
                </div>
              )}
              {estimated_roi_percentage !== null && estimated_roi_percentage !== undefined && (
                <div className="flex items-center">
                  <Percent className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Estimated ROI: <span className="font-medium text-foreground">{formatPercentage(estimated_roi_percentage)}</span></span>
                </div>
              )}
              {is_essential_replacement !== null && is_essential_replacement !== undefined && (
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Essential Replacement: <span className="font-medium text-foreground">{formatBoolean(is_essential_replacement)}</span></span>
                </div>
              )}
              {current_equipment_utilization_percentage !== null && current_equipment_utilization_percentage !== undefined && (
                <div className="flex items-center">
                  <BarChart className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Current Utilization: <span className="font-medium text-foreground">{formatPercentage(current_equipment_utilization_percentage)}</span></span>
                </div>
              )}
              {/* Loan Management Fields */}
              {total_business_liabilities !== null && total_business_liabilities !== undefined && (
                <div className="flex items-center">
                  <Banknote className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Total Liabilities: <span className="font-medium text-foreground">{formatCurrency(total_business_liabilities)}</span></span>
                </div>
              )}
              {total_business_assets !== null && total_business_assets !== undefined && (
                <div className="flex items-center">
                  <Landmark className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Total Assets: <span className="font-medium text-foreground">{formatCurrency(total_business_assets)}</span></span>
                </div>
              )}
              {total_monthly_debt_repayments !== null && total_monthly_debt_repayments !== undefined && (
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Monthly Debt Repayments: <span className="font-medium text-foreground">{formatCurrency(total_monthly_debt_repayments)}</span></span>
                </div>
              )}
              {loan_purpose_is_revenue_generating !== null && loan_purpose_is_revenue_generating !== undefined && (
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Loan Purpose Revenue-Generating: <span className="font-medium text-foreground">{formatBoolean(loan_purpose_is_revenue_generating)}</span></span>
                </div>
              )}
              {/* Business Expansion Fields */}
              {expansion_cost !== null && expansion_cost !== undefined && (
                <div className="flex items-center">
                  <Store className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Expansion Cost: <span className="font-medium text-foreground">{formatCurrency(expansion_cost)}</span></span>
                </div>
              )}
              {capital_available_percentage_of_cost !== null && capital_available_percentage_of_cost !== undefined && (
                <div className="flex items-center">
                  <Wallet className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Capital Available: <span className="font-medium text-foreground">{formatPercentage(capital_available_percentage_of_cost)} of cost</span></span>
                </div>
              )}
              {profit_growth_consistent_6_months !== null && profit_growth_consistent_6_months !== undefined && (
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Consistent Profit Growth (6M): <span className="font-medium text-foreground">{formatBoolean(profit_growth_consistent_6_months)}</span></span>
                </div>
              )}
              {market_research_validates_demand !== null && market_research_validates_demand !== undefined && (
                <div className="flex items-center">
                  <Search className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Market Research Validates Demand: <span className="font-medium text-foreground">{formatBoolean(market_research_validates_demand)}</span></span>
                </div>
              )}
              {profit_margin_trend !== null && profit_margin_trend !== undefined && (
                <div className="flex items-center">
                  {profit_margin_trend === 'consistent_growth' ? <TrendingUp className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" /> : <TrendingDown className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />}
                  <span className="text-muted-foreground">Profit Margin Trend: <span className="font-medium text-foreground">{formatTrend(profit_margin_trend)}</span></span>
                </div>
              )}
              {revenue_growth_trend !== null && revenue_growth_trend !== undefined && (
                <div className="flex items-center">
                  {revenue_growth_trend === 'consistent_growth' ? <TrendingUp className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" /> : <TrendingDown className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />}
                  <span className="text-muted-foreground">Revenue Growth Trend: <span className="font-medium text-foreground">{formatTrend(revenue_growth_trend)}</span></span>
                </div>
              )}
            </div>
          </div>
        ) : null}

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

        {/* Feedback Section */}
        <div className="pt-4 border-t border-border mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">How helpful was this recommendation?</p>
          <StarRating 
            rating={feedbackStatus} 
            onRatingChange={handleFeedback} 
            disabled={feedbackStatus !== null} // Disable after first feedback
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default DecisionCard;