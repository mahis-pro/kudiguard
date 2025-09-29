import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutDashboard, TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react';
import FinancialHealthScoreCard from '@/components/FinancialHealthScoreCard';
import TipOfTheDayCard from '@/components/TipOfTheDayCard'; // Reusing existing component

const InsightsPage = () => {
  // Mock data for demonstration
  const mockHealthScore = {
    score: 'stable' as 'stable' | 'caution' | 'risky',
    message: 'Your business shows strong financial stability. Keep monitoring your expenses to maintain this trend.',
  };

  const mockAlerts = [
    { id: 1, type: 'warning', message: 'Inventory costs increased by 15% last month. Review supplier prices.' },
    { id: 2, type: 'info', message: 'Consider setting a savings goal for business expansion.' },
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <LayoutDashboard className="h-8 w-8 text-primary mr-3" />
          <h1 className="text-3xl font-bold text-primary">Insights</h1>
        </div>

        <div className="grid gap-6 mb-8">
          {/* Financial Health Score */}
          <FinancialHealthScoreCard {...mockHealthScore} />

          {/* Graphs Section */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <TrendingUp className="mr-2 h-5 w-5 text-primary" />
                Performance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-center justify-center bg-muted/50 rounded-md text-muted-foreground">
                {/* Placeholder for actual charts */}
                <p>Graphs (Revenue vs. Expenses, Savings Trend) will appear here.</p>
              </div>
            </CardContent>
          </Card>

          {/* Alerts Panel */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <AlertTriangle className="mr-2 h-5 w-5 text-warning" />
                Alerts & Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockAlerts.length > 0 ? (
                mockAlerts.map(alert => (
                  <div key={alert.id} className={`p-3 rounded-md ${alert.type === 'warning' ? 'bg-warning-light border border-warning/20 text-warning' : 'bg-accent border border-border text-foreground'}`}>
                    <p className="text-sm">{alert.message}</p>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">No new alerts at the moment. All good!</p>
              )}
              <div className="mt-4 p-3 bg-primary-light/20 rounded-md">
                <h3 className="font-semibold text-primary mb-1">Top 3 things to fix this month:</h3>
                <ul className="list-disc list-inside text-sm text-primary/90">
                  <li>Review inventory turnover rate.</li>
                  <li>Increase marketing spend by 5% to boost sales.</li>
                  <li>Allocate 10% of net profit to emergency savings.</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Tip of the Day */}
          <TipOfTheDayCard />
        </div>
      </div>
    </div>
  );
};

export default InsightsPage;