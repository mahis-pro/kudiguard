import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import MobileHeader from '@/components/MobileHeader';

const AuthenticatedLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-gradient-subtle">
      <MobileHeader onMenuClick={() => setIsSidebarOpen(true)} />
      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      
      {/* 
        This main content area is a flex container that grows to fill available space.
        It uses flex-col to stack its children vertically.
        The top padding (pt-16) creates space for the fixed mobile header.
        On medium screens and up (md:), the top padding is removed as the header is hidden.
      */}
      <main className="flex flex-col flex-1 md:ml-64 pt-16 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
};

export default AuthenticatedLayout;