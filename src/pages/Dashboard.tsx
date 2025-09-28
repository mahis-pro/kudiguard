import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Navigation from '@/components/Navigation';
import FinancialHealthScoreCard from '@/components/FinancialHealthScoreCard';
import TipOfTheDayCard from '@/components/TipOfTheDayCard';
import { MessageCircle, TrendingUp, DollarSign, PiggyBank, History, BookOpen, HelpCircle } from 'lucide-react';
import { useSession } from '@/components/auth/SessionContextProvider';
import { useQuery } from '@tanstack/react-query';

interface DashboardProps {
  onAskKudiGuard: () => void;
}

// Interface for the combined data from decisions and recommendations tables
interface DecisionWithRecommendation {
  id: string; // Recommendation ID
  created_at: string; // Recommendation creation date
  decision_id: string;
  user_id: string;
  recommendation: { // This is the JSONB column from the recommendations table
    decision_result: string;
    decision_status: 'success' | 'warning' | 'danger';
    explanation: string;
    next_steps: string[];
    financial_health_score: number;
    score_interpretation: string;
    numeric_breakdown: {
      monthly_revenue: number;
      monthly_expenses: number;
      current_savings: number;
      net_income: number;
      staff_payroll: number;
      // Add other relevant inputs here
    };
  };
  decisions: { // This is the joined data from the decisions table
    question: string;
    inputs: { // The original inputs from the decision
      monthlyRevenue: number;
      monthlyExpenses: number;
      currentSavings: number;
      staffPayroll?: number;
      inventoryValue?: number;
      outstandingDebts?: number;
      receivables?: number;
      equipmentInvestment?: number;
      marketingSpend?: number;
      ownerWithdrawals?: number;
      businessAge?: number;
      industryType?: string;
    };
  }[]; // <--- Changed to array type
}

const Dashboard = ({ onAskKudiGuard }: DashboardProps) => {
  const { userDisplayName, isLoading: sessionLoading, supabase, session } = useSession();

  const fetchDecisions = async () => {
    if (!session?.user?.id) {
      return [];
    }
    const { data, error } = await supabase
      .from('recommendations')
      .select(`
        id,
        created_at,
        decision_id,
        user_id,
        recommendation,
        decisions (
          question,
          inputs
        )
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }
    return data as DecisionWithRecommendation[];
  };

  const { data: recommendations, isLoading: recommendationsLoading, error: recommendationsError } = useQuery<DecisionWithRecommendation[], Error>({
    queryKey: ['dashboardRecommendations', session?.user?.id],
    queryFn: fetchDecisions,
    enabled: !!session?.user?.id && !sessionLoading,
  });

  const latestRecommendation = recommendations && recommendations.length > 0 ? recommendations[0] : null;
  
  // Derive stats from latest recommendation's numeric_breakdown or use placeholders
  const displayRevenue = latestRecommendation?.recommendation.numeric_breakdown.monthly_revenue || 0;
  const displayExpenses = latestRecommendation?.recommendation.numeric_breakdown.monthly_expenses || 0;
  const displaySavings = latestRecommendation?.recommendation.numeric_breakdown.current_savings || 0;

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

  const recentRecommendations = recommendations ? recommendations.slice(0, 2) : []; // Show up to 2 most recent recommendations

  // Financial Health Score and Interpretation now come from the latest recommendation
  const healthScore = latestRecommendation?.recommendation.financial_health_score;
  const healthInterpretation = latestRecommendation?.recommendation.score_interpretation;

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
      score: 'stable', // Default to stable if no recommendations yet
      message: 'Start by asking KudiGuard your first financial question to get a personalized health assessment!',
    };
  }

  if (sessionLoading || recommendationsLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (recommendationsError) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <p className="text-destructive">Error loading dashboard data: {recommendationsError.message}</p>
      </div>
    );
  }

  const welcomeName = userDisplayName || "Vendor";

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
            {recentRecommendations.length > 0 ? (
              recentRecommendations.map((rec, index) => (
                <div key={rec.id} className="flex items-center justify-between p-3 bg-accent rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{rec.decisions[0].question}</p> {/* Access first element */}
                    <p className="text-xs text-muted-foreground">{new Date(rec.created_at).toLocaleDateString('en-GB')}</p>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    rec.recommendation.decision_status === 'success' ? 'bg-success-light text-success' : 'bg-warning-light text-warning'
                  }`}>
                    {rec.recommendation.decision_result}
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