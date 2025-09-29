import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// Removed Navigation import as it's now handled by AuthenticatedLayout
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Mail, 
  Briefcase, 
  Edit3, 
  Save,
  Bell,
  Shield,
  Image,
  LogOut // Added LogOut icon for logout button
} from 'lucide-react';
import { useSession } from '@/components/auth/SessionContextProvider';

const Profile = () => {
  const { session, supabase, isLoading, userDisplayName } = useSession();
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

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
        variant: "default",
      });
      // SessionContextProvider will handle redirection to /login
    } catch (error: any) {
      console.error('Error logging out:', error.message);
      toast({
        title: "Logout Failed",
        description: error.message || "An error occurred during logout.",
        variant: "destructive",
      });
    }
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
    { key: 'fullName', label: 'Full Name', icon: User, type: 'text' },
    { key: 'email', label: 'Email Address', icon: Mail, readOnly: true, type: 'text' },
    { key: 'businessName', label: 'Business Name', icon: Briefcase, type: 'text' },
    { key: 'avatarUrl', label: 'Avatar URL', icon: Image, type: 'url' },
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Navigation is now handled by AuthenticatedLayout */}
      <div className="max-w-3xl mx-auto p-4">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
            {profileData.avatarUrl ? (
              <img src={profileData.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
              <User className="h-10 w-10 text-primary-foreground" />
            )}
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
                <Input
                  id={field.key}
                  type={field.type}
                  value={profileData[field.key as keyof typeof profileData]}
                  onChange={(e) => handleInputChange(field.key, e.target.value)}
                  disabled={!isEditing || field.readOnly}
                  className={!isEditing || field.readOnly ? "bg-muted/50" : ""}
                />
              </div>
            ))}
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

        {/* Logout Button */}
        <Card className="shadow-card mt-6">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center">
              <LogOut className="h-5 w-5 text-destructive mr-3" />
              <p className="font-medium text-foreground">Logout</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Sign Out
            </Button>
          </CardContent>
        </Card>

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