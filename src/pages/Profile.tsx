import React, { useState, useEffect } from 'react';
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
  X 
} from 'lucide-react';
import { useSession } from '@/components/auth/SessionContextProvider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

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
  });
  const [isSaving, setIsSaving] = useState(false);
  const [currentExpenseInput, setCurrentExpenseInput] = useState('');

  // Predefined options for select fields (same as onboarding)
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

  // Fetch user profile data
  useEffect(() => {
    if (session?.user && !isLoading) {
      const fetchProfile = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, business_name, business_type, monthly_sales_range, top_expense_categories')
          .eq('id', session.user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
          toast({
            title: "Error fetching profile",
            description: error.message,
            variant: "destructive",
          });
        } else if (data) {
          setProfileData({
            fullName: data.full_name || '',
            email: session.user.email || '',
            businessName: data.business_name || '',
            businessType: data.business_type || '',
            monthlySalesRange: data.monthly_sales_range || '',
            topExpenseCategories: data.top_expense_categories || [],
          });
        } else {
          // If no profile found, initialize with email and empty fields
          setProfileData(prev => ({
            ...prev,
            email: session.user.email || '',
            fullName: userDisplayName || '',
          }));
        }
      };
      fetchProfile();
    }
  }, [session, isLoading, supabase, toast, userDisplayName]);

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
      // Manually trigger a re-fetch of session context to update userDisplayName
      window.location.reload(); // Simple reload for now to update context
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

  const handleInputChange = (field: string, value: string | string[]) => {
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  // Static placeholder stats
  const totalDecisions = 0;
  const recommendedActions = 0;
  const savedPotentialLoss = 0; 
  
  const memberSinceDate = session?.user?.created_at 
    ? new Date(session.user.created_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'short' }) 
    : 'N/A';

  // Static financial health score and interpretation
  const financialHealthScore = 0;
  const scoreInterpretation = "No decisions made yet. Your financial health score will appear here after your first analysis.";

  const profileFields = [
    { key: 'fullName', label: 'Full Name', icon: User, type: 'text', component: Input },
    { key: 'email', label: 'Email Address', icon: Mail, readOnly: true, type: 'text', component: Input },
    { key: 'businessName', label: 'Business Name', icon: Briefcase, type: 'text', component: Input },
    { key: 'businessType', label: 'Business Type', icon: Building, type: 'select', options: businessTypeOptions },
    { key: 'monthlySalesRange', label: 'Average Monthly Sales Range', icon: DollarSign, type: 'select', options: monthlySalesRangeOptions },
  ];

  return (
    <div className="h-full bg-gradient-subtle"> {/* Changed min-h-screen to h-full */}
      <div className="max-w-3xl mx-auto p-4"> {/* Kept p-4 for internal content padding */}
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
            <User className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your account information and preferences</p>
        </div>

        {/* Profile Information */}
        <Card className="shadow-card mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl">Personal & Business Information</CardTitle>
            <Button
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              variant={isEditing ? "default" : "outline"}
              className={isEditing ? "bg-gradient-primary" : ""}
              disabled={isSaving}
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
                    <SelectTrigger className={`h-12 ${!isEditing || field.readOnly ? "bg-muted/50" : ""}`}>
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
                    className={!isEditing || field.readOnly ? "bg-muted/50" : ""}
                  />
                )}
              </div>
            ))}

            {/* Top Expense Categories */}
            <div className="space-y-2">
              <Label htmlFor="topExpenseCategories" className="text-foreground font-medium flex items-center">
                <ListChecks className="mr-2 h-4 w-4 text-muted-foreground" />
                Top Expense Categories
              </Label>
              {isEditing ? (
                <>
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

        {/* Business Stats (Now Static) */}
        <Card className="shadow-card mb-6">
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

        {/* Settings Sections */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Notifications */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Bell className="mr-2 h-5 w-5 text-primary" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Decision reminders</span>
                <Button variant="outline" size="sm">Enable</Button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Financial tips</span>
                <Button variant="outline" size="sm">Enable</Button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Weekly summaries</span>
                <Button variant="outline" size="sm">Enable</Button>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Shield className="mr-2 h-5 w-5 text-primary" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Two-factor authentication</span>
                <Button variant="outline" size="sm">Setup</Button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Change password</span>
                <Button variant="outline" size="sm">Update</Button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Login sessions</span>
                <Button variant="outline" size="sm">Manage</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Danger Zone */}
        <Card className="shadow-card mt-6 border-destructive/20">
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
  );
};

export default Profile;