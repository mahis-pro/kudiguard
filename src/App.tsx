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
import AnalyticsPage from "./pages/AnalyticsPage"; // Import the new AnalyticsPage
import DecisionHistoryPage from "./pages/DecisionHistoryPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Disable automatic refetching when window regains focus
      staleTime: 1000 * 60 * 5, // Data is considered fresh for 5 minutes
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/insights" element={<InsightsPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} /> {/* New Analytics Route */}
                <Route path="/history" element={<DecisionHistoryPage />} />
                <Route path="/settings" element={<Profile />} />
                {/* Add other authenticated routes here, e.g., /learning-hub */}
              </Route>

              {/* Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </SessionContextProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;