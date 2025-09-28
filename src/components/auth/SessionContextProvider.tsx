import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast'; // Using KudiGuard's useToast

// Define a simple UserRole for KudiGuard (assuming one role for now)
type UserRole = "vendor";

interface SessionContextType {
  session: Session | null;
  isLoading: boolean;
  supabase: typeof supabase;
  userRole: UserRole | null;
  onboardingCompleted: boolean | null;
  avatarUrl: string | null;
  userDisplayName: string | null;
  businessName: string | null;
  financialGoal: string | null; // Added financialGoal to context type
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start as true
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [financialGoal, setFinancialGoal] = useState<string | null>(null); // Added state for financialGoal
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Function to fetch user profile and update context states
  const fetchAndSetUserProfile = async (currentSession: Session) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, onboarding_completed, avatar_url, first_name, last_name, business_name, financial_goal') // Fetch financial_goal
        .eq('id', currentSession.user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116' || !data) {
          // Profile not found, user needs onboarding
          setUserRole("vendor"); // Default to vendor role
          setOnboardingCompleted(false);
          setAvatarUrl(null);
          setUserDisplayName(currentSession.user.email || null);
          setBusinessName(null);
          setFinancialGoal(null); // Clear financial goal
        } else {
          toast({
            title: "Profile Error",
            description: `Could not load user profile: ${error.message}`,
            variant: "destructive",
          });
        }
      } else if (data) {
        const userRoleFromProfile = data.role as UserRole;
        const onboardingStatus = data.onboarding_completed;
        const userAvatarUrl = data.avatar_url;
        const userBusinessName = data.business_name;
        const userFinancialGoal = data.financial_goal; // Get financial goal
        let derivedDisplayName: string | null = null;

        if (data.first_name || data.last_name) {
          derivedDisplayName = `${data.first_name || ''} ${data.last_name || ''}`.trim();
        }
        if (!derivedDisplayName) {
          derivedDisplayName = currentSession.user.email || null;
        }

        setUserRole(userRoleFromProfile);
        setOnboardingCompleted(onboardingStatus);
        setAvatarUrl(userAvatarUrl);
        setUserDisplayName(derivedDisplayName);
        setBusinessName(userBusinessName);
        setFinancialGoal(userFinancialGoal); // Set financial goal
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: `An unexpected error occurred: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Effect 1: Auth state listener and initial load
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);

      const isSignificantAuthEvent = ['SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED'].includes(event);
      const isInitialSessionWithNoProfile = currentSession && userRole === null;

      if (isSignificantAuthEvent || isInitialSessionWithNoProfile) {
        if (currentSession) {
          fetchAndSetUserProfile(currentSession);
        } else {
          // User signed out
          setIsLoading(false);
          setUserRole(null);
          setOnboardingCompleted(null);
          setAvatarUrl(null);
          setUserDisplayName(null);
          setBusinessName(null);
          setFinancialGoal(null); // Clear financial goal on sign out
        }
      } else if (!currentSession) {
        setIsLoading(false);
        setUserRole(null);
        setOnboardingCompleted(null);
        setAvatarUrl(null);
        setUserDisplayName(null);
        setBusinessName(null);
        setFinancialGoal(null); // Clear financial goal if no session
      }
    });

    // Initial session check on mount
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (initialSession) {
        if (userRole === null) {
          fetchAndSetUserProfile(initialSession);
        } else {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [userRole]);

  // Effect 2: Handle navigation based on session, onboarding, and current path
  useEffect(() => {
    if (isLoading) {
      return; // Wait for session and profile to load
    }

    const authRoutes = ['/login', '/signup'];
    const publicRoutes = ['/', '/about']; // Only truly public routes that redirect if logged in
    const protectedRoutes = ['/dashboard', '/profile', '/history', '/onboarding', '/tips', '/help']; // Now includes tips and help

    const isCurrentPathAuthOrPublic = authRoutes.includes(location.pathname) || publicRoutes.includes(location.pathname);
    const isCurrentPathProtected = protectedRoutes.includes(location.pathname);

    if (session) {
      // User is authenticated
      if (onboardingCompleted === false) {
        // User needs onboarding
        if (location.pathname !== '/onboarding') {
          navigate('/onboarding');
          toast({
            title: "Complete Your Profile",
            description: "Please complete the onboarding process.",
            variant: "default",
          });
        }
      } else if (onboardingCompleted === true) {
        // User is onboarded
        if (isCurrentPathAuthOrPublic || location.pathname === '/onboarding') {
          navigate('/dashboard'); // Always redirect to dashboard if onboarded
        }
      }
    } else {
      // User is NOT authenticated
      if (isCurrentPathProtected && !isCurrentPathAuthOrPublic) {
        // Only show toast if we are actually navigating away from the current page
        if (location.pathname !== '/login') { 
          toast({
            title: "Authentication Required",
            description: "Please sign in to access this page.",
            variant: "destructive",
          });
        }
        navigate('/login');
      }
    }
  }, [session, isLoading, userRole, onboardingCompleted, location.pathname, navigate, toast]);

  return (
    <SessionContext.Provider value={{ session, isLoading, supabase, userRole, onboardingCompleted, avatarUrl, userDisplayName, businessName, financialGoal }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionContextProvider');
  }
  return context;
};