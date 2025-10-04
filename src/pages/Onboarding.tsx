import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  ArrowRight, 
  Briefcase, 
  Building, 
  DollarSign, 
  ListChecks,
  ChevronLeft,
  CheckCircle,
  HelpCircle,
  X 
} from 'lucide-react';
import kudiGuardLogo from '@/assets/kudiguard-logo.png';
import { useSession } from '@/components/auth/SessionContextProvider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch'; // Import Switch

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session, supabase, isLoading } = useSession();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [monthlySalesRange, setMonthlySalesRange] = useState('');
  const [topExpenseCategories, setTopExpenseCategories] = useState<string[]>([]);
  const [currentExpenseInput, setCurrentExpenseInput] = useState('');
  const [isFmcgVendor, setIsFmcgVendor] = useState(false); // New state for FMCG vendor

  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalSteps = 3; // Personal, Business, Financial Habits

  // Predefined options for select fields
  const businessTypeOptions = [
    'Retail (e.g., shop, stall)', 
    'Service (e.g., barber, tailor)', 
    'Food & Beverage (e.g., restaurant, street food)', 
    'Wholesale', 
    'Online Business', 
    'Other'
  ];
  const monthlySalesRangeOptions = [
    'Below ₦50,000', 
    '₦50,000 - ₦200,000', 
    '₦200,001 - ₦500,000', 
    '₦500,001 - ₦1,000,000', 
    'Above ₦1,000,000'
  ];
  const commonExpenseCategories = [
    'Rent', 'Inventory', 'Staff Salaries', 'Transportation', 'Marketing', 
    'Utilities', 'Loan Repayments', 'Supplies', 'Maintenance', 'Other'
  ];

  // Redirect if full_name and business_name are already set
  useEffect(() => {
    if (!isLoading && session?.user) {
      const checkProfile = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, business_name, business_type, monthly_sales_range, top_expense_categories, is_fmcg_vendor') // Include new field
          .eq('id', session.user.id)
          .single();

        if (data && data.full_name && data.business_name && data.business_type && data.monthly_sales_range && data.top_expense_categories && (data.is_fmcg_vendor !== null)) { // Check for is_fmcg_vendor
          navigate('/chat'); // Redirect to chat if onboarding is complete
          toast({
            title: "Profile Already Set",
            description: "You have already completed your profile.",
            variant: "default",
          });
        } else if (data) {
          // Pre-fill if some data exists
          setFullName(data.full_name || '');
          setBusinessName(data.business_name || '');
          setBusinessType(data.business_type || '');
          setMonthlySalesRange(data.monthly_sales_range || '');
          setTopExpenseCategories(data.top_expense_categories || []);
          setIsFmcgVendor(data.is_fmcg_vendor || false); // Set new state
        } else if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
          toast({
            title: "Error fetching profile",
            description: error.message,
            variant: "destructive",
          });
        }
      };
      checkProfile();
    }
  }, [isLoading, session, navigate, toast, supabase]);

  const handleNextStep = () => {
    // Basic validation for current step before moving to next
    if (currentStep === 1 && (!fullName.trim() || !businessName.trim())) {
      toast({ title: "Missing Information", description: "Please provide your full name and business name.", variant: "destructive" });
      return;
    }
    if (currentStep === 2 && (!businessType || !monthlySalesRange)) {
      toast({ title: "Missing Information", description: "Please select your business type and monthly sales range.", variant: "destructive" });
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleAddExpenseCategory = () => {
    const trimmedInput = currentExpenseInput.trim();
    if (trimmedInput && !topExpenseCategories.includes(trimmedInput)) {
      setTopExpenseCategories((prev) => [...prev, trimmedInput]);
      setCurrentExpenseInput('');
    }
  };

  const handleRemoveExpenseCategory = (categoryToRemove: string) => {
    setTopExpenseCategories((prev) => prev.filter((cat) => cat !== categoryToRemove));
  };

  const handleCompleteOnboarding = async () => {
    if (!session?.user?.id) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to complete your profile.",
        variant: "destructive",
      });
      return;
    }

    if (!fullName.trim() || !businessName.trim() || !businessType || !monthlySalesRange) {
      toast({
        title: "Missing Information",
        description: "Please complete all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: fullName,
          business_name: businessName,
          business_type: businessType,
          monthly_sales_range: monthlySalesRange,
          top_expense_categories: topExpenseCategories.length > 0 ? topExpenseCategories : null,
          is_fmcg_vendor: isFmcgVendor, // Save new field
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Welcome to KudiGuard!",
        description: `Your profile for "${fullName}" and business "${businessName}" is set up.`,
      });
      navigate('/chat'); // Redirect to chat after successful onboarding
    } catch (error: any) {
      console.error('Error completing profile:', error.message);
      toast({
        title: "Error",
        description: error.message || "Failed to complete profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-foreground font-medium flex items-center">
                <User className="mr-2 h-4 w-4 text-muted-foreground" />
                Your Full Name <span className="text-destructive ml-1">*</span>
              </Label>
              <Input
                id="fullName"
                type="text"
                placeholder="e.g., Mama Ngozi"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-12"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessName" className="text-foreground font-medium flex items-center">
                <Briefcase className="mr-2 h-4 w-4 text-muted-foreground" />
                Your Business Name <span className="text-destructive ml-1">*</span>
              </Label>
              <Input
                id="businessName"
                type="text"
                placeholder="e.g., Ngozi's Provisions"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="h-12"
                required
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="businessType" className="text-foreground font-medium flex items-center">
                <Building className="mr-2 h-4 w-4 text-muted-foreground" />
                Business Type <span className="text-destructive ml-1">*</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="ml-1 h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Helps KudiGuard tailor advice to your industry.</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Select value={businessType} onValueChange={setBusinessType} required>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select your business type" />
                </SelectTrigger>
                <SelectContent>
                  {businessTypeOptions.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthlySalesRange" className="text-foreground font-medium flex items-center">
                <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
                Average Monthly Sales Range <span className="text-destructive ml-1">*</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="ml-1 h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Allows KudiGuard to understand your business scale.</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Select value={monthlySalesRange} onValueChange={setMonthlySalesRange} required>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select your average monthly sales" />
                </SelectTrigger>
                <SelectContent>
                  {monthlySalesRangeOptions.map((range) => (
                    <SelectItem key={range} value={range}>{range}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between space-x-2 pt-2">
              <Label htmlFor="isFmcgVendor" className="text-foreground font-medium flex items-center">
                Is your business a Fast-Moving Consumer Goods (FMCG) vendor?
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="ml-1 h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>FMCG businesses sell products quickly (e.g., food, beverages, toiletries).</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Switch
                id="isFmcgVendor"
                checked={isFmcgVendor}
                onCheckedChange={setIsFmcgVendor}
              />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="topExpenseCategories" className="text-foreground font-medium flex items-center">
                <ListChecks className="mr-2 h-4 w-4 text-muted-foreground" />
                Top 3-5 Expense Categories (Optional)
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="ml-1 h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Helps KudiGuard understand your cost structure.</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <div className="flex space-x-2">
                <Select value={currentExpenseInput} onValueChange={setCurrentExpenseInput}>
                  <SelectTrigger className="flex-1 h-12">
                    <SelectValue placeholder="Select or type an expense" />
                  </SelectTrigger>
                  <SelectContent>
                    {commonExpenseCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" onClick={handleAddExpenseCategory} variant="outline" className="h-12">Add</Button>
              </div>
              <Input
                type="text"
                placeholder="Or type a custom expense category"
                value={currentExpenseInput}
                onChange={(e) => setCurrentExpenseInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddExpenseCategory()}
                className="h-12 mt-2"
              />
              <div className="flex flex-wrap gap-2 mt-3">
                {topExpenseCategories.map((category) => (
                  <Badge key={category} variant="secondary" className="pr-1">
                    {category}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-1 h-4 w-4 p-0.5 rounded-full hover:bg-destructive/20"
                      onClick={() => handleRemoveExpenseCategory(category)}
                    >
                      <X className="h-3 w-3 text-destructive" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="text-center pb-8">
          <div className="flex items-center justify-center mb-4">
            <img 
              src={kudiGuardLogo} 
              alt="KudiGuard" 
              className="h-16 w-auto"
            />
          </div>
          <h1 className="text-3xl font-bold text-primary">Welcome!</h1>
          <p className="text-muted-foreground mt-2">
            Let's set up your profile for success.
          </p>
          
          {/* Progress Indicator */}
          <div className="flex justify-center space-x-2 mt-6">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <div
                key={index}
                className={`h-2 w-8 rounded-full ${
                  index + 1 <= currentStep ? 'bg-gradient-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-2">Step {currentStep} of {totalSteps}</p>

        </CardHeader>
        
        <CardContent className="space-y-6">
          {renderStep()}
          
          <div className="flex justify-between pt-4">
            {currentStep > 1 && (
              <Button 
                onClick={handlePrevStep}
                variant="outline"
                className="h-12"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
            )}
            {currentStep < totalSteps ? (
              <Button 
                onClick={handleNextStep}
                className={`h-12 ${currentStep === 1 && (!fullName.trim() || !businessName.trim()) ? 'opacity-50 cursor-not-allowed' : ''} ${currentStep === 2 && (!businessType || !monthlySalesRange) ? 'opacity-50 cursor-not-allowed' : ''} ml-auto bg-gradient-primary hover:shadow-success font-semibold`}
                disabled={(currentStep === 1 && (!fullName.trim() || !businessName.trim())) || (currentStep === 2 && (!businessType || !monthlySalesRange))}
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button 
                onClick={handleCompleteOnboarding}
                disabled={!fullName.trim() || !businessName.trim() || !businessType || !monthlySalesRange || isSubmitting}
                className="w-full h-12 bg-gradient-primary hover:shadow-success font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2"></div>
                    Completing setup...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Complete Setup
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;