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
  ArrowRight, // Added ArrowRight import
} from 'lucide-react';
import kudiGuardLogo from '@/assets/kudiguard-logo.png';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'; // Import Sheet components

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
        <nav className="hidden md:flex items-center space-x-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                className={`text-muted-foreground hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'text-primary font-semibold' : ''}`}
              >
                {item.label}
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

        {/* Mobile Menu Button (Hamburger) */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button
              variant="ghost"
              size="icon" // Changed size to icon for a square button
              className="text-foreground h-10 w-10" // Increased size
            >
              <Menu className="h-6 w-6" /> {/* Larger icon */}
              <span className="sr-only">Toggle mobile menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 bg-background flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-center">
              <img 
                src={kudiGuardLogo} 
                alt="KudiGuard" 
                className="h-10 w-auto"
              />
            </div>
            <nav className="flex-1 p-4 space-y-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link 
                    key={item.path} 
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Button
                      variant="ghost"
                      className={`w-full justify-start text-base h-12 ${isActive ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent"}`}
                    >
                      <item.icon className="h-5 w-5 mr-3" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
              <div className="pt-4 border-t border-border mt-4">
                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-base h-12 hover:bg-primary/10"
                  >
                    <User className="h-5 w-5 mr-3" />
                    Login
                  </Button>
                </Link>
                <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button
                    className="w-full justify-start text-base h-12 mt-2 bg-gradient-primary hover:shadow-success"
                  >
                    <ArrowRight className="h-5 w-5 mr-3" />
                    Sign Up
                  </Button>
                </Link>
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

export default Navigation;