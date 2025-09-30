// supabase/functions/decision-engine/decisions/inventory.ts

import { FinancialData, ProfileData, DecisionFunctionReturn } from '../schemas.ts';
import { ERROR_CODES, SEVERITY } from '../constants.ts';
import { CustomError } from '../errors.ts';

export function makeInventoryDecision(
  financialData: FinancialData,
  profileData: ProfileData,
  currentPayload: Record<string, any>,
  question: string,
  requestId: string,
): DecisionFunctionReturn {
  let estimatedInventoryCost = currentPayload?.estimated_inventory_cost;
  let inventoryTurnoverDays = currentPayload?.inventory_turnover_days;
  let outstandingSupplierDebts = currentPayload?.outstanding_supplier_debts;
  let supplierCreditTermsDays = currentPayload?.supplier_credit_terms_days;
  let averageReceivablesTurnoverDays = currentPayload?.average_receivables_turnover_days;
  let supplierDiscountPercentage = currentPayload?.supplier_discount_percentage;
  let storageCostPercentageOfOrder = currentPayload?.storage_cost_percentage_of_order;

  const { monthly_revenue, monthly_expenses, current_savings } = financialData;
  const net_income = monthly_revenue - monthly_expenses;
  const isFmcgVendor = profileData.is_fmcg_vendor;
  
  const reasons = [];
  let approveScore = 0;
  let waitScore = 0;
  let rejectScore = 0;
  let actionable_steps: string[] = [];
  let recommendation: 'APPROVE' | 'WAIT' | 'REJECT';
  let reasoning: string; // Declare reasoning here

  // --- Data Gathering Sequence for Inventory ---
  if (estimatedInventoryCost === undefined || estimatedInventoryCost === null) {
    return {
      decision: null as any,
      dataNeeded: {
        field: "estimated_inventory_cost",
        prompt: "What is the estimated cost of the new inventory you want to purchase (in ₦)?",
        intent_context: { 
          intent: "inventory", 
          decision_type: "inventory_purchase",
          current_payload: currentPayload 
        },
      }
    };
  }
  if (inventoryTurnoverDays === undefined || inventoryTurnoverDays === null) {
    return {
      decision: null as any,
      dataNeeded: {
        field: "inventory_turnover_days",
        prompt: "What is your average inventory turnover in days (how long it takes to sell all your stock)?",
        intent_context: { 
          intent: "inventory", 
          decision_type: "inventory_purchase",
          current_payload: currentPayload 
        },
      }
    };
  }
  if (outstandingSupplierDebts === undefined || outstandingSupplierDebts === null) {
    return {
      decision: null as any,
      dataNeeded: {
        field: "outstanding_supplier_debts",
        prompt: "What is your total outstanding debt to suppliers (in ₦)?",
        intent_context: { 
          intent: "inventory", 
          decision_type: "inventory_purchase",
          current_payload: currentPayload 
        },
      }
    };
  }

  // Conditional data requests for Rule 2 (FMCG specific)
  if (isFmcgVendor) {
    if (supplierCreditTermsDays === undefined || supplierCreditTermsDays === null) {
      return {
        decision: null as any,
        dataNeeded: {
          field: "supplier_credit_terms_days",
          prompt: "What are your supplier's credit terms in days (how long do you have to pay)?",
          intent_context: { 
            intent: "inventory", 
            decision_type: "inventory_purchase",
            current_payload: currentPayload 
          },
        }
      };
    }
    if (averageReceivablesTurnoverDays === undefined || averageReceivablesTurnoverDays === null) {
      return {
        decision: null as any,
        dataNeeded: {
          field: "average_receivables_turnover_days",
          prompt: "What is your average receivables turnover in days (how long customers take to pay you)?",
          intent_context: { 
            intent: "inventory", 
            decision_type: "inventory_purchase",
            current_payload: currentPayload 
          },
        }
      };
    }
  }

  // Conditional data requests for Additional Case (Bulk Purchase)
  if (supplierDiscountPercentage !== undefined && supplierDiscountPercentage !== null) {
    if (storageCostPercentageOfOrder === undefined || storageCostPercentageOfOrder === null) {
      return {
        decision: null as any,
        dataNeeded: {
          field: "storage_cost_percentage_of_order",
          prompt: "What is the estimated storage cost for this bulk order as a percentage of the order value (e.g., '5' for 5%)?",
          intent_context: { 
            intent: "inventory", 
            decision_type: "inventory_purchase",
            current_payload: currentPayload 
          },
        }
      };
    }
  }
  // --- End Data Gathering Sequence ---

  // --- Final Validation before Rule Evaluation ---
  if (estimatedInventoryCost === undefined || inventoryTurnoverDays === undefined || outstandingSupplierDebts === undefined ||
      (isFmcgVendor && (supplierCreditTermsDays === undefined || averageReceivablesTurnoverDays === undefined)) ||
      (supplierDiscountPercentage !== undefined && storageCostPercentageOfOrder === undefined)) {
    throw new CustomError(
      ERROR_CODES.MISSING_REQUIRED_FIELD,
      "Critical inventory data is missing after collection. Please restart the conversation.",
      SEVERITY.HIGH,
      500
    );
  }

  // Type assertion after validation
  const finalEstimatedInventoryCost = estimatedInventoryCost!;
  const finalInventoryTurnoverDays = inventoryTurnoverDays!;
  const finalOutstandingSupplierDebts = outstandingSupplierDebts!;
  const finalSupplierCreditTermsDays = isFmcgVendor ? supplierCreditTermsDays! : undefined;
  const finalAverageReceivablesTurnoverDays = isFmcgVendor ? averageReceivablesTurnoverDays! : undefined;
  const finalSupplierDiscountPercentage = supplierDiscountPercentage;
  const finalStorageCostPercentageOfOrder = storageCostPercentageOfOrder;


  // --- Rule Evaluation ---

  // Rule 3: Reject conditions (highest priority)
  if (finalOutstandingSupplierDebts > (0.40 * monthly_revenue)) { // Outstanding supplier debts > 40% of monthly revenue
    rejectScore++;
    reasons.push(`Your outstanding supplier debts (₦${finalOutstandingSupplierDebts.toLocaleString()}) are more than 40% of your monthly revenue (₦${monthly_revenue.toLocaleString()}).`);
  }
  // Simplified: Cash flow shows 2 consecutive negative months -> check if latest net income is negative
  if (net_income < 0) {
    rejectScore++;
    reasons.push(`Your business currently has a negative net income (₦${net_income.toLocaleString()}).`);
  }

  if (rejectScore > 0) {
    recommendation = 'REJECT';
    reasoning = `Purchasing new inventory now would be too risky for your business. Key reasons: ${reasons.join(' ')}.`;
    actionable_steps = [
      'Prioritize paying down outstanding supplier debts.',
      'Focus on increasing revenue and reducing expenses to achieve positive net income.',
      'Review your current inventory to identify slow-moving items and clear them out.'
    ];
  } else {
    // If not rejected, evaluate other rules for APPROVE/WAIT
    
    // Rule 1: Restock if inventory turnover < 30 days AND cash reserves cover 120% of order value.
    const cashReservesCoverOrder = current_savings >= (1.20 * finalEstimatedInventoryCost);
    if (finalInventoryTurnoverDays < 30 && cashReservesCoverOrder) {
      approveScore++;
      reasons.push(`Your inventory turnover is fast (${finalInventoryTurnoverDays} days) and your cash reserves (₦${current_savings.toLocaleString()}) comfortably cover 120% of the order value (₦${(1.20 * finalEstimatedInventoryCost).toLocaleString()}).`);
    } else {
      if (finalInventoryTurnoverDays >= 30) reasons.push(`Your inventory turnover is slow (${finalInventoryTurnoverDays} days).`);
      if (!cashReservesCoverOrder) reasons.push(`Your cash reserves (₦${current_savings.toLocaleString()}) do not cover 120% of the order value (₦${(1.20 * finalEstimatedInventoryCost).toLocaleString()}).`);
      waitScore++;
    }

    // Rule 2: For FMCG vendors, allow restock on credit if supplier terms ≤ 30 days and average receivables turnover < 25 days.
    if (isFmcgVendor && finalSupplierCreditTermsDays !== undefined && finalAverageReceivablesTurnoverDays !== undefined) {
      if (finalSupplierCreditTermsDays <= 30 && finalAverageReceivablesTurnoverDays < 25) {
        approveScore++; // This rule can also contribute to approval
        reasons.push(`As an FMCG vendor, your supplier credit terms (${finalSupplierCreditTermsDays} days) are favorable and your receivables turnover is efficient (${finalAverageReceivablesTurnoverDays} days).`);
      } else {
        if (finalSupplierCreditTermsDays > 30) reasons.push(`As an FMCG vendor, your supplier credit terms (${finalSupplierCreditTermsDays} days) are longer than ideal.`);
        if (finalAverageReceivablesTurnoverDays >= 25) reasons.push(`As an FMCG vendor, your average receivables turnover (${finalAverageReceivablesTurnoverDays} days) is slower than recommended.`);
        waitScore++;
      }
    }

    // Additional Case: Bulk-purchase recommendation if supplier discount ≥ 15% and storage cost ≤ 5% of order value.
    if (finalSupplierDiscountPercentage !== undefined && finalStorageCostPercentageOfOrder !== undefined) {
      if (finalSupplierDiscountPercentage >= 15 && finalStorageCostPercentageOfOrder <= 5) {
        reasons.push(`Consider a bulk purchase due to a significant supplier discount (${finalSupplierDiscountPercentage}%) and low storage costs (${finalStorageCostPercentageOfOrder}%).`);
        actionable_steps.push('Explore the possibility of a bulk purchase to maximize savings from the supplier discount.');
      } else {
        if (finalSupplierDiscountPercentage < 15) reasons.push(`The supplier discount (${finalSupplierDiscountPercentage}%) is not substantial enough for a bulk purchase recommendation.`);
        if (finalStorageCostPercentageOfOrder > 5) reasons.push(`Storage costs (${finalStorageCostPercentageOfOrder}%) are too high to justify a bulk purchase at this time.`);
      }
    }

    if (approveScore > 0 && waitScore === 0) { // If at least one approve condition met and no wait conditions
      recommendation = 'APPROVE';
      reasoning = `Your business is in a strong position to restock. ${reasons.join(' ')}.`;
      actionable_steps.unshift('Confirm current market demand to avoid overstocking.', 'Negotiate best possible terms with suppliers.');
    } else {
      recommendation = 'WAIT';
      reasoning = `It's advisable to wait before restocking. Key considerations: ${reasons.join(' ')}.`;
      actionable_steps.unshift('Review your sales data to understand demand fluctuations.', 'Improve cash flow by collecting receivables faster or reducing non-essential expenses.');
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
      estimated_inventory_cost: finalEstimatedInventoryCost,
      inventory_turnover_days: finalInventoryTurnoverDays,
      supplier_credit_terms_days: finalSupplierCreditTermsDays,
      average_receivables_turnover_days: finalAverageReceivablesTurnoverDays,
      outstanding_supplier_debts: finalOutstandingSupplierDebts,
      supplier_discount_percentage: finalSupplierDiscountPercentage,
      storage_cost_percentage_of_order: finalStorageCostPercentageOfOrder,
    }
  };
}