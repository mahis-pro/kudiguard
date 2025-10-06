import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import ChatPage from "./pages/ChatPage";
import About from "./pages/About";
import Profile from "./pages/Profile";
import FinancialTips from "./pages/FinancialTips";
import Help from "./pages/Help";
import NotFound from "./pages/NotFound";
import SignUpScreen from "./components/SignUpScreen";
import ResetPassword from "./pages/ResetPassword";
import { SessionContextProvider } from "./components/auth/SessionContextProvider";
import AuthenticatedLayout from "@/layouts/AuthenticatedLayout";
import InsightsPage from "./pages/InsightsPage";
import DecisionHistoryPage from "./pages/DecisionHistoryPage";
import FinancialDataPage from "./pages/FinancialDataPage";
import ChatRedirector from "./components/ChatRedirector";
import ErrorBoundary from "./components/ErrorBoundary"; // Import ErrorBoundary
import { toast } from "./hooks/use-toast"; // Import toast for global error handling

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
      retry: 1, // Retry failed queries once by default
      retryDelay: 1000, // 1 second delay before retry
    },
    mutations: {
      onError: (error: any) => {
        // Global error handling for mutations
        console.error("Global mutation error:", error);
        toast({
          title: "Action Failed",
          description: error.message || "An unexpected error occurred.",
          variant: "destructive",
        });
      },
    },
  },
});

const App = () => {
  return (
    <ErrorBoundary> {/* Wrap the entire application with ErrorBoundary */}
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <SessionContextProvider>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<SignUpScreen />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/about" element={<About />} />
                <Route path="/tips" element={<FinancialTips />} />
                <Route path="/help" element={<Help />} />

                {/* Authenticated Routes */}
                <Route element={<AuthenticatedLayout />}>
                  <Route path="/chat" element={<ChatRedirector />} />
                  <Route path="/chat/:chatId" element={<ChatPage />} />
                  <Route path="/insights" element={<InsightsPage />} />
                  <Route path="/history" element={<DecisionHistoryPage />} />
                  <Route path="/financial-data" element={<FinancialDataPage />} />
                  <Route path="/settings" element={<Profile />} />
                </Route>

                {/* Catch-all route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </SessionContextProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;