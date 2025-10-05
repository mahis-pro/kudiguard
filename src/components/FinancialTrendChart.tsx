import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Added import

interface FinancialEntry {
  created_at: string;
  monthly_revenue: number;
  monthly_expenses: number;
  current_savings: number;
}

interface FinancialTrendChartProps {
  financialEntries: FinancialEntry[];
}

const FinancialTrendChart = ({ financialEntries }: FinancialTrendChartProps) => {
  // Sort entries by date in ascending order for the chart
  const sortedEntries = [...financialEntries].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const chartData = sortedEntries.map(entry => ({
    date: format(new Date(entry.created_at), 'MMM dd'),
    revenue: entry.monthly_revenue,
    expenses: entry.monthly_expenses,
    savings: entry.current_savings,
  }));

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-xl">Financial Trends (Last {financialEntries.length} Months)</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px] p-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 10,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" className="text-xs text-muted-foreground" />
            <YAxis className="text-xs text-muted-foreground" tickFormatter={(value) => `₦${value.toLocaleString()}`} />
            <Tooltip 
              formatter={(value: number) => `₦${value.toLocaleString()}`}
              labelFormatter={(label: string) => `Date: ${label}`}
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              itemStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Line type="monotone" dataKey="revenue" stroke="hsl(var(--success))" activeDot={{ r: 8 }} name="Revenue" />
            <Line type="monotone" dataKey="expenses" stroke="hsl(var(--destructive))" activeDot={{ r: 8 }} name="Expenses" />
            <Line type="monotone" dataKey="savings" stroke="hsl(var(--primary))" activeDot={{ r: 8 }} name="Savings" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default FinancialTrendChart;