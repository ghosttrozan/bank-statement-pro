import React, { useState, useEffect } from 'react';
import { X, User, CreditCard, Shield, Smartphone, MapPin, FileText, History, Activity, Crown } from 'lucide-react';
import api from '../../lib/api';

interface UserDetailDrawerProps {
  user: any | null;
  onClose: () => void;
}

type Tab = 'profile' | 'subscription' | 'access' | 'device' | 'location' | 'statements' | 'logins' | 'activity';

const tabs: { key: Tab; label: string; icon: React.FC<any> }[] = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'subscription', label: 'Subscription', icon: CreditCard },
  { key: 'access', label: 'Access', icon: Shield },
  { key: 'device', label: 'Device', icon: Smartphone },
  { key: 'location', label: 'Location', icon: MapPin },
  { key: 'statements', label: 'Statements', icon: FileText },
  { key: 'logins', label: 'Login History', icon: History },
  { key: 'activity', label: 'Activity', icon: Activity },
];

export default function UserDetailDrawer({ user, onClose }: UserDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [stmtLogs, setStmtLogs] = useState<any[]>([]);
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setActiveTab('profile');
      setStmtLogs([]);
      setLoginHistory([]);
      setActivityLogs([]);
    }
  }, [user]);

  const fetchTabData = async (tab: Tab) => {
    if (!user) return;
    setActiveTab(tab);
    if (tab === 'statements' && stmtLogs.length === 0) {
      setLoading(true);
      try {
        const res = await api.get(`/api/users/${user._id}/statement-logs`);
        setStmtLogs(res.data.logs || []);
      } catch {} finally { setLoading(false); }
    }
    if (tab === 'logins' && loginHistory.length === 0) {
      setLoading(true);
      try {
        const res = await api.get(`/api/users/${user._id}/login-history`);
        setLoginHistory(res.data.records || []);
      } catch {} finally { setLoading(false); }
    }
    if (tab === 'activity' && activityLogs.length === 0) {
      setLoading(true);
      try {
        const res = await api.get(`/api/users/${user._id}/activity`);
        setActivityLogs(res.data.logs || []);
      } catch {} finally { setLoading(false); }
    }
  };

  if (!user) return null;

  const maxLimit = user.subscription?.maxStatements;
  const usagePct = maxLimit === -1 ? 100 : Math.min(100, ((user.totalStatementsGenerated || 0) / maxLimit) * 100);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col overflow-hidden select-none">
        {/* Header */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/30">
          <div className="flex items-center gap-3">
            {user.role === 'SUPER_ADMIN' && <Crown size={14} className="text-amber-400" />}
            <div>
              <h3 className="text-sm font-black text-slate-100">{user.fullName}</h3>
              <span className="text-[10px] text-slate-500 font-medium">@{user.username}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-xl cursor-pointer transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="border-b border-slate-800 px-4 flex gap-1 overflow-x-auto shrink-0 bg-slate-950/20">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => fetchTabData(t.key)}
                className={`flex items-center gap-1.5 px-3 py-3 text-[10px] font-black uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                  activeTab === t.key ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}>
                <Icon size={11} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 text-xs space-y-3">
          {/* PROFILE */}
          {activeTab === 'profile' && (
            <div className="space-y-3">
              <InfoRow label="Full Name" value={user.fullName} />
              <InfoRow label="Username" value={`@${user.username}`} mono />
              <InfoRow label="Phone Number" value={user.phoneNumber} mono />
              <InfoRow label="Role" value={user.role.replace('_', ' ')} badge={
                user.role === 'SUPER_ADMIN' ? 'amber' : user.role === 'ADMIN' ? 'indigo' : 'slate'
              } />
              <InfoRow label="Total Statements" value={String(user.totalStatementsGenerated || 0)} />
              <InfoRow label="Last Active" value={user.lastSeenAt ? new Date(user.lastSeenAt).toLocaleString() : 'Never'} />
              <InfoRow label="Created At" value={user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'} />
            </div>
          )}

          {/* SUBSCRIPTION */}
          {activeTab === 'subscription' && (
            <div className="space-y-3">
              <InfoRow label="Plan" value={user.subscription?.plan || 'FREE'} />
              <InfoRow label="Status" value={user.subscription?.status || 'ACTIVE'} badge={
                user.subscription?.status === 'ACTIVE' ? 'emerald' : 'rose'
              } />
              <InfoRow label="Start Date" value={user.subscription?.startDate ? new Date(user.subscription.startDate).toLocaleDateString() : 'N/A'} />
              <InfoRow label="End Date" value={user.subscription?.endDate ? new Date(user.subscription.endDate).toLocaleDateString() : 'N/A'} />
              <InfoRow label="Max Statements" value={maxLimit === -1 ? 'Unlimited' : String(maxLimit)} />
              {/* Usage bar */}
              <div className="mt-4 space-y-1.5">
                <div className="flex justify-between font-semibold text-slate-400">
                  <span>Usage</span>
                  <span>{user.totalStatementsGenerated || 0} / {maxLimit === -1 ? '∞' : maxLimit}</span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${usagePct}%` }} />
                </div>
              </div>
            </div>
          )}

          {/* ACCESS */}
          {activeTab === 'access' && (
            <div className="space-y-3">
              <InfoRow label="Banned" value={user.isBanned ? 'Yes' : 'No'} badge={user.isBanned ? 'rose' : 'emerald'} />
              {user.isBanned && <InfoRow label="Ban Reason" value={user.banReason || '—'} />}
              {user.bannedAt && <InfoRow label="Banned At" value={new Date(user.bannedAt).toLocaleString()} />}
              <InfoRow label="Deleted" value={user.isDeleted ? 'Yes' : 'No'} badge={user.isDeleted ? 'slate' : 'emerald'} />
              {user.deletedAt && <InfoRow label="Deleted At" value={new Date(user.deletedAt).toLocaleString()} />}
              <InfoRow label="Session Version" value={String(user.sessionVersion)} mono />
            </div>
          )}

          {/* DEVICE */}
          {activeTab === 'device' && (
            <div className="space-y-3">
              <InfoRow label="Browser" value={user.lastDeviceInfo?.browser || 'N/A'} />
              <InfoRow label="Browser Version" value={user.lastDeviceInfo?.browserVersion || 'N/A'} />
              <InfoRow label="Operating System" value={user.lastDeviceInfo?.operatingSystem || 'N/A'} />
              <InfoRow label="OS Version" value={user.lastDeviceInfo?.operatingSystemVersion || 'N/A'} />
              <InfoRow label="Device Type" value={user.lastDeviceInfo?.deviceType || 'N/A'} />
              <InfoRow label="User Agent" value={user.lastDeviceInfo?.userAgent || 'N/A'} mono />
            </div>
          )}

          {/* LOCATION */}
          {activeTab === 'location' && (
            <div className="space-y-3">
              <InfoRow label="Last IP" value={user.lastIPAddress || 'N/A'} mono />
              <InfoRow label="City" value={user.lastLocation?.city || 'N/A'} />
              <InfoRow label="State" value={user.lastLocation?.state || 'N/A'} />
              <InfoRow label="Country" value={user.lastLocation?.country || 'N/A'} />
            </div>
          )}

          {/* STATEMENTS */}
          {activeTab === 'statements' && (
            loading ? <LoadingRow /> :
            stmtLogs.length === 0 ? <EmptyRow text="No statement logs found." /> :
            <div className="space-y-2">
              {stmtLogs.map((log: any) => (
                <div key={log._id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex justify-between">
                    <span className="font-mono text-[10px] text-indigo-400">{new Date(log.generatedAt).toLocaleString()}</span>
                    <span className="text-[10px] text-slate-500">{log.ipAddress || 'N/A'}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">Device: {log.deviceType || 'unknown'}</div>
                </div>
              ))}
            </div>
          )}

          {/* LOGINS */}
          {activeTab === 'logins' && (
            loading ? <LoadingRow /> :
            loginHistory.length === 0 ? <EmptyRow text="No login history found." /> :
            <div className="space-y-2">
              {loginHistory.map((log: any) => (
                <div key={log._id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="font-mono text-[10px] text-indigo-400">{new Date(log.loginTime).toLocaleString()}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{log.ipAddress}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[10px] text-slate-500">
                    <span>{log.browser} {log.browserVersion}</span>
                    <span>•</span><span>{log.operatingSystem}</span>
                    <span>•</span><span>{[log.city, log.country].filter(Boolean).join(', ') || 'Local'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ACTIVITY */}
          {activeTab === 'activity' && (
            loading ? <LoadingRow /> :
            activityLogs.length === 0 ? <EmptyRow text="No activity logs found." /> :
            <div className="space-y-2">
              {activityLogs.map((log: any) => (
                <div key={log._id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-start gap-3">
                  <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-md font-black uppercase shrink-0">
                    {log.action.replace(/_/g, ' ')}
                  </span>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const InfoRow = ({ label, value, mono, badge }: { label: string; value: string; mono?: boolean; badge?: string }) => {
  const badgeStyles: Record<string, string> = {
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    slate: 'bg-slate-800 text-slate-400 border-slate-700',
  };

  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-slate-800/50">
      <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px] shrink-0">{label}</span>
      {badge ? (
        <span className={`px-2 py-0.5 rounded-md border font-black uppercase text-[9px] tracking-wider ${badgeStyles[badge] || badgeStyles.slate}`}>
          {value}
        </span>
      ) : (
        <span className={`font-semibold text-slate-200 text-right break-all ${mono ? 'font-mono text-[10px]' : ''}`}>{value}</span>
      )}
    </div>
  );
};

const LoadingRow = () => (
  <div className="text-center py-10 text-slate-500 italic text-xs">Loading...</div>
);

const EmptyRow = ({ text }: { text: string }) => (
  <div className="text-center py-10 text-slate-500 italic text-xs">{text}</div>
);
