import React from 'react';
import { Activity } from 'lucide-react';

interface ActivityLogTableProps {
  logs: any[];
  loading?: boolean;
}

const actionColors: Record<string, string> = {
  LOGIN: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  LOGOUT: 'bg-slate-800 text-slate-400 border-slate-700',
  STATEMENT_GENERATED: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  PASSWORD_CHANGED: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  PROFILE_UPDATED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  USER_CREATED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  USER_BANNED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  USER_UNBANNED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  USER_DELETED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  FORCE_LOGOUT: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  PASSWORD_RESET: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  SUBSCRIPTION_CHANGED: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
};

export default function ActivityLogTable({ logs, loading }: ActivityLogTableProps) {
  if (loading) {
    return <div className="text-center py-12 text-slate-500 italic text-xs">Loading...</div>;
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl py-16 text-center">
        <Activity size={28} className="text-slate-700 mx-auto mb-3" />
        <p className="text-slate-500 text-xs font-medium italic">No activity logs found.</p>
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
              <th className="p-3.5 text-left">Actor</th>
              <th className="p-3.5 text-left">Target</th>
              <th className="p-3.5 text-left">Action</th>
              <th className="p-3.5 text-left">IP Address</th>
              <th className="p-3.5 text-left">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {logs.map((log: any) => {
              const style = actionColors[log.action] || 'bg-slate-800 text-slate-400 border-slate-700';
              return (
                <tr key={log._id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3.5 font-mono text-[10px] text-indigo-300 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="p-3.5">
                    {log.actorId ? (
                      <div>
                        <span className="font-bold text-slate-200 block">{log.actorId.fullName || 'System'}</span>
                        <span className="text-slate-500 font-mono text-[10px]">
                          {log.actorId.role ? `[${log.actorId.role.replace('_', ' ')}]` : ''}
                        </span>
                      </div>
                    ) : <span className="text-slate-500 italic">System</span>}
                  </td>
                  <td className="p-3.5">
                    {log.targetId ? (
                      <div>
                        <span className="font-bold text-slate-200 block">{log.targetId.fullName || '—'}</span>
                        <span className="text-slate-500 font-mono text-[10px]">@{log.targetId.username}</span>
                      </div>
                    ) : <span className="text-slate-500 italic">—</span>}
                  </td>
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded-md border font-black uppercase text-[9px] tracking-wider whitespace-nowrap ${style}`}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-3.5 font-mono text-[10px] text-slate-400 whitespace-nowrap">
                    {log.ipAddress || 'N/A'}
                  </td>
                  <td className="p-3.5 text-slate-500 max-w-48 truncate">
                    {log.metadata ? JSON.stringify(log.metadata) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
