import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar'; // Import the new Sidebar component

const AuthenticatedLayout = () => {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar for desktop, or trigger for mobile sheet */}
      <Sidebar />

      {/* Main content area */}
      <main className="flex-1 md:ml-64 p-4 md:p-6"> {/* Adjust margin-left for sidebar width on desktop */}
        <Outlet />
      </main>
    </div>
  );
};

export default AuthenticatedLayout;