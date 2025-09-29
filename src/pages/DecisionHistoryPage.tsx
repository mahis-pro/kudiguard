import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { History, CheckCircle, AlertTriangle, XCircle, ChevronDown, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Decision {
  id: string;
  date: string;
  question: string;
  recommendation: 'Recommended' | 'Cautious' | 'Not Advisable';
  reasoning: string;
  actionTaken?: string;
  tags: string[];
}

const mockDecisions: Decision[] = [
  {
    id: '1',
    date: '2024-07-20',
    question: 'Should I hire a new sales assistant?',
    recommendation: 'Cautious',
    reasoning: 'Your current profit margin is tight, and adding a new salary might strain your cash flow. Consider increasing sales by 15% before hiring.',
    actionTaken: 'Decided to wait 2 months and focus on marketing first.',
    tags: ['Hiring', 'Staffing', 'Cash Flow'],
  },
  {
    id: '2',
    date: '2024-07-10',
    question: 'Is it a good time to restock my electronics inventory?',
    recommendation: 'Recommended',
    reasoning: 'Your electronics stock is low, and demand is high. You have sufficient cash reserves to cover the purchase without impacting operations.',
    actionTaken: 'Restocked inventory, sales increased by 10% in the following week.',
    tags: ['Inventory', 'Sales', 'Cash Flow'],
  },
  {
    id: '3',
    date: '2024-06-25',
    question: 'Should I take a loan to expand my shop space?',
    recommendation: 'Not Advisable',
    reasoning: 'Your current debt-to-equity ratio is already high, and adding more debt could put your business at significant risk. Focus on debt reduction first.',
    actionTaken: 'Decided against the loan, exploring cheaper rental options instead.',
    tags: ['Expansion', 'Debt', 'Risk Management'],
  },
];

const DecisionHistoryPage = () => {
  const [openDecisionId, setOpenDecisionId] = React.useState<string | null>(null);

  const getRecommendationIcon = (recommendation: Decision['recommendation']) => {
    switch (recommendation) {
      case 'Recommended': return <CheckCircle className="h-5 w-5 text-success" />;
      case 'Cautious': return <AlertTriangle className="h-5 w-5 text-warning" />;
      case 'Not Advisable': return <XCircle className="h-5 w-5 text-destructive" />;
      default: return null;
    }
  };

  const getRecommendationColor = (recommendation: Decision['recommendation']) => {
    switch (recommendation) {
      case 'Recommended': return 'text-success';
      case 'Cautious': return 'text-warning';
      case 'Not Advisable': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <History className="h-8 w-8 text-primary mr-3" />
          <h1 className="text-3xl font-bold text-primary">Decision History</h1>
        </div>

        <Card className="shadow-card mb-6">
          <CardContent className="p-4 flex flex-wrap gap-2 items-center">
            <Button variant="outline" size="sm" className="flex items-center">
              <Filter className="h-4 w-4 mr-2" /> Filter by Category
            </Button>
            {/* Add more filter buttons here */}
            <Button variant="outline" size="sm">Export</Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {mockDecisions.map((decision) => (
            <Collapsible
              key={decision.id}
              open={openDecisionId === decision.id}
              onOpenChange={() => setOpenDecisionId(openDecisionId === decision.id ? null : decision.id)}
            >
              <Card className="shadow-card">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full h-auto p-4 flex flex-col items-start justify-start text-left">
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className="flex items-center">
                        {getRecommendationIcon(decision.recommendation)}
                        <span className={`ml-2 font-semibold ${getRecommendationColor(decision.recommendation)}`}>
                          {decision.recommendation}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(decision.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-lg font-medium text-foreground mb-2">{decision.question}</p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {decision.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${openDecisionId === decision.id ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 pb-4">
                  <div className="border-t border-border pt-4 space-y-3">
                    <div>
                      <h3 className="font-semibold text-foreground">Reasoning:</h3>
                      <p className="text-muted-foreground text-sm">{decision.reasoning}</p>
                    </div>
                    {decision.actionTaken && (
                      <div>
                        <h3 className="font-semibold text-foreground">Action Taken:</h3>
                        <p className="text-muted-foreground text-sm">{decision.actionTaken}</p>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DecisionHistoryPage;