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
          <Card className="shadow-card mb-6 bg-gradient-subtle"> {/* Applied gradient here */}
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

        <Card className="shadow-card mt-6 bg-gradient-subtle"> {/* Applied gradient here */}
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <LineChart className="h-5 w-5 mr-2 text-primary" />
              Understanding Your Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              This chart is your business's story! It helps you see how your revenue, expenses, and savings are changing over time. Look for these patterns to understand your business better:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
              <li>
                <span className="font-semibold text-foreground">Rising Revenue:</span> This means your business is growing! Keep up the good work and explore what's driving these sales so you can do more of it.
              </li>
              <li>
                <span className="font-semibold text-foreground">Stable or Decreasing Expenses:</span> Excellent! This shows you're managing your costs well. Continue to monitor and find smart ways to save without compromising quality.
              </li>
              <li>
                <span className="font-semibold text-foreground">Increasing Savings:</span> Fantastic! A growing savings cushion means your business is becoming more resilient and ready for future opportunities or unexpected challenges.
              </li>
              <li>
                <span className="font-semibold text-foreground">Dips or Spikes:</span> Don't worry, these are normal. Use them as opportunities to learn! Think about what happened during those times – did sales drop due to a holiday, or did expenses increase because of a new investment? Understanding these helps you plan better.
              </li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Remember, the more regularly you add your financial data, the more accurate and helpful these insights will be for your business!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsPage;