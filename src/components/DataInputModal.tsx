import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Info, // Added Info icon for tooltips
} from 'lucide-react';
import { useSession } from '@/components/auth/SessionContextProvider';
import { useToast } from '@/hooks/use-toast';

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
  businessAge: number; // Now in years
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
    // Add other relevant inputs here
  };
}

interface DataInputModalProps {
  question: string;
  intent: string;
  onBack: () => void;
  onAnalyze: (data: FinancialData, result: DecisionResultData) => void;
}

// Define a base interface for field definitions
interface BaseFieldDefinition {
  label: string;
  icon: React.ElementType;
  placeholder: string;
  required: boolean;
  color: string;
  type: 'number' | 'text' | 'url' | 'select'; // Added 'select' here
  tooltip: string;
}

// Define a specific interface for select fields
interface SelectFieldDefinition extends BaseFieldDefinition {
  type: 'select';
  options: string[];
}

// Union type for all field definitions
type FieldDefinition = BaseFieldDefinition | SelectFieldDefinition;

// Define all possible input fields with their metadata
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
const intentFieldMapping: { [key: string]: (keyof FinancialData)[] } = { // Changed type of keys to keyof FinancialData
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

const DataInputModal = ({ question, intent, onBack, onAnalyze }: DataInputModalProps) => {
  const { session, supabase } = useSession();
  const { toast } = useToast();
  const [data, setData] = useState<FinancialData>({
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
  const [isLoading, setIsLoading] = useState(false);

  // Determine which fields to show based on the intent
  const fieldsToShow = useMemo(() => {
    const keys = intentFieldMapping[intent] || intentFieldMapping['general_advice'];
    return keys.map(key => ({ key, ...fieldDefinitions[key] }));
  }, [intent]);

  const handleInputChange = (field: keyof FinancialData, value: string | number) => {
    const numericValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
    setData(prev => ({ ...prev, [field]: numericValue }));
  };

  const handleSelectChange = (field: keyof FinancialData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const netIncome = data.monthlyRevenue - data.monthlyExpenses - data.ownerWithdrawals;

  const handleAnalyze = async () => {
    if (!session?.access_token || !session?.user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to get financial advice.",
        variant: "destructive",
      });
      return;
    }

    if (data.monthlyRevenue <= 0 || data.monthlyExpenses <= 0) {
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
          question: question,
          intent: intent,
          inputs: data, // Store raw inputs for auditing/re-analysis
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
          intent: intent,
          inputs: data, // Pass the collected financial data
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

      onAnalyze(data, { ...resultData, id: fetchedRecommendation.id }); // Pass the recommendation ID
    } catch (error: any) {
      console.error('Error during analysis:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "An unexpected error occurred during analysis. Please try again.",
        variant: "destructive",
      });
      // If an error occurred after decision creation, mark it as error
      if (decisionId) {
        await supabase.from('decisions').update({ status: 'error' }).eq('id', decisionId);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = data.monthlyRevenue > 0 && data.monthlyExpenses > 0;

  return (
    <div className="min-h-screen bg-gradient-subtle p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={onBack} className="mr-3 p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center">
            <div className="bg-gradient-primary p-2 rounded-full mr-3">
              <Calculator className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary">Financial Analysis</h1>
              <p className="text-sm text-muted-foreground">Help us understand your business</p>
            </div>
          </div>
        </div>

        {/* Question Card */}
        <Card className="shadow-card mb-6 bg-primary-light/10 border-primary/20">
          <CardContent className="p-4">
            <p className="font-medium text-primary">"{question}"</p>
            <p className="text-sm text-muted-foreground mt-1">
              To give you the best answer, we need some financial details.
            </p>
          </CardContent>
        </Card>

        {/* Data Input Form */}
        <Card className="shadow-card">
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
                        value={data[field.key] as string}
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
                        value={data[field.key] || ''}
                        onChange={(e) => handleInputChange(field.key as keyof FinancialData, e.target.value)}
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
                disabled={!isValid || isLoading}
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
      </div>
    </div>
  );
};

export default DataInputModal;