import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Navigation from '@/components/Navigation';
import FinancialHealthScoreCard from '@/components/FinancialHealthScoreCard';
import TipOfTheDayCard from '@/components/TipOfTheDayCard';
import { MessageCircle, TrendingUp, DollarSign, PiggyBank, BookOpen, HelpCircle } from 'lucide-react';
import { useSession } from '@/components/auth/SessionContextProvider';
// Removed useQuery import as decision data fetching is removed

const Dashboard = () => {
  const { userDisplayName, isLoading: sessionLoading } = useSession();
  const navigate = useNavigate();

  // Static placeholder stats for now
  const displayRevenue = 150000;
  const displayExpenses = 80000;
  const displaySavings = 50000;

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

  // Static financial health score props
  const financialHealthScoreProps = {
    score: 'stable' as 'stable' | 'caution' | 'risky',
    message: 'Start by asking KudiGuard your first financial question to get a personalized health assessment!',
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  const welcomeName = userDisplayName || "Vendor";

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navigation />
      <div className="max-w-2xl mx-auto space-y-6 p-4">
        
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

        {/* Main Action Button - Placeholder for future chat page */}
        <Button 
          onClick={() => console.log('Ask KudiGuard clicked - implement new chat logic here')}
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

        {/* Start a New Conversation Card (replaces Recent Decisions) */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <MessageCircle className="mr-2 h-5 w-5 text-primary" />
              Start a New Conversation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-center text-muted-foreground py-4">
              Your decision history will appear here once you start asking KudiGuard questions again.
            </p>
            <Button 
              onClick={() => console.log('Ask KudiGuard clicked - implement new chat logic here')}
              className="w-full mt-3 bg-gradient-primary hover:shadow-success"
            >
              Ask KudiGuard Your First Question
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;