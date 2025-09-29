import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MessageCircle, LayoutDashboard, Settings, PlusCircle, LogOut, History } from 'lucide-react'; // Added History icon
import { useSession } from '@/components/auth/SessionContextProvider';
import { useToast } from '@/hooks/use-toast';

const BottomNavigationBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { supabase } = useSession();
  const { toast } = useToast();

  const navItems = [
    { path: '/chat', icon: MessageCircle, label: 'Chat' },
    { path: '/insights', icon: LayoutDashboard, label: 'Insights' },
    { path: '/history', icon: History, label: 'History' }, // New nav item
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

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
      // SessionContextProvider will handle redirection to /login
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
    // This will trigger a structured input inside the chat,
    // for now, we'll just navigate to chat and simulate a prompt.
    navigate('/chat');
    toast({
      title: "Add Data",
      description: "This will open a structured input in the chat to add your financial data.",
      variant: "default",
    });
    // In future, this could trigger a specific chat message or a dialog/sheet
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-50 md:hidden">
      <nav className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} className="flex-1 text-center">
              <Button
                variant="ghost"
                size="icon"
                className={`flex flex-col h-full w-full rounded-none ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
              >
                <item.icon className="h-5 w-5 mb-1" />
                <span className="text-xs">{item.label}</span>
              </Button>
            </Link>
          );
        })}
        {/* Floating Action Button (FAB) - for Add Data */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <Button
            size="lg"
            className="rounded-full h-14 w-14 bg-gradient-primary shadow-lg hover:shadow-success flex items-center justify-center"
            onClick={handleAddData}
          >
            <PlusCircle className="h-6 w-6 text-primary-foreground" />
          </Button>
        </div>
      </nav>
    </div>
  );
};

export default BottomNavigationBar;