import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress'; // Import Progress component
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, Share2, ShieldCheck, ThumbsUp, ThumbsDown } from 'lucide-react'; // Added ThumbsUp, ThumbsDown
import { useToast } from '@/hooks/use-toast'; // Import useToast
import { useSession } from '@/components/auth/SessionContextProvider'; // Import useSession

interface FinancialData {
  monthlyRevenue: number;
  monthlyExpenses: number;
  currentSavings: number;
  staffPayroll: number;
  inventoryValue: number;
  outstandingDebts: number;
  receivables: number;
  equipmentInvestment: number;
  marketingSpend: number;
  ownerWithdrawals: number;
  businessAge: number;
  industryType: string;
}

interface DecisionResultData {
  id: string; // Decision ID is now required
  decision_result: string;
  decision_status: 'success' | 'warning' | 'danger';
  explanation: string;
  next_steps: string[];
  financial_health_score: number;
  score_interpretation: string;
}

interface DecisionResultProps {
  question: string;
  data: FinancialData;
  result: DecisionResultData; // Now receives the full result from the Edge Function
  onBack: () => void;
}

const DecisionResult = ({ question, data, result, onBack }: DecisionResultProps) => {
  const { toast } = useToast();
  const { session } = useSession();
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null); // null: no feedback, true: accepted, false: rejected

  const {
    id: decisionId, // Extract decisionId
    decision_result: decisionResultText,
    decision_status: decisionStatus,
    explanation,
    next_steps: nextSteps,
    financial_health_score: financialHealthScore,
    score_interpretation: scoreInterpretation,
  } = result;

  let StatusIcon: React.ElementType;
  let statusColorClass: string;
  let cardBgClass: string;

  switch (decisionStatus) {
    case 'success':
      StatusIcon = CheckCircle;
      statusColorClass = "text-success";
      cardBgClass = "bg-success-light border-success/30";
      break;
    case 'warning':
      StatusIcon = AlertTriangle;
      statusColorClass = "text-warning";
      cardBgClass = "bg-warning-light border-warning/30";
      break;
    case 'danger':
      StatusIcon = XCircle;
      statusColorClass = "text-destructive";
      cardBgClass = "bg-destructive/10 border-destructive/30";
      break;
    default:
      StatusIcon = AlertTriangle;
      statusColorClass = "text-muted-foreground";
      cardBgClass = "bg-muted/30 border-muted/20";
  }

  const netIncome = data.monthlyRevenue - data.monthlyExpenses - data.ownerWithdrawals; // Use ownerWithdrawals for net income

  const handleShareResult = () => {
    navigator.clipboard.writeText(`KudiGuard's advice for "${question}": ${decisionResultText}. Financial Health Score: ${financialHealthScore}/100. Explanation: ${explanation}`);
    toast({
      title: "Result Copied!",
      description: "The decision summary has been copied to your clipboard.",
    });
  };

  const handleFeedback = async (accepted: boolean) => {
    if (!session?.access_token || !decisionId) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to provide feedback.",
        variant: "destructive",
      });
      return;
    }

    setIsFeedbackSubmitting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-decision-feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          decisionId: decisionId,
          acceptedOrRejected: accepted,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit feedback.');
      }

      setFeedbackGiven(accepted);
      toast({
        title: "Feedback Submitted",
        description: `Decision marked as ${accepted ? 'accepted' : 'rejected'}. Thank you for your input!`,
      });
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Feedback Failed",
        description: error.message || "An error occurred while submitting feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsFeedbackSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={onBack} className="mr-3 p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-primary">Decision Result</h1>
            <p className="text-sm text-muted-foreground">Based on your financial data</p>
          </div>
        </div>

        {/* Question Card */}
        <Card className="shadow-card mb-6 bg-muted/30">
          <CardContent className="p-4">
            <p className="font-medium text-foreground">"{question}"</p>
          </CardContent>
        </Card>

        {/* Decision Card */}
        <Card className={`shadow-card mb-6 ${cardBgClass}`}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-xl">
              <StatusIcon className={`mr-3 h-6 w-6 ${statusColorClass}`} />
              {decisionResultText}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground leading-relaxed">{explanation}</p>
          </CardContent>
        </Card>

        {/* Financial Health Score Card */}
        <Card className="shadow-card mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-xl">
              <ShieldCheck className="mr-3 h-6 w-6 text-primary" />
              Financial Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center mb-2">
              <Progress value={financialHealthScore} className="h-3 flex-1" />
              <span className="ml-3 text-lg font-bold text-primary">{financialHealthScore}%</span>
            </div>
            <p className="text-sm text-muted-foreground">{scoreInterpretation}</p>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card className="shadow-card mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Your Financial Snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-success-light rounded-lg">
                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                <p className="text-lg font-bold text-success">₦{data.monthlyRevenue.toLocaleString()}</p>
              </div>
              <div className="text-center p-3 bg-warning-light rounded-lg">
                <p className="text-sm text-muted-foreground">Monthly Expenses</p>
                <p className="text-lg font-bold text-warning">₦{data.monthlyExpenses.toLocaleString()}</p>
              </div>
              <div className="text-center p-3 bg-primary-light/20 rounded-lg">
                <p className="text-sm text-muted-foreground">Net Income</p>
                <p className={`text-lg font-bold ${netIncome > 0 ? 'text-success' : 'text-destructive'}`}>
                  ₦{netIncome.toLocaleString()}
                </p>
              </div>
              <div className="text-center p-3 bg-accent rounded-lg">
                <p className="text-sm text-muted-foreground">Current Savings</p>
                <p className="text-lg font-bold text-primary">₦{data.currentSavings.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recommended Next Steps */}
        <Card className="shadow-card mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Recommended Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {nextSteps.map((step, index) => (
                <li key={index} className="flex items-start">
                  <div className="bg-primary rounded-full w-6 h-6 flex items-center justify-center text-primary-foreground text-sm font-bold mr-3 mt-0.5">
                    {index + 1}
                  </div>
                  <p className="text-foreground">{step}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Feedback Section */}
        {!feedbackGiven && (
          <Card className="shadow-card mb-6 bg-accent/20 border-accent/30">
            <CardContent className="p-4 text-center">
              <p className="font-medium text-foreground mb-3">Did you find this advice helpful?</p>
              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  className="bg-success-light text-success hover:bg-success/20"
                  onClick={() => handleFeedback(true)}
                  disabled={isFeedbackSubmitting}
                >
                  <ThumbsUp className="mr-2 h-4 w-4" />
                  Accept Decision
                </Button>
                <Button
                  variant="outline"
                  className="bg-destructive/10 text-destructive hover:bg-destructive/20"
                  onClick={() => handleFeedback(false)}
                  disabled={isFeedbackSubmitting}
                >
                  <ThumbsDown className="mr-2 h-4 w-4" />
                  Reject Decision
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        {feedbackGiven !== null && (
          <Card className={`shadow-card mb-6 ${feedbackGiven ? 'bg-success-light border-success/30' : 'bg-destructive/10 border-destructive/30'}`}>
            <CardContent className="p-4 text-center flex items-center justify-center">
              {feedbackGiven ? (
                <CheckCircle className="mr-2 h-5 w-5 text-success" />
              ) : (
                <XCircle className="mr-2 h-5 w-5 text-destructive" />
              )}
              <p className="font-medium text-foreground">
                You marked this decision as {feedbackGiven ? 'accepted' : 'rejected'}.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={onBack}
            className="w-full h-12 bg-gradient-primary hover:shadow-success font-semibold"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          
          <Button variant="outline" className="w-full h-12" onClick={handleShareResult}>
            <Share2 className="mr-2 h-4 w-4" />
            Share Result
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DecisionResult;