import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  History,
  FileSpreadsheet,
  Settings,
  ArrowLeft,
  Activity,
  Landmark,
} from 'lucide-react';

export default function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const isSuper = user.role === 'SUPER_ADMIN';

  const menuItems = [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/admin/dashboard',
      show: true,
    },
    {
      label: 'Manage Users',
      icon: Users,
      path: '/admin/users',
      show: true,
    },
    {
      label: 'Manage Admins',
      icon: ShieldCheck,
      path: '/admin/admins',
      show: isSuper,
    },
    {
      label: 'Login History',
      icon: History,
      path: '/admin/login-history',
      show: isSuper,
    },
    {
      label: 'Activity Logs',
      icon: Activity,
      path: '/admin/activity',
      show: isSuper,
    },
    {
      label: 'Statement Logs',
      icon: FileSpreadsheet,
      path: '/admin/statements',
      show: isSuper,
    },
    {
      label: 'System Settings',
      icon: Settings,
      path: '/admin/settings',
      show: isSuper,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 px-6 border-b border-slate-800 flex items-center gap-3 bg-slate-950/40">
        <div className="w-8 h-8 bg-indigo-650 rounded-lg flex items-center justify-center text-white">
          <Landmark size={18} />
        </div>
        <div>
          <h2 className="font-extrabold text-sm text-slate-100 tracking-tight leading-none">StatementPro</h2>
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1 block">Portal</span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {menuItems
          .filter((item) => item.show)
          .map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-400 border-l-4 border-indigo-500 pl-3'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-indigo-400' : 'text-slate-500'} />
                {item.label}
              </Link>
            );
          })}
      </nav>

      {/* Back to App */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/30">
        <Link
          to="/generator"
          className="flex items-center justify-center gap-2 w-full bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-2.5 px-4 rounded-xl text-[10px] uppercase tracking-widest border border-slate-700 transition-all active:scale-97 cursor-pointer"
        >
          <ArrowLeft size={14} />
          Go to Generator
        </Link>
      </div>
    </aside>
  );
}
