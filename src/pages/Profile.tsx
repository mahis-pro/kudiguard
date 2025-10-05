import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Mail, 
  Briefcase, 
  Edit3, 
  Save,
  Bell,
  Shield,
  Building,
  DollarSign,
  ListChecks,
  X,
  HelpCircle,
  Lock, // Added for security section
  Clock // Added for security section
} from 'lucide-react';
import { useSession } from '@/components/auth/SessionContextProvider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'; // Ensure TooltipProvider is imported if not already globally
import { useQuery } from '@tanstack/react-query'; // Import useQuery

const Profile = () => {
  const { session, supabase, isLoading, userDisplayName } = useSession();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    businessName: '',
    businessType: '',
    monthlySalesRange: '',
    topExpenseCategories: [] as string[],
    isFmcgVendor: false,
  });
  const [initialProfileData, setInitialProfileData] = useState({}); // To track original data for changes
  const [isSaving, setIsSaving] = useState(false);
  const [currentExpenseInput, setCurrentExpenseInput] = useState('');
  const [hasChanges, setHasChanges] = useState(false); // New state to track changes

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

  // Effect to fetch profile data
  useEffect(() => {
    if (session?.user && !isLoading) {
      const fetchProfile = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, business_name, business_type, monthly_sales_range, top_expense_categories, is_fmcg_vendor')
          .eq('id', session.user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          toast({
            title: "Error fetching profile",
            description: error.message,
            variant: "destructive",
          });
        } else if (data) {
          const fetchedData = {
            fullName: data.full_name || '',
            email: session.user.email || '',
            businessName: data.business_name || '',
            businessType: data.business_type || '',
            monthlySalesRange: data.monthly_sales_range || '',
            topExpenseCategories: data.top_expense_categories || [],
            isFmcgVendor: data.is_fmcg_vendor || false,
          };
          setProfileData(fetchedData);
          setInitialProfileData(fetchedData); // Store initial data
        } else {
          const defaultData = {
            fullName: userDisplayName || '',
            email: session.user.email || '',
            businessName: '',
            businessType: '',
            monthlySalesRange: '',
            topExpenseCategories: [],
            isFmcgVendor: false,
          };
          setProfileData(defaultData);
          setInitialProfileData(defaultData); // Store initial data
        }
      };
      fetchProfile();
    }
  }, [session, isLoading, supabase, toast, userDisplayName]);

  // Effect to check for changes
  useEffect(() => {
    const currentDataString = JSON.stringify(profileData);
    const initialDataString = JSON.stringify(initialProfileData);
    setHasChanges(currentDataString !== initialDataString);
  }, [profileData, initialProfileData]);

  const handleSave = async () => {
    if (!session?.user?.id) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to update your profile.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.fullName,
          business_name: profileData.businessName,
          business_type: profileData.businessType,
          monthly_sales_range: profileData.monthlySalesRange,
          top_expense_categories: profileData.topExpenseCategories.length > 0 ? profileData.topExpenseCategories : null,
          is_fmcg_vendor: profileData.isFmcgVendor,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved successfully.",
      });
      setIsEditing(false);
      // Update initialProfileData to reflect saved changes
      setInitialProfileData(profileData);
      setHasChanges(false); // No pending changes after save
      // window.location.reload(); // Removed to prevent full page reload
    } catch (error: any) {
      console.error('Error saving profile:', error.message);
      toast({
        title: "Error",
        description: error.message || "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string | string[] | boolean) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddExpenseCategory = () => {
    const trimmedInput = currentExpenseInput.trim();
    if (trimmedInput && !profileData.topExpenseCategories.includes(trimmedInput)) {
      setProfileData((prev) => ({
        ...prev,
        topExpenseCategories: [...prev.topExpenseCategories, trimmedInput],
      }));
      setCurrentExpenseInput('');
    }
  };

  const handleRemoveExpenseCategory = (categoryToRemove: string) => {
    setProfileData((prev) => ({
      ...prev,
      topExpenseCategories: prev.topExpenseCategories.filter((cat) => cat !== categoryToRemove),
    }));
  };

  // --- Data Fetching for Business Overview ---
  const userId = session?.user?.id;

  // Fetch all decisions for the user
  const { data: decisions, isLoading: decisionsLoading, error: decisionsError } = useQuery({
    queryKey: ['userDecisions', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('decisions')
        .select('id, recommendation')
        .eq('user_id', userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Fetch latest financial entry for health score
  const { data: latestFinancialEntry, isLoading: financialLoading, error: financialError } = useQuery({
    queryKey: ['latestFinancialEntryForProfile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('financial_entries')
        .select('monthly_revenue, monthly_expenses, current_savings')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  if (isLoading || decisionsLoading || financialLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  // --- Derived Metrics for Business Overview ---
  const totalDecisions = decisions?.length || 0;
  const recommendedActions = decisions?.filter(d => d.recommendation === 'APPROVE').length || 0;
  const savedPotentialLoss = 0; // Placeholder: Requires more complex logic or a new DB field.

  const memberSinceDate = session?.user?.created_at 
    ? new Date(session.user.created_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'short' }) 
    : 'N/A';

  let financialHealthScore = 0;
  let scoreInterpretation = "No decisions made yet. Your financial health score will appear here after your first analysis.";

  if (latestFinancialEntry) {
    const { monthly_revenue, monthly_expenses, current_savings } = latestFinancialEntry;
    const netProfit = monthly_revenue - monthly_expenses;
    const profitMargin = monthly_revenue > 0 ? (netProfit / monthly_revenue) * 100 : 0;

    if (netProfit <= 0 || current_savings < (0.5 * monthly_expenses)) {
      financialHealthScore = 20; // Risky
      scoreInterpretation = "Your business is facing significant financial challenges. Focus on immediate revenue generation and aggressive cost reduction to improve stability.";
    } else if (netProfit > 0 && (profitMargin < 10 || current_savings < monthly_expenses)) {
      financialHealthScore = 50; // Caution
      scoreInterpretation = "Your business is profitable, but there are areas for improvement. Consider optimizing expenses, increasing profit margins, or building a stronger savings buffer.";
    } else if (netProfit > 0 && profitMargin >= 10 && current_savings >= monthly_expenses) {
      financialHealthScore = 100; // Stable
      scoreInterpretation = "Your business is in a stable financial position with healthy profits and sufficient reserves. You're well-positioned for growth and strategic investments.";
    }
  }

  const profileFields = [
    { key: 'fullName', label: 'Full Name', icon: User, type: 'text', readOnly: false },
    { key: 'email', label: 'Email Address', icon: Mail, readOnly: true, type: 'text' },
    { key: 'businessName', label: 'Business Name', icon: Briefcase, type: 'text', readOnly: false },
    { key: 'businessType', label: 'Business Type', icon: Building, type: 'select', options: businessTypeOptions, readOnly: false },
    { key: 'monthlySalesRange', label: 'Average Monthly Sales Range', icon: DollarSign, type: 'select', options: monthlySalesRangeOptions, readOnly: false },
  ];

  return (
    <TooltipProvider> {/* Wrap with TooltipProvider */}
      <div className="h-full overflow-y-auto">
        <div className="max-w-3xl mx-auto p-4 md:p-6">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
              <User className="h-10 w-10 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold text-primary mb-2">Settings</h1>
            <p className="text-muted-foreground">Manage your account information and preferences</p>
          </div>

          <Card className="shadow-card mb-6 bg-gradient-subtle"> {/* Applied gradient here */}
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl">Personal & Business Information</CardTitle>
              <Button
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                variant={isEditing ? "default" : "outline"}
                className={isEditing ? "bg-gradient-primary" : ""}
                disabled={isSaving || (isEditing && !hasChanges)} // Disable if saving or in edit mode with no changes
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2"></div>
                    Saving...
                  </>
                ) : isEditing ? (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                ) : (
                  <>
                    <Edit3 className="mr-2 h-4 w-4" />
                    Edit Profile
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {profileFields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key} className="flex items-center">
                    <field.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                    {field.label}
                  </Label>
                  {field.type === 'select' ? (
                    <Select 
                      value={profileData[field.key as keyof typeof profileData] as string} 
                      onValueChange={(value) => handleInputChange(field.key, value)}
                      disabled={!isEditing || field.readOnly}
                    >
                      <SelectTrigger className={`h-12 ${isEditing && !field.readOnly ? "bg-primary-light/10 border-primary" : "bg-muted/50"}`}>
                        <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map((option) => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={field.key}
                      type={field.type}
                      value={profileData[field.key as keyof typeof profileData] as string}
                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                      disabled={!isEditing || field.readOnly}
                      className={`h-12 ${isEditing && !field.readOnly ? "bg-primary-light/10 border-primary" : "bg-muted/50"}`}
                    />
                  )}
                </div>
              ))}

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
                  checked={profileData.isFmcgVendor}
                  onCheckedChange={(checked) => handleInputChange('isFmcgVendor', checked)}
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="topExpenseCategories" className="text-foreground font-medium flex items-center">
                  <ListChecks className="mr-2 h-4 w-4 text-muted-foreground" />
                  Top Expense Categories
                </Label>
                {isEditing ? (
                  <>
                    <div className="flex space-x-2">
                      <Select value={currentExpenseInput} onValueChange={setCurrentExpenseInput}>
                        <SelectTrigger className="flex-1 h-12 bg-primary-light/10 border-primary">
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
                      className="h-12 mt-2 bg-primary-light/10 border-primary"
                    />
                    <div className="flex flex-wrap gap-2 mt-3">
                      {profileData.topExpenseCategories.map((category) => (
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
                  </>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {profileData.topExpenseCategories.length > 0 ? (
                      profileData.topExpenseCategories.map((category) => (
                        <Badge key={category} variant="secondary">{category}</Badge>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-sm">No expense categories added.</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card mb-6 bg-gradient-subtle"> {/* Applied gradient here */}
            <CardHeader>
              <CardTitle className="text-xl">Business Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-success-light rounded-lg">
                  <p className="text-sm text-muted-foreground">Decisions Made</p>
                  <p className="text-2xl font-bold text-success">{totalDecisions}</p>
                </div>
                <div className="text-center p-4 bg-primary-light/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Recommended Actions</p>
                  <p className="text-2xl font-bold text-primary">{recommendedActions}</p>
                </div>
                <div className="text-center p-4 bg-warning-light rounded-lg">
                  <p className="text-sm text-muted-foreground">Potential Loss Avoided</p>
                  <p className="text-2xl font-bold text-warning">₦{savedPotentialLoss.toLocaleString()}</p>
                </div>
                <div className="text-center p-4 bg-accent rounded-lg">
                  <p className="text-sm text-muted-foreground">Member Since</p>
                  <p className="text-2xl font-bold text-foreground">{memberSinceDate}</p>
                </div>
              </div>

              {financialHealthScore !== undefined && scoreInterpretation && (
                <div className="mt-6 pt-6 border-t border-border">
                  <h3 className="text-lg font-bold text-primary mb-2 flex items-center">
                    <Shield className="mr-2 h-5 w-5 text-primary" />
                    Latest Financial Health: {financialHealthScore}%
                  </h3>
                  <p className="text-sm text-muted-foreground">{scoreInterpretation}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="shadow-card bg-gradient-subtle"> {/* Applied gradient here */}
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Bell className="mr-2 h-5 w-5 text-primary" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Decision reminders</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm">Enable</Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Receive alerts for important financial decisions.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Financial tips</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm">Enable</Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Get daily or weekly financial advice and insights.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Weekly summaries</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm">Enable</Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Receive a summary of your business's financial performance.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card bg-gradient-subtle"> {/* Applied gradient here */}
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Shield className="mr-2 h-5 w-5 text-primary" />
                  Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Two-factor authentication</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm">Setup</Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Add an extra layer of security to your account.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Change password</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm">Update</Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Change your account password securely.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Login sessions</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm">Manage</Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>View and manage active login sessions for your account.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-card mt-6 border-destructive/20 bg-gradient-subtle"> {/* Applied gradient here */}
            <CardHeader>
              <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Delete Account</p>
                  <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
                </div>
                <Button variant="destructive" size="sm">
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Profile;