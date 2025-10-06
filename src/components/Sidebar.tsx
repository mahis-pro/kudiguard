import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { LayoutDashboard, Settings, PlusCircle, LogOut, History, LineChart, MessageSquarePlus, MessageSquareText, DollarSign } from 'lucide-react';
import kudiGuardLogo from '@/assets/kudiguard-logo.png';
import { useSession } from '@/components/auth/SessionContextProvider';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  onAddDataClick: () => void;
  onStartNewChatClick: () => void;
}

const Sidebar = ({ isSidebarOpen, setIsSidebarOpen, onAddDataClick, onStartNewChatClick }: SidebarProps) => {
  const location = useLocation();
  const { supabase, session, isLoading: sessionLoading } = useSession();
  const { toast } = useToast();

  const navItems = [
    { path: '/insights', icon: LayoutDashboard, label: 'Insights' },
    { path: '/analytics', icon: LineChart, label: 'Analytics' },
    { path: '/history', icon: History, label: 'Decision History' },
    { path: '/financial-data', icon: DollarSign, label: 'Financial Data' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  // Fetch user's chat history
  const { data: chatHistory, isLoading: chatHistoryLoading } = useQuery({
    queryKey: ['chatHistory', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      const { data, error } = await supabase
        .from('chats')
        .select('id, title, current_question, created_at') // Fetch the new 'title' column
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false }); // Order by updated_at for latest activity
      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id && !sessionLoading,
  });

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
        variant: "default",
      });
      setIsSidebarOpen(false);
    } catch (error: any) {
      console.error('Error logging out:', error.message);
      toast({
        title: "Logout Failed",
        description: error.message || "An error occurred during logout.",
        variant: "destructive",
      });
    }
  };

  const handleAddData = () => {
    onAddDataClick();
    setIsSidebarOpen(false);
  };

  const handleNewChat = () => {
    onStartNewChatClick();
    setIsSidebarOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-gradient-subtle text-sidebar-foreground border-r border-sidebar-border shadow-lg">
      {/* Logo and App Name */}
      <div className="p-4 border-b border-sidebar-border flex items-center justify-center">
        <Link to="/chat" className="flex items-center" onClick={() => setIsSidebarOpen(false)}>
          <img 
            src={kudiGuardLogo} 
            alt="KudiGuard" 
            className="h-9 w-auto"
          />
        </Link>
      </div>

      {/* Start New Chat Button */}
      <div className="p-4 text-center border-b border-sidebar-border">
        <Button 
          variant="outline" 
          onClick={handleNewChat}
          className="w-full justify-center text-primary hover:bg-primary/10 h-12"
        >
          <MessageSquarePlus className="h-5 w-5 mr-2" />
          Start New Chat
        </Button>
      </div>

      {/* Chat History */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <h3 className="text-sm font-semibold text-muted-foreground px-4 pt-4 pb-2">Recent Chats</h3>
        <ScrollArea className="flex-1 px-2">
          {chatHistoryLoading ? (
            <div className="p-2 text-sm text-muted-foreground">Loading chats...</div>
          ) : chatHistory && chatHistory.length > 0 ? (
            <div className="space-y-1">
              {chatHistory.map((chat) => {
                const isActive = location.pathname === `/chat/${chat.id}`;
                // Use the new 'title' column, fallback to current_question, then a generic date
                const chatTitle = chat.title || chat.current_question || `Chat on ${new Date(chat.created_at).toLocaleDateString()}`;
                return (
                  <Link 
                    key={chat.id} 
                    to={`/chat/${chat.id}`} 
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <Button
                      variant="ghost"
                      className={`w-full justify-start text-sm h-10 truncate ${
                        isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/90' : 'hover:bg-sidebar-accent/50'
                      }`}
                    >
                      <MessageSquareText className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{chatTitle}</span>
                    </Button>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-2 text-sm text-muted-foreground">No recent chats.</div>
          )}
        </ScrollArea>
      </div>

      {/* Navigation Links */}
      <nav className="p-2 space-y-1 border-t border-sidebar-border">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path} 
              to={item.path} 
              onClick={() => setIsSidebarOpen(false)}
            >
              <Button
                variant="ghost"
                className={`w-full justify-start text-base h-12 ${
                  isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/90' : 'hover:bg-sidebar-accent/50'
                }`}
              >
                <item.icon className="h-5 w-5 mr-3" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* Add Data Button */}
      <div className="p-4 border-t border-sidebar-border">
        <Button 
          onClick={handleAddData}
          className="w-full bg-gradient-primary hover:shadow-success font-semibold h-12"
        >
          <PlusCircle className="h-5 w-5 mr-2" />
          Add Data
        </Button>
      </div>

      {/* Logout Button */}
      <div className="p-4">
        <Button 
          onClick={handleLogout}
          variant="outline"
          className="w-full justify-start text-destructive hover:bg-destructive/10 h-12"
        >
          <LogOut className="h-5 w-5 mr-3" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Sheet */}
      <div className="md:hidden">
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <SheetContent side="left" className="p-0 w-64">
            {sidebarContent}
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Fixed Sidebar */}
      <div className="hidden md:block w-64 fixed top-0 left-0 h-full z-40">
        {sidebarContent}
      </div>
    </>
  );
};

export default Sidebar;