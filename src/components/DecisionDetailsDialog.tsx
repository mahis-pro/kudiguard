import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import DecisionCard from '@/components/DecisionCard';

interface DecisionDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  decision: {
    id: string;
    question: string;
    recommendation: 'APPROVE' | 'WAIT' | 'REJECT';
    reasoning: string;
    actionable_steps: string[];
    financial_snapshot: {
      monthly_revenue: number;
      monthly_expenses: number;
      current_savings: number;
    };
    estimated_salary?: number;
    created_at: string;
  } | null;
}

const DecisionDetailsDialog = ({ isOpen, onClose, decision }: DecisionDetailsDialogProps) => {
  if (!decision) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-primary">Decision Details</DialogTitle>
          <DialogDescription>
            Review the full analysis and recommendation for your question.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <h3 className="text-lg font-semibold text-foreground mb-2">Question:</h3>
          <p className="text-muted-foreground mb-4">{decision.question}</p>
          
          <DecisionCard data={decision} />

          <p className="text-sm text-muted-foreground mt-4 text-right">
            Decision made on: {new Date(decision.created_at).toLocaleDateString()}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DecisionDetailsDialog;