import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import MobileHeader from '@/components/MobileHeader';
import AddDataModal from '@/components/AddDataModal';
import { useSession } from '@/components/auth/SessionContextProvider';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query'; // Import useQueryClient

const AuthenticatedLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAddDataModalOpen, setIsAddDataModalOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null); // State to hold the ID of the active chat
  const { session, supabase, isLoading: sessionLoading } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient(); // Initialize useQueryClient

  // Effect to set an initial active chat or load the latest one
  useEffect(() => {
    if (!sessionLoading && session?.user && !activeChatId) {
      const fetchOrCreateChat = async () => {
        // Attempt to fetch the latest chat for the user
        const { data, error } = await supabase
          .from('chats')
          .select('id')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
          console.error('Error fetching latest chat:', error.message);
          toast({
            title: "Error loading chat",
            description: "Could not load your previous chat. Starting a new one.",
            variant: "destructive",
          });
          await handleStartNewChat(); // Create a new chat if there's an error
        } else if (data) {
          setActiveChatId(data.id); // Set the latest chat as active
        } else {
          // No existing chats, create a new one
          await handleStartNewChat();
        }
      };
      fetchOrCreateChat();
    }
  }, [sessionLoading, session, activeChatId, supabase, toast]);

  const handleStartNewChat = async () => {
    if (!session?.user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to start a new chat.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create a new empty chat record in the database
      const { data, error } = await supabase
        .from('chats')
        .insert({
          user_id: session.user.id,
          messages: [], // Start with an empty message array
          current_payload: {},
        })
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      setActiveChatId(data.id); // Set the new chat as the active one
      queryClient.invalidateQueries({ queryKey: ['chatState', session.user.id, data.id] }); // Invalidate old chat query
      toast({
        title: "New Chat Started",
        description: "Your conversation history has been cleared and a new chat begun.",
        variant: "default",
      });
    } catch (error: any) {
      console.error('Error starting new chat:', error.message);
      toast({
        title: "Error",
        description: error.message || "Failed to start a new chat.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-subtle">
      <MobileHeader onMenuClick={() => setIsSidebarOpen(true)} />
      <Sidebar 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen}
        onAddDataClick={() => setIsAddDataModalOpen(true)}
        onStartNewChatClick={handleStartNewChat}
      />
      
      <main className="flex flex-col flex-1 md:ml-64 pt-16 md:pt-0">
        {/* Pass activeChatId to the Outlet context */}
        <Outlet context={{ activeChatId }} /> 
      </main>

      <AddDataModal 
        isOpen={isAddDataModalOpen} 
        onClose={() => setIsAddDataModalOpen(false)} 
      />
    </div>
  );
};

export default AuthenticatedLayout;