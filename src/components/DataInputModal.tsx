import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Calculator, TrendingUp, DollarSign, PiggyBank, Users, Package, Banknote, ReceiptText, Wrench, Megaphone, Wallet, Clock, Tag } from 'lucide-react';
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
  businessAge: number;
  industryType: string;
}

interface DecisionResultData {
  id: string;
  decision_result: string;
  decision_status: 'success' | 'warning' | 'danger';
  explanation: string;
  next_steps: string[];
  financial_health_score: number;
  score_interpretation: string;
}

interface DataInputModalProps {
  question: string;
  onBack: () => void;
  onAnalyze: (data: FinancialData, result: DecisionResultData) => void;
}

const DataInputModal = ({ question, onBack, onAnalyze }: DataInputModalProps) => {
  const { session } = useSession();
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

  const handleInputChange = (field: keyof FinancialData, value: string | number) => {
    const numericValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
    setData(prev => ({ ...prev, [field]: numericValue }));
  };

  const handleAnalyze = async () => {
    if (!session?.access_token) {
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

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate_recommendation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          question: question,
          monthlyRevenue: data.monthlyRevenue,
          monthlyExpenses: data.monthlyExpenses,
          currentSavings: data.currentSavings,
          staffPayroll: data.staffPayroll,
          inventoryValue: data.inventoryValue,
          outstandingDebts: data.outstandingDebts,
          receivables: data.receivables,
          equipmentInvestment: data.equipmentInvestment,
          marketingSpend: data.marketingSpend,
          ownerWithdrawals: data.ownerWithdrawals,
          businessAge: data.businessAge,
          industryType: data.industryType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get financial advice from KudiGuard.');
      }

      const result: DecisionResultData = await response.json();
      onAnalyze(data, result);
    } catch (error: any) {
      console.error('Error calling decision engine:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "An unexpected error occurred during analysis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const inputFields = [
    {
      key: 'monthlyRevenue' as keyof FinancialData,
      label: 'Monthly Revenue',
      icon: TrendingUp,
      placeholder: '150000',
      required: true,
      color: 'text-success',
      type: 'number'
    },
    {
      key: 'monthlyExpenses' as keyof FinancialData,
      label: 'Monthly Expenses',
      icon: DollarSign,
      placeholder: '80000',
      required: true,
      color: 'text-warning',
      type: 'number'
    },
    {
      key: 'currentSavings' as keyof FinancialData,
      label: 'Current Savings',
      icon: PiggyBank,
      placeholder: '50000',
      required: false,
      color: 'text-primary',
      type: 'number'
    },
    {
      key: 'staffPayroll' as keyof FinancialData,
      label: 'Staff Payroll',
      icon: Users,
      placeholder: '25000',
      required: false,
      color: 'text-muted-foreground',
      type: 'number'
    },
    {
      key: 'inventoryValue' as keyof FinancialData,
      label: 'Current Inventory Value',
      icon: Package,
      placeholder: '75000',
      required: false,
      color: 'text-indigo-500',
      type: 'number'
    },
    {
      key: 'outstandingDebts' as keyof FinancialData,
      label: 'Outstanding Debts/Loans',
      icon: Banknote,
      placeholder: '30000',
      required: false,
      color: 'text-red-500',
      type: 'number'
    },
    {
      key: 'receivables' as keyof FinancialData,
      label: 'Pending Payments (Receivables)',
      icon: ReceiptText,
      placeholder: '10000',
      required: false,
      color: 'text-blue-500',
      type: 'number'
    },
    {
      key: 'equipmentInvestment' as keyof FinancialData,
      label: 'Planned Equipment/Asset Purchase',
      icon: Wrench,
      placeholder: '40000',
      required: false,
      color: 'text-purple-500',
      type: 'number'
    },
    {
      key: 'marketingSpend' as keyof FinancialData,
      label: 'Monthly Marketing Spend',
      icon: Megaphone,
      placeholder: '5000',
      required: false,
      color: 'text-orange-500',
      type: 'number'
    },
    {
      key: 'ownerWithdrawals' as keyof FinancialData,
      label: 'Personal Withdrawals from Business',
      icon: Wallet,
      placeholder: '10000',
      required: false,
      color: 'text-gray-500',
      type: 'number'
    },
    {
      key: 'businessAge' as keyof FinancialData,
      label: 'Business Age (in months)',
      icon: Clock,
      placeholder: '12',
      required: false,
      color: 'text-teal-500',
      type: 'number'
    },
    {
      key: 'industryType' as keyof FinancialData,
      label: 'Vendor Category',
      icon: Tag,
      placeholder: 'Electronics',
      required: false,
      color: 'text-green-500',
      type: 'text'
    },
  ];

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
          </CardHeader>
          <CardContent className="space-y-6">
            {inputFields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key} className="flex items-center font-medium">
                  <field.icon className={`mr-2 h-4 w-4 ${field.color}`} />
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                <div className="relative">
                  {field.type === 'number' && (
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground font-medium">
                      ₦
                    </span>
                  )}
                  <Input
                    id={field.key}
                    type={field.type}
                    placeholder={field.placeholder}
                    value={data[field.key] || ''}
                    onChange={(e) => handleInputChange(field.key, e.target.value)}
                    className={`${field.type === 'number' ? 'pl-8' : 'pl-3'} h-12`}
                    min={field.type === 'number' ? "0" : undefined}
                  />
                </div>
              </div>
            ))}

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