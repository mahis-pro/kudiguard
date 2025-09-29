import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNavigationBar from '@/components/BottomNavigationBar';
// Removed Navigation import as it's not needed for authenticated layout

const AuthenticatedLayout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation is removed for authenticated users as per UX docs */}
      
      {/* Main content area */}
      <main className="flex-1 pb-16"> {/* Add padding-bottom for fixed bottom nav on all screen sizes */}
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <BottomNavigationBar />
    </div>
  );
};

export default AuthenticatedLayout;