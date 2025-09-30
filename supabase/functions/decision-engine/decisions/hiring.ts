// supabase/functions/decision-engine/decisions/hiring.ts

import { FinancialData, DecisionFunctionReturn } from '../schemas.ts';

export function makeHiringDecision(
  financialData: FinancialData,
  currentPayload: Record<string, any>,
  question: string,
  requestId: string,
): DecisionFunctionReturn {
  let estimatedSalary = currentPayload?.estimated_salary;

  // If estimated_salary is not provided, request it from the user
  if (estimatedSalary === undefined || estimatedSalary === null) {
    console.log(`[${requestId}] Data needed: estimated_salary`);
    return {
      decision: null as any, // Placeholder, actual decision not made yet
      dataNeeded: {
        field: "estimated_salary",
        prompt: "What is the estimated monthly salary for the new hire (in ₦)?",
        intent_context: { 
          intent: "hiring", 
          decision_type: "hiring_affordability",
          current_payload: currentPayload 
        },
      }
    };
  }

  const { monthly_revenue, monthly_expenses, current_savings } = financialData;
  const net_income = monthly_revenue - monthly_expenses;
  
  const reasons = [];
  let score = 0;
  let recommendation: 'APPROVE' | 'WAIT' | 'REJECT';
  let reasoning: string; // Declare reasoning here
  let actionable_steps: string[];

  // Rule 1: Positive Net Income
  if (net_income > 0) {
    score += 1;
  } else {
    reasons.push(`Your business is not currently profitable (Net Income: ₦${net_income.toLocaleString()}).`);
  }

  // Rule 2: Savings Buffer
  if (current_savings >= monthly_expenses) {
    score += 1;
  } else {
    reasons.push(`Your savings (₦${current_savings.toLocaleString()}) are less than one month of expenses (₦${monthly_expenses.toLocaleString()}). Build a stronger safety net first.`);
  }

  // Rule 3: Affordability
  if (net_income >= 3 * estimatedSalary) {
    score += 1;
  } else {
    reasons.push(`Your net income (₦${net_income.toLocaleString()}) is not at least 3x the estimated salary (₦${(3 * estimatedSalary).toLocaleString()}) for a new hire.`);
  }

  // Determine final recommendation
  if (score === 3) {
    recommendation = 'APPROVE';
    reasoning = 'Your business shows strong financial health to support a new hire. You have positive net income, a sufficient savings buffer, and can comfortably afford the estimated salary.';
    actionable_steps = [
      'Start by hiring on a contract or part-time basis to test the impact.',
      'Create a clear job description with defined responsibilities.',
      'Ensure you have a process for payroll and tax compliance.'
    ];
  } else if (score >= 1) {
    recommendation = 'WAIT';
    reasoning = `While your business has some strengths, it's not fully ready for a new hire. The key reasons to wait are: ${reasons.join(' ')}`;
    actionable_steps = [
      'Focus on increasing revenue or decreasing non-essential costs to improve net income.',
      'Build your emergency savings to cover at least 1-3 months of expenses.',
      'Re-evaluate your hiring needs in 1-2 months.'
    ];
  } else {
    recommendation = 'REJECT';
    reasoning = `Hiring a new staff member now would be too risky for your business. The key reasons for this are: ${reasons.join(' ')}`;
    actionable_steps = [
      'Conduct a full review of your business expenses to find savings.',
      'Explore strategies to boost your monthly revenue.',
      'Focus on stabilizing the business before considering new fixed costs.'
    ];
  }

  return {
    decision: {
      recommendation,
      reasoning,
      actionable_steps: Array.from(new Set(actionable_steps)), // Ensure unique steps
      financial_snapshot: financialData,
      estimated_salary: estimatedSalary,
    }
  };
}