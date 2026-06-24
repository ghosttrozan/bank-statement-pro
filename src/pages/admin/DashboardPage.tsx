import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../lib/api';
import SuperAdminDashboard from '../../components/admin/SuperAdminDashboard';
import AdminDashboard from '../../components/admin/AdminDashboard';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get('/api/analytics/overview');
        if (mounted) setStats(res.data);
      } catch (err: any) {
        if (mounted) setError(err?.response?.data?.message || 'Failed to load analytics.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl px-6 py-4 text-rose-400 text-sm font-medium">
          {error}
        </div>
      </div>
    );
  }

  const role = user?.role;
  if (role === 'SUPER_ADMIN') return <SuperAdminDashboard data={stats} />;
  if (role === 'ADMIN') return <AdminDashboard data={stats} />;

  return null;
}
