import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Briefcase, Target, ArrowRight } from 'lucide-react';
import kudiGuardLogo from '@/assets/kudiguard-logo.png';
import { useSession } from '@/components/auth/SessionContextProvider'; // Import useSession
import FinancialGoalSelect from '@/components/FinancialGoalSelect'; // Import new component

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session, supabase, isLoading, onboardingCompleted } = useSession(); // Use session from context
  const [businessName, setBusinessName] = useState('');
  const [goal, setGoal] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already onboarded
  useEffect(() => {
    if (!isLoading && onboardingCompleted === true) {
      navigate('/dashboard');
      toast({
        title: "Already Onboarded",
        description: "You have already completed the onboarding process.",
        variant: "default",
      });
    }
  }, [isLoading, onboardingCompleted, navigate, toast]);

  const handleCompleteOnboarding = async () => {
    if (!session?.user?.id) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to complete onboarding.",
        variant: "destructive",
      });
      return;
    }

    if (!businessName.trim() || !goal) {
      toast({
        title: "Missing Information",
        description: "Please provide your business name and select a goal.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Update the profiles table to mark onboarding as complete and save business details
      const { error } = await supabase
        .from('profiles')
        .update({ 
          onboarding_completed: true,
          business_name: businessName, // Assuming a business_name column
          financial_goal: goal,       // Assuming a financial_goal column
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Welcome to KudiGuard!",
        description: `Your business "${businessName}" is set up with a focus on ${goal}.`,
      });
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error completing onboarding:', error.message);
      toast({
        title: "Error",
        description: error.message || "Failed to complete onboarding. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || (session && onboardingCompleted === true)) {
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
            Let's set up your business for success.
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="businessName" className="text-foreground font-medium flex items-center">
              <Briefcase className="mr-2 h-4 w-4 text-muted-foreground" />
              Your Business Name
            </Label>
            <Input
              id="businessName"
              type="text"
              placeholder="e.g., Mama Ngozi's Provisions"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="h-12"
              required
            />
          </div>

          {/* Financial Goal Select */}
          <FinancialGoalSelect
            value={goal}
            onValueChange={setGoal}
            label="What's your main financial goal?"
          />
          
          <Button 
            onClick={handleCompleteOnboarding}
            disabled={!businessName.trim() || !goal || isSubmitting}
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