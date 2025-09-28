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
import { useSession } from '@/components/auth/SessionContextProvider'; // Import useSession
import { useQuery } from '@tanstack/react-query'; // Import useQuery

interface Decision {
  id: string;
  created_at: string; // Changed from 'date' to 'created_at' to match Supabase schema
  question: string;
  decision_result: 'Do it' | 'Wait' | 'Don\'t do it' | 'Likely safe' | 'Be cautious' | 'Urgent Review'; // Updated to match Edge Function logic
  decision_status: 'success' | 'warning' | 'danger'; // Updated to match Edge Function logic
  monthly_revenue: number; // Changed from 'revenue' to 'monthly_revenue'
  monthly_expenses: number; // Changed from 'expenses' to 'monthly_expenses'
  current_savings: number; // Changed from 'savings' to 'current_savings'
  staff_payroll?: number; // Added staff_payroll, optional
  explanation: string;
  next_steps?: string[]; // Added next_steps, optional
  financial_health_score?: number; // Added new field
  score_interpretation?: string; // Added new field
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
      .from('decisions')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false }); // Order by creation date

    if (error) {
      throw error;
    }
    return data as Decision[];
  };

  const { data: decisions, isLoading: decisionsLoading, error: decisionsError } = useQuery<Decision[], Error>({
    queryKey: ['userDecisions', session?.user?.id],
    queryFn: fetchDecisions,
    enabled: !!session?.user?.id && !sessionLoading, // Only run query if session is available and not loading
  });

  const categories = ['all', 'Staffing', 'Expansion', 'Financing', 'Inventory', 'General']; // Added 'General' category

  const filteredDecisions = (decisions || []).filter(decision => {
    const matchesSearch = decision.question.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Determine category based on question for filtering, similar to DecisionResult logic
    let decisionCategory = 'General';
    if (decision.question.toLowerCase().includes('staff') || decision.question.toLowerCase().includes('hire')) {
      decisionCategory = 'Staffing';
    } else if (decision.question.toLowerCase().includes('expand') || decision.question.toLowerCase().includes('stock') || decision.question.toLowerCase().includes('shop')) {
      decisionCategory = 'Expansion';
    } else if (decision.question.toLowerCase().includes('loan') || decision.question.toLowerCase().includes('finance') || decision.question.toLowerCase().includes('borrow')) {
      decisionCategory = 'Financing';
    } else if (decision.question.toLowerCase().includes('stock') || decision.question.toLowerCase().includes('inventory')) {
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

  const totalDecisions = filteredDecisions.length;
  const successfulDecisions = filteredDecisions.filter(d => d.decision_status === 'success').length;
  const averageSavings = totalDecisions > 0 
    ? filteredDecisions.reduce((acc, d) => acc + d.current_savings, 0) / totalDecisions 
    : 0;

  if (sessionLoading || decisionsLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <p className="text-muted-foreground">Loading decisions...</p>
      </div>
    );
  }

  if (decisionsError) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <p className="text-destructive">Error loading decisions: {decisionsError.message}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-4">
      <div className="max-w-4xl mx-auto">
        <Navigation />
        
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
          {filteredDecisions.map((decision) => {
            // Determine category for display based on question
            let displayCategory = 'General';
            if (decision.question.toLowerCase().includes('staff') || decision.question.toLowerCase().includes('hire')) {
              displayCategory = 'Staffing';
            } else if (decision.question.toLowerCase().includes('expand') || decision.question.toLowerCase().includes('stock') || decision.question.toLowerCase().includes('shop')) {
              displayCategory = 'Expansion';
            } else if (decision.question.toLowerCase().includes('loan') || decision.question.toLowerCase().includes('finance') || decision.question.toLowerCase().includes('borrow')) {
              displayCategory = 'Financing';
            } else if (decision.question.toLowerCase().includes('stock') || decision.question.toLowerCase().includes('inventory')) {
              displayCategory = 'Inventory';
            }

            return (
              <Card key={decision.id} className="shadow-card">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{decision.question}</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(decision.created_at).toLocaleDateString('en-GB')}
                        </div>
                        <Badge variant="outline">{displayCategory}</Badge>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full border ${getStatusColor(decision.decision_status)}`}>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(decision.decision_status)}
                        <span className="font-medium">{decision.decision_result}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6 mb-4">
                    <div>
                      <h4 className="font-medium text-foreground mb-2">Explanation</h4>
                      <p className="text-muted-foreground">{decision.explanation}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-foreground mb-2">Financial Snapshot</h4>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="text-center p-2 bg-success-light rounded">
                          <p className="text-xs text-muted-foreground">Revenue</p>
                          <p className="font-medium text-success">₦{decision.monthly_revenue.toLocaleString()}</p>
                        </div>
                        <div className="text-center p-2 bg-warning-light rounded">
                          <p className="text-xs text-muted-foreground">Expenses</p>
                          <p className="font-medium text-warning">₦{decision.monthly_expenses.toLocaleString()}</p>
                        </div>
                        <div className="text-center p-2 bg-primary-light/20 rounded">
                          <p className="text-xs text-muted-foreground">Savings</p>
                          <p className="font-medium text-primary">₦{decision.current_savings.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {decision.financial_health_score !== undefined && decision.score_interpretation && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium text-foreground mb-2 flex items-center">
                        <ShieldCheck className="h-4 w-4 mr-2 text-primary" />
                        Health Score: {decision.financial_health_score}%
                      </h4>
                      <p className="text-sm text-muted-foreground">{decision.score_interpretation}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredDecisions.length === 0 && (
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