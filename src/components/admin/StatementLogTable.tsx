import React from 'react';
import { FileText } from 'lucide-react';

interface StatementLogTableProps {
  logs: any[];
  loading?: boolean;
}

export default function StatementLogTable({ logs, loading }: StatementLogTableProps) {
  if (loading) {
    return <div className="text-center py-12 text-slate-500 italic text-xs">Loading...</div>;
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl py-16 text-center">
        <FileText size={28} className="text-slate-700 mx-auto mb-3" />
        <p className="text-slate-500 text-xs font-medium italic">No statement logs found.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-500 font-bold uppercase tracking-wider">
              <th className="p-3.5 text-left">Timestamp</th>
              <th className="p-3.5 text-left">User</th>
              <th className="p-3.5 text-left">Device</th>
              <th className="p-3.5 text-left">OS / Browser</th>
              <th className="p-3.5 text-left">Location</th>
              <th className="p-3.5 text-left font-mono">IP Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {logs.map((log: any) => (
              <tr key={log._id} className="hover:bg-slate-800/30 transition-colors">
                <td className="p-3.5 font-mono text-[10px] text-indigo-300 whitespace-nowrap">
                  {new Date(log.generatedAt).toLocaleString()}
                </td>
                <td className="p-3.5">
                  {log.userId ? (
                    <div>
                      <span className="font-bold text-slate-200 block">{log.userId.fullName}</span>
                      <span className="text-slate-500 font-mono text-[10px]">@{log.userId.username}</span>
                    </div>
                  ) : <span className="text-slate-500 italic">—</span>}
                </td>
                <td className="p-3.5">
                  <span className={`px-2 py-0.5 rounded-md font-black uppercase text-[9px] tracking-wider ${
                    log.deviceType === 'Mobile' ? 'bg-indigo-500/10 text-indigo-400' :
                    log.deviceType === 'Tablet' ? 'bg-purple-500/10 text-purple-400' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {log.deviceType || 'Desktop'}
                  </span>
                </td>
                <td className="p-3.5 text-slate-400">
                  <span className="block">{log.operatingSystem || 'N/A'}</span>
                  <span className="text-slate-500 text-[10px]">{log.browser} {log.browserVersion}</span>
                </td>
                <td className="p-3.5 text-slate-400">
                  {[log.city, log.country].filter(Boolean).join(', ') || 'Unknown'}
                </td>
                <td className="p-3.5 font-mono text-[10px] text-slate-400 whitespace-nowrap">
                  {log.ipAddress || 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
