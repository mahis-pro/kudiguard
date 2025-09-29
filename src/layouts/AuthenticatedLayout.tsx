import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';

const AuthenticatedLayout = () => {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar for desktop, or trigger for mobile sheet */}
      <Sidebar />

      {/* Main content area */}
      {/* md:ml-64 pushes content right on desktop to make space for the fixed sidebar */}
      {/* p-4 md:p-6 applies consistent padding around the content */}
      <main className="flex-1 md:ml-64 p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default AuthenticatedLayout;