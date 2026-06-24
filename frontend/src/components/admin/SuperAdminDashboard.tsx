import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  Users,
  ShieldAlert,
  Radio,
  Ban,
  Trash2,
  FileText,
  Activity,
  History,
  TrendingUp,
  CreditCard,
} from 'lucide-react';

interface SuperAdminDashboardProps {
  data: {
    cards: {
      totalUsers: number;
      totalAdmins: number;
      activeUsers: number;
      onlineUsers: number;
      offlineUsers: number;
      bannedUsers: number;
      deletedUsers: number;
      totalStatements: number;
      todayStatements: number;
      weeklyStatements: number;
      monthlyStatements: number;
    };
    recentLogins: any[];
    topGenerators: any[];
    chartData: {
      statementsPerDay: any[];
      activeUsersLast30Days: number;
    };
  };
}

export default function SuperAdminDashboard({ data }: SuperAdminDashboardProps) {
  const { cards, recentLogins, topGenerators, chartData } = data;

  const cardList = [
    { label: 'Total Users', value: cards.totalUsers, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Total Admins', value: cards.totalAdmins, icon: ShieldAlert, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Active Users', value: cards.activeUsers, icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Online (5m)', value: cards.onlineUsers, icon: Radio, color: 'text-pink-400', bg: 'bg-pink-500/10' },
    { label: 'Offline Users', value: cards.offlineUsers, icon: Users, color: 'text-slate-400', bg: 'bg-slate-500/10' },
    { label: 'Banned Users', value: cards.bannedUsers, icon: Ban, color: 'text-rose-400', bg: 'bg-rose-500/10' },
    { label: 'Deleted Users', value: cards.deletedUsers, icon: Trash2, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Total Statements', value: cards.totalStatements, icon: FileText, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { label: "Today's Created", value: cards.todayStatements, icon: FileText, color: 'text-teal-400', bg: 'bg-teal-500/10' },
    { label: 'Weekly Volume', value: cards.weeklyStatements, icon: FileText, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { label: 'Monthly Volume', value: cards.monthlyStatements, icon: FileText, color: 'text-sky-400', bg: 'bg-sky-500/10' },
    { label: 'Last 30d Active', value: chartData.activeUsersLast30Days, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  ];

  return (
    <div className="space-y-8 select-none">
      {/* 12 Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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

      {/* Chart Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Statements Volume Line Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800/80 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-350 flex items-center gap-2">
              <Activity size={15} className="text-indigo-500" /> Statements Created (Last 30 Days)
            </h3>
          </div>
          <div className="h-64 w-full">
            {chartData.statementsPerDay && chartData.statementsPerDay.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.statementsPerDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="_id" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '10px' }}
                    labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}
                    itemStyle={{ color: '#818cf8', fontSize: '11px' }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 italic">
                No generation logs recorded in the past 30 days
              </div>
            )}
          </div>
        </div>

        {/* Plan Breakdown Card / Top Generators summary */}
        <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-2xl space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-350 flex items-center gap-2">
            <CreditCard size={15} className="text-indigo-500" /> Top System Consumers
          </h3>
          <div className="space-y-3.5 overflow-y-auto max-h-64 pr-1">
            {topGenerators.slice(0, 5).map((user, i) => (
              <div key={user._id} className="flex items-center justify-between bg-slate-950/40 p-3 rounded-xl border border-slate-800/50">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-200 block truncate max-w-[120px]">{user.fullName}</span>
                  <span className="text-[10px] text-slate-500 font-medium block">@{user.username}</span>
                </div>
                <div className="text-right space-y-0.5">
                  <span className="text-xs font-black text-indigo-400 font-mono block">
                    {user.totalStatementsGenerated} stmt
                  </span>
                  <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wide">
                    {user.subscription?.plan || 'FREE'}
                  </span>
                </div>
              </div>
            ))}
            {topGenerators.length === 0 && (
              <div className="text-center text-xs text-slate-500 italic py-10">No users found.</div>
            )}
          </div>
        </div>

      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Audit Logins */}
        <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-2xl space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-350 flex items-center gap-2">
            <History size={15} className="text-indigo-500" /> Recent User Logins
          </h3>
          <div className="overflow-x-auto min-w-0">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-bold">
                  <th className="pb-3 pr-2">User</th>
                  <th className="pb-3 pr-2">IP</th>
                  <th className="pb-3 pr-2">Location</th>
                  <th className="pb-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 font-medium text-slate-300">
                {recentLogins.map((login) => (
                  <tr key={login._id} className="hover:text-slate-100">
                    <td className="py-3 pr-2 font-bold max-w-[120px] truncate">
                      {login.userId?.fullName || 'System User'}
                    </td>
                    <td className="py-3 pr-2 font-mono text-[11px] text-slate-400">{login.ipAddress}</td>
                    <td className="py-3 pr-2 text-slate-400">
                      {[login.city, login.country].filter(Boolean).join(', ') || 'Local'}
                    </td>
                    <td className="py-3 text-slate-500 font-mono text-[10px]">
                      {new Date(login.loginTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
                {recentLogins.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-slate-500 italic">No recent login records.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Generators Table (detailed) */}
        <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-2xl space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-350 flex items-center gap-2">
            <Users size={15} className="text-indigo-500" /> Top Statement Producers
          </h3>
          <div className="overflow-x-auto min-w-0">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-bold">
                  <th className="pb-3 pr-2">Name</th>
                  <th className="pb-3 pr-2">Role</th>
                  <th className="pb-3 pr-2">Plan</th>
                  <th className="pb-3 text-right">Statements</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 font-medium text-slate-300">
                {topGenerators.map((gen) => (
                  <tr key={gen._id} className="hover:text-slate-100">
                    <td className="py-3 pr-2 font-bold max-w-[120px] truncate">{gen.fullName}</td>
                    <td className="py-3 pr-2">
                      <span className="text-[10px] text-slate-450 uppercase">{gen.role.replace('_', ' ')}</span>
                    </td>
                    <td className="py-3 pr-2">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${
                        gen.subscription?.plan === 'ENTERPRISE' ? 'bg-purple-500/10 text-purple-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {gen.subscription?.plan}
                      </span>
                    </td>
                    <td className="py-3 text-right font-black font-mono text-indigo-400">
                      {gen.totalStatementsGenerated}
                    </td>
                  </tr>
                ))}
                {topGenerators.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-slate-500 italic">No users available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
