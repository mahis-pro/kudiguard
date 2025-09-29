import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import { useSession } from '@/components/auth/SessionContextProvider';

const DecisionHistoryPage = () => {
  const { userDisplayName, isLoading } = useSession();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-muted-foreground">Loading decision history...</p>
      </div>
    );
  }

  const firstName = userDisplayName ? userDisplayName.split(' ')[0] : 'User';

  // Placeholder data for demonstration
  const decisions = [
    {
      id: 'd1',
      date: '2023-10-26',
      type: 'Expense Approval',
      description: 'Approved inventory purchase for ₦150,000.',
      outcome: 'Positive',
      impact: 'Maintained stock levels, slight impact on cash flow.',
      status: 'Completed',
    },
    {
      id: 'd2',
      date: '2023-10-20',
      type: 'Pricing Adjustment',
      description: 'Increased price of Product A by 5%.',
      outcome: 'Neutral',
      impact: 'Slight increase in profit margin, no significant change in sales volume.',
      status: 'Completed',
    },
    {
      id: 'd3',
      date: '2023-10-15',
      type: 'Marketing Campaign',
      description: 'Launched social media ad campaign for Product B.',
      outcome: 'Pending',
      impact: 'Awaiting sales data for full impact analysis.',
      status: 'In Progress',
    },
    {
      id: 'd4',
      date: '2023-10-10',
      type: 'Loan Application',
      description: 'Applied for a small business loan of ₦500,000.',
      outcome: 'Negative',
      impact: 'Application rejected due to insufficient collateral.',
      status: 'Completed',
    },
    {
      id: 'd5',
      date: '2023-10-05',
      type: 'Staff Hiring',
      description: 'Hired new sales assistant.',
      outcome: 'Positive',
      impact: 'Improved customer service, increased operational costs.',
      status: 'Completed',
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'In Progress':
        return <Clock className="h-4 w-4 text-warning" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'Positive':
        return <Badge variant="default">Positive</Badge>;
      case 'Negative':
        return <Badge variant="destructive">Negative</Badge>;
      case 'Neutral':
        return <Badge variant="secondary">Neutral</Badge>;
      case 'Pending':
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <h1 className="text-3xl font-bold text-primary mb-6">Decision History</h1>
        <p className="text-muted-foreground mb-8">Review past financial decisions and their outcomes.</p>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-xl">Your Business Decisions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Impact</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {decisions.map((decision) => (
                    <TableRow key={decision.id}>
                      <TableCell className="font-medium">{new Date(decision.date).toLocaleDateString()}</TableCell>
                      <TableCell>{decision.type}</TableCell>
                      <TableCell>{decision.description}</TableCell>
                      <TableCell>{getOutcomeBadge(decision.outcome)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{decision.impact}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center">
                          {getStatusIcon(decision.status)}
                          <span className="ml-2 text-sm">{decision.status}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {decisions.length === 0 && (
              <p className="text-center text-muted-foreground mt-4">No decisions recorded yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DecisionHistoryPage;