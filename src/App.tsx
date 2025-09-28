import React, { useState } from "react";
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
import AskKudiGuard from "./components/AskKudiGuard";
import DataInputModal from "./components/DataInputModal";
import DecisionResult from "./components/DecisionResult";

const queryClient = new QueryClient();

// Define interfaces for financial data and decision result
interface FinancialData {
  monthlyRevenue: number;
  monthlyExpenses: number;
  currentSavings: number;
  staffPayroll: number;
  inventoryValue: number;
  outstandingDebts: number;
  receivables: number;
  equipmentInvestment: number;
  marketingSpend: number;
  ownerWithdrawals: number;
  businessAge: number;
  industryType: string;
}

interface DecisionResultData {
  id: string; // This will be the recommendation ID
  decision_result: string;
  decision_status: 'success' | 'warning' | 'danger';
  explanation: string;
  next_steps: string[];
  financial_health_score: number;
  score_interpretation: string;
  accepted_or_rejected?: boolean;
  numeric_breakdown: {
    monthly_revenue: number;
    monthly_expenses: number;
    current_savings: number;
    net_income: number;
    staff_payroll: number;
    // Add other relevant inputs here
  };
}

const App = () => {
  const [showAskKudiGuard, setShowAskKudiGuard] = useState(false);
  const [showDataInput, setShowDataInput] = useState(false);
  const [showDecisionResult, setShowDecisionResult] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentIntent, setCurrentIntent] = useState(''); // New state for intent
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [decisionResult, setDecisionResult] = useState<DecisionResultData | null>(null);

  const handleAskKudiGuard = () => {
    setShowAskKudiGuard(true);
    setShowDataInput(false);
    setShowDecisionResult(false);
    setCurrentQuestion('');
    setCurrentIntent('');
    setFinancialData(null);
    setDecisionResult(null);
  };

  const handleShowDataInput = (question: string, intent: string) => { // Now accepts intent
    setCurrentQuestion(question);
    setCurrentIntent(intent); // Set the intent
    setShowAskKudiGuard(false);
    setShowDataInput(true);
    setShowDecisionResult(false);
  };

  const handleAnalyze = (data: FinancialData, result: DecisionResultData) => {
    setFinancialData(data);
    setDecisionResult(result);
    setShowAskKudiGuard(false);
    setShowDataInput(false);
    setShowDecisionResult(true);
  };

  const handleBackToDashboard = () => {
    setShowAskKudiGuard(false);
    setShowDataInput(false);
    setShowDecisionResult(false);
    setCurrentQuestion('');
    setCurrentIntent('');
    setFinancialData(null);
    setDecisionResult(null);
    // Invalidate queries to refetch dashboard data after a new decision
    queryClient.invalidateQueries({ queryKey: ['dashboardDecisions'] });
    queryClient.invalidateQueries({ queryKey: ['userDecisions'] });
    queryClient.invalidateQueries({ queryKey: ['userDecisionsProfile'] }); // Invalidate for Profile page
  };

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
                element={
                  showAskKudiGuard ? (
                    <AskKudiGuard onBack={handleBackToDashboard} onShowDataInput={handleShowDataInput} />
                  ) : showDataInput && currentQuestion && currentIntent ? ( // Check for currentIntent
                    <DataInputModal 
                      question={currentQuestion} 
                      intent={currentIntent} // Pass intent to DataInputModal
                      onBack={handleAskKudiGuard} 
                      onAnalyze={handleAnalyze} 
                    />
                  ) : showDecisionResult && currentQuestion && financialData && decisionResult ? (
                    <DecisionResult 
                      question={currentQuestion} 
                      data={financialData} 
                      result={decisionResult} 
                      onBack={handleBackToDashboard} 
                    />
                  ) : (
                    <DashboardPage onAskKudiGuard={handleAskKudiGuard} />
                  )
                } 
              />
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