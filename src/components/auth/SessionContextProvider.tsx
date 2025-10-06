import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { PostgrestError } from '@supabase/supabase-js';

// Define a simple UserRole for KudiGuard
type UserRole = "vendor" | "admin" | "analyst";

interface SessionContextType {
  session: Session | null;
  isLoading: boolean;
  supabase: typeof supabase;
  userRole: UserRole | null;
  userDisplayName: string | null;
  isFmcgVendor: boolean | null;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const [isFmcgVendor, setIsFmcgVendor] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Function to fetch user profile and update context states
  const fetchAndSetUserProfile = async (currentSession: Session) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, full_name, business_name, business_type, monthly_sales_range, top_expense_categories, is_fmcg_vendor')
        .eq('id', currentSession.user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116' || !data) {
          // Profile not found, user needs to create one (initial setup)
          setUserRole("vendor"); // Default to vendor role
          setUserDisplayName(currentSession.user.email || null);
          setIsFmcgVendor(false); // Default to false if no profile
          // If no profile, redirect to onboarding
          if (location.pathname !== '/onboarding') {
            navigate('/onboarding');
            toast({
              title: "Complete Your Profile",
              description: "Please set up your business profile to continue.",
              variant: "default",
            });
          }
        } else {
          // Other database errors
          toast({
            title: "Profile Error",
            description: `Could not load user profile: ${(error as PostgrestError).message}`,
            variant: "destructive",
          });
          // Consider redirecting to login or a generic error page if profile is critical and cannot be loaded
          navigate('/login');
        }
      } else if (data) {
        const userRoleFromProfile = data.role as UserRole;
        const userFullName = data.full_name;
        const userBusinessName = data.business_name;
        const userBusinessType = data.business_type;
        const userMonthlySalesRange = data.monthly_sales_range;
        const userTopExpenseCategories = data.top_expense_categories;
        const userIsFmcgVendor = data.is_fmcg_vendor;

        let derivedDisplayName: string | null = null;

        if (userFullName) {
          derivedDisplayName = userFullName;
        }
        if (!derivedDisplayName) {
          derivedDisplayName = currentSession.user.email || null;
        }

        setUserRole(userRoleFromProfile);
        setUserDisplayName(derivedDisplayName);
        setIsFmcgVendor(userIsFmcgVendor);

        // If any critical onboarding data is missing, redirect to onboarding
        if (!userFullName || !userBusinessName || !userBusinessType || !userMonthlySalesRange || !userTopExpenseCategories || userIsFmcgVendor === null) {
          if (location.pathname !== '/onboarding') {
            navigate('/onboarding');
            toast({
              title: "Complete Your Profile",
              description: "Please set up your business profile to continue.",
              variant: "default",
            });
          }
        } else {
          // If profile is complete and user is on an auth-related or public page, redirect to chat
          const publicAndAuthRoutes = ['/', '/about', '/tips', '/help', '/login', '/signup', '/reset-password', '/onboarding'];
          if (publicAndAuthRoutes.includes(location.pathname)) {
            navigate('/chat');
          }
        }
      }
    } catch (err: any) {
      console.error("Unexpected error in fetchAndSetUserProfile:", err);
      toast({
        title: "Error",
        description: `An unexpected error occurred: ${err.message}`,
        variant: "destructive",
      });
      navigate('/login'); // Redirect to login on unexpected errors
    } finally {
      setIsLoading(false);
    }
  };

  // Effect 1: Auth state listener and initial load
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);

      if (currentSession) {
        fetchAndSetUserProfile(currentSession);
      } else {
        // User signed out
        setIsLoading(false);
        setUserRole(null);
        setUserDisplayName(null);
        setIsFmcgVendor(null);
        // Redirect to login if signed out and on a protected route
        const protectedRoutes = ['/chat', '/insights', '/settings', '/onboarding', '/history', '/financial-data']; // Added /financial-data
        if (protectedRoutes.includes(location.pathname)) {
          navigate('/login');
        }
      }
    });

    // Initial session check on mount
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (initialSession) {
        fetchAndSetUserProfile(initialSession);
      } else {
        setIsLoading(false);
        const protectedRoutes = ['/chat', '/insights', '/settings', '/onboarding', '/history', '/financial-data']; // Added /financial-data
        if (protectedRoutes.includes(location.pathname)) {
          navigate('/login');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Effect 2: Handle navigation based on session and current path (simplified)
  useEffect(() => {
    if (isLoading) {
      return;
    }

    const protectedRoutes = ['/chat', '/insights', '/settings', '/history', '/financial-data']; // Added /financial-data

    if (session) {
      // User is authenticated
    } else {
      // User is NOT authenticated
      if (protectedRoutes.includes(location.pathname) || location.pathname === '/onboarding') {
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
    <SessionContext.Provider value={{ session, isLoading, supabase, userRole, userDisplayName, isFmcgVendor }}>
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