// supabase/functions/decision-engine/decisions/equipment.ts

import { FinancialData, DecisionFunctionReturn } from '../schemas.ts';
import { ERROR_CODES, SEVERITY } from '../constants.ts';
import { CustomError } from '../errors.ts';

export function makeEquipmentDecision(
  financialData: FinancialData,
  currentPayload: Record<string, any>,
  question: string,
  requestId: string,
): DecisionFunctionReturn {
  const { monthly_revenue, monthly_expenses, current_savings } = financialData;
  const net_income = monthly_revenue - monthly_expenses;
  const profit_margin = monthly_revenue > 0 ? (net_income / monthly_revenue) * 100 : 0;
  const savings_buffer_months = monthly_expenses > 0 ? current_savings / monthly_expenses : Infinity;

  let estimatedEquipmentCost = currentPayload.estimated_equipment_cost;
  let expectedRevenueIncreaseMonthly = currentPayload.expected_revenue_increase_monthly;
  let expectedExpenseDecreaseMonthly = currentPayload.expected_expense_decrease_monthly;
  let equipmentLifespanMonths = currentPayload.equipment_lifespan_months;
  let isCriticalReplacement = currentPayload.is_critical_replacement;
  let isPowerSolution = currentPayload.is_power_solution; 
  let currentEnergyCostMonthly = currentPayload.current_energy_cost_monthly;
  let hasDiversifiedRevenueStreams = currentPayload.has_diversified_revenue_streams; 
  let existingDebtLoadMonthlyRepayments = currentPayload.existing_debt_load_monthly_repayments;
  let financingRequired = currentPayload.financing_required;
  let financingInterestRateAnnualPercentage = currentPayload.financing_interest_rate_annual_percentage;
  let financingTermMonths = currentPayload.financing_term_months;

  let recommendation: 'APPROVE' | 'WAIT' | 'REJECT';
  let reasoning: string;
  let actionable_steps: string[] = [];
  const reasons: string[] = [];
  let rejectConditionsMet = 0;
  let approveConditionsMet = 0;

  // --- Data Gathering Sequence for Equipment ---

  // Infer is_power_solution if not explicitly set
  if (isPowerSolution === undefined || isPowerSolution === null) {
    if (question.toLowerCase().includes('generator') || question.toLowerCase().includes('solar') || question.toLowerCase().includes('inverter') || question.toLowerCase().includes('power')) {
      currentPayload.is_power_solution = true;
      isPowerSolution = true;
    } else {
      currentPayload.is_power_solution = false;
      isPowerSolution = false;
    }
  }

  if (estimatedEquipmentCost === undefined || estimatedEquipmentCost === null) {
    return {
      decision: null as any,
      dataNeeded: {
        field: "estimated_equipment_cost",
        prompt: "What is the estimated cost of the equipment (in ₦)?",
        intent_context: { intent: "equipment", decision_type: "equipment_purchase", current_payload: currentPayload },
      }
    };
  }

  if (isCriticalReplacement === undefined || isCriticalReplacement === null) {
    return {
      decision: null as any,
      dataNeeded: {
        field: "is_critical_replacement",
        prompt: "Is this equipment a critical replacement for something broken that currently stops or severely impedes core business operations? (true/false)",
        intent_context: { intent: "equipment", decision_type: "equipment_purchase", current_payload: currentPayload },
      }
    };
  }

  if (expectedRevenueIncreaseMonthly === undefined || expectedRevenueIncreaseMonthly === null) {
    return {
      decision: null as any,
      dataNeeded: {
        field: "expected_revenue_increase_monthly",
        prompt: "How much do you expect this equipment to increase your monthly revenue (in ₦)?",
        intent_context: { intent: "equipment", decision_type: "equipment_purchase", current_payload: currentPayload },
      }
    };
  }

  if (expectedExpenseDecreaseMonthly === undefined || expectedExpenseDecreaseMonthly === null) {
    return {
      decision: null as any,
      dataNeeded: {
        field: "expected_expense_decrease_monthly",
        prompt: "How much do you expect this equipment to decrease your monthly expenses (in ₦)?",
        intent_context: { intent: "equipment", decision_type: "equipment_purchase", current_payload: currentPayload },
      }
    };
  }

  if (existingDebtLoadMonthlyRepayments === undefined || existingDebtLoadMonthlyRepayments === null) {
    return {
      decision: null as any,
      dataNeeded: {
        field: "existing_debt_load_monthly_repayments",
        prompt: "What are your total monthly repayments for existing business loans or significant debts (in ₦)?",
        intent_context: { intent: "equipment", decision_type: "equipment_purchase", current_payload: currentPayload },
      }
    };
  }

  // Conditional prompt for current_energy_cost_monthly if it's a power solution
  if (isPowerSolution && (currentEnergyCostMonthly === undefined || currentEnergyCostMonthly === null)) {
    return {
      decision: null as any,
      dataNeeded: {
        field: "current_energy_cost_monthly",
        prompt: "What is your current average monthly energy cost (in ₦)?",
        intent_context: { intent: "equipment", decision_type: "equipment_purchase", current_payload: currentPayload },
      }
    };
  }

  // Conditional prompt for has_diversified_revenue_streams if estimated_equipment_cost is high
  if (estimatedEquipmentCost > 1000000 && (hasDiversifiedRevenueStreams === undefined || hasDiversifiedRevenueStreams === null)) {
    return {
      decision: null as any,
      dataNeeded: {
        field: "has_diversified_revenue_streams",
        prompt: "Does your business have at least two distinct, significant revenue streams? (true/false)",
        intent_context: { intent: "equipment", decision_type: "equipment_purchase", current_payload: currentPayload },
      }
    };
  } else if (hasDiversifiedRevenueStreams === undefined) {
    // Default to true if not capital intensive and not explicitly set
    currentPayload.has_diversified_revenue_streams = true;
    hasDiversifiedRevenueStreams = true;
  }

  // Conditional prompt for financing_required if estimated_equipment_cost is high relative to savings
  if (estimatedEquipmentCost > (0.5 * current_savings) && (financingRequired === undefined || financingRequired === null)) {
    return {
      decision: null as any,
      dataNeeded: {
        field: "financing_required",
        prompt: "Will you need external financing (e.g., a loan) for this purchase? (true/false)",
        intent_context: { intent: "equipment", decision_type: "equipment_purchase", current_payload: currentPayload },
      }
    };
  } else if (financingRequired === undefined) {
    // Default to false if not high relative to savings and not explicitly set
    currentPayload.financing_required = false;
    financingRequired = false;
  }

  // Conditional prompts for financing details if financing_required is true
  if (financingRequired) {
    if (financingInterestRateAnnualPercentage === undefined || financingInterestRateAnnualPercentage === null) {
      return {
        decision: null as any,
        dataNeeded: {
          field: "financing_interest_rate_annual_percentage",
          prompt: "What is the estimated annual interest rate (%) for the financing?",
          intent_context: { intent: "equipment", decision_type: "equipment_purchase", current_payload: currentPayload },
        }
      };
    }
    if (financingTermMonths === undefined || financingTermMonths === null) {
      return {
        decision: null as any,
        dataNeeded: {
          field: "financing_term_months",
          prompt: "What is the estimated loan term in months for the financing?",
          intent_context: { intent: "equipment", decision_type: "equipment_purchase", current_payload: currentPayload },
        }
      };
    }
  }

  // --- Final Validation before Rule Evaluation ---
  if (estimatedEquipmentCost === undefined || expectedRevenueIncreaseMonthly === undefined || expectedExpenseDecreaseMonthly === undefined ||
      isCriticalReplacement === undefined || existingDebtLoadMonthlyRepayments === undefined ||
      (isPowerSolution && currentEnergyCostMonthly === undefined) ||
      (estimatedEquipmentCost > 1000000 && hasDiversifiedRevenueStreams === undefined) ||
      (financingRequired && (financingInterestRateAnnualPercentage === undefined || financingTermMonths === undefined))) {
    throw new CustomError(
      ERROR_CODES.MISSING_REQUIRED_FIELD,
      "Critical equipment data is missing after collection. Please restart the conversation.",
      SEVERITY.HIGH,
      500
    );
  }

  // Type assertion after validation
  const finalEstimatedEquipmentCost = estimatedEquipmentCost!;
  const finalExpectedRevenueIncreaseMonthly = expectedRevenueIncreaseMonthly!;
  const finalExpectedExpenseDecreaseMonthly = expectedExpenseDecreaseMonthly!;
  const finalIsCriticalReplacement = isCriticalReplacement!;
  const finalIsPowerSolution = isPowerSolution!;
  const finalCurrentEnergyCostMonthly = currentEnergyCostMonthly ?? 0; // Default to 0 if not a power solution
  const finalHasDiversifiedRevenueStreams = hasDiversifiedRevenueStreams!;
  const finalExistingDebtLoadMonthlyRepayments = existingDebtLoadMonthlyRepayments!;
  const finalFinancingRequired = financingRequired!;
  const finalFinancingInterestRateAnnualPercentage = financingInterestRateAnnualPercentage ?? 0;
  const finalFinancingTermMonths = financingTermMonths ?? 1; // Default to 1 to avoid division by zero

  const monthly_profit_increase = finalExpectedRevenueIncreaseMonthly + finalExpectedExpenseDecreaseMonthly;
  const payback_months = monthly_profit_increase > 0 ? finalEstimatedEquipmentCost / monthly_profit_increase : Infinity;
  const productivity_gain_percentage = net_income > 0 ? (monthly_profit_increase / net_income) * 100 : 0;
  const energy_cost_percentage_of_expenses = monthly_expenses > 0 ? (finalCurrentEnergyCostMonthly / monthly_expenses) * 100 : 0;

  // --- A. Immediate REJECT Conditions (Highest Priority) ---
  // Rule 3: Capital-Intensive & Undiversified (Refined)
  if (finalEstimatedEquipmentCost > 1000000 && !finalHasDiversifiedRevenueStreams && !finalIsCriticalReplacement) {
    rejectConditionsMet++;
    reasons.push(`Investing over ₦1,000,000 without diversified revenue streams is too risky, as it concentrates your business's financial exposure and could jeopardize stability if one stream falters.`);
    actionable_steps.push("Focus on developing at least one additional significant and stable revenue stream before considering such a large, non-critical investment.");
  }

  // Severe Negative Net Income (Non-Critical)
  if (net_income < 0 && !finalIsCriticalReplacement) {
    rejectConditionsMet++;
    reasons.push(`Your business is currently unprofitable (Net Income: ₦${net_income.toLocaleString()}). Adding new costs for non-critical equipment would worsen your financial situation.`);
    actionable_steps.push("Prioritize increasing revenue and aggressively cutting non-essential expenses to achieve consistent profitability before any new investments.");
  }

  // Overwhelming Existing Debt (Non-Critical)
  if (finalExistingDebtLoadMonthlyRepayments > (0.30 * monthly_revenue) && !finalIsCriticalReplacement) {
    rejectConditionsMet++;
    reasons.push(`Your existing debt burden (₦${finalExistingDebtLoadMonthlyRepayments.toLocaleString()} monthly) is already high, exceeding 30% of your monthly revenue. Taking on more debt for non-critical equipment could lead to severe cash flow problems.`);
    actionable_steps.push("Focus on significantly reducing your current debt load to improve financial stability and free up cash flow for future investments.");
  }

  if (rejectConditionsMet > 0) {
    recommendation = 'REJECT';
    reasoning = `Based on critical financial indicators, this investment is currently too risky for your business. ${reasons.join(' ')}`;
  } else {
    // --- B. Strong APPROVE Conditions ---
    // Critical Replacement Override
    if (finalIsCriticalReplacement && (current_savings >= finalEstimatedEquipmentCost || (current_savings + net_income * 2) >= finalEstimatedEquipmentCost)) {
      approveConditionsMet++;
      reasons.push(`This equipment is a critical replacement essential for your business operations. Your financials, while potentially tight, can support this necessary investment.`);
      actionable_steps.push("Proceed with the purchase. Ensure minimal downtime during installation. If cash flow is tight, explore short-term, low-interest financing options or temporary solutions.");
    }

    // Rule 1: High ROI / Quick Payback
    if (monthly_profit_increase > 0 && (payback_months <= 12 || (net_income > 0 && productivity_gain_percentage >= 20))) {
      approveConditionsMet++;
      reasons.push(`The equipment offers a rapid return on investment (payback in ${payback_months.toFixed(1)} months) or a significant boost to your business's profitability (${productivity_gain_percentage.toFixed(1)}% productivity gain).`);
      actionable_steps.push("Confirm current market demand to ensure the expected revenue increase is realistic.", "Negotiate best possible terms with suppliers.");
    }

    // Rule 2: Small Equipment, Healthy Business
    if (finalEstimatedEquipmentCost <= 200000 && profit_margin >= 15 && savings_buffer_months >= 2) {
      approveConditionsMet++;
      reasons.push(`This small investment (₦${finalEstimatedEquipmentCost.toLocaleString()}) is well within your business's capacity, given your healthy profit margins (${profit_margin.toFixed(1)}%) and strong savings buffer (${savings_buffer_months.toFixed(1)} months).`);
      actionable_steps.push("Ensure the equipment aligns with your long-term business goals.", "Consider potential maintenance costs.");
    }

    // Additional Case: Prioritized Power Solution (Nigerian Context)
    if (finalIsPowerSolution && energy_cost_percentage_of_expenses > 15) {
      approveConditionsMet++; // Give it a strong weight
      reasons.push(`Your high energy costs (currently ${energy_cost_percentage_of_expenses.toFixed(1)}% of monthly expenses) are a significant drain. This power solution investment is highly prioritized as it will likely lead to substantial operational savings and improved stability.`);
      actionable_steps.push("Calculate the exact ROI from energy savings over the equipment's lifespan.", "Ensure proper installation and regular maintenance for longevity.");
    }

    if (approveConditionsMet > 0) {
      recommendation = 'APPROVE';
      if (reasons.length === 0) reasons.push("Your business is in a strong position for this investment."); // Fallback if no specific reasons added yet
    } else {
      // --- C. WAIT Conditions (Default if not REJECT or strong APPROVE) ---
      recommendation = 'WAIT';
      if (monthly_profit_increase <= 0) {
        reasons.push("The expected financial impact (revenue increase + expense decrease) is not positive, indicating the investment might not pay for itself.");
        actionable_steps.push("Re-evaluate the potential benefits of this equipment. Can it truly increase revenue or decrease expenses significantly?");
      } else if (payback_months > 12) {
        reasons.push(`The estimated payback period of ${payback_months.toFixed(1)} months is longer than ideal, suggesting a slower return on investment.`);
        actionable_steps.push("Explore ways to accelerate the return on investment, such as increasing sales targets or finding more cost-effective equipment.");
      }
      if (profit_margin < 15) {
        reasons.push(`Your current profit margin (${profit_margin.toFixed(1)}%) is below the recommended threshold for new investments.`);
        actionable_steps.push("Focus on improving your overall business profitability before committing to new equipment.");
      }
      if (savings_buffer_months < 2) {
        reasons.push(`Your savings buffer (${savings_buffer_months.toFixed(1)} months) is less than the recommended 2 months of expenses, making new investments risky.`);
        actionable_steps.push("Build up your emergency savings to at least 2 months of operational expenses.");
      }
      if (finalExistingDebtLoadMonthlyRepayments > (0.15 * monthly_revenue) && finalExistingDebtLoadMonthlyRepayments <= (0.30 * monthly_revenue)) {
        reasons.push(`Your existing debt load (₦${finalExistingDebtLoadMonthlyRepayments.toLocaleString()} monthly) is moderate. Adding more debt might strain your cash flow.`);
        actionable_steps.push("Consider reducing existing debts or exploring financing options with more favorable terms.");
      }
      if (finalFinancingRequired && finalFinancingInterestRateAnnualPercentage > 25) {
        reasons.push(`The estimated annual interest rate for financing (${finalFinancingInterestRateAnnualPercentage}%) is quite high, significantly increasing the total cost of the equipment.`);
        actionable_steps.push("Seek alternative financing options with lower interest rates or consider delaying the purchase until better terms are available.");
      }
      if (finalFinancingRequired && finalFinancingTermMonths > 36) { // Example: long term for small business
        reasons.push(`A long financing term of ${finalFinancingTermMonths} months could tie up your cash flow for an extended period.`);
        actionable_steps.push("Explore options for a shorter loan term or consider a smaller, more affordable equipment purchase.");
      }
      if (reasons.length === 0) {
        reasons.push("The current financial conditions suggest caution. While not immediately risky, there are areas for improvement before this investment.");
        actionable_steps.push("Review your business plan and financial projections. Consider a phased approach to investment.");
      }
    }
  }

  // Ensure actionable steps are unique and relevant
  actionable_steps = Array.from(new Set(actionable_steps));

  return {
    decision: {
      recommendation,
      reasoning,
      actionable_steps,
      financial_snapshot: financialData,
      estimated_equipment_cost: finalEstimatedEquipmentCost,
      expected_revenue_increase_monthly: finalExpectedRevenueIncreaseMonthly,
      expected_expense_decrease_monthly: finalExpectedExpenseDecreaseMonthly,
      equipment_lifespan_months: equipmentLifespanMonths, // This was not prompted, so it might be undefined
      is_critical_replacement: finalIsCriticalReplacement,
      is_power_solution: finalIsPowerSolution,
      current_energy_cost_monthly: finalCurrentEnergyCostMonthly,
      has_diversified_revenue_streams: finalHasDiversifiedRevenueStreams,
      existing_debt_load_monthly_repayments: finalExistingDebtLoadMonthlyRepayments,
      financing_required: finalFinancingRequired,
      financing_interest_rate_annual_percentage: finalFinancingInterestRateAnnualPercentage,
      financing_term_months: finalFinancingTermMonths,
    }
  };
}