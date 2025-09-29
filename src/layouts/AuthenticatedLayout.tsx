import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNavigationBar from '@/components/BottomNavigationBar';
import Navigation from '@/components/Navigation'; // For desktop navigation

const AuthenticatedLayout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Desktop Navigation (if needed, or can be removed for a purely mobile-first approach) */}
      <div className="hidden md:block">
        <Navigation /> {/* This will be the desktop version of the nav */}
      </div>
      
      {/* Main content area */}
      <main className="flex-1 pb-16 md:pb-0"> {/* Add padding-bottom for mobile nav */}
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNavigationBar />
    </div>
  );
};

export default AuthenticatedLayout;