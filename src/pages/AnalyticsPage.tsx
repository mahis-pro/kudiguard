import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSession } from '@/components/auth/SessionContextProvider';
import { useQuery } from '@tanstack/react-query';
import FinancialTrendChart from '@/components/FinancialTrendChart';
import { LineChart, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const AnalyticsPage = () => {
  const { userDisplayName, isLoading: sessionLoading, supabase, session } = useSession();
  const userId = session?.user?.id;

  // Fetch financial entries for the chart
  const { data: financialEntries, isLoading: financialLoading, error: financialError } = useQuery({
    queryKey: ['financialHistory', userId], // Changed query key to reflect history
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('financial_entries')
        .select('monthly_revenue, monthly_expenses, current_savings, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true }); // Order ascending for chart
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  if (sessionLoading || financialLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  if (financialError) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-destructive">
        <p>Error loading financial data: {financialError.message}</p>
      </div>
    );
  }

  const firstName = userDisplayName ? userDisplayName.split(' ')[0] : 'User';

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <h1 className="text-3xl font-bold text-primary mb-6">Hello, {firstName}! Your Business Analytics</h1>
        <p className="text-muted-foreground mb-8">Visualize your financial trends and performance over time.</p>

        {financialEntries && financialEntries.length > 0 ? (
          <div className="mb-6">
            <FinancialTrendChart financialEntries={financialEntries} />
          </div>
        ) : (
          <Card className="shadow-card mb-6">
            <CardContent className="p-6 text-center">
              <Info className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                No financial data available to display trends. Please add your monthly revenue, expenses, and savings.
              </p>
              <Link to="/chat"> {/* Assuming Add Data modal can be triggered from chat */}
                <Button className="bg-gradient-primary hover:shadow-success">
                  Add Financial Data
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-card mt-6">
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <LineChart className="h-5 w-5 mr-2 text-primary" />
              Understanding Your Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              This chart helps you see how your revenue, expenses, and savings are changing.
              Look for patterns:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
              <li>**Rising Revenue:** A good sign of business growth.</li>
              <li>**Stable or Decreasing Expenses:** Indicates good cost control.</li>
              <li>**Increasing Savings:** Shows improved financial health and resilience.</li>
              <li>**Dips or Spikes:** Investigate what caused these changes to learn and adapt.</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Regularly adding your financial data will give you the most accurate and helpful insights.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsPage;