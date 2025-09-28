import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Navigation from '@/components/Navigation';
import FinancialHealthScoreCard from '@/components/FinancialHealthScoreCard';
import TipOfTheDayCard from '@/components/TipOfTheDayCard';
import { MessageCircle, TrendingUp, DollarSign, PiggyBank, History, BookOpen, HelpCircle } from 'lucide-react'; // Removed Users icon as it's not directly used in stats
import { useSession } from '@/components/auth/SessionContextProvider';
import { useQuery } from '@tanstack/react-query';

interface DashboardProps {
  onAskKudiGuard: () => void;
}

interface Decision {
  id: string;
  created_at: string;
  question: string;
  decision_type: string; // Changed from decision_result
  recommendation: string; // Changed from decision_result
  confidence_level: 'recommended' | 'cautious' | 'not_advisable'; // New enum type
  explanation: string;
  financial_health_score?: number;
  score_interpretation?: string;
}

const Dashboard = ({ onAskKudiGuard }: DashboardProps) => {
  const { userDisplayName, isLoading: sessionLoading, supabase, session } = useSession(); // Removed businessName, financialGoal

  const fetchDecisions = async () => {
    if (!session?.user?.id) {
      return [];
    }
    const { data, error } = await supabase
      .from('finance.decisions') // Changed to finance.decisions
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
  // These stats will need to be derived from bookkeeping_entries in the future
  // For now, we'll use placeholders or derive from latest decision if available
  const displayRevenue = 0; // Placeholder
  const displayExpenses = 0; // Placeholder
  const displaySavings = 0; // Placeholder

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

  // Financial Health Score and Interpretation now come from the latest decision
  const healthScore = latestDecision?.financial_health_score;
  const healthInterpretation = latestDecision?.score_interpretation;

  let financialHealthScoreProps: { score: 'stable' | 'caution' | 'risky', message: string };

  if (healthScore !== undefined && healthInterpretation) {
    let scoreCategory: 'stable' | 'caution' | 'risky';
    if (healthScore >= 80) {
      scoreCategory = 'stable';
    } else if (healthScore >= 40) {
      scoreCategory = 'caution';
    } else {
      scoreCategory = 'risky';
    }
    financialHealthScoreProps = {
      score: scoreCategory,
      message: healthInterpretation,
    };
  } else {
    financialHealthScoreProps = {
      score: 'stable', // Default to stable if no decisions yet
      message: 'Start by asking KudiGuard your first financial question to get a personalized health assessment!',
    };
  }

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

  const welcomeName = userDisplayName || "Vendor"; // Removed businessName

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
        <FinancialHealthScoreCard score={financialHealthScoreProps.score} message={financialHealthScoreProps.message} />

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
                    decision.confidence_level === 'recommended' ? 'bg-success-light text-success' : 'bg-warning-light text-warning'
                  }`}>
                    {decision.recommendation}
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