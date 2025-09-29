import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import MobileHeader from '@/components/MobileHeader'; // Import the new MobileHeader component

const AuthenticatedLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State to control mobile sidebar sheet

  return (
    <div className="min-h-screen flex">
      {/* Mobile Header - visible only on small screens */}
      <MobileHeader onMenuClick={() => setIsSidebarOpen(true)} />

      {/* Sidebar for desktop, or the Sheet for mobile */}
      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

      {/* Main content area */}
      {/* md:ml-64 pushes content right on desktop to make space for the fixed sidebar */}
      {/* p-4 md:p-6 applies consistent padding around the content */}
      {/* pt-[64px] adds top padding on mobile to prevent content from being hidden under the fixed MobileHeader */}
      <main className="flex-1 md:ml-64 p-4 md:p-6 pt-[64px] md:pt-0">
        <Outlet />
      </main>
    </div>
  );
};

export default AuthenticatedLayout;