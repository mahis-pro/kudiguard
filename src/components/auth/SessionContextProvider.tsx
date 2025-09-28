import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

// Define a simple UserRole for KudiGuard
type UserRole = "vendor" | "admin" | "analyst";

interface SessionContextType {
  session: Session | null;
  isLoading: boolean;
  supabase: typeof supabase;
  userRole: UserRole | null;
  avatarUrl: string | null;
  userDisplayName: string | null;
  // Removed onboardingCompleted, businessName, financialGoal from context
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Function to fetch user profile and update context states
  const fetchAndSetUserProfile = async (currentSession: Session) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, avatar_url, full_name') // Fetch full_name and role
        .eq('id', currentSession.user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116' || !data) {
          // Profile not found, user needs to create one (initial setup)
          setUserRole("vendor"); // Default to vendor role
          setAvatarUrl(null);
          setUserDisplayName(currentSession.user.email || null);
        } else {
          toast({
            title: "Profile Error",
            description: `Could not load user profile: ${error.message}`,
            variant: "destructive",
          });
        }
      } else if (data) {
        const userRoleFromProfile = data.role as UserRole;
        const userAvatarUrl = data.avatar_url;
        const userFullName = data.full_name;
        let derivedDisplayName: string | null = null;

        if (userFullName) {
          derivedDisplayName = userFullName;
        }
        if (!derivedDisplayName) {
          derivedDisplayName = currentSession.user.email || null;
        }

        setUserRole(userRoleFromProfile);
        setAvatarUrl(userAvatarUrl);
        setUserDisplayName(derivedDisplayName);
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

      if (currentSession) {
        fetchAndSetUserProfile(currentSession);
      } else {
        // User signed out
        setIsLoading(false);
        setUserRole(null);
        setAvatarUrl(null);
        setUserDisplayName(null);
      }
    });

    // Initial session check on mount
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (initialSession) {
        fetchAndSetUserProfile(initialSession);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Effect 2: Handle navigation based on session and current path
  useEffect(() => {
    if (isLoading) {
      return; // Wait for session and profile to load
    }

    const authRoutes = ['/login', '/signup', '/reset-password'];
    const publicRoutes = ['/', '/about'];
    const protectedRoutes = ['/dashboard', '/profile', '/history', '/tips', '/help'];

    const isCurrentPathAuthOrPublic = authRoutes.includes(location.pathname) || publicRoutes.includes(location.pathname);
    const isCurrentPathProtected = protectedRoutes.includes(location.pathname);

    if (session) {
      // User is authenticated
      if (!userDisplayName && location.pathname !== '/profile') {
        // If user has no full_name set, redirect to profile for initial setup
        navigate('/profile');
        toast({
          title: "Complete Your Profile",
          description: "Please set your full name to continue.",
          variant: "default",
        });
      } else if (userDisplayName && (isCurrentPathAuthOrPublic || location.pathname === '/onboarding')) {
        // If user is authenticated and has a display name, redirect from auth/public pages to dashboard
        navigate('/dashboard');
      }
    } else {
      // User is NOT authenticated
      if (isCurrentPathProtected && !isCurrentPathAuthOrPublic) {
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
  }, [session, isLoading, userDisplayName, location.pathname, navigate, toast]);

  return (
    <SessionContext.Provider value={{ session, isLoading, supabase, userRole, avatarUrl, userDisplayName }}>
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