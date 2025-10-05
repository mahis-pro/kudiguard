import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, AlertTriangle, XCircle } from 'lucide-react';

// For now, we'll use mock data for the health score.
// In a real application, this would come from your backend analysis.
interface FinancialHealthScoreProps {
  score: 'stable' | 'caution' | 'risky';
  message: string;
}

const FinancialHealthScoreCard = ({ score, message }: FinancialHealthScoreProps) => {
  let icon: React.ElementType;
  let title: string;
  let cardClasses: string;
  let iconClasses: string;
  let shadowClass: string = 'shadow-card'; // Default shadow

  switch (score) {
    case 'stable':
      icon = ShieldCheck;
      title = 'Stable';
      cardClasses = 'bg-success-light border-success/20';
      iconClasses = 'text-success';
      shadowClass = 'shadow-success-glow'; // Apply specific glow
      break;
    case 'caution':
      icon = AlertTriangle;
      title = 'Caution';
      cardClasses = 'bg-warning-light border-warning/20';
      iconClasses = 'text-warning';
      shadowClass = 'shadow-warning-glow'; // Apply specific glow
      break;
    case 'risky':
      icon = XCircle;
      title = 'Risky';
      cardClasses = 'bg-destructive/10 border-destructive/20';
      iconClasses = 'text-destructive';
      shadowClass = 'shadow-destructive-glow'; // Apply specific glow
      break;
    default:
      icon = ShieldCheck;
      title = 'Unknown';
      cardClasses = 'bg-muted/30 border-muted/20';
      iconClasses = 'text-muted-foreground';
      shadowClass = 'shadow-card';
  }

  const IconComponent = icon;

  return (
    <Card className={`${shadowClass} ${cardClasses} hover:shadow-lg transition-shadow duration-300`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-2xl font-bold">
          <IconComponent className={`mr-3 h-7 w-7 ${iconClasses}`} />
          Business Health: {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-foreground leading-relaxed">{message}</p>
      </CardContent>
    </Card>
  );
};

export default FinancialHealthScoreCard;