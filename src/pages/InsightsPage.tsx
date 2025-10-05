import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, BarChart, Info, CalendarDays, Clock, CheckCircle, XCircle, MessageCircle, Eye, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSession } from '@/components/auth/SessionContextProvider';
import FinancialHealthScoreCard from '@/components/FinancialHealthScoreCard';
import { useQuery } from '@tanstack/react-query';
import DecisionDetailsDialog from '@/components/DecisionDetailsDialog';
import FinancialTrendChart from '@/components/FinancialTrendChart'; // Import the new chart component
import { Link } from 'react-router-dom'; // Import Link for navigation

const InsightsPage = () => {
  const { userDisplayName, isLoading: sessionLoading, supabase, session } = useSession();
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState<any | null>(null);

  const userId = session?.user?.id;

  // Fetch latest financial entries (up to 2 for trend comparison)
  const { data: financialEntries, isLoading: financialLoading, error: financialError } = useQuery({
    queryKey: ['latestFinancialEntry', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('financial_entries')
        .select('monthly_revenue, monthly_expenses, current_savings, created_at') // Include created_at for charting
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(6); // Fetch up to 6 entries for better trend visualization
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const latestFinancialData = financialEntries?.[0];
  const previousFinancialData = financialEntries?.[1];

  // Helper function to determine trend
  const getTrend = (current: number, previous: number | undefined, isExpense: boolean = false) => {
    if (previous === undefined || previous === null) return 'none';
    if (current > previous) return isExpense ? 'down' : 'up'; // Expenses 'up' is bad (down arrow)
    if (current < previous) return isExpense ? 'up' : 'down'; // Expenses 'down' is good (up arrow)
    return 'same';
  };

  // Fetch recent decisions
  const { data: decisionsData, isLoading: decisionsLoading, error: decisionsError } = useQuery({
    queryKey: ['recentDecisions', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('decisions')
        .select('id, question, recommendation, reasoning, actionable_steps, financial_snapshot, estimated_salary, estimated_inventory_cost, inventory_turnover_days, supplier_credit_terms_days, average_receivables_turnover_days, outstanding_supplier_debts, supplier_discount_percentage, storage_cost_percentage_of_order, proposed_marketing_budget, is_localized_promotion, historic_foot_traffic_increase_observed, sales_increase_last_campaign_1, sales_increase_last_campaign_2, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3); // Fetch top 3 recent decisions for recommendations
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  if (sessionLoading || financialLoading || decisionsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-muted-foreground">Loading insights...</p>
      </div>
    );
  }

  if (financialError || decisionsError) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-destructive">
        <p>Error loading data: {financialError?.message || decisionsError?.message}</p>
      </div>
    );
  }

  const firstName = userDisplayName ? userDisplayName.split(' ')[0] : 'User';

  const totalRevenue = latestFinancialData?.monthly_revenue || 0;
  const totalExpenses = latestFinancialData?.monthly_expenses || 0;
  const currentSavings = latestFinancialData?.current_savings || 0;
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Calculate trends for each metric
  const revenueTrend = getTrend(totalRevenue, previousFinancialData?.monthly_revenue);
  const expensesTrend = getTrend(totalExpenses, previousFinancialData?.monthly_expenses, true); // isExpense = true
  const netProfitTrend = getTrend(netProfit, (previousFinancialData?.monthly_revenue || 0) - (previousFinancialData?.monthly_expenses || 0));

  const renderTrendIcon = (trend: 'up' | 'down' | 'same' | 'none') => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-success ml-1" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-destructive ml-1" />;
    return null; // No icon for 'same' or 'none'
  };

  // Improved financial health score logic
  let healthScore: 'stable' | 'caution' | 'risky' = 'caution';
  let healthMessage = "No recent financial data. Please add your monthly revenue, expenses, and savings to get a personalized health score.";

  if (latestFinancialData) {
    if (netProfit <= 0 || currentSavings < (0.5 * totalExpenses)) {
      healthScore = 'risky';
      healthMessage = "Your business is facing significant financial challenges. Focus on immediate revenue generation and aggressive cost reduction to improve stability.";
    } else if (netProfit > 0 && (profitMargin < 10 || currentSavings < totalExpenses)) {
      healthScore = 'caution';
      healthMessage = "Your business is profitable, but there are areas for improvement. Consider optimizing expenses, increasing profit margins, or building a stronger savings buffer.";
    } else if (netProfit > 0 && profitMargin >= 10 && currentSavings >= totalExpenses) {
      healthScore = 'stable';
      healthMessage = "Your business is in a stable financial position with healthy profits and sufficient reserves. You're well-positioned for growth and strategic investments.";
    }
  }

  const getRecommendationBadge = (recommendation: string) => {
    switch (recommendation) {
      case 'APPROVE':
        return <Badge variant="default" className="bg-success hover:bg-success/90">Approve</Badge>;
      case 'WAIT':
        return <Badge variant="secondary" className="bg-warning hover:bg-warning/90">Wait</Badge>;
      case 'REJECT':
        return <Badge variant="destructive" className="hover:bg-destructive/90">Reject</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const handleViewDetails = (decision: any) => {
    setSelectedDecision(decision);
    setIsDetailsModalOpen(true);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <h1 className="text-3xl font-bold text-primary mb-6">Hello, {firstName}! Your Business Insights</h1>
        
        <div className="mb-6">
          <FinancialHealthScoreCard 
            score={healthScore}
            message={healthMessage} 
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <div className="flex items-center">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                {renderTrendIcon(revenueTrend)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold currency">{totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Latest entry</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
              <div className="flex items-center">
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
                {renderTrendIcon(expensesTrend)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold currency">{totalExpenses.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Latest entry</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
              <div className="flex items-center">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                {renderTrendIcon(netProfitTrend)}
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold currency ${netProfit > 0 ? 'text-success' : netProfit < 0 ? 'text-destructive' : 'text-foreground'}`}>
                {netProfit.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Latest calculation</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${profitMargin > 0 ? 'text-success' : profitMargin < 0 ? 'text-destructive' : 'text-foreground'}`}>
                {profitMargin.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">Based on latest data</p>
            </CardContent>
          </Card>
        </div>

        {/* Financial Trends Chart */}
        {financialEntries && financialEntries.length > 1 && (
          <div className="mb-6">
            <FinancialTrendChart financialEntries={financialEntries} />
          </div>
        )}

        <Card className="shadow-card mb-6">
          <CardHeader>
            <CardTitle className="text-xl">KudiGuard Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {decisionsData && decisionsData.length > 0 ? (
                decisionsData.map((decision) => (
                  <div key={decision.id} className="border-b border-border pb-4 last:border-b-0 last:pb-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start">
                        <MessageCircle className="h-5 w-5 text-primary mr-3 mt-1 flex-shrink-0" />
                        <p className="font-medium text-foreground">{decision.question}</p>
                      </div>
                      {getRecommendationBadge(decision.recommendation)}
                    </div>
                    <p className="text-sm text-muted-foreground pl-8 mb-3">{decision.reasoning}</p>
                    <div className="pl-8">
                      <Button variant="outline" size="sm" onClick={() => handleViewDetails(decision)}>
                        <Eye className="h-4 w-4 mr-2" /> View Details
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Info className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    No recent recommendations. Start a chat to get personalized advice for your business!
                  </p>
                  <Link to="/chat">
                    <Button className="bg-gradient-primary hover:shadow-success">
                      Ask KudiGuard a Question
                    </Button>
                  </Link>
                </div>
              )}
            </div>
            {decisionsData && decisionsData.length > 0 && (
              <Link to="/history">
                <Button className="mt-4 bg-gradient-primary hover:shadow-success">
                  View All Decisions
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-xl">Upcoming Financial Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center text-muted-foreground py-4">
              <CalendarDays className="h-10 w-10 mb-4" />
              <p className="mb-4 text-center">
                No upcoming events or reminders set.
                KudiGuard can help you track important financial dates.
              </p>
              <Button variant="outline" className="hover:bg-primary/10">
                Set Up Reminders
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <DecisionDetailsDialog 
        isOpen={isDetailsModalOpen} 
        onClose={() => setIsDetailsModalOpen(false)} 
        decision={selectedDecision} 
      />
    </div>
  );
};

export default InsightsPage;