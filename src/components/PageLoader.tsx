import React from 'react';

const PageLoader = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-subtle">
      <div className="loader"></div>
      <p className="mt-8 text-lg font-medium text-primary animate-pulse">Loading KudiGuard...</p>
    </div>
  );
};

export default PageLoader;