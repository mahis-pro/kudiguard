import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, BarChart, Info, CalendarDays, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSession } from '@/components/auth/SessionContextProvider';
import FinancialHealthScoreCard from '@/components/FinancialHealthScoreCard';
import { useQuery } from '@tanstack/react-query';

const InsightsPage = () => {
  const { userDisplayName, isLoading: sessionLoading, supabase, session } = useSession();

  const userId = session?.user?.id;

  // Fetch latest financial entry
  const { data: financialData, isLoading: financialLoading, error: financialError } = useQuery({
    queryKey: ['latestFinancialEntry', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('financial_entries')
        .select('monthly_revenue, monthly_expenses, current_savings')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 means no rows found
      return data;
    },
    enabled: !!userId,
  });

  // Fetch recent decisions
  const { data: decisionsData, isLoading: decisionsLoading, error: decisionsError } = useQuery({
    queryKey: ['recentDecisions', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('decisions')
        .select('id, question, recommendation, reasoning, created_at')
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

  const totalRevenue = financialData?.monthly_revenue || 0;
  const totalExpenses = financialData?.monthly_expenses || 0;
  const currentSavings = financialData?.current_savings || 0;
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Placeholder for financial health score logic (will be dynamic later)
  let healthScore: 'stable' | 'caution' | 'risky' = 'caution';
  let healthMessage = "No recent financial data. Please add your monthly revenue, expenses, and savings to get a personalized health score.";

  if (financialData) {
    if (netProfit > 0 && currentSavings >= totalExpenses) {
      healthScore = 'stable';
      healthMessage = "Your business is performing well with positive profit and healthy savings. Keep up the great work!";
    } else if (netProfit > 0 || currentSavings > 0) {
      healthScore = 'caution';
      healthMessage = "Your business shows potential, but there are areas to improve, such as increasing savings or optimizing expenses.";
    } else {
      healthScore = 'risky';
      healthMessage = "Your business is currently facing challenges. Focus on increasing revenue and reducing expenses to improve stability.";
    }
  }

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
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold currency">{totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Latest entry</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold currency">{totalExpenses.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Latest entry</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold currency">{netProfit.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Latest calculation</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profitMargin.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Based on latest data</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-card mb-6">
          <CardHeader>
            <CardTitle className="text-xl">KudiGuard Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {decisionsData && decisionsData.length > 0 ? (
                decisionsData.map((decision) => (
                  <div key={decision.id} className="flex items-start">
                    <Info className="h-5 w-5 text-primary mr-3 mt-1" />
                    <div>
                      <p className="font-medium">{decision.question}</p>
                      <p className="text-sm text-muted-foreground">{decision.reasoning}</p>
                      <Badge variant="outline" className="mt-1">{decision.recommendation}</Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">No recent recommendations. Ask KudiGuard a question!</p>
              )}
            </div>
            {decisionsData && decisionsData.length > 0 && (
              <Button variant="link" className="mt-4 p-0" onClick={() => window.location.href = '/history'}>
                View all decisions
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-xl">Upcoming Financial Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-muted-foreground">
              <CalendarDays className="h-5 w-5 mr-2" />
              <p>No upcoming events. Add data to get personalized reminders!</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InsightsPage;