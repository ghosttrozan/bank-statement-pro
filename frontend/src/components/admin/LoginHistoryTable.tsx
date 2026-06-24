import React from 'react';
import { Monitor, MapPin, Clock } from 'lucide-react';

interface LoginHistoryTableProps {
  records: any[];
  loading?: boolean;
}

export default function LoginHistoryTable({ records, loading }: LoginHistoryTableProps) {
  if (loading) {
    return <div className="text-center py-12 text-slate-500 italic text-xs">Loading...</div>;
  }

  if (!records || records.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl py-16 text-center">
        <Clock size={28} className="text-slate-700 mx-auto mb-3" />
        <p className="text-slate-500 text-xs font-medium italic">No login history found.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-500 font-bold uppercase tracking-wider">
              <th className="p-3.5 text-left">
                <div className="flex items-center gap-1.5"><Clock size={11} /> Timestamp</div>
              </th>
              <th className="p-3.5 text-left">User</th>
              <th className="p-3.5 text-left">
                <div className="flex items-center gap-1.5"><Monitor size={11} /> Device</div>
              </th>
              <th className="p-3.5 text-left">OS & Browser</th>
              <th className="p-3.5 text-left">
                <div className="flex items-center gap-1.5"><MapPin size={11} /> Location</div>
              </th>
              <th className="p-3.5 text-left font-mono">IP Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {records.map((r: any) => (
              <tr key={r._id} className="hover:bg-slate-800/30 transition-colors">
                <td className="p-3.5 font-mono text-[10px] text-indigo-300 whitespace-nowrap">
                  {new Date(r.loginTime).toLocaleString()}
                </td>
                <td className="p-3.5">
                  <span className="font-bold text-slate-200 block">{r.userId?.fullName || 'N/A'}</span>
                  <span className="text-slate-500 font-mono text-[10px]">@{r.userId?.username || '—'}</span>
                </td>
                <td className="p-3.5">
                  <span className={`px-2 py-0.5 rounded-md font-black uppercase text-[9px] tracking-wider ${
                    r.deviceType === 'Mobile' ? 'bg-indigo-500/10 text-indigo-400' :
                    r.deviceType === 'Tablet' ? 'bg-purple-500/10 text-purple-400' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {r.deviceType || 'Desktop'}
                  </span>
                </td>
                <td className="p-3.5 text-slate-400">
                  <span className="block">{r.operatingSystem || 'N/A'}</span>
                  <span className="text-slate-500 text-[10px]">{r.browser} {r.browserVersion}</span>
                </td>
                <td className="p-3.5 text-slate-400">
                  {[r.city, r.state, r.country].filter(Boolean).join(', ') || 'Unknown'}
                </td>
                <td className="p-3.5 font-mono text-[10px] text-slate-400 whitespace-nowrap">
                  {r.ipAddress || 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
