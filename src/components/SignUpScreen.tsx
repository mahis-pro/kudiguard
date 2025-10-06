import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Mail, Lock } from 'lucide-react';
import kudiGuardLogo from '@/assets/kudiguard-logo.png';
import { useSession } from '@/components/auth/SessionContextProvider';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { AuthApiError } from '@supabase/supabase-js';

const SignUpScreen = () => {
  const { supabase } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const { toast } = useToast();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSignUp = async () => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');

    if (!email) {
      setEmailError('Email address is required');
      isValid = false;
    } else if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    }
    
    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      isValid = false;
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password');
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      isValid = false;
    }

    if (!isValid) {
      toast({
        title: "Validation Error",
        description: "Please correct the highlighted fields.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signUp({ 
        email,
        password,
        options: {
          // You can add user_metadata here if needed, e.g., first_name, last_name
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Sign Up Successful",
        description: "Please check your email to verify your account. You can then log in.",
        variant: "default",
      });
    } catch (error: any) {
      console.error('Error signing up:', error.message);
      let errorMessage = 'Failed to sign up. Please try again.';
      if (error instanceof AuthApiError) {
        if (error.message.includes('User already registered')) {
          errorMessage = 'An account with this email already exists. Please log in.';
        } else if (error.message.includes('Password should be at least 6 characters')) {
          errorMessage = 'Password must be at least 6 characters long.';
        }
      }
      toast({ variant: 'destructive', title: 'Sign Up Failed', description: errorMessage });
    } finally {
      setIsLoading(false);
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
              className="h-8 w-auto"
            />
          </div>
          <h1 className="text-2xl font-bold text-primary">Join KudiGuard</h1>
          <p className="text-muted-foreground mt-2">
            Get personalized financial advice for your business
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground font-medium">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="vendor@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError('');
                }}
                className={`pl-10 h-12 ${emailError ? 'border-destructive' : ''}`}
              />
            </div>
            {emailError && (
              <p className="text-sm text-destructive">{emailError}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground font-medium">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                className={`pl-10 h-12 ${passwordError ? 'border-destructive' : ''}`}
              />
            </div>
            {passwordError && (
              <p className="text-sm text-destructive">{passwordError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-foreground font-medium">
              Confirm Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (confirmPasswordError) setConfirmPasswordError('');
                }}
                className={`pl-10 h-12 ${confirmPasswordError ? 'border-destructive' : ''}`}
              />
            </div>
            {confirmPasswordError && (
              <p className="text-sm text-destructive">{confirmPasswordError}</p>
            )}
          </div>
          
          <Button 
            onClick={handleSignUp}
            disabled={isLoading}
            className="w-full h-12 bg-gradient-primary hover:shadow-success font-semibold"
          >
            {isLoading ? "Signing up..." : "Sign Up with Email & Password"}
          </Button>
          
          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Log In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignUpScreen;