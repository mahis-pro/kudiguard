import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Lock, AlertCircle, CheckCircle } from 'lucide-react';
import kudiGuardLogo from '@/assets/kudiguard-logo.png';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [formMessage, setFormMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const handleResetPassword = async () => {
    let isValid = true;
    setPasswordError('');
    setConfirmPasswordError('');
    setFormMessage(null);

    if (!newPassword) {
      setPasswordError('New password is required');
      isValid = false;
    } else if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      isValid = false;
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your new password');
      isValid = false;
    } else if (newPassword !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      isValid = false;
    }

    if (!isValid) {
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      setFormMessage({ type: 'success', text: 'Password updated successfully! Redirecting to login...' });
      toast({
        title: "Password Reset Successful",
        description: "Your password has been updated. Please log in with your new password.",
        variant: "default",
      });
      setTimeout(() => {
        navigate('/login');
      }, 2000); // Redirect after 2 seconds
    } catch (error: any) {
      console.error('Error resetting password:', error.message);
      setFormMessage({ type: 'error', text: error.message || 'Failed to reset password. Please try again.' });
      toast({
        title: "Password Reset Failed",
        description: error.message || "An error occurred while resetting your password.",
        variant: "destructive",
      });
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
              className="h-16 w-auto"
            />
          </div>
          <h1 className="text-3xl font-bold text-primary">Reset Your Password</h1>
          <p className="text-muted-foreground mt-2">
            Enter your new password below
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {formMessage && (
            <div className={`flex items-center p-3 rounded-md ${
              formMessage.type === 'error' ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-success-light text-success border border-success/20'
            }`}>
              {formMessage.type === 'error' ? (
                <AlertCircle className="h-4 w-4 mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              <p className="text-sm">{formMessage.text}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-foreground font-medium">
              New Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="newPassword"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                  setFormMessage(null);
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
              Confirm New Password
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
                  setFormMessage(null);
                }}
                className={`pl-10 h-12 ${confirmPasswordError ? 'border-destructive' : ''}`}
              />
            </div>
            {confirmPasswordError && (
              <p className="text-sm text-destructive">{confirmPasswordError}</p>
            )}
          </div>
          
          <Button 
            onClick={handleResetPassword}
            disabled={isLoading || !newPassword || !confirmPassword}
            className="w-full h-12 bg-gradient-primary hover:shadow-success font-semibold"
          >
            {isLoading ? "Resetting password..." : "Reset Password"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;