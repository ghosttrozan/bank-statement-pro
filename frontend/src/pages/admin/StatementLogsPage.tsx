import React, { useEffect, useState, useCallback } from 'react';
import api from '../../lib/api';
import StatementLogTable from '../../components/admin/StatementLogTable';
import { FileText, ChevronLeft, ChevronRight, Search, Download } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function StatementLogsPage() {
  const { user } = useAuth();
  const isSuper = user?.role === 'SUPER_ADMIN';

  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (search) params.search = search;
      const res = await api.get('/api/statements/logs', { params });
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
      setPage(res.data.page || 1);
      setPages(res.data.pages || 1);
    } catch {} finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/api/statements/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `statement-logs-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <FileText size={20} className="text-indigo-400" />
            <h1 className="text-xl font-black text-slate-100">Statement Logs</h1>
          </div>
          <p className="text-xs text-slate-500 font-medium">All bank statements generated in the system — {total} total generations.</p>
        </div>

        {isSuper && (
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-750 text-slate-350 border border-slate-700 font-bold px-3 py-2 rounded-xl text-xs transition-all cursor-pointer"
          >
            <Download size={13} /> Export CSV
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by user name, username or IP..."
            className="bg-slate-900 border border-slate-800 text-slate-200 text-xs pl-9 pr-4 py-2.5 rounded-xl w-64 focus:outline-none focus:border-indigo-500 placeholder-slate-600 font-medium"
          />
        </div>
      </div>

      <StatementLogTable logs={logs} loading={loading} />

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
