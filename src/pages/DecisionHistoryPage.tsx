import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Clock, Eye, MessageCircle, Info } from 'lucide-react';
import { useSession } from '@/components/auth/SessionContextProvider';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import DecisionDetailsDialog from '@/components/DecisionDetailsDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { Label } from '@/components/ui/label'; // Import Label component

const DecisionHistoryPage = () => {
  const { isLoading: sessionLoading, supabase, session } = useSession();
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState<any | null>(null);
  const [filterType, setFilterType] = useState('all'); // 'all', 'APPROVE', 'WAIT', 'REJECT'
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest', 'oldest'
  const isMobile = useIsMobile();

  const userId = session?.user?.id;

  const { data: decisions, isLoading: decisionsLoading, error: decisionsError } = useQuery({
    queryKey: ['decisionHistory', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('decisions')
        .select('id, question, recommendation, reasoning, actionable_steps, financial_snapshot, estimated_salary, estimated_inventory_cost, inventory_turnover_days, supplier_credit_terms_days, average_receivables_turnover_days, outstanding_supplier_debts, supplier_discount_percentage, storage_cost_percentage_of_order, proposed_marketing_budget, is_localized_promotion, historic_foot_traffic_increase_observed, sales_increase_last_campaign_1, sales_increase_last_campaign_2, is_volatile_industry, is_growth_stage, is_seasonal_windfall_month, debt_apr, consecutive_negative_cash_flow_months, current_reserve_allocation_percentage_emergency, current_reserve_allocation_percentage_growth, fixed_operating_expenses, net_profit, equipment_cost, estimated_roi_percentage, is_essential_replacement, current_equipment_utilization_percentage, total_business_liabilities, total_business_assets, total_monthly_debt_repayments, loan_purpose_is_revenue_generating, profit_growth_consistent_6_months, market_research_validates_demand, capital_available_percentage_of_cost, expansion_cost, profit_margin_trend, revenue_growth_trend, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }); // Default to newest first from DB
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const filteredAndSortedDecisions = useMemo(() => {
    let currentDecisions = decisions || [];

    // Apply filter
    if (filterType !== 'all') {
      currentDecisions = currentDecisions.filter(
        (decision) => decision.recommendation === filterType
      );
    }

    // Apply sort
    if (sortOrder === 'oldest') {
      currentDecisions = [...currentDecisions].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    } else {
      // 'newest' is default from query, but re-sort if filter changed
      currentDecisions = [...currentDecisions].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    return currentDecisions;
  }, [decisions, filterType, sortOrder]);

  if (sessionLoading || decisionsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-muted-foreground">Loading decision history...</p>
      </div>
    );
  }

  if (decisionsError) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-destructive">
        <p>Error loading data: {decisionsError.message}</p>
      </div>
    );
  }

  const getRecommendationBadge = (recommendation: string) => {
    switch (recommendation) {
      case 'APPROVE':
        return <Badge variant="default" className="bg-success hover:bg-success/90">Approve</Badge>;
      case 'WAIT':
        return <Badge variant="secondary" className="bg-warning hover:bg-warning/90">Wait</Badge>;
      case 'REJECT':
        return <Badge variant="destructive" className="hover:bg-destructive/90">Reject</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const handleViewDetails = (decision: any) => {
    setSelectedDecision(decision);
    setIsDetailsModalOpen(true);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <h1 className="text-3xl font-bold text-primary mb-6">Decision History</h1>
        <p className="text-muted-foreground mb-8">Review past financial decisions and their outcomes.</p>

        <Card className="shadow-card bg-gradient-subtle"> {/* Applied gradient here */}
          <CardHeader>
            <CardTitle className="text-xl">Your Business Decisions</CardTitle>
            {decisions && decisions.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <div className="flex-1">
                  <Label htmlFor="filter-type" className="sr-only">Filter by Recommendation</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger id="filter-type" className="w-full">
                      <SelectValue placeholder="Filter by Recommendation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Recommendations</SelectItem>
                      <SelectItem value="APPROVE">Approve</SelectItem>
                      <SelectItem value="WAIT">Wait</SelectItem>
                      <SelectItem value="REJECT">Reject</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label htmlFor="sort-order" className="sr-only">Sort by Date</Label>
                  <Select value={sortOrder} onValueChange={setSortOrder}>
                    <SelectTrigger id="sort-order" className="w-full">
                      <SelectValue placeholder="Sort by Date" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Date (Newest First)</SelectItem>
                      <SelectItem value="oldest">Date (Oldest First)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {filteredAndSortedDecisions && filteredAndSortedDecisions.length > 0 ? (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">Date</TableHead>
                        <TableHead>Question</TableHead>
                        <TableHead>Recommendation</TableHead>
                        <TableHead className="text-center">Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedDecisions.map((decision) => (
                        <TableRow key={decision.id}>
                          <TableCell className="font-medium">{new Date(decision.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{decision.question}</TableCell>
                          <TableCell>{getRecommendationBadge(decision.recommendation)}</TableCell>
                          <TableCell className="text-center">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleViewDetails(decision)}
                              className="flex items-center justify-center mx-auto"
                            >
                              <Eye className="h-4 w-4 mr-2" /> View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  {filteredAndSortedDecisions.map((decision) => (
                    <Card key={decision.id} className="shadow-sm border bg-gradient-subtle"> {/* Applied gradient here */}
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground flex items-center">
                            <Clock className="h-4 w-4 mr-2" />
                            {new Date(decision.created_at).toLocaleDateString()}
                          </span>
                          {getRecommendationBadge(decision.recommendation)}
                        </div>
                        <p className="font-semibold text-foreground flex items-start">
                          <MessageCircle className="h-4 w-4 text-primary mr-2 mt-1 flex-shrink-0" />
                          {decision.question}
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleViewDetails(decision)}
                          className="w-full mt-2"
                        >
                          <Eye className="h-4 w-4 mr-2" /> View Details
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Info className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                <p className="mb-4 text-center">
                  No decisions recorded yet. Start a chat to get your first recommendation!
                </p>
                <Link to="/chat">
                  <Button className="bg-gradient-primary hover:shadow-success">
                    Start a Chat
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <DecisionDetailsDialog 
        isOpen={isDetailsModalOpen} 
        onClose={() => setIsDetailsModalOpen(false)} 
        decision={selectedDecision} 
      />
    </div>
  );
};

export default DecisionHistoryPage;