import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import MobileHeader from '@/components/MobileHeader';
import AddDataModal from '@/components/AddDataModal'; // Import the new modal
import { useSession } from '@/components/auth/SessionContextProvider';
import { useToast } from '@/hooks/use-toast';

const AuthenticatedLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAddDataModalOpen, setIsAddDataModalOpen] = useState(false); // State for the modal
  const [chatKey, setChatKey] = useState(0); // Key to force ChatPage remount for reset
  const { session } = useSession();
  const { toast } = useToast();

  // Helper to get the localStorage key based on user ID
  const getLocalStorageKey = (userId: string | undefined) => 
    userId ? `kudiguard_chat_state_${userId}` : 'kudiguard_chat_state_anonymous';

  const handleStartNewChat = () => {
    const userId = session?.user?.id;
    const key = getLocalStorageKey(userId);
    localStorage.removeItem(key); // Clear from local storage

    setChatKey(prevKey => prevKey + 1); // Increment key to force ChatPage remount
    toast({
      title: "New Chat Started",
      description: "Your conversation history has been cleared.",
      variant: "default",
    });
  };

  return (
    <div className="min-h-screen flex bg-gradient-subtle">
      <MobileHeader onMenuClick={() => setIsSidebarOpen(true)} />
      <Sidebar 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen}
        onAddDataClick={() => setIsAddDataModalOpen(true)} // Pass handler to open modal
        onStartNewChatClick={handleStartNewChat} // Pass the new chat handler
      />
      
      <main className="flex flex-col flex-1 md:ml-64 pt-16 md:pt-0">
        {/* Use key prop to force ChatPage to remount and reset its state */}
        <Outlet context={{ chatKey }} /> 
      </main>

      {/* Render the modal */}
      <AddDataModal 
        isOpen={isAddDataModalOpen} 
        onClose={() => setIsAddDataModalOpen(false)} 
      />
    </div>
  );
};

export default AuthenticatedLayout;