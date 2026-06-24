import React from 'react';
import { Users, FileText, Radio, CheckCircle, Ban } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AdminDashboardProps {
  data: {
    cards: {
      myUsersTotal: number;
      activeUsers: number;
      onlineUsers: number;
      totalStatements: number;
      todayStatements: number;
      monthlyStatements: number;
    };
    myUsers: any[];
  };
}

export default function AdminDashboard({ data }: AdminDashboardProps) {
  const { cards, myUsers } = data;

  const cardList = [
    { label: 'My Users', value: cards.myUsersTotal, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Active Users', value: cards.activeUsers, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Online Users', value: cards.onlineUsers, icon: Radio, color: 'text-pink-400', bg: 'bg-pink-500/10' },
    { label: 'Total Statements', value: cards.totalStatements, icon: FileText, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { label: "Today's Statements", value: cards.todayStatements, icon: FileText, color: 'text-teal-400', bg: 'bg-teal-500/10' },
    { label: 'Monthly Statements', value: cards.monthlyStatements, icon: FileText, color: 'text-sky-400', bg: 'bg-sky-500/10' },
  ];

  return (
    <div className="space-y-8 select-none">
      {/* 6 Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cardList.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="bg-slate-900 border border-slate-800/80 p-4.5 rounded-2xl flex items-center justify-between shadow-lg shadow-black/5 hover:border-slate-700 transition-colors">
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">{card.label}</span>
                <span className="text-xl font-black text-slate-100 block tracking-tight">
                  {card.value.toLocaleString()}
                </span>
              </div>
              <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center`}>
                <Icon size={18} className={card.color} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Users Summary Table */}
      <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-355 flex items-center gap-2">
            <Users size={15} className="text-indigo-500" /> Managed Users Overview
          </h3>
          <Link
            to="/admin/users"
            className="text-[10px] bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 font-bold px-3 py-1.5 rounded-lg transition-all"
          >
            Manage All
          </Link>
        </div>

        <div className="overflow-x-auto min-w-0">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 font-bold">
                <th className="pb-3 pr-2">Name</th>
                <th className="pb-3 pr-2">Username</th>
                <th className="pb-3 pr-2">Status</th>
                <th className="pb-3 pr-2">Plan</th>
                <th className="pb-3 text-right">Usage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 font-medium text-slate-350">
              {myUsers.slice(0, 10).map((u) => (
                <tr key={u._id} className="hover:text-slate-100">
                  <td className="py-3 pr-2 font-bold max-w-[150px] truncate">{u.fullName}</td>
                  <td className="py-3 pr-2 text-slate-500">@{u.username}</td>
                  <td className="py-3 pr-2">
                    {u.isBanned ? (
                      <span className="inline-flex items-center gap-1 text-[9px] bg-rose-500/10 text-rose-450 border border-rose-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold">
                        <Ban size={8} /> Banned
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-2">
                    <span className="text-[10px] font-black uppercase text-indigo-400">
                      {u.subscription?.plan}
                    </span>
                  </td>
                  <td className="py-3 text-right font-black font-mono text-indigo-300">
                    {u.totalStatementsGenerated} / {u.subscription?.maxStatements === -1 ? '∞' : u.subscription?.maxStatements}
                  </td>
                </tr>
              ))}
              {myUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-500 italic">You have not created any users yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
