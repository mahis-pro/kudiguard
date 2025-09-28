import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response('Unauthorized', {
      status: 401,
      headers: corsHeaders,
    });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: authHeader },
      },
    },
  );

  try {
    const { data: { user } } = await supabaseClient.auth.getUser(); 
    if (!user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const {
      question,
      monthlyRevenue,
      monthlyExpenses,
      currentSavings = 0,
      staffPayroll = 0,
      inventoryValue = 0,
      outstandingDebts = 0,
      receivables = 0,
      equipmentInvestment = 0,
      marketingSpend = 0,
      ownerWithdrawals = 0,
      businessAge = 0,
      industryType = 'General',
    } = await req.json();

    // --- Core Financial Calculations ---
    const netIncome = monthlyRevenue - monthlyExpenses; // Net income before owner withdrawals for some calculations
    const netIncomeAfterWithdrawals = monthlyRevenue - monthlyExpenses - ownerWithdrawals;

    // --- Decision Logic Variables ---
    let decisionResultText: string;
    let decisionStatus: 'success' | 'warning' | 'danger';
    let explanation: string;
    let nextSteps: string[] = [];
    let decisionFlowIdentified: string | null = null;

    // --- Identify Decision Flow based on question ---
    const lowerCaseQuestion = question.toLowerCase();

    if (lowerCaseQuestion.includes('hire staff') || lowerCaseQuestion.includes('recruit worker') || lowerCaseQuestion.includes('add employee')) {
      decisionFlowIdentified = 'hire_staff';
    } else if (lowerCaseQuestion.includes('pay salary') || lowerCaseQuestion.includes('pay staff') || lowerCaseQuestion.includes('cover payroll')) {
      decisionFlowIdentified = 'pay_salary';
    } else if (lowerCaseQuestion.includes('buy equipment') || lowerCaseQuestion.includes('purchase machine') || lowerCaseQuestion.includes('acquire asset')) {
      decisionFlowIdentified = 'buy_equipment';
    } else if (lowerCaseQuestion.includes('increase marketing') || lowerCaseQuestion.includes('spend more on ads') || lowerCaseQuestion.includes('promotion budget')) {
      decisionFlowIdentified = 'increase_marketing';
    } else if (lowerCaseQuestion.includes('take loan') || lowerCaseQuestion.includes('borrow money') || lowerCaseQuestion.includes('credit facility')) {
      decisionFlowIdentified = 'take_loan';
    } else if (lowerCaseQuestion.includes('cut cost') || lowerCaseQuestion.includes('reduce expenses') || lowerCaseQuestion.includes('save money')) {
      decisionFlowIdentified = 'reduce_expenses';
    } else if (lowerCaseQuestion.includes('buy more stock') || lowerCaseQuestion.includes('expand inventory') || lowerCaseQuestion.includes('restock')) {
      decisionFlowIdentified = 'expand_inventory';
    } else if (lowerCaseQuestion.includes('save') || lowerCaseQuestion.includes('increase savings') || lowerCaseQuestion.includes('reserve funds')) {
      decisionFlowIdentified = 'save_money';
    } else if (lowerCaseQuestion.includes('take money out') || lowerCaseQuestion.includes('owner withdrawal') || lowerCaseQuestion.includes('cash out')) {
      decisionFlowIdentified = 'withdraw_funds';
    } else if (lowerCaseQuestion.includes('expand') || lowerCaseQuestion.includes('grow') || lowerCaseQuestion.includes('new shop')) {
      decisionFlowIdentified = 'expand_business'; // Keep existing expansion logic
    }

    // --- Apply Decision Logic based on identified flow ---
    switch (decisionFlowIdentified) {
      case 'hire_staff':
        if (netIncomeAfterWithdrawals > (2 * staffPayroll) && currentSavings > (3 * staffPayroll)) {
          decisionResultText = "Recommended";
          decisionStatus = "success";
          explanation = `Based on your healthy net income of ₦${netIncomeAfterWithdrawals.toLocaleString()} and strong savings of ₦${currentSavings.toLocaleString()}, hiring staff is recommended.`;
          nextSteps = [
            "Clearly define the role and responsibilities.",
            "Start with part-time or contract staff to test the impact.",
            "Monitor financial performance closely for the first 3-6 months."
          ];
        } else if (netIncomeAfterWithdrawals > staffPayroll) {
          decisionResultText = "Cautious";
          decisionStatus = "warning";
          explanation = `While you have some net income (₦${netIncomeAfterWithdrawals.toLocaleString()}), your current savings (₦${currentSavings.toLocaleString()}) suggest caution before hiring.`;
          nextSteps = [
            "Increase monthly revenue by at least 20% consistently.",
            "Build your emergency savings to cover at least 3 months of expenses.",
            "Optimize existing operations to reduce workload before hiring."
          ];
        } else {
          decisionResultText = "Not Advisable";
          decisionStatus = "danger";
          explanation = `Your current financial position (net income of ₦${netIncomeAfterWithdrawals.toLocaleString()} and savings of ₦${currentSavings.toLocaleString()}) makes hiring staff not advisable at this time.`;
          nextSteps = [
            "Focus on increasing profitability and reducing expenses.",
            "Prioritize building a substantial emergency fund."
          ];
        }
        break;

      case 'pay_salary':
        if (netIncomeAfterWithdrawals >= staffPayroll) {
          decisionResultText = "Recommended";
          decisionStatus = "success";
          explanation = `Your net income of ₦${netIncomeAfterWithdrawals.toLocaleString()} is sufficient to cover the staff payroll of ₦${staffPayroll.toLocaleString()}.`;
          nextSteps = [
            "Ensure consistent cash flow to maintain payroll.",
            "Consider setting aside a payroll buffer in your savings.",
            "Review staff productivity and efficiency regularly."
          ];
        } else if (netIncomeAfterWithdrawals + currentSavings >= staffPayroll) {
          decisionResultText = "Cautious (dip into savings)";
          decisionStatus = "warning";
          explanation = `Your net income (₦${netIncomeAfterWithdrawals.toLocaleString()}) is not enough to cover payroll (₦${staffPayroll.toLocaleString()}), requiring you to dip into savings (₦${currentSavings.toLocaleString()}).`;
          nextSteps = [
            "Identify reasons for low net income and address them.",
            "Prioritize increasing revenue or reducing other expenses.",
            "Avoid consistent reliance on savings for payroll."
          ];
        } else {
          decisionResultText = "Not Advisable";
          decisionStatus = "danger";
          explanation = `Your current financial position makes covering staff payroll of ₦${staffPayroll.toLocaleString()} challenging without significant risk to your business.`;
          nextSteps = [
            "Urgently review your business model for profitability.",
            "Consider temporary measures to reduce payroll costs if possible.",
            "Seek financial advice on restructuring your expenses."
          ];
        }
        break;

      case 'buy_equipment':
        if (currentSavings >= equipmentInvestment && netIncomeAfterWithdrawals > 0) {
          decisionResultText = "Recommended";
          decisionStatus = "success";
          explanation = `Your financials suggest that purchasing equipment worth ₦${equipmentInvestment.toLocaleString()} is recommended, given your savings (₦${currentSavings.toLocaleString()}) and positive net income (₦${netIncomeAfterWithdrawals.toLocaleString()}).`;
          nextSteps = [
            "Research equipment options thoroughly for best value.",
            "Ensure the equipment directly contributes to increased revenue or efficiency.",
            "Factor in maintenance costs and depreciation."
          ];
        } else if (currentSavings >= 0.5 * equipmentInvestment) {
          decisionResultText = "Cautious";
          decisionStatus = "warning";
          explanation = `You have some savings (₦${currentSavings.toLocaleString()}) to cover part of the equipment cost (₦${equipmentInvestment.toLocaleString()}), but proceed with caution.`;
          nextSteps = [
            "Consider financing options or saving more before purchase.",
            "Evaluate if the equipment is absolutely essential for immediate operations.",
            "Look for used or refurbished options to reduce initial cost."
          ];
        } else {
          decisionResultText = "Not Advisable";
          decisionStatus = "danger";
          explanation = `Purchasing equipment worth ₦${equipmentInvestment.toLocaleString()} is not advisable at this time, as your current savings (₦${currentSavings.toLocaleString()}) are insufficient.`;
          nextSteps = [
            "Prioritize building your savings significantly.",
            "Explore alternative solutions or temporary rentals if urgent."
          ];
        }
        break;

      case 'increase_marketing':
        const marketingToRevenueRatio = monthlyRevenue > 0 ? marketingSpend / monthlyRevenue : 0;
        if (marketingToRevenueRatio < 0.1 && netIncomeAfterWithdrawals > 0) {
          decisionResultText = "Recommended";
          decisionStatus = "success";
          explanation = `With a healthy net income (₦${netIncomeAfterWithdrawals.toLocaleString()}) and relatively low marketing spend (₦${marketingSpend.toLocaleString()}), increasing marketing is recommended to boost visibility.`;
          nextSteps = [
            "Develop a clear marketing strategy with measurable goals.",
            "Start with small, targeted campaigns and track ROI.",
            "Explore cost-effective digital marketing channels."
          ];
        } else if (marketingToRevenueRatio < 0.2) {
          decisionResultText = "Cautious";
          decisionStatus = "warning";
          explanation = `Your current marketing spend (₦${marketingSpend.toLocaleString()}) is moderate. Proceed with caution if increasing further, especially if net income (₦${netIncomeAfterWithdrawals.toLocaleString()}) is tight.`;
          nextSteps = [
            "Analyze the effectiveness of your current marketing efforts.",
            "Optimize existing campaigns before increasing budget.",
            "Ensure any new spend is directly tied to revenue generation."
          ];
        } else {
          decisionResultText = "Not Advisable";
          decisionStatus = "danger";
          explanation = `Increasing marketing spend (currently ₦${marketingSpend.toLocaleString()}) is not advisable. Your current spend is already high relative to revenue, or your net income (₦${netIncomeAfterWithdrawals.toLocaleString()}) is insufficient.`;
          nextSteps = [
            "Review and cut ineffective marketing channels.",
            "Focus on organic growth and customer retention.",
            "Improve overall profitability before allocating more to marketing."
          ];
        }
        break;

      case 'take_loan':
        const debtRatio = monthlyRevenue > 0 ? outstandingDebts / monthlyRevenue : Infinity;
        if (debtRatio < 0.3 && netIncomeAfterWithdrawals > 0) {
          decisionResultText = "Recommended";
          decisionStatus = "success";
          explanation = `Your debt-to-revenue ratio is healthy (${(debtRatio * 100).toFixed(1)}%) and you have a positive net income (₦${netIncomeAfterWithdrawals.toLocaleString()}), making a loan manageable.`;
          nextSteps = [
            "Only borrow what is absolutely necessary for a clear growth opportunity.",
            "Carefully compare interest rates and repayment terms from multiple lenders.",
            "Ensure the loan's purpose will directly generate more revenue or reduce costs."
          ];
        } else if (debtRatio < 0.5) {
          decisionResultText = "Cautious";
          decisionStatus = "warning";
          explanation = `Your debt-to-revenue ratio (${(debtRatio * 100).toFixed(1)}%) is moderate. Proceed with caution if taking a loan, as it could strain your finances.`;
          nextSteps = [
            "Evaluate if the loan is truly essential or if alternatives exist.",
            "Focus on reducing existing debts before taking on new ones.",
            "Ensure a clear repayment plan and sufficient cash flow."
          ];
        } else {
          decisionResultText = "Not Advisable";
          decisionStatus = "danger";
          explanation = `Your current debt-to-revenue ratio (${(debtRatio * 100).toFixed(1)}%) is high, making a new loan not advisable at this time.`;
          nextSteps = [
            "Prioritize aggressive debt reduction strategies.",
            "Avoid taking on any new financial commitments.",
            "Focus on increasing revenue and improving cash flow."
          ];
        }
        break;

      case 'reduce_expenses':
        const expenseRatio = monthlyRevenue > 0 ? monthlyExpenses / monthlyRevenue : Infinity;
        if (expenseRatio > 0.7) {
          decisionResultText = "Recommended";
          decisionStatus = "success";
          explanation = `Your expenses (₦${monthlyExpenses.toLocaleString()}) are very high relative to your revenue (₦${monthlyRevenue.toLocaleString()}), making expense reduction highly recommended.`;
          nextSteps = [
            "Conduct a detailed review of all business expenses.",
            "Identify non-essential costs and areas for negotiation.",
            "Implement cost-cutting measures immediately and monitor their impact."
          ];
        } else if (expenseRatio > 0.5) {
          decisionResultText = "Cautious";
          decisionStatus = "warning";
          explanation = `Your expenses (₦${monthlyExpenses.toLocaleString()}) are a significant portion of your revenue (₦${monthlyRevenue.toLocaleString()}). Reviewing them cautiously is advised.`;
          nextSteps = [
            "Look for small, incremental savings without impacting operations.",
            "Negotiate better deals with suppliers or service providers.",
            "Optimize resource usage to reduce waste."
          ];
        } else {
          decisionResultText = "Not Advisable";
          decisionStatus = "success"; // Not advisable to cut if already efficient
          explanation = `Your expenses (₦${monthlyExpenses.toLocaleString()}) are well-managed relative to your revenue (₦${monthlyRevenue.toLocaleString()}). Aggressive cuts may not be necessary.`;
          nextSteps = [
            "Continue to monitor expenses regularly for efficiency.",
            "Focus on growth strategies rather than drastic cost-cutting.",
            "Ensure quality of service/product is not compromised by cuts."
          ];
        }
        break;

      case 'expand_inventory':
        if (netIncomeAfterWithdrawals > 0 && currentSavings > (0.5 * inventoryValue)) {
          decisionResultText = "Recommended";
          decisionStatus = "success";
          explanation = `With a positive net income (₦${netIncomeAfterWithdrawals.toLocaleString()}) and good savings (₦${currentSavings.toLocaleString()}) relative to your inventory, expanding stock is recommended.`;
          nextSteps = [
            "Analyze sales trends to identify high-demand products.",
            "Gradually increase inventory for popular items to avoid overstocking.",
            "Negotiate favorable terms with suppliers for bulk purchases."
          ];
        } else if (currentSavings > (0.3 * inventoryValue)) {
          decisionResultText = "Cautious";
          decisionStatus = "warning";
          explanation = `Your savings (₦${currentSavings.toLocaleString()}) provide some buffer, but expanding inventory significantly requires caution.`;
          nextSteps = [
            "Focus on optimizing existing inventory before expanding.",
            "Consider a smaller, targeted expansion for proven best-sellers.",
            "Ensure you have a clear plan to sell increased stock quickly."
          ];
        } else {
          decisionResultText = "Not Advisable";
          decisionStatus = "danger";
          explanation = `Expanding inventory is not advisable at this time, as your current savings (₦${currentSavings.toLocaleString()}) are insufficient to support a larger stock.`;
          nextSteps = [
            "Prioritize building your emergency savings.",
            "Focus on selling existing inventory efficiently.",
            "Review your purchasing strategy to avoid tying up capital."
          ];
        }
        break;

      case 'save_money':
        if (netIncomeAfterWithdrawals > 0) {
          decisionResultText = "Recommended";
          decisionStatus = "success";
          explanation = `With a positive net income of ₦${netIncomeAfterWithdrawals.toLocaleString()}, increasing your savings is highly recommended.`;
          nextSteps = [
            "Set a specific savings goal (e.g., 3-6 months of expenses).",
            "Automate a portion of your net income to a separate savings account.",
            "Regularly review your budget to find more opportunities to save."
          ];
        } else if (netIncomeAfterWithdrawals === 0) {
          decisionResultText = "Cautious (break-even)";
          decisionStatus = "warning";
          explanation = `Your business is currently breaking even. While saving is important, focus on increasing profitability first.`;
          nextSteps = [
            "Identify strategies to increase revenue or reduce expenses to create a surplus.",
            "Even small, consistent savings can make a difference.",
            "Review your pricing strategy to improve margins."
          ];
        } else {
          decisionResultText = "Not Advisable";
          decisionStatus = "danger";
          explanation = `Your business is currently operating at a loss. Saving money is not feasible until profitability improves.`;
          nextSteps = [
            "Urgently address the reasons for your business losses.",
            "Focus on increasing revenue and drastically cutting non-essential expenses.",
            "Avoid new financial commitments until stable."
          ];
        }
        break;

      case 'withdraw_funds':
        if (netIncomeAfterWithdrawals > ownerWithdrawals) {
          decisionResultText = "Recommended";
          decisionStatus = "success";
          explanation = `Your net income (₦${netIncomeAfterWithdrawals.toLocaleString()}) is sufficient to cover your planned withdrawal of ₦${ownerWithdrawals.toLocaleString()}.`;
          nextSteps = [
            "Ensure withdrawals are consistent and planned.",
            "Maintain a clear distinction between business and personal finances.",
            "Consider reinvesting a portion of profits back into the business."
          ];
        } else if (currentSavings > ownerWithdrawals) {
          decisionResultText = "Cautious (use savings)";
          decisionStatus = "warning";
          explanation = `Your net income (₦${netIncomeAfterWithdrawals.toLocaleString()}) is not enough to cover your withdrawal (₦${ownerWithdrawals.toLocaleString()}), requiring you to use your current savings (₦${currentSavings.toLocaleString()}).`;
          nextSteps = [
            "Evaluate if the withdrawal is absolutely necessary at this time.",
            "Focus on increasing business profitability to support future withdrawals.",
            "Avoid depleting emergency savings for personal use."
          ];
        } else {
          decisionResultText = "Not Advisable";
          decisionStatus = "danger";
          explanation = `Withdrawing ₦${ownerWithdrawals.toLocaleString()} is not advisable, as your net income (₦${netIncomeAfterWithdrawals.toLocaleString()}) and savings (₦${currentSavings.toLocaleString()}) are insufficient.`;
          nextSteps = [
            "Prioritize improving business cash flow and profitability.",
            "Avoid personal withdrawals that could jeopardize business stability.",
            "Explore personal budgeting strategies to reduce reliance on business funds."
          ];
        }
        break;

      case 'expand_business': // Existing logic for general expansion
        const expansionProfitabilityThreshold = monthlyRevenue * 0.15;
        const expansionSavingsThreshold = monthlyExpenses * 3;
        if (netIncomeAfterWithdrawals > expansionProfitabilityThreshold && currentSavings > expansionSavingsThreshold) {
          decisionResultText = "Do it";
          decisionStatus = "success";
          explanation = `Your business shows strong financial health with a net income of ₦${netIncomeAfterWithdrawals.toLocaleString()} and substantial savings of ₦${currentSavings.toLocaleString()}. You are well-positioned for expansion.`;
          nextSteps = [
            "Develop a detailed expansion plan and budget.",
            "Start with a phased approach to minimize risk.",
            "Continuously monitor market demand and financial impact."
          ];
        } else {
          decisionResultText = "Wait";
          decisionStatus = "warning";
          explanation = `Expansion requires significant capital and stable cash flow. With your current net income of ₦${netIncomeAfterWithdrawals.toLocaleString()} and savings of ₦${currentSavings.toLocaleString()}, it's advisable to wait and strengthen your finances.`;
          nextSteps = [
            "Focus on increasing profitability of existing operations.",
            "Build your current savings to a higher level, targeting 4-6 months of expenses.",
            "Research market opportunities thoroughly before committing to expansion."
          ];
        }
        break;

      default: // General advice if no specific question matches
        if (netIncomeAfterWithdrawals <= 0) {
          decisionResultText = "Urgent Review";
          decisionStatus = "danger";
          explanation = "Your expenses currently exceed or equal your income. It's crucial to address this immediately to prevent further financial strain.";
          nextSteps.push("Identify and reduce non-essential expenses.", "Explore ways to increase monthly revenue.", "Avoid new financial commitments.");
        } else {
          decisionResultText = "Proceed with caution";
          decisionStatus = "warning";
          explanation = `You have a net income of ₦${netIncomeAfterWithdrawals.toLocaleString()}. This provides some flexibility, but careful planning is still needed.`;
          nextSteps.push("Maintain a detailed record of all income and expenses.", "Regularly review your financial position.", "Consider setting a clear financial goal for your business.");
        }
        break;
    }

    // --- Financial Health Scoring System ---
    let financialHealthScore = 50; // Base score

    // Adjust based on Net Income (profitability)
    if (netIncomeAfterWithdrawals > (monthlyRevenue * 0.2)) { // Very profitable (e.g., >20% net margin)
      financialHealthScore += 20;
    } else if (netIncomeAfterWithdrawals > 0) { // Profitable
      financialHealthScore += 10;
    } else if (netIncomeAfterWithdrawals < -(monthlyExpenses * 0.2)) { // Significant loss (e.g., >20% loss margin)
      financialHealthScore -= 25;
    } else if (netIncomeAfterWithdrawals < 0) { // Small loss
      financialHealthScore -= 10;
    }

    // Adjust based on Current Savings (emergency fund coverage)
    const monthsOfExpensesInSavings = monthlyExpenses > 0 ? currentSavings / monthlyExpenses : 0;
    if (monthsOfExpensesInSavings >= 6) { // Excellent savings
      financialHealthScore += 20;
    } else if (monthsOfExpensesInSavings >= 3) { // Good savings
      financialHealthScore += 10;
    } else if (monthsOfExpensesInSavings < 1) { // Low/no savings
      financialHealthScore -= 15;
    }

    // Adjust based on Staff Payroll (if applicable and significant)
    if (staffPayroll > 0 && monthlyRevenue > 0) {
      const payrollToRevenueRatio = staffPayroll / monthlyRevenue;
      if (payrollToRevenueRatio > 0.4) { // High payroll burden (e.g., >40% of revenue)
        financialHealthScore -= 10;
      } else if (payrollToRevenueRatio < 0.2) { // Efficient payroll (e.g., <20% of revenue)
        financialHealthScore += 5;
      }
    }

    // Adjust based on Outstanding Debts
    if (outstandingDebts > 0 && monthlyRevenue > 0) {
      const debtToRevenueRatio = outstandingDebts / monthlyRevenue;
      if (debtToRevenueRatio > 1) { // Debts exceed a month's revenue
        financialHealthScore -= 15;
      } else if (debtToRevenueRatio > 0.5) { // Debts are significant
        financialHealthScore -= 5;
      }
    }

    // Adjust based on Receivables
    if (receivables > 0 && monthlyRevenue > 0) {
      const receivablesToRevenueRatio = receivables / monthlyRevenue;
      if (receivablesToRevenueRatio > 0.3) { // High receivables, potential cash flow issue
        financialHealthScore -= 5;
      } else if (receivablesToRevenueRatio < 0.1) { // Low receivables, good cash flow
        financialHealthScore += 5;
      }
    }

    // Clamp score between 0 and 100
    financialHealthScore = Math.max(0, Math.min(100, financialHealthScore));

    // --- Score Interpretation ---
    let scoreInterpretation: string;
    if (financialHealthScore < 40) {
      scoreInterpretation = "Critical – urgent financial restructuring needed. Your business faces significant risks.";
    } else if (financialHealthScore < 60) {
      scoreInterpretation = "Weak – unstable finances, improve savings and debt handling. Focus on core stability.";
    } else if (financialHealthScore < 80) {
      scoreInterpretation = "Fair – manageable but requires consistent improvements. You have potential for growth with careful planning.";
    } else {
      scoreInterpretation = "Strong – healthy finances, room for growth and investments. Your business is well-positioned.";
    }

    // --- Store Decision in Supabase ---
    const { error: dbError } = await supabaseClient
      .from('decisions')
      .insert({
        user_id: user.id,
        question: question,
        monthly_revenue: monthlyRevenue,
        monthly_expenses: monthlyExpenses,
        current_savings: currentSavings,
        staff_payroll: staffPayroll,
        inventory_value: inventoryValue,
        outstanding_debts: outstandingDebts,
        receivables: receivables,
        equipment_investment: equipmentInvestment,
        marketing_spend: marketingSpend,
        owner_withdrawals: ownerWithdrawals,
        business_age: businessAge,
        industry_type: industryType,
        decision_result: decisionResultText,
        decision_status: decisionStatus,
        explanation: explanation,
        next_steps: nextSteps,
        financial_health_score: financialHealthScore,
        score_interpretation: scoreInterpretation,
        accepted_or_rejected: null,
      });

    if (dbError) {
      console.error('Error saving decision to DB:', dbError);
    }

    // --- Return Response ---
    return new Response(JSON.stringify({
      success: true,
      decision_result: decisionResultText,
      decision_status: decisionStatus,
      explanation: explanation,
      next_steps: nextSteps,
      financial_health_score: financialHealthScore,
      score_interpretation: scoreInterpretation,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Edge Function Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});