import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../../hooks/useAuth';
import { Shield } from 'lucide-react';

export default function AdminLayout() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect if role is not allowed in admin layout (only SUPER_ADMIN and ADMIN are allowed)
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
    return <Navigate to="/generator" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex font-sans overflow-hidden admin-panel-root">
      {/* Admin Sidebar Navigation */}
      <Sidebar />

      {/* Main Admin Content Frame */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Admin Top Header */}
        <header className="h-16 border-b border-slate-900 px-6 sm:px-8 flex items-center justify-between shrink-0 bg-slate-950 select-none">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-550">Access Level:</span>
            <span className="inline-flex items-center gap-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider">
              <Shield size={10} />
              {user.role.replace('_', ' ')}
            </span>
          </div>

          <div className="text-right">
            <span className="block text-xs font-bold text-slate-200 leading-tight">{user.fullName}</span>
            <span className="block text-[10px] text-slate-500 font-semibold mt-0.5">Logged in as admin</span>
          </div>
        </header>

        {/* Content view window */}
        <main className="flex-1 p-6 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
