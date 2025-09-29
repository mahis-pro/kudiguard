import React from 'react';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import kudiGuardLogo from '@/assets/kudiguard-logo.png';

interface MobileHeaderProps {
  onMenuClick: () => void;
}

const MobileHeader = ({ onMenuClick }: MobileHeaderProps) => {
  return (
    <header className="fixed top-0 left-0 right-0 bg-card shadow-md p-4 flex items-center justify-between z-50 md:hidden h-16">
      <Button variant="ghost" size="icon" onClick={onMenuClick}>
        <Menu className="h-6 w-6" />
      </Button>
      <div className="flex items-center">
        <img 
          src={kudiGuardLogo} 
          alt="KudiGuard" 
          className="h-8 w-8 mr-2"
        />
        <span className="text-lg font-bold text-primary">KudiGuard</span>
      </div>
      {/* Placeholder for potential right-side elements or to balance space */}
      <div className="w-10"></div> 
    </header>
  );
};

export default MobileHeader;