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
} from 'lucide-react';
import kudiGuardLogo from '@/assets/kudiguard-logo.png';
// Removed useSession and useToast imports as logout is moved

interface NavigationProps {
  showBackButton?: boolean;
  onBack?: () => void;
}

const Navigation = ({ showBackButton, onBack }: NavigationProps) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // These items are for public pages or desktop view of authenticated pages
  const navItems = [
    { path: '/about', icon: HelpCircle, label: 'About' }, // Example public nav item
    { path: '/tips', icon: BookOpen, label: 'Tips' },
    { path: '/help', icon: HelpCircle, label: 'Help' }
  ];

  if (showBackButton && onBack) {
    return (
      <header className="w-full bg-background/90 backdrop-blur-sm fixed top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center">
          <Button variant="ghost" onClick={onBack} className="mr-3 p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center">
            <img 
              src={kudiGuardLogo} 
              alt="KudiGuard" 
              className="h-8 w-auto"
            />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="w-full bg-background/90 backdrop-blur-sm fixed top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <img 
            src={kudiGuardLogo} 
            alt="KudiGuard" 
            className="h-10 w-auto md:h-12"
          />
        </Link>
        
        {/* Desktop Navigation for public pages */}
        <nav className="hidden md:flex space-x-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className={isActive ? "bg-gradient-primary" : "text-foreground hover:bg-accent"}
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
          {/* Login/Signup buttons for public view */}
          <Link to="/login">
            <Button variant="outline" className="hover:bg-primary hover:text-primary-foreground">
              Login
            </Button>
          </Link>
          <Link to="/signup">
            <Button className="bg-gradient-primary hover:shadow-success">
              Sign Up
            </Button>
          </Link>
        </nav>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden text-foreground"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Navigation Menu for public pages */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background/90 backdrop-blur-sm">
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
                    className={`w-full justify-start ${isActive ? "bg-gradient-primary" : "text-foreground hover:bg-accent"}`}
                  >
                    <item.icon className="h-4 w-4 mr-3" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
            <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-foreground hover:bg-accent"
              >
                Login
              </Button>
            </Link>
            <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)}>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-foreground hover:bg-accent"
              >
                Sign Up
              </Button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navigation;