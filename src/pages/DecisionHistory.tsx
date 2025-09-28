import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Navigation from '@/components/Navigation';
import { 
  History, 
  Search, 
  Filter, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Calendar,
  TrendingUp,
  DollarSign,
  Users,
  ShieldCheck
} from 'lucide-react';
import { useSession } from '@/components/auth/SessionContextProvider';
import { useQuery } from '@tanstack/react-query';

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

const DecisionHistory = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const { supabase, session, isLoading: sessionLoading } = useSession();

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
    queryKey: ['userRecommendations', session?.user?.id],
    queryFn: fetchDecisions,
    enabled: !!session?.user?.id && !sessionLoading,
  });

  const categories = ['all', 'Staffing', 'Expansion', 'Financing', 'Inventory', 'General'];

  const filteredRecommendations = (recommendations || []).filter(rec => {
    const question = rec.decisions[0].question.toLowerCase(); // Access first element
    const matchesSearch = question.includes(searchQuery.toLowerCase());
    
    let decisionCategory = 'General';
    if (question.includes('staff') || question.includes('hire')) {
      decisionCategory = 'Staffing';
    } else if (question.includes('expand') || question.includes('stock') || question.includes('shop')) {
      decisionCategory = 'Expansion';
    } else if (question.includes('loan') || question.includes('borrow') || question.includes('finance')) {
      decisionCategory = 'Financing';
    } else if (question.includes('stock') || question.includes('inventory')) {
      decisionCategory = 'Inventory';
    }

    const matchesCategory = filterCategory === 'all' || decisionCategory === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'danger': return <XCircle className="h-4 w-4 text-destructive" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-success-light text-success border-success/20';
      case 'warning': return 'bg-warning-light text-warning border-warning/20';
      case 'danger': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const totalDecisions = filteredRecommendations.length;
  const successfulDecisions = filteredRecommendations.filter(rec => rec.recommendation.decision_status === 'success').length;
  const averageSavings = totalDecisions > 0 
    ? filteredRecommendations.reduce((acc, rec) => acc + rec.recommendation.numeric_breakdown.current_savings, 0) / totalDecisions 
    : 0;

  if (sessionLoading || recommendationsLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <p className="text-muted-foreground">Loading decisions...</p>
      </div>
    );
  }

  if (recommendationsError) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <p className="text-destructive">Error loading decisions: {recommendationsError.message}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle"> {/* Removed p-4 */}
      <Navigation /> {/* Moved outside */}
      <div className="max-w-4xl mx-auto p-4"> {/* Added p-4 for content */}
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-primary p-3 rounded-full">
              <History className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">Decision History</h1>
          <p className="text-muted-foreground">Track your financial decisions and their outcomes</p>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-card">
            <CardContent className="p-6 text-center">
              <TrendingUp className="h-8 w-8 text-success mx-auto mb-3" />
              <h3 className="text-2xl font-bold text-primary">{totalDecisions}</h3>
              <p className="text-muted-foreground">Total Decisions</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-8 w-8 text-success mx-auto mb-3" />
              <h3 className="text-2xl font-bold text-success">{successfulDecisions}</h3>
              <p className="text-muted-foreground">Successful Actions</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-6 text-center">
              <DollarSign className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="text-2xl font-bold text-primary">₦{averageSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
              <p className="text-muted-foreground">Avg. Savings</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="shadow-card mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search decisions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Filter className="h-5 w-5 text-muted-foreground mt-2" />
                <div className="flex gap-2 flex-wrap">
                  {categories.map((category) => (
                    <Button
                      key={category}
                      variant={filterCategory === category ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterCategory(category)}
                      className={filterCategory === category ? "bg-gradient-primary" : ""}
                    >
                      {category === 'all' ? 'All' : category}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Decisions List */}
        <div className="space-y-4">
          {filteredRecommendations.map((rec) => {
            const question = rec.decisions[0].question; // Access first element
            let displayCategory = 'General';
            if (question.toLowerCase().includes('staff') || question.toLowerCase().includes('hire')) {
              displayCategory = 'Staffing';
            } else if (question.toLowerCase().includes('expand') || question.toLowerCase().includes('stock') || question.toLowerCase().includes('shop')) {
              displayCategory = 'Expansion';
            } else if (question.toLowerCase().includes('loan') || question.toLowerCase().includes('finance') || question.toLowerCase().includes('borrow')) {
              displayCategory = 'Financing';
            } else if (question.toLowerCase().includes('stock') || question.toLowerCase().includes('inventory')) {
              displayCategory = 'Inventory';
            }

            return (
              <Card key={rec.id} className="shadow-card">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{question}</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(rec.created_at).toLocaleDateString('en-GB')}
                        <Badge variant="outline">{displayCategory}</Badge>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full border ${getStatusColor(rec.recommendation.decision_status)}`}>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(rec.recommendation.decision_status)}
                        <span className="font-medium">{rec.recommendation.decision_result}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6 mb-4">
                    <div>
                      <h4 className="font-medium text-foreground mb-2">Explanation</h4>
                      <p className="text-muted-foreground">{rec.recommendation.explanation}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-foreground mb-2">Financial Snapshot</h4>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="text-center p-2 bg-success-light rounded">
                          <p className="text-xs text-muted-foreground">Revenue</p>
                          <p className="font-medium text-success">₦{rec.recommendation.numeric_breakdown.monthly_revenue.toLocaleString()}</p>
                        </div>
                        <div className="text-center p-2 bg-warning-light rounded">
                          <p className="text-xs text-muted-foreground">Expenses</p>
                          <p className="font-medium text-warning">₦{rec.recommendation.numeric_breakdown.monthly_expenses.toLocaleString()}</p>
                        </div>
                        <div className="text-center p-2 bg-primary-light/20 rounded">
                          <p className="text-xs text-muted-foreground">Savings</p>
                          <p className="font-medium text-primary">₦{rec.recommendation.numeric_breakdown.current_savings.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {rec.recommendation.financial_health_score !== undefined && rec.recommendation.score_interpretation && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium text-foreground mb-2 flex items-center">
                        <ShieldCheck className="h-4 w-4 mr-2 text-primary" />
                        Health Score: {rec.recommendation.financial_health_score}%
                      </h4>
                      <p className="text-sm text-muted-foreground">{rec.recommendation.score_interpretation}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredRecommendations.length === 0 && (
          <Card className="shadow-card">
            <CardContent className="p-8 text-center">
              <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No decisions found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filter criteria, or ask KudiGuard a question!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DecisionHistory;