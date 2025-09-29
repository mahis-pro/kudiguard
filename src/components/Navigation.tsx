import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  User, 
  BookOpen, 
  HelpCircle, 
  ArrowLeft,
  Menu,
  X,
  LogOut // Import LogOut icon
} from 'lucide-react';
import kudiGuardLogo from '@/assets/kudiguard-logo.png';
import { useSession } from '@/components/auth/SessionContextProvider'; // Import useSession
import { useToast } from '@/hooks/use-toast'; // Import useToast

interface NavigationProps {
  showBackButton?: boolean;
  onBack?: () => void;
}

const Navigation = ({ showBackButton, onBack }: NavigationProps) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { supabase } = useSession(); // Get supabase client from session context
  const { toast } = useToast(); // Get toast function

  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/profile', icon: User, label: 'Profile' },
    // Removed: { path: '/history', icon: History, label: 'History' },
    { path: '/tips', icon: BookOpen, label: 'Tips' },
    { path: '/help', icon: HelpCircle, label: 'Help' }
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
    } finally {
      setIsMobileMenuOpen(false); // Close mobile menu after action
    }
  };

  if (showBackButton && onBack) {
    return (
      <header className="w-full bg-card shadow-card border-b border-border"> {/* Consistent header styling */}
        <div className="container mx-auto px-4 py-4 flex items-center"> {/* Use container for consistent padding */}
          <Button variant="ghost" onClick={onBack} className="mr-3 p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center">
            <img 
              src={kudiGuardLogo} 
              alt="KudiGuard" 
              className="h-8 w-8 mr-3"
            />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="w-full bg-card shadow-card border-b border-border"> {/* Changed to header, full width, card styling */}
      <div className="container mx-auto px-4 py-4 flex items-center justify-between"> {/* Added container for padding */}
        <Link to="/dashboard" className="flex items-center">
          <img 
            src={kudiGuardLogo} 
            alt="KudiGuard" 
            className="h-10 w-10 md:h-12 md:w-12"
          />
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex space-x-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className={isActive ? "bg-gradient-primary" : ""}
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </nav>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t bg-card">
          <nav className="p-4 space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link 
                  key={item.path} 
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className={`w-full justify-start ${isActive ? "bg-gradient-primary" : ""}`}
                  >
                    <item.icon className="h-4 w-4 mr-3" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4 mr-3" />
              Logout
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navigation;