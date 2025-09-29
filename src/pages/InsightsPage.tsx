import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, BarChart, Info, CalendarDays, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSession } from '@/components/auth/SessionContextProvider';
import FinancialHealthScoreCard from '@/components/FinancialHealthScoreCard';

const InsightsPage = () => {
  const { userDisplayName, isLoading } = useSession();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <p className="text-muted-foreground">Loading insights...</p>
      </div>
    );
  }

  const firstName = userDisplayName ? userDisplayName.split(' ')[0] : 'User';

  // Placeholder data for demonstration
  const totalRevenue = 1250000;
  const totalExpenses = 980000;
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = (netProfit / totalRevenue) * 100;
  const recentTransactions = [
    { id: '1', type: 'expense', description: 'Inventory purchase', amount: 150000, date: '2023-10-26', status: 'completed' },
    { id: '2', type: 'revenue', description: 'Sales from market', amount: 80000, date: '2023-10-25', status: 'completed' },
    { id: '3', type: 'expense', description: 'Staff salaries', amount: 70000, date: '2023-10-25', status: 'completed' },
    { id: '4', type: 'revenue', description: 'Online sales', amount: 45000, date: '2023-10-24', status: 'completed' },
  ];
  const topExpenses = [
    { category: 'Inventory', amount: 450000, percentage: 45 },
    { category: 'Staff Salaries', amount: 200000, percentage: 20 },
    { category: 'Rent', amount: 100000, percentage: 10 },
    { category: 'Transportation', amount: 80000, percentage: 8 },
  ];
  const recommendations = [
    { id: 'r1', text: 'Consider negotiating better prices with your inventory suppliers to improve profit margins.', type: 'action' },
    { id: 'r2', text: 'Your marketing spend is low; explore digital marketing to reach more customers.', type: 'tip' },
    { id: 'r3', text: 'Review your transportation costs; group deliveries or explore alternative logistics.', type: 'action' },
  ];

  return (
    <div className="h-full bg-gradient-subtle"> {/* Changed min-h-screen to h-full, removed p-4 */}
      <div className="max-w-4xl mx-auto"> {/* Kept max-w-4xl mx-auto */}
        <h1 className="text-3xl font-bold text-primary mb-6">Hello, {firstName}! Your Business Insights</h1>
        
        {/* Financial Health Score Card */}
        <div className="mb-6">
          <FinancialHealthScoreCard 
            score="stable"
            message="Your business is performing well! Keep up the great work." 
          />
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦{totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">+20.1% from last month</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦{totalExpenses.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">+5.3% from last month</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦{netProfit.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">+15.8% from last month</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profitMargin.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Target: 25%</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card className="shadow-card mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    {transaction.type === 'expense' ? (
                      <XCircle className="h-5 w-5 text-destructive mr-3" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-success mr-3" />
                    )}
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-sm text-muted-foreground">{new Date(transaction.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <p className={`font-bold ${transaction.type === 'expense' ? 'text-destructive' : 'text-success'}`}>
                    {transaction.type === 'expense' ? '-' : '+'}₦{transaction.amount.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            <Button variant="link" className="mt-4 p-0">View all transactions</Button>
          </CardContent>
        </Card>

        {/* Top Expenses & Recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-xl">Top Expense Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topExpenses.map((expense, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <p className="text-sm">{expense.category}</p>
                    <div className="flex items-center">
                      <p className="text-sm font-medium mr-2">₦{expense.amount.toLocaleString()}</p>
                      <Badge variant="secondary">{expense.percentage}%</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-xl">KudiGuard Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recommendations.map((rec) => (
                  <div key={rec.id} className="flex items-start">
                    <Info className="h-5 w-5 text-primary mr-3 mt-1" />
                    <div>
                      <p className="font-medium">{rec.text}</p>
                      <Badge variant="outline" className="mt-1">{rec.type === 'action' ? 'Actionable' : 'Tip'}</Badge>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="link" className="mt-4 p-0">View all recommendations</Button>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Financial Events (Placeholder) */}
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