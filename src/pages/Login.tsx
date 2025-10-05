import { useNavigate } from 'react-router-dom';
import LoginScreen from '@/components/LoginScreen';
import { useSession } from '@/components/auth/SessionContextProvider'; // Import useSession

const Login = () => {
  const { isLoading } = useSession(); // Use session from context

  // The redirect logic is now handled by SessionContextProvider,
  // so we only need to ensure the LoginScreen is rendered if not authenticated.
  // If session is loading, we can show a loading state.
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <p className="text-muted-foreground">Loading authentication...</p>
      </div>
    );
  }

  // If session exists and onboarding is handled by context, it will redirect.
  // So, if we reach here, it means no active session or still needs login.
  // The onSendOtpSuccess prop is no longer relevant for email/password login
  // and can be removed from the LoginScreen component.

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <LoginScreen />
    </div>
  );
};

export default Login;