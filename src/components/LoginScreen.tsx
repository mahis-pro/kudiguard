import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Mail, Lock } from 'lucide-react';
import kudiGuardLogo from '@/assets/kudiguard-logo.png';
import { supabase } from '@/lib/supabase';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { AuthApiError } from '@supabase/supabase-js';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const { toast } = useToast();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSignIn = async () => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');

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
      const { error } = await supabase.auth.signInWithPassword({ 
        email,
        password,
      });

      if (error) {
        throw error;
      }

      toast({ variant: 'default', title: 'Login Successful!', description: 'Redirecting to your dashboard.' }); 
    } catch (error: any) {
      console.error('Error signing in:', error.message);
      let errorMessage = 'Failed to sign in. Please check your credentials.';
      if (error instanceof AuthApiError) {
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please try again.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please confirm your email address to log in.';
        }
      }
      toast({ variant: 'destructive', title: 'Login Failed', description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email || !validateEmail(email)) {
      setEmailError('Please enter a valid email to reset password');
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address to reset your password.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Password Reset Email Sent",
        description: "Please check your inbox for instructions to reset your password.",
        variant: "default",
      });
    } catch (error: any) {
      console.error('Error sending password reset:', error.message);
      let errorMessage = 'Failed to send password reset email. Please try again.';
      if (error instanceof AuthApiError) {
        if (error.message.includes('User not found')) {
          errorMessage = 'No user found with that email address.';
        }
      }
      toast({ variant: 'destructive', title: 'Password Reset Failed', description: errorMessage });
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
          <h1 className="text-2xl font-bold text-primary">Welcome Back!</h1>
          <p className="text-muted-foreground mt-2">
            Your financial advisor for smart business decisions
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
            <Button variant="link" onClick={handleForgotPassword} className="p-0 h-auto text-sm text-primary hover:underline">
              Forgot password?
            </Button>
          </div>
          
          <Button 
            onClick={handleSignIn}
            disabled={isLoading}
            className="w-full h-12 bg-gradient-primary hover:shadow-success font-semibold"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
          
          <div className="text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary hover:underline">
              Sign Up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginScreen;