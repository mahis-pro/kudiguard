import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/components/auth/SessionContextProvider';
import { DollarSign, TrendingUp, PiggyBank } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query'; // Import useQueryClient

const formSchema = z.object({
  id: z.string().optional(), // Added for editing existing entries
  monthly_revenue: z.coerce.number().min(0, 'Revenue must be a positive number.'),
  monthly_expenses: z.coerce.number().min(0, 'Expenses must be a positive number.'),
  current_savings: z.coerce.number().min(0, 'Savings must be a positive number.'),
});

interface FinancialEntry {
  id: string;
  entry_date: string;
  monthly_revenue: number;
  monthly_expenses: number;
  current_savings: number;
  created_at: string;
}

interface AddDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  entryToEdit?: FinancialEntry | null; // Optional prop for editing
}

const AddDataModal = ({ isOpen, onClose, entryToEdit }: AddDataModalProps) => {
  const { supabase, session } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient(); // Initialize useQueryClient
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      monthly_revenue: 0,
      monthly_expenses: 0,
      current_savings: 0,
    },
  });

  // Populate form fields when entryToEdit changes
  useEffect(() => {
    if (entryToEdit) {
      form.reset({
        id: entryToEdit.id,
        monthly_revenue: entryToEdit.monthly_revenue,
        monthly_expenses: entryToEdit.monthly_expenses,
        current_savings: entryToEdit.current_savings,
      });
    } else {
      form.reset({
        monthly_revenue: 0,
        monthly_expenses: 0,
        current_savings: 0,
      });
    }
  }, [entryToEdit, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!session?.user) {
      toast({ title: 'Error', description: 'You must be logged in.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (values.id) {
        // Update existing entry
        const { error } = await supabase.from('financial_entries').update({
          monthly_revenue: values.monthly_revenue,
          monthly_expenses: values.monthly_expenses,
          current_savings: values.current_savings,
          entry_date: new Date().toISOString(), // Update entry date to now
        })
        .eq('id', values.id)
        .eq('user_id', session.user.id); // Ensure user can only update their own entries

        if (error) throw error;

        toast({
          title: 'Success!',
          description: 'Financial entry updated successfully.',
        });
      } else {
        // Insert new entry
        const { error } = await supabase.from('financial_entries').insert({
          monthly_revenue: values.monthly_revenue,
          monthly_expenses: values.monthly_expenses,
          current_savings: values.current_savings,
          user_id: session.user.id,
          entry_date: new Date().toISOString(), // Set entry date for new entries
        });

        if (error) throw error;

        toast({
          title: 'Success!',
          description: 'Your financial data has been saved.',
        });
      }
      
      form.reset();
      // Invalidate relevant queries to refetch data and update UI
      queryClient.invalidateQueries({ queryKey: ['allFinancialEntries', session.user.id] });
      queryClient.invalidateQueries({ queryKey: ['latestFinancialEntry', session.user.id] });
      queryClient.invalidateQueries({ queryKey: ['latestFinancialEntryForProfile', session.user.id] });
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error saving data',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-[425px]"
        aria-labelledby="add-data-modal-title"
        aria-describedby="add-data-modal-description"
      >
        <DialogHeader>
          <DialogTitle id="add-data-modal-title">{entryToEdit ? 'Edit Financial Entry' : 'Add New Financial Data'}</DialogTitle>
          <DialogDescription id="add-data-modal-description">
            {entryToEdit ? 'Update the financial numbers for this entry.' : 'Provide your latest financial numbers. This data will be used to give you personalized advice.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="monthly_revenue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <TrendingUp className="mr-2 h-4 w-4 text-muted-foreground" />
                    Monthly Revenue (₦)
                  </FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 500000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="monthly_expenses"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
                    Monthly Expenses (₦)
                  </FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 350000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="current_savings"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <PiggyBank className="mr-2 h-4 w-4 text-muted-foreground" />
                    Current Business Savings (₦)
                  </FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 200000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting} className="w-full bg-gradient-primary">
                {isSubmitting ? (entryToEdit ? 'Updating...' : 'Saving...') : (entryToEdit ? 'Update Entry' : 'Save Data')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddDataModal;