import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useSession } from '@/components/auth/SessionContextProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusCircle, Edit, Trash2, Info, CalendarDays, DollarSign, TrendingUp, PiggyBank } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AddDataModal from '@/components/AddDataModal'; // Reusing the existing modal
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface FinancialEntry {
  id: string;
  entry_date: string;
  monthly_revenue: number;
  monthly_expenses: number;
  current_savings: number;
  created_at: string;
}

const FinancialDataPage = () => {
  const { isLoading: sessionLoading, supabase, session } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isAddDataModalOpen, setIsAddDataModalOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<FinancialEntry | null>(null);

  const userId = session?.user?.id;

  // Fetch all financial entries for the user
  const { data: financialEntries, isLoading: financialLoading, error: financialError } = useQuery<FinancialEntry[]>({
    queryKey: ['allFinancialEntries', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('financial_entries')
        .select('id, entry_date, monthly_revenue, monthly_expenses, current_savings, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const handleAddOrEditClick = (entry?: FinancialEntry) => {
    setEntryToEdit(entry || null);
    setIsAddDataModalOpen(true);
  };

  const handleDeleteMutation = useMutation({
    mutationFn: async (entryId: string) => {
      if (!session?.user?.id) throw new Error("User not authenticated.");
      const { error } = await supabase
        .from('financial_entries')
        .delete()
        .eq('id', entryId)
        .eq('user_id', session.user.id); // Ensure user can only delete their own entries
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allFinancialEntries', session?.user?.id] });
      queryClient.invalidateQueries({ queryKey: ['latestFinancialEntry', session?.user?.id] }); // Invalidate latest entry too
      queryClient.invalidateQueries({ queryKey: ['latestFinancialEntryForProfile', session?.user?.id] }); // Invalidate profile's financial entry
      toast({ title: "Success", description: "Financial entry deleted successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: `Failed to delete entry: ${error.message}`, variant: "destructive" });
    },
  });

  if (sessionLoading || financialLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-muted-foreground">Loading financial data...</p>
      </div>
    );
  }

  if (financialError) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-destructive">
        <p>Error loading financial data: {financialError.message}</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <h1 className="text-3xl font-bold text-primary mb-6">Your Financial Data</h1>
        <p className="text-muted-foreground mb-8">Manage your monthly revenue, expenses, and savings entries.</p>

        <Card className="shadow-card bg-gradient-subtle">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-xl">All Entries</CardTitle>
            <Button onClick={() => handleAddOrEditClick()} className="bg-gradient-primary hover:shadow-success">
              <PlusCircle className="h-4 w-4 mr-2" /> Add New Entry
            </Button>
          </CardHeader>
          <CardContent>
            {financialEntries && financialEntries.length > 0 ? (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">Date</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Expenses</TableHead>
                        <TableHead>Savings</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {financialEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">{format(new Date(entry.entry_date || entry.created_at), 'MMM dd, yyyy')}</TableCell>
                          <TableCell className="currency text-success">{entry.monthly_revenue.toLocaleString()}</TableCell>
                          <TableCell className="currency text-destructive">{entry.monthly_expenses.toLocaleString()}</TableCell>
                          <TableCell className="currency text-primary">{entry.current_savings.toLocaleString()}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center space-x-2">
                              <Button variant="outline" size="sm" onClick={() => handleAddOrEditClick(entry)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will permanently delete your financial entry.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteMutation.mutate(entry.id)}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  {financialEntries.map((entry) => (
                    <Card key={entry.id} className="shadow-sm border bg-gradient-subtle">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground flex items-center">
                            <CalendarDays className="h-4 w-4 mr-2" />
                            {format(new Date(entry.entry_date || entry.created_at), 'MMM dd, yyyy')}
                          </span>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleAddOrEditClick(entry)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete your financial entry.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteMutation.mutate(entry.id)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                          <div className="flex items-center">
                            <TrendingUp className="h-4 w-4 mr-2 text-success" />
                            <span className="text-muted-foreground">Revenue: <span className="font-medium currency text-foreground">{entry.monthly_revenue.toLocaleString()}</span></span>
                          </div>
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-2 text-destructive" />
                            <span className="text-muted-foreground">Expenses: <span className="font-medium currency text-foreground">{entry.monthly_expenses.toLocaleString()}</span></span>
                          </div>
                          <div className="flex items-center">
                            <PiggyBank className="h-4 w-4 mr-2 text-primary" />
                            <span className="text-muted-foreground">Savings: <span className="font-medium currency text-foreground">{entry.current_savings.toLocaleString()}</span></span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Info className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                <p className="mb-4 text-center">
                  No financial entries found. Add your first entry to get started!
                </p>
                <Button onClick={() => handleAddOrEditClick()} className="bg-gradient-primary hover:shadow-success">
                  <PlusCircle className="h-4 w-4 mr-2" /> Add New Entry
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <AddDataModal 
        isOpen={isAddDataModalOpen} 
        onClose={() => {
          setIsAddDataModalOpen(false);
          setEntryToEdit(null); // Clear entry to edit when modal closes
        }}
        entryToEdit={entryToEdit} // Pass the entry to edit
      />
    </div>
  );
};

export default FinancialDataPage;