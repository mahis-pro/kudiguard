import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, Clock, Eye, MessageCircle } from 'lucide-react';
import { useSession } from '@/components/auth/SessionContextProvider';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import DecisionDetailsDialog from '@/components/DecisionDetailsDialog';
import { useIsMobile } from '@/hooks/use-mobile'; // Import useIsMobile

const DecisionHistoryPage = () => {
  const { userDisplayName, isLoading: sessionLoading, supabase, session } = useSession();
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState<any | null>(null);
  const isMobile = useIsMobile(); // Use the hook to detect mobile

  const userId = session?.user?.id;

  const { data: decisions, isLoading: decisionsLoading, error: decisionsError } = useQuery({
    queryKey: ['decisionHistory', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('decisions')
        .select('id, question, recommendation, reasoning, actionable_steps, financial_snapshot, estimated_salary, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

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

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-xl">Your Business Decisions</CardTitle>
          </CardHeader>
          <CardContent>
            {decisions && decisions.length > 0 ? (
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
                      {decisions.map((decision) => (
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
                  {decisions.map((decision) => (
                    <Card key={decision.id} className="shadow-sm border">
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
                No decisions recorded yet. Start a chat to get your first recommendation!
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