import React, { useEffect, useState, useCallback } from 'react';
import api from '../../lib/api';
import ActivityLogTable from '../../components/admin/ActivityLogTable';
import { Activity, ChevronLeft, ChevronRight, Search } from 'lucide-react';

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (search) params.search = search;
      if (actionFilter) params.action = actionFilter;
      const res = await api.get('/api/activity', { params });
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
      setPage(res.data.page || 1);
      setPages(res.data.pages || 1);
    } catch {} finally { setLoading(false); }
  }, [page, search, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <Activity size={20} className="text-indigo-400" />
          <h1 className="text-xl font-black text-slate-100">Activity Logs</h1>
        </div>
        <p className="text-xs text-slate-500 font-medium">All system audit and administration logs — {total} total entries.</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by user or detail..."
            className="bg-slate-900 border border-slate-800 text-slate-200 text-xs pl-9 pr-4 py-2.5 rounded-xl w-64 focus:outline-none focus:border-indigo-500 placeholder-slate-600 font-medium"
          />
        </div>

        <select
          value={actionFilter}
          onChange={e => { setActionFilter(e.target.value); setPage(1); }}
          className="bg-slate-900 border border-slate-800 text-slate-350 text-xs px-3 py-2.5 rounded-xl cursor-pointer focus:outline-none"
        >
          <option value="">All Actions</option>
          <option value="LOGIN">Login</option>
          <option value="LOGOUT">Logout</option>
          <option value="STATEMENT_GENERATED">Statement Generated</option>
          <option value="PASSWORD_CHANGED">Password Changed</option>
          <option value="PROFILE_UPDATED">Profile Updated</option>
          <option value="USER_CREATED">User Created</option>
          <option value="USER_BANNED">User Banned</option>
          <option value="USER_UNBANNED">User Unbanned</option>
          <option value="USER_DELETED">User Deleted</option>
          <option value="FORCE_LOGOUT">Force Logout</option>
          <option value="PASSWORD_RESET">Password Reset</option>
          <option value="SUBSCRIPTION_CHANGED">Subscription Changed</option>
        </select>
      </div>

      <ActivityLogTable logs={logs} loading={loading} />

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 font-semibold">{total} total • Page {page} of {pages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-30 cursor-pointer">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-30 cursor-pointer">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
