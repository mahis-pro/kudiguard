import React from 'react'; // Removed useState
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet'; // Removed SheetTrigger
import { MessageCircle, LayoutDashboard, Settings, PlusCircle, LogOut, History } from 'lucide-react'; // Removed Menu
import kudiGuardLogo from '@/assets/kudiguard-logo.png';
import { useSession } from '@/components/auth/SessionContextProvider';
import { useToast } from '@/hooks/use-toast';
// Removed useIsMobile

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

const Sidebar = ({ isSidebarOpen, setIsSidebarOpen }: SidebarProps) => { // Added props
  const location = useLocation();
  const navigate = useNavigate();
  const { supabase, userDisplayName } = useSession();
  const { toast } = useToast();
  // Removed isMobile and local isSheetOpen state

  const navItems = [
    { path: '/chat', icon: MessageCircle, label: 'Chat' },
    { path: '/insights', icon: LayoutDashboard, label: 'Insights' },
    { path: '/history', icon: History, label: 'History' },
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
      setIsSidebarOpen(false); // Close sheet on logout
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
    navigate('/chat');
    toast({
      title: "Add Data",
      description: "This will open a structured input in the chat to add your financial data.",
      variant: "default",
    });
    setIsSidebarOpen(false); // Close sheet after action
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border shadow-lg">
      {/* Logo and App Name */}
      <div className="p-4 border-b border-sidebar-border flex items-center justify-center">
        <img 
          src={kudiGuardLogo} 
          alt="KudiGuard" 
          className="h-10 w-10 mr-2"
        />
        <span className="text-xl font-bold text-sidebar-primary">KudiGuard</span>
      </div>

      {/* User Info (Optional, can be added later) */}
      {userDisplayName && (
        <div className="p-4 text-center border-b border-sidebar-border">
          <p className="font-semibold text-sidebar-foreground">Hello, {userDisplayName.split(' ')[0]}!</p>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path} 
              to={item.path} 
              onClick={() => setIsSidebarOpen(false)} // Close sheet on navigation
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
      {/* Mobile Sheet - controlled by AuthenticatedLayout */}
      <div className="md:hidden">
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          {/* SheetTrigger is now in MobileHeader */}
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