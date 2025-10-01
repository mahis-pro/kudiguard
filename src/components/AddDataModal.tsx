import React, { useState } from 'react';
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
  monthly_revenue: z.coerce.number().min(0, 'Revenue must be a positive number.'),
  monthly_expenses: z.coerce.number().min(0, 'Expenses must be a positive number.'),
  current_savings: z.coerce.number().min(0, 'Savings must be a positive number.'),
});

interface AddDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddDataModal = ({ isOpen, onClose }: AddDataModalProps) => {
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

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!session?.user) {
      toast({ title: 'Error', description: 'You must be logged in.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('financial_entries').insert({
        ...values,
        user_id: session.user.id,
      });

      if (error) throw error;

      toast({
        title: 'Success!',
        description: 'Your financial data has been saved.',
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['latestFinancialEntry', session.user.id] }); // Invalidate the query
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Financial Data</DialogTitle>
          <DialogDescription>
            Provide your latest financial numbers. This data will be used to give you personalized advice.
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
                {isSubmitting ? 'Saving...' : 'Save Data'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddDataModal;