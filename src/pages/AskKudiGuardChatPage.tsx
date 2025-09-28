import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ArrowLeft,
  Send,
  MessageCircle,
  Calculator,
  TrendingUp,
  DollarSign,
  PiggyBank,
  Users,
  Package,
  Banknote,
  ReceiptText,
  Wrench,
  Megaphone,
  Wallet,
  Clock,
  Tag,
  Info,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Share2,
  ShieldCheck,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import Navigation from '@/components/Navigation';
import { useSession } from '@/components/auth/SessionContextProvider';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs for chat messages
import { useNavigate } from 'react-router-dom'; // Import useNavigate

// --- Interfaces (reused from previous components) ---
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
  id: string; // This will be the recommendation ID
  decision_result: string;
  decision_status: 'success' | 'warning' | 'danger';
  explanation: string;
  next_steps: string[];
  financial_health_score: number;
  score_interpretation: string;
  accepted_or_rejected?: boolean;
  numeric_breakdown: {
    monthly_revenue: number;
    monthly_expenses: number;
    current_savings: number;
    net_income: number;
    staff_payroll: number;
  };
}

// Define a base interface for field definitions
interface BaseFieldDefinition {
  label: string;
  icon: React.ElementType;
  placeholder: string;
  required: boolean;
  color: string;
  type: 'number' | 'text' | 'url' | 'select';
  tooltip: string;
}

// Define a specific interface for select fields
interface SelectFieldDefinition extends BaseFieldDefinition {
  type: 'select';
  options: string[];
}

// Union type for all field definitions
type FieldDefinition = BaseFieldDefinition | SelectFieldDefinition;

// --- Field Definitions (reused from DataInputModal) ---
const fieldDefinitions: { [key: string]: FieldDefinition } = {
  monthlyRevenue: {
    label: 'Monthly Revenue',
    icon: TrendingUp,
    placeholder: '150,000',
    required: true,
    color: 'text-success',
    type: 'number',
    tooltip: 'Total income generated from sales before any expenses.',
  },
  monthlyExpenses: {
    label: 'Monthly Expenses',
    icon: DollarSign,
    placeholder: '80,000',
    required: true,
    color: 'text-warning',
    type: 'number',
    tooltip: 'Total recurring costs to run your business (e.g., rent, utilities, supplies).',
  },
  currentSavings: {
    label: 'Current Business Savings',
    icon: PiggyBank,
    placeholder: '50,000',
    required: false,
    color: 'text-primary',
    type: 'number',
    tooltip: 'Total cash available in your business account for operations and emergencies.',
  },
  staffPayroll: {
    label: 'Monthly Staff Salaries',
    icon: Users,
    placeholder: '25,000',
    required: false,
    color: 'text-muted-foreground',
    type: 'number',
    tooltip: 'Total monthly cost for all staff salaries and wages.',
  },
  inventoryValue: {
    label: 'Current Inventory Value',
    icon: Package,
    placeholder: '75,000',
    required: false,
    color: 'text-indigo-500',
    type: 'number',
    tooltip: 'The estimated value of all goods you currently have for sale.',
  },
  outstandingDebts: {
    label: 'Outstanding Debts/Loans',
    icon: Banknote,
    placeholder: '30,000',
    required: false,
    color: 'text-red-500',
    type: 'number',
    tooltip: 'Total amount your business currently owes to lenders or suppliers.',
  },
  receivables: {
    label: 'Customer Payments Due (Receivables)',
    icon: ReceiptText,
    placeholder: '10,000',
    required: false,
    color: 'text-blue-500',
    type: 'number',
    tooltip: 'Money owed to your business by customers for goods/services already delivered.',
  },
  equipmentInvestment: {
    label: 'Planned Equipment/Asset Purchase',
    icon: Wrench,
    placeholder: '40,000',
    required: false,
    color: 'text-purple-500',
    type: 'number',
    tooltip: 'Amount you plan to spend on new equipment or assets.',
  },
  marketingSpend: {
    label: 'Monthly Marketing Spend',
    icon: Megaphone,
    placeholder: '5,000',
    required: false,
    color: 'text-orange-500',
    type: 'number',
    tooltip: 'Amount spent monthly on advertising and promotions.',
  },
  ownerWithdrawals: {
    label: 'Owner Withdrawals (Monthly Average)',
    icon: Wallet,
    placeholder: '10,000',
    required: false,
    color: 'text-gray-500',
    type: 'number',
    tooltip: 'Average amount you take from the business for personal use each month.',
  },
  businessAge: {
    label: 'Business Age (in years)',
    icon: Clock,
    placeholder: '2',
    required: false,
    color: 'text-teal-500',
    type: 'number',
    tooltip: 'How many years your business has been operating.',
  },
  industryType: {
    label: 'Vendor Category',
    icon: Tag,
    placeholder: 'General',
    required: false,
    color: 'text-green-500',
    type: 'select',
    options: ['Food & Beverage', 'Textiles & Fashion', 'Electronics', 'General Merchandise', 'Services', 'Agriculture', 'Other'],
    tooltip: 'The primary category of your business.',
  },
};

// Define which fields are relevant for each intent
const intentFieldMapping: { [key: string]: (keyof FinancialData)[] } = {
  hire_staff: ['monthlyRevenue', 'monthlyExpenses', 'currentSavings', 'staffPayroll', 'ownerWithdrawals', 'businessAge'],
  manage_inventory: ['monthlyRevenue', 'monthlyExpenses', 'currentSavings', 'inventoryValue', 'outstandingDebts', 'receivables'],
  take_loan: ['monthlyRevenue', 'monthlyExpenses', 'currentSavings', 'outstandingDebts', 'receivables', 'businessAge', 'industryType'],
  expand_shop: ['monthlyRevenue', 'monthlyExpenses', 'currentSavings', 'equipmentInvestment', 'ownerWithdrawals', 'businessAge', 'industryType'],
  adjust_pricing: ['monthlyRevenue', 'monthlyExpenses', 'currentSavings', 'inventoryValue', 'marketingSpend', 'industryType'],
  manage_savings: ['monthlyRevenue', 'monthlyExpenses', 'currentSavings', 'ownerWithdrawals'],
  invest_equipment: ['monthlyRevenue', 'monthlyExpenses', 'currentSavings', 'equipmentInvestment', 'ownerWithdrawals', 'businessAge'],
  manage_expenses: ['monthlyRevenue', 'monthlyExpenses', 'currentSavings', 'ownerWithdrawals'],
  marketing_campaign: ['monthlyRevenue', 'monthlyExpenses', 'currentSavings', 'marketingSpend'],
  owner_withdrawals: ['monthlyRevenue', 'monthlyExpenses', 'currentSavings', 'ownerWithdrawals'],
  manage_receivables: ['monthlyRevenue', 'monthlyExpenses', 'currentSavings', 'receivables', 'outstandingDebts'],
  diversify_products: ['monthlyRevenue', 'monthlyExpenses', 'currentSavings', 'inventoryValue', 'marketingSpend', 'industryType'],
  track_sales: ['monthlyRevenue', 'monthlyExpenses', 'currentSavings'],
  general_advice: ['monthlyRevenue', 'monthlyExpenses', 'currentSavings', 'staffPayroll', 'inventoryValue', 'outstandingDebts', 'receivables', 'ownerWithdrawals', 'businessAge', 'industryType'],
};

// --- Chat Message Types (Refactored to a discriminated union) ---
interface UserChatMessage {
  id: string;
  type: 'user';
  content: string;
  timestamp: Date;
}

interface SystemQuestionMessage {
  id: string;
  type: 'system_question';
  content: string;
  timestamp: Date;
}

interface SystemInputPromptMessage {
  id: string;
  type: 'system_input_prompt';
  content: React.ReactNode; // This can be JSX
  timestamp: Date;
}

interface SystemResultMessage {
  id: string;
  type: 'system_result';
  content: DecisionResultData; // Explicitly typed as DecisionResultData
  timestamp: Date;
}

type ChatMessage = UserChatMessage | SystemQuestionMessage | SystemInputPromptMessage | SystemResultMessage;

const AskKudiGuardChatPage = () => {
  const { session, supabase } = useSession();
  const { toast } = useToast();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate(); // Initialize useNavigate

  // --- Chat State ---
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'ask_question' | 'input_data' | 'show_result'>('ask_question');

  // --- Decision-specific States ---
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentIntent, setCurrentIntent] = useState('');
  const [financialData, setFinancialData] = useState<FinancialData>({
    monthlyRevenue: 0,
    monthlyExpenses: 0,
    currentSavings: 0,
    staffPayroll: 0,
    inventoryValue: 0,
    outstandingDebts: 0,
    receivables: 0,
    equipmentInvestment: 0,
    marketingSpend: 0,
    ownerWithdrawals: 0,
    businessAge: 0,
    industryType: 'General',
  });
  const [decisionResult, setDecisionResult] = useState<DecisionResultData | null>(null);
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);

  // --- Suggested Questions (reused from AskKudiGuard) ---
  const suggestedQuestions = [
    "Can I hire another staff member?",
    "Should I buy more stock this month?",
    "Is it safe to take a business loan?",
    "Can I afford to expand my shop?",
    "Should I increase my product prices?",
    "How much should I save for emergencies?",
    "Is it a good time to invest in new equipment?",
    "Can I afford to open a second branch?",
    "What's a healthy profit margin for my business?",
    "Should I reduce my operating expenses?",
    "How can I improve my cash flow?",
    "Is my current inventory level optimal?",
    "When should I consider a marketing campaign?",
    "Can I afford to give staff bonuses?",
    "Should I pay off my business debt early?",
    "How much can I safely withdraw from my business?",
    "What's the best way to manage my receivables?",
    "Should I diversify my product offerings?",
    "Is my business financially ready for a slow season?",
    "How can I track my daily sales more effectively?"
  ];
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]); // Initialize as empty

  // Scroll to bottom of chat history
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Update filtered suggestions based on current input
  useEffect(() => {
    if (currentInput.trim() === '') {
      setFilteredSuggestions([]); // Show no suggestions if input is empty
    } else {
      setFilteredSuggestions(
        suggestedQuestions.filter(sugg =>
          sugg.toLowerCase().includes(currentInput.toLowerCase())
        )
      );
    }
  }, [currentInput]);

  // --- Intent Detection (reused from AskKudiGuard) ---
  const determineIntent = (q: string): string => {
    const lowerQ = q.toLowerCase();
    if (lowerQ.includes('hire') || lowerQ.includes('staff') || lowerQ.includes('bonuses')) return 'hire_staff';
    if (lowerQ.includes('stock') || lowerQ.includes('inventory') || lowerQ.includes('buy more') || lowerQ.includes('optimal inventory')) return 'manage_inventory';
    if (lowerQ.includes('loan') || lowerQ.includes('borrow') || lowerQ.includes('finance') || lowerQ.includes('debt') || lowerQ.includes('pay off debt')) return 'take_loan';
    if (lowerQ.includes('expand') || lowerQ.includes('shop') || lowerQ.includes('new location') || lowerQ.includes('second branch')) return 'expand_shop';
    if (lowerQ.includes('price') || lowerQ.includes('increase prices') || lowerQ.includes('profit margin')) return 'adjust_pricing';
    if (lowerQ.includes('save') || lowerQ.includes('savings') || lowerQ.includes('emergency fund') || lowerQ.includes('slow season')) return 'manage_savings';
    if (lowerQ.includes('equipment') || lowerQ.includes('asset purchase')) return 'invest_equipment';
    if (lowerQ.includes('expenses') || lowerQ.includes('reduce expenses') || lowerQ.includes('cash flow')) return 'manage_expenses';
    if (lowerQ.includes('marketing')) return 'marketing_campaign';
    if (lowerQ.includes('withdraw') || lowerQ.includes('owner withdrawals')) return 'owner_withdrawals';
    if (lowerQ.includes('receivables')) return 'manage_receivables';
    if (lowerQ.includes('diversify product')) return 'diversify_products';
    if (lowerQ.includes('track sales')) return 'track_sales';
    return 'general_advice'; // Default intent
  };

  // --- Handlers ---
  const handleAskQuestionSubmit = () => {
    if (!currentInput.trim()) return;

    const userQuestion = currentInput.trim();
    setChatHistory(prev => [...prev, { id: uuidv4(), type: 'user', content: userQuestion, timestamp: new Date() }]);
    setCurrentQuestion(userQuestion);
    setCurrentInput('');
    setIsLoading(true);

    const intent = determineIntent(userQuestion);
    setCurrentIntent(intent);

    setTimeout(() => { // Simulate processing time
      setIsLoading(false);
      setChatHistory(prev => [...prev, {
        id: uuidv4(),
        type: 'system_input_prompt',
        content: (
          <>
            <p className="font-medium text-primary">"{userQuestion}"</p>
            <p className="text-sm text-muted-foreground mt-1">
              To give you the best answer, we need some financial details.
            </p>
          </>
        ),
        timestamp: new Date()
      }]);
      setStep('input_data');
    }, 1000);
  };

  const handleSuggestedClick = (suggestedQuestion: string) => {
    setCurrentInput(suggestedQuestion);
    // Do NOT automatically submit here. User will click send or press Enter.
  };

  const handleFinancialDataChange = (field: keyof FinancialData, value: string | number) => {
    const numericValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
    setFinancialData(prev => ({ ...prev, [field]: numericValue }));
  };

  const handleSelectChange = (field: keyof FinancialData, value: string) => {
    setFinancialData(prev => ({ ...prev, [field]: value }));
  };

  const handleAnalyze = async () => {
    if (!session?.access_token || !session?.user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to get financial advice.",
        variant: "destructive",
      });
      return;
    }

    if (financialData.monthlyRevenue <= 0 || financialData.monthlyExpenses <= 0) {
      toast({
        title: "Missing Information",
        description: "Monthly Revenue and Monthly Expenses are required and must be greater than zero.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    let decisionId: string | null = null;

    try {
      // Step 1: Insert a new decision into the public.decisions table
      const { data: newDecision, error: decisionError } = await supabase
        .from('decisions')
        .insert({
          user_id: session.user.id,
          question: currentQuestion,
          intent: currentIntent,
          inputs: financialData,
          status: 'pending',
        })
        .select('id')
        .single();

      if (decisionError || !newDecision) {
        throw new Error(decisionError?.message || 'Failed to create new decision record.');
      }
      decisionId = newDecision.id;

      // Step 2: Call the decision-engine Edge Function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/decision-engine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          decision_id: decisionId,
          intent: currentIntent,
          inputs: financialData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get financial advice from KudiGuard.');
      }

      const { recommendation: resultData } = await response.json();

      // The resultData from the Edge Function is the recommendation JSONB
      // We need to add the recommendation ID to it for feedback
      const { data: fetchedRecommendation, error: fetchRecError } = await supabase
        .from('recommendations')
        .select('id')
        .eq('decision_id', decisionId)
        .single();

      if (fetchRecError || !fetchedRecommendation) {
        throw new Error(fetchRecError?.message || 'Failed to fetch recommendation ID.');
      }

      const fullDecisionResult: DecisionResultData = { ...resultData, id: fetchedRecommendation.id };
      setDecisionResult(fullDecisionResult);

      setChatHistory(prev => [...prev, {
        id: uuidv4(),
        type: 'system_result',
        content: fullDecisionResult, // Pass the full result object
        timestamp: new Date()
      }]);
      setStep('show_result');
      setFeedbackGiven(null); // Reset feedback state for new decision

    } catch (error: any) {
      console.error('Error during analysis:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "An unexpected error occurred during analysis. Please try again.",
        variant: "destructive",
      });
      if (decisionId) {
        await supabase.from('decisions').update({ status: 'error' }).eq('id', decisionId);
      }
      // Optionally, revert to ask_question step or show error in chat
      setStep('ask_question');
      setChatHistory(prev => [...prev, {
        id: uuidv4(),
        type: 'system_question',
        content: `Sorry, I encountered an error: ${error.message}. Please try asking your question again.`,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = async (accepted: boolean) => {
    if (!session?.access_token || !decisionResult?.id) {
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
          recommendationId: decisionResult.id,
          acceptedOrRejected: accepted,
          rating: accepted ? 5 : 1,
          comment: '',
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

  const handleShareResult = () => {
    if (!decisionResult) return;
    navigator.clipboard.writeText(`KudiGuard's advice for "${currentQuestion}": ${decisionResult.decision_result}. Financial Health Score: ${decisionResult.financial_health_score}/100. Explanation: ${decisionResult.explanation}`);
    toast({
      title: "Result Copied!",
      description: "The decision summary has been copied to your clipboard.",
    });
  };

  const handleBackToDashboard = () => {
    // Reset all states to start fresh for a new conversation
    setChatHistory([]);
    setCurrentInput('');
    setIsLoading(false);
    setStep('ask_question');
    setCurrentQuestion('');
    setCurrentIntent('');
    setFinancialData({
      monthlyRevenue: 0, monthlyExpenses: 0, currentSavings: 0, staffPayroll: 0,
      inventoryValue: 0, outstandingDebts: 0, receivables: 0, equipmentInvestment: 0,
      marketingSpend: 0, ownerWithdrawals: 0, businessAge: 0, industryType: 'General',
    });
    setDecisionResult(null);
    setFeedbackGiven(null);
    // Invalidate queries to refetch dashboard data after a new decision
    // queryClient.invalidateQueries({ queryKey: ['dashboardDecisions'] }); // Assuming queryClient is available
    // queryClient.invalidateQueries({ queryKey: ['userDecisions'] });
    // queryClient.invalidateQueries({ queryKey: ['userDecisionsProfile'] });
    navigate('/dashboard'); // Navigate to the dashboard
  };

  // Determine which fields to show based on the intent
  const fieldsToShow = useMemo(() => {
    const keys = intentFieldMapping[currentIntent] || intentFieldMapping['general_advice'];
    return keys.map(key => ({ key, ...fieldDefinitions[key] }));
  }, [currentIntent]);

  const netIncome = financialData.monthlyRevenue - financialData.monthlyExpenses - financialData.ownerWithdrawals;
  const isFinancialDataValid = financialData.monthlyRevenue > 0 && financialData.monthlyExpenses > 0;

  // Render logic for decision result card
  const renderDecisionResultCard = (result: DecisionResultData) => {
    let StatusIconComponent: React.ElementType;
    let statusColorClass: string;
    let cardBgClass: string;

    switch (result.decision_status) {
      case 'success':
        StatusIconComponent = CheckCircle;
        statusColorClass = "text-success";
        cardBgClass = "bg-success-light border-success/30";
        break;
      case 'warning':
        StatusIconComponent = AlertTriangle;
        statusColorClass = "text-warning";
        cardBgClass = "bg-warning-light border-warning/30";
        break;
      case 'danger':
        StatusIconComponent = XCircle;
        statusColorClass = "text-destructive";
        cardBgClass = "bg-destructive/10 border-destructive/30";
        break;
      default:
        StatusIconComponent = AlertTriangle;
        statusColorClass = "text-muted-foreground";
        cardBgClass = "bg-muted/30 border-muted/20";
    }

    return (
      <div className="space-y-4">
        {/* Decision Card */}
        <Card className={`shadow-card ${cardBgClass}`}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-xl">
              <StatusIconComponent className={`mr-3 h-6 w-6 ${statusColorClass}`} />
              {result.decision_result}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground leading-relaxed">{result.explanation}</p>
          </CardContent>
        </Card>

        {/* Financial Health Score Card */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-xl">
              <ShieldCheck className="mr-3 h-6 w-6 text-primary" />
              Financial Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center mb-2">
              <Progress value={result.financial_health_score} className="h-3 flex-1" />
              <span className="ml-3 text-lg font-bold text-primary">{result.financial_health_score}%</span>
            </div>
            <p className="text-sm text-muted-foreground">{result.score_interpretation}</p>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Your Financial Snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-success-light rounded-lg">
                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                <p className="text-lg font-bold text-success">₦{result.numeric_breakdown.monthly_revenue.toLocaleString()}</p>
              </div>
              <div className="text-center p-3 bg-warning-light rounded-lg">
                <p className="text-sm text-muted-foreground">Monthly Expenses</p>
                <p className="text-lg font-bold text-warning">₦{result.numeric_breakdown.monthly_expenses.toLocaleString()}</p>
              </div>
              <div className="text-center p-3 bg-primary-light/20 rounded-lg">
                <p className="text-sm text-muted-foreground">Net Income</p>
                <p className={`text-lg font-bold ${result.numeric_breakdown.net_income > 0 ? 'text-success' : 'text-destructive'}`}>
                  ₦{result.numeric_breakdown.net_income.toLocaleString()}
                </p>
              </div>
              <div className="text-center p-3 bg-accent rounded-lg">
                <p className="text-sm text-muted-foreground">Current Savings</p>
                <p className="text-lg font-bold text-primary">₦{result.numeric_breakdown.current_savings.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recommended Next Steps */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Recommended Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {result.next_steps.map((step, index) => (
                <li key={index} className="flex items-start">
                  <div className="bg-primary rounded-full w-6 h-6 flex items-center justify-center text-primary-foreground text-sm font-bold mr-3 mt-0.5 flex-shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-foreground">{step}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Feedback Section */}
        {feedbackGiven === null && (
          <Card className="shadow-card bg-accent/20 border-accent/30">
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
          <Card className={`shadow-card ${feedbackGiven ? 'bg-success-light border-success/30' : 'bg-destructive/10 border-destructive/30'}`}>
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
            onClick={handleBackToDashboard}
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
    );
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex flex-col">
      <Navigation showBackButton onBack={handleBackToDashboard} />
      <div className="flex-1 overflow-hidden">
        <div ref={chatContainerRef} className="max-w-2xl mx-auto p-4 h-full overflow-y-auto custom-scrollbar">
          {chatHistory.length === 0 && step === 'ask_question' && (
            <div className="text-center py-8">
              <MessageCircle className="h-16 w-16 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-primary mb-2">Ask KudiGuard Anything</h2>
              <p className="text-muted-foreground">Your personal financial advisor for small business decisions.</p>
            </div>
          )}

          {chatHistory.map(message => (
            <div key={message.id} className={`mb-4 ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
              {message.type === 'user' ? (
                <div className="inline-block bg-primary text-primary-foreground rounded-lg p-3 max-w-[80%]">
                  <p className="text-sm">{message.content}</p>
                </div>
              ) : message.type === 'system_input_prompt' ? (
                <div className="inline-block bg-accent text-foreground rounded-lg p-3 max-w-[80%]">
                  {message.content}
                </div>
              ) : message.type === 'system_result' ? ( // Removed typeof check, now type-safe
                <div className="inline-block bg-accent text-foreground rounded-lg p-3 max-w-[100%]">
                  {renderDecisionResultCard(message.content)} {/* No cast needed */}
                </div>
              ) : (
                <div className="inline-block bg-accent text-foreground rounded-lg p-3 max-w-[80%]">
                  <p className="text-sm">{message.content as string}</p>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center space-x-2 text-muted-foreground mb-4">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
              <span>KudiGuard is thinking...</span>
            </div>
          )}

          {step === 'ask_question' && !isLoading && filteredSuggestions.length > 0 && ( // Only show if suggestions exist
            <div className="space-y-2 pt-2">
              <p className="text-sm font-medium text-muted-foreground">Suggestions:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar"> {/* Added max-h and overflow */}
                {filteredSuggestions.map((suggestedQuestion, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    onClick={() => handleSuggestedClick(suggestedQuestion)}
                    className="w-full text-left justify-start h-auto py-3 px-4 hover:bg-accent"
                  >
                    <MessageCircle className="mr-2 h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-sm">{suggestedQuestion}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {step === 'input_data' && !isLoading && (
            <Card className="shadow-card mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Your Business Finances</CardTitle>
                <p className="text-sm text-muted-foreground">Fields marked with <span className="text-destructive">*</span> are required.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <TooltipProvider>
                  {fieldsToShow.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label htmlFor={field.key as string} className="flex items-center font-medium">
                        <field.icon className={`mr-2 h-4 w-4 ${field.color}`} />
                        {field.label}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                        {field.tooltip && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="ml-2 h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{field.tooltip}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </Label>
                      <div className="relative">
                        {field.type === 'number' && (
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground font-medium">
                            ₦
                          </span>
                        )}
                        {field.type === 'select' ? (
                          <Select
                            value={financialData[field.key] as string}
                            onValueChange={(value) => handleSelectChange(field.key as keyof FinancialData, value)}
                          >
                            <SelectTrigger className="pl-3 h-12">
                              <SelectValue placeholder={field.placeholder} />
                            </SelectTrigger>
                            <SelectContent>
                              {(field as SelectFieldDefinition).options?.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            id={field.key as string}
                            type={field.type}
                            placeholder={field.placeholder}
                            value={financialData[field.key] || ''}
                            onChange={(e) => handleFinancialDataChange(field.key as keyof FinancialData, e.target.value)}
                            className={`${field.type === 'number' ? 'pl-8' : 'pl-3'} h-12`}
                            min={field.type === 'number' ? "0" : undefined}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </TooltipProvider>

                {/* Live Net Income Display */}
                <div className="space-y-2 pt-4 border-t border-border">
                  <Label className="flex items-center font-medium">
                    <Calculator className="mr-2 h-4 w-4 text-primary" />
                    Calculated Net Income
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="ml-2 h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Your monthly revenue minus monthly expenses and owner withdrawals.</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <div className={`text-2xl font-bold ${netIncome > 0 ? 'text-success' : 'text-destructive'}`}>
                    ₦{netIncome.toLocaleString()}
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button
                    onClick={handleAnalyze}
                    disabled={!isFinancialDataValid || isLoading}
                    className="w-full h-12 bg-gradient-primary hover:shadow-success font-semibold"
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2"></div>
                        Analyzing...
                      </div>
                    ) : (
                      <>
                        <Calculator className="mr-2 h-4 w-4" />
                        Analyze & Get Advice
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Your financial data is processed securely and never shared with third parties.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Input Area at the bottom */}
      {step === 'ask_question' && (
        <div className="sticky bottom-0 bg-card border-t border-border p-4">
          <div className="max-w-2xl mx-auto flex space-x-2">
            <Input
              placeholder="e.g., Can I hire another staff member?"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAskQuestionSubmit()}
              className="flex-1 h-12"
              disabled={isLoading}
            />
            <Button
              onClick={handleAskQuestionSubmit}
              disabled={!currentInput.trim() || isLoading}
              className="bg-gradient-primary hover:shadow-success h-12"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AskKudiGuardChatPage;