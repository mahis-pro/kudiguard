import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { User, ArrowRight } from 'lucide-react'; // Changed Briefcase to User
import kudiGuardLogo from '@/assets/kudiguard-logo.png';
import { useSession } from '@/components/auth/SessionContextProvider';

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session, supabase, isLoading, userDisplayName } = useSession(); // Removed onboardingCompleted, financialGoal
  const [fullName, setFullName] = useState(''); // Changed businessName to fullName
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if full_name is already set
  useEffect(() => {
    if (!isLoading && userDisplayName) { // If userDisplayName is set, assume profile is complete
      navigate('/dashboard');
      toast({
        title: "Profile Already Set",
        description: "You have already completed your profile.",
        variant: "default",
      });
    }
  }, [isLoading, userDisplayName, navigate, toast]);

  const handleCompleteOnboarding = async () => {
    if (!session?.user?.id) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to complete your profile.",
        variant: "destructive",
      });
      return;
    }

    if (!fullName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide your full name.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Update the profiles table to set full_name
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: fullName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Welcome to KudiGuard!",
        description: `Your profile for "${fullName}" is set up.`,
      });
      navigate('/dashboard');
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

  if (isLoading || (session && userDisplayName)) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="text-center pb-8">
          <div className="flex items-center justify-center mb-4">
            <img 
              src={kudiGuardLogo} 
              alt="KudiGuard" 
              className="h-16 w-16"
            />
          </div>
          <h1 className="text-3xl font-bold text-primary">Welcome to KudiGuard!</h1>
          <p className="text-muted-foreground mt-2">
            Let's set up your profile for success.
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-foreground font-medium flex items-center">
              <User className="mr-2 h-4 w-4 text-muted-foreground" />
              Your Full Name
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

          {/* FinancialGoalSelect removed */}
          
          <Button 
            onClick={handleCompleteOnboarding}
            disabled={!fullName.trim() || isSubmitting}
            className="w-full h-12 bg-gradient-primary hover:shadow-success font-semibold"
          >
            {isSubmitting ? "Completing setup..." : (
              <>
                Complete Setup
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;