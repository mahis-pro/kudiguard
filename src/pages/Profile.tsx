import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Navigation from '@/components/Navigation';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Mail, 
  Briefcase, 
  Edit3, 
  Save,
  Bell,
  Shield,
  CheckCircle,
  XCircle,
  Image // Added Image icon
} from 'lucide-react';
import { useSession } from '@/components/auth/SessionContextProvider';
import { useQuery } from '@tanstack/react-query';

// Interface for the combined data from decisions and recommendations tables
interface DecisionWithRecommendation {
  id: string; // Recommendation ID
  created_at: string; // Recommendation creation date
  decision_id: string;
  user_id: string;
  recommendation: { // This is the JSONB column from the recommendations table
    decision_result: string;
    decision_status: 'success' | 'warning' | 'danger';
    explanation: string;
    next_steps: string[];
    financial_health_score: number;
    score_interpretation: string;
    numeric_breakdown: {
      monthly_revenue: number;
      monthly_expenses: number;
      current_savings: number;
      net_income: number;
      staff_payroll: number;
      // Add other relevant inputs here
    };
  };
  decisions: { // This is the joined data from the decisions table
    question: string;
    inputs: { // The original inputs from the decision
      monthlyRevenue: number;
      monthlyExpenses: number;
      currentSavings: number;
      staffPayroll?: number;
      inventoryValue?: number;
      outstandingDebts?: number;
      receivables?: number;
      equipmentInvestment?: number;
      marketingSpend?: number;
      ownerWithdrawals?: number;
      businessAge?: number;
      industryType?: string;
    };
  }[]; // <--- Changed to array type
}

const Profile = () => {
  const { session, supabase, isLoading, userDisplayName, avatarUrl } = useSession();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    businessName: '',
    avatarUrl: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Fetch user profile data
  useEffect(() => {
    if (session?.user && !isLoading) {
      const fetchProfile = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, business_name, avatar_url')
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
            avatarUrl: data.avatar_url || '',
          });
        } else {
          // If no profile found, initialize with email and empty fields
          setProfileData(prev => ({
            ...prev,
            email: session.user.email || '',
            fullName: userDisplayName || '', // Use userDisplayName from session context if available
          }));
        }
      };
      fetchProfile();
    }
  }, [session, isLoading, supabase, toast, userDisplayName]);

  // Fetch user recommendations (decisions)
  const fetchRecommendations = async () => {
    if (!session?.user?.id) {
      return [];
    }
    const { data, error } = await supabase
      .from('recommendations')
      .select(`
        id,
        created_at,
        decision_id,
        user_id,
        recommendation,
        decisions (
          question,
          inputs
        )
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }
    return data as DecisionWithRecommendation[];
  };

  const { data: recommendations, isLoading: recommendationsLoading, error: recommendationsError } = useQuery<DecisionWithRecommendation[], Error>({
    queryKey: ['userRecommendationsProfile', session?.user?.id],
    queryFn: fetchRecommendations,
    enabled: !!session?.user?.id && !isLoading,
  });

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
          avatar_url: profileData.avatarUrl.trim() === '' ? null : profileData.avatarUrl, // Set to null if empty
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
      // In a real app, SessionContextProvider might have a refreshProfile method
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

  const handleInputChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading || recommendationsLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (recommendationsError) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <p className="text-destructive">Error loading recommendations for profile: {recommendationsError.message}</p>
      </div>
    );
  }

  const profileFields = [
    { key: 'fullName', label: 'Full Name', icon: User, type: 'text' },
    { key: 'email', label: 'Email Address', icon: Mail, readOnly: true, type: 'text' },
    { key: 'businessName', label: 'Business Name', icon: Briefcase, type: 'text' },
    { key: 'avatarUrl', label: 'Avatar URL', icon: Image, type: 'url' }, // Added avatar URL field
  ];

  const totalDecisions = recommendations?.length || 0;
  const recommendedDecisions = recommendations?.filter(rec => rec.recommendation.decision_status === 'success').length || 0;
  const savedPotentialLoss = 0; // This would require complex calculation, keeping as 0 for now
  
  const memberSinceDate = session?.user?.created_at 
    ? new Date(session.user.created_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'short' }) 
    : 'N/A';

  const latestRecommendation = recommendations && recommendations.length > 0 ? recommendations[0] : null;
  const financialHealthScore = latestRecommendation?.recommendation.financial_health_score;
  const scoreInterpretation = latestRecommendation?.recommendation.score_interpretation;

  return (
    <div className="min-h-screen bg-gradient-subtle"> {/* Removed p-4 */}
      <Navigation /> {/* Moved outside */}
      <div className="max-w-3xl mx-auto p-4"> {/* Added p-4 for content */}
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden"> {/* Added overflow-hidden */}
            {profileData.avatarUrl ? (
              <img src={profileData.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
              <User className="h-10 w-10 text-primary-foreground" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">My Profile</h1>
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
                <Input
                  id={field.key}
                  type={field.type} // Use type from field definition
                  value={profileData[field.key as keyof typeof profileData]}
                  onChange={(e) => handleInputChange(field.key, e.target.value)}
                  disabled={!isEditing || field.readOnly}
                  className={!isEditing || field.readOnly ? "bg-muted/50" : ""}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Business Stats (Now Dynamic) */}
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
                <p className="text-2xl font-bold text-primary">{recommendedDecisions}</p>
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