import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export const Layout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
        <p className="text-sm font-semibold text-neutral-300">Verifying administrator authorization...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans lg:pl-60">
      <Sidebar />
      <div className="admin-content flex min-w-0 flex-col">
        <Outlet />
      </div>
    </div>
  );
};
