import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Navigation from '@/components/Navigation';
import FinancialHealthScoreCard from '@/components/FinancialHealthScoreCard';
import TipOfTheDayCard from '@/components/TipOfTheDayCard';
import { MessageCircle, TrendingUp, DollarSign, PiggyBank, Users, History, BookOpen, HelpCircle } from 'lucide-react';
import { useSession } from '@/components/auth/SessionContextProvider'; // Import useSession
import { useQuery } from '@tanstack/react-query'; // Import useQuery

interface DashboardProps {
  onAskKudiGuard: () => void;
}

interface Decision {
  id: string;
  created_at: string;
  question: string;
  decision_result: string;
  decision_status: 'success' | 'warning' | 'danger';
  monthly_revenue: number;
  monthly_expenses: number;
  current_savings: number;
  staff_payroll?: number;
  explanation: string;
  next_steps?: string[];
}

// Helper function to calculate financial health score
const calculateFinancialHealth = (decisions: Decision[], financialGoal: string | null) => {
  if (!decisions || decisions.length === 0) {
    return {
      score: 'stable' as 'stable' | 'caution' | 'risky',
      message: 'Start by asking KudiGuard your first financial question to get a personalized health assessment!',
    };
  }

  const totalNetIncome = decisions.reduce((sum, d) => sum + (d.monthly_revenue - d.monthly_expenses), 0);
  const averageNetIncome = totalNetIncome / decisions.length;
  const successCount = decisions.filter(d => d.decision_status === 'success').length;
  const warningCount = decisions.filter(d => d.decision_status === 'warning').length;
  const totalDecisions = decisions.length;

  let score: 'stable' | 'caution' | 'risky' = 'caution';
  let message = 'Your business shows mixed financial signals. Review your recent decisions and consider strategies to improve profitability.';

  if (averageNetIncome < 0) {
    score = 'risky';
    message = 'Your business is currently operating at a loss on average. It\'s crucial to focus on increasing revenue or drastically cutting expenses.';
  } else if (warningCount / totalDecisions > 0.5) {
    score = 'caution';
    message = 'Many of your recent decisions suggest caution. Focus on building a stronger financial foundation before taking on new ventures.';
  } else if (successCount / totalDecisions > 0.7 && averageNetIncome > 20000) { // Arbitrary threshold for "good" net income
    score = 'stable';
    message = 'Your business is financially stable and making good decisions. You have a solid foundation for growth!';
  }

  // Add a touch of personalization based on goal
  if (financialGoal === 'growth' && score === 'risky') {
    message += ' Achieving your growth goal will require significant financial adjustments.';
  } else if (financialGoal === 'stability' && score === 'stable') {
    message += ' You are on track to achieve your financial stability goal.';
  }

  return { score, message };
};

const Dashboard = ({ onAskKudiGuard }: DashboardProps) => {
  const { userDisplayName, businessName, isLoading: sessionLoading, supabase, session, financialGoal } = useSession();

  const fetchDecisions = async () => {
    if (!session?.user?.id) {
      return [];
    }
    const { data, error } = await supabase
      .from('decisions')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }
    return data as Decision[];
  };

  const { data: decisions, isLoading: decisionsLoading, error: decisionsError } = useQuery<Decision[], Error>({
    queryKey: ['dashboardDecisions', session?.user?.id],
    queryFn: fetchDecisions,
    enabled: !!session?.user?.id && !sessionLoading,
  });

  const latestDecision = decisions && decisions.length > 0 ? decisions[0] : null;
  const displayRevenue = latestDecision ? latestDecision.monthly_revenue : 0;
  const displayExpenses = latestDecision ? latestDecision.monthly_expenses : 0;
  const displaySavings = latestDecision ? latestDecision.current_savings : 0;

  const stats = [
    {
      title: "Revenue",
      amount: `₦${displayRevenue.toLocaleString()}`,
      icon: TrendingUp,
      color: "text-success"
    },
    {
      title: "Expenses", 
      amount: `₦${displayExpenses.toLocaleString()}`,
      icon: DollarSign,
      color: "text-warning"
    },
    {
      title: "Savings",
      amount: `₦${displaySavings.toLocaleString()}`, 
      icon: PiggyBank,
      color: "text-primary"
    }
  ];

  const recentDecisions = decisions ? decisions.slice(0, 2) : []; // Show up to 2 most recent decisions

  const financialHealth = calculateFinancialHealth(decisions || [], financialGoal);

  if (sessionLoading || decisionsLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (decisionsError) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <p className="text-destructive">Error loading dashboard data: {decisionsError.message}</p>
      </div>
    );
  }

  const welcomeName = businessName || userDisplayName || "Vendor";

  return (
    <div className="min-h-screen bg-gradient-subtle p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Navigation />
        
        {/* Header */}
        <div className="text-center py-6">
          <h1 className="text-2xl font-bold text-primary mb-2">Welcome back, {welcomeName}!</h1>
          <p className="text-muted-foreground">Let's make smart financial decisions together</p>
        </div>

        {/* Financial Health Score Card */}
        <FinancialHealthScoreCard score={financialHealth.score} message={financialHealth.message} />

        {/* Tip of the Day Card */}
        <TipOfTheDayCard />

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat, index) => (
            <Card key={index} className="shadow-card">
              <CardContent className="p-4 text-center">
                <stat.icon className={`h-6 w-6 mx-auto mb-2 ${stat.color}`} />
                <p className="text-xs text-muted-foreground mb-1">{stat.title}</p>
                <p className="text-lg font-bold text-foreground">{stat.amount}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Action Button */}
        <Button 
          onClick={onAskKudiGuard}
          className="w-full h-14 bg-gradient-primary hover:shadow-success text-lg font-semibold"
        >
          <MessageCircle className="mr-2 h-5 w-5" />
          Ask KudiGuard
        </Button>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/tips">
            <Card className="shadow-card cursor-pointer hover:shadow-success transition-shadow">
              <CardContent className="p-4 text-center">
                <BookOpen className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Financial Tips</p>
              </CardContent>
            </Card>
          </Link>
          
          <Link to="/help">
            <Card className="shadow-card cursor-pointer hover:shadow-success transition-shadow">
              <CardContent className="p-4 text-center">
                <HelpCircle className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Get Help</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Decisions */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <History className="mr-2 h-5 w-5 text-primary" />
              Recent Decisions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentDecisions.length > 0 ? (
              recentDecisions.map((decision, index) => (
                <div key={decision.id} className="flex items-center justify-between p-3 bg-accent rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{decision.question}</p>
                    <p className="text-xs text-muted-foreground">{new Date(decision.created_at).toLocaleDateString('en-GB')}</p>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    decision.decision_status === 'success' ? 'bg-success-light text-success' : 'bg-warning-light text-warning'
                  }`}>
                    {decision.decision_result}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">No decisions yet. Ask KudiGuard your first question!</p>
            )}
            
            <Link to="/history">
              <Button 
                variant="outline" 
                className="w-full mt-3"
              >
                View All History
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;