import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import MobileHeader from '@/components/MobileHeader';
import AddDataModal from '@/components/AddDataModal';
import { useSession } from '@/components/auth/SessionContextProvider';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const AuthenticatedLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAddDataModalOpen, setIsAddDataModalOpen] = useState(false);
  const { session, supabase } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Function to handle starting a new chat (kept here as it's passed to Sidebar)
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
          title: 'New Chat', // Default title for a new chat
        })
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['chatState', session.user.id] });
      queryClient.invalidateQueries({ queryKey: ['chatHistory', session.user.id] });
      // The navigation to the new chat ID will be handled by the component that calls this function
      // (e.g., Sidebar, which will then trigger ChatRedirector or ChatPage)
      toast({
        title: "New Chat Started",
        description: "Your conversation history has been cleared and a new chat begun.",
        variant: "default",
      });
      return data.id; // Return the new chat ID
    } catch (error: any) {
      console.error('Error starting new chat:', error.message);
      toast({
        title: "Error",
        description: error.message || "Failed to start a new chat.",
        variant: "destructive",
      });
      return null;
    }
  };

  // The useEffect for chat redirection has been moved to ChatRedirector.tsx
  // This layout now simply renders its children (Outlet) for all authenticated routes.

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
        <Outlet />
      </main>

      <AddDataModal 
        isOpen={isAddDataModalOpen} 
        onClose={() => setIsAddDataModalOpen(false)} 
      />
    </div>
  );
};

export default AuthenticatedLayout;