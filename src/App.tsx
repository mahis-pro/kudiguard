import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import DashboardPage from "./pages/Dashboard";
import About from "./pages/About";
import Profile from "./pages/Profile";
import DecisionHistory from "./pages/DecisionHistory";
import FinancialTips from "./pages/FinancialTips";
import Help from "./pages/Help";
import NotFound from "./pages/NotFound";
import SignUpScreen from "./components/SignUpScreen";
import ResetPassword from "./pages/ResetPassword";
import { SessionContextProvider } from "./components/auth/SessionContextProvider";
import AskKudiGuardChatPage from "./pages/AskKudiGuardChatPage"; // Import the new chat page

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SessionContextProvider>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUpScreen />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route 
                path="/dashboard" 
                element={<DashboardPage />} /* Removed onAskKudiGuard prop */
              />
              <Route path="/ask" element={<AskKudiGuardChatPage />} /> {/* New route for the chat page */}
              <Route path="/about" element={<About />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/history" element={<DecisionHistory />} />
              <Route path="/tips" element={<FinancialTips />} />
              <Route path="/help" element={<Help />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </SessionContextProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;