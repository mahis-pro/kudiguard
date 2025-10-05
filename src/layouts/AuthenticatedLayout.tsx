import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import MobileHeader from '@/components/MobileHeader';
import AddDataModal from '@/components/AddDataModal'; // Import the new modal

const AuthenticatedLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAddDataModalOpen, setIsAddDataModalOpen] = useState(false); // State for the modal

  return (
    <div className="min-h-screen flex bg-gradient-subtle">
      <MobileHeader onMenuClick={() => setIsSidebarOpen(true)} />
      <Sidebar 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen}
        onAddDataClick={() => setIsAddDataModalOpen(true)} // Pass handler to open modal
      />
      
      <main className="flex flex-col flex-1 md:ml-64 pt-16 md:pt-0">
        <Outlet />
      </main>

      {/* Render the modal */}
      <AddDataModal 
        isOpen={isAddDataModalOpen} 
        onClose={() => setIsAddDataModalOpen(false)} 
      />
    </div>
  );
};

export default AuthenticatedLayout;