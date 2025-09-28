import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Target } from 'lucide-react';

interface FinancialGoalSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
}

const financialGoals = [
  { value: 'growth', label: 'Grow My Business', description: 'Increase revenue and expand operations.' },
  { value: 'stability', label: 'Achieve Financial Stability', description: 'Build savings and reduce financial risks.' },
  { value: 'debt-reduction', label: 'Reduce Debt', description: 'Pay off loans and improve cash flow.' },
];

const FinancialGoalSelect = ({ value, onValueChange, disabled, label = "Financial Goal" }: FinancialGoalSelectProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="financialGoal" className="text-foreground font-medium flex items-center">
        <Target className="mr-2 h-4 w-4 text-muted-foreground" />
        {label}
      </Label>
      <Select onValueChange={onValueChange} value={value} disabled={disabled}>
        <SelectTrigger id="financialGoal" className="h-12">
          <SelectValue placeholder="Select your main financial goal" />
        </SelectTrigger>
        <SelectContent>
          {financialGoals.map((goal) => (
            <SelectItem key={goal.value} value={goal.value}>
              <div className="flex flex-col items-start">
                <span className="font-medium">{goal.label}</span>
                <span className="text-xs text-muted-foreground">{goal.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default FinancialGoalSelect;