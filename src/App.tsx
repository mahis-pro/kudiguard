import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import ChatPage from "./pages/ChatPage"; // Updated import to ChatPage
import About from "./pages/About";
import Profile from "./pages/Profile";
import FinancialTips from "./pages/FinancialTips";
import Help from "./pages/Help";
import NotFound from "./pages/NotFound";
import SignUpScreen from "./components/SignUpScreen";
import ResetPassword from "./pages/ResetPassword";
import { SessionContextProvider } from "./components/auth/SessionContextProvider";
import AuthenticatedLayout from "@/layouts/AuthenticatedLayout"; // Corrected import path

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
                <Route path="/chat" element={<ChatPage />} /> {/* New main chat page */}
                <Route path="/insights" element={<div>Insights Page (Coming Soon)</div>} /> {/* Placeholder */}
                <Route path="/settings" element={<Profile />} /> {/* Profile is now part of settings */}
                {/* Add other authenticated routes here, e.g., /history, /learning-hub */}
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