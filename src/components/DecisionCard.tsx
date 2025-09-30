import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

interface DecisionCardProps {
  data: {
    recommendation: 'APPROVE' | 'WAIT' | 'REJECT';
    reasoning: string;
    actionable_steps: string[];
    financial_snapshot: {
      monthly_revenue: number;
      monthly_expenses: number;
      current_savings: number;
    };
  };
}

const DecisionCard = ({ data }: DecisionCardProps) => {
  const { recommendation, reasoning, actionable_steps, financial_snapshot } = data;

  const getRecommendationDetails = () => {
    switch (recommendation) {
      case 'APPROVE':
        return {
          Icon: CheckCircle,
          title: 'Recommendation: Approve',
          badgeVariant: 'default',
          cardClasses: 'bg-success-light border-success/20',
          iconClasses: 'text-success',
        };
      case 'WAIT':
        return {
          Icon: AlertTriangle,
          title: 'Recommendation: Wait',
          badgeVariant: 'secondary',
          cardClasses: 'bg-warning-light border-warning/20',
          iconClasses: 'text-warning',
        };
      case 'REJECT':
        return {
          Icon: XCircle,
          title: 'Recommendation: Reject',
          badgeVariant: 'destructive',
          cardClasses: 'bg-destructive/10 border-destructive/20',
          iconClasses: 'text-destructive',
        };
      default:
        return {
          Icon: Info,
          title: 'Recommendation',
          badgeVariant: 'outline',
          cardClasses: 'bg-muted',
          iconClasses: 'text-muted-foreground',
        };
    }
  };

  const { Icon, title, badgeVariant, cardClasses, iconClasses } = getRecommendationDetails();

  return (
    <Card className={`shadow-md mt-2 ${cardClasses}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg">
          <Icon className={`mr-3 h-6 w-6 ${iconClasses}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold text-foreground mb-1">Reasoning:</h4>
          <p className="text-sm text-foreground/90">{reasoning}</p>
        </div>
        <div>
          <h4 className="font-semibold text-foreground mb-2">Actionable Steps:</h4>
          <ul className="space-y-1">
            {actionable_steps.map((step, index) => (
              <li key={index} className="flex items-start text-sm">
                <CheckCircle className="h-4 w-4 text-success mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-foreground/90">{step}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default DecisionCard;