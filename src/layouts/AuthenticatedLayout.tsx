import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom'; // Import useNavigate and useParams
import Sidebar from '@/components/Sidebar';
import MobileHeader from '@/components/MobileHeader';
import AddDataModal from '@/components/AddDataModal';
import { useSession } from '@/components/auth/SessionContextProvider';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const AuthenticatedLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAddDataModalOpen, setIsAddDataModalOpen] = useState(false);
  const { session, supabase, isLoading: sessionLoading } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate(); // Initialize useNavigate
  const { chatId: urlChatId } = useParams<{ chatId: string }>(); // Get chatId from URL

  // Effect to set an initial active chat or load the latest one
  useEffect(() => {
    if (!sessionLoading && session?.user) {
      const fetchOrCreateChat = async () => {
        if (urlChatId) {
          // If a chatId is in the URL, ensure it's a valid chat for the user
          const { data, error } = await supabase
            .from('chats')
            .select('id')
            .eq('id', urlChatId)
            .eq('user_id', session.user.id)
            .single();

          if (error || !data) {
            console.error('Error fetching chat from URL or chat not found:', error?.message);
            toast({
              title: "Chat Not Found",
              description: "The requested chat could not be loaded. Starting a new one.",
              variant: "destructive",
            });
            await handleStartNewChat(); // Create a new chat if URL chat is invalid
          }
          // If data exists, no need to navigate, ChatPage will pick it up
        } else {
          // No chatId in URL, try to load the latest chat or create a new one
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
            await handleStartNewChat();
          } else if (data) {
            navigate(`/chat/${data.id}`); // Navigate to the latest chat
          } else {
            await handleStartNewChat(); // No existing chats, create a new one
          }
        }
      };
      fetchOrCreateChat();
    }
  }, [sessionLoading, session, supabase, toast, navigate, urlChatId]); // Added urlChatId to dependencies

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
      const { data, error } = await supabase
        .from('chats')
        .insert({
          user_id: session.user.id,
          messages: [],
          current_payload: {},
        })
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['chatState', session.user.id] }); // Invalidate all chat states for this user
      navigate(`/chat/${data.id}`); // Navigate to the newly created chat
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
        <Outlet /> {/* No longer passing activeChatId via context */}
      </main>

      <AddDataModal 
        isOpen={isAddDataModalOpen} 
        onClose={() => setIsAddDataModalOpen(false)} 
      />
    </div>
  );
};

export default AuthenticatedLayout;