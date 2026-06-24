import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Settings, Shield, Globe, Lock, Save, RefreshCw } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function SettingsPage() {
  const { user } = useAuth();
  const isSuper = user?.role === 'SUPER_ADMIN';

  const [settings, setSettings] = useState<any>({
    maintenanceMode: false,
    allowedIPs: [],
    sessionTimeoutMinutes: 60,
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15,
    jwtAccessTokenExpiry: '15m',
    jwtRefreshTokenExpiry: '30d'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ipInput, setIpInput] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/settings');
        if (res.data?.settings) {
          setSettings(res.data.settings);
        }
      } catch (err: any) {
        setErrorMsg('Failed to load system settings.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuper) return;
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const res = await api.put('/api/settings', settings);
      setSuccessMsg('Settings saved successfully.');
      if (res.data?.settings) {
        setSettings(res.data.settings);
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddIP = () => {
    if (!ipInput.trim()) return;
    if (settings.allowedIPs.includes(ipInput.trim())) return;
    setSettings((prev: any) => ({
      ...prev,
      allowedIPs: [...prev.allowedIPs, ipInput.trim()]
    }));
    setIpInput('');
  };

  const handleRemoveIP = (ip: string) => {
    setSettings((prev: any) => ({
      ...prev,
      allowedIPs: prev.allowedIPs.filter((x: string) => x !== ip)
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <Settings size={20} className="text-indigo-400" />
          <h1 className="text-xl font-black text-slate-100">System Settings</h1>
        </div>
        <p className="text-xs text-slate-500 font-medium">
          Configure application security policies, maintenance mode, and JWT parameters.
        </p>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-400 text-xs font-medium">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-rose-400 text-xs font-medium">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Maintenance Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-black text-slate-200 flex items-center gap-2">
            <Globe size={15} className="text-indigo-400" /> General / Availability
          </h3>
          <div className="flex items-center justify-between border-t border-slate-800/50 pt-4">
            <div>
              <span className="text-xs font-bold text-slate-200 block">Maintenance Mode</span>
              <span className="text-[10px] text-slate-500 font-medium block">
                If active, only administrators can access the system. Users will see a maintenance notice.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                disabled={!isSuper}
                onChange={e => setSettings((prev: any) => ({ ...prev, maintenanceMode: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-650 peer-checked:after:bg-white border border-slate-700/50" />
            </label>
          </div>
        </div>

        {/* Security Limits Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-black text-slate-200 flex items-center gap-2">
            <Shield size={15} className="text-indigo-400" /> Brute-Force & Access Limits
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/50 pt-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Max Login Attempts</label>
              <input
                type="number"
                disabled={!isSuper}
                value={settings.maxLoginAttempts}
                onChange={e => setSettings((prev: any) => ({ ...prev, maxLoginAttempts: parseInt(e.target.value) || 5 }))}
                className="w-full bg-slate-950 border border-slate-850 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lockout Duration (Minutes)</label>
              <input
                type="number"
                disabled={!isSuper}
                value={settings.lockoutDurationMinutes}
                onChange={e => setSettings((prev: any) => ({ ...prev, lockoutDurationMinutes: parseInt(e.target.value) || 15 }))}
                className="w-full bg-slate-950 border border-slate-850 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Session Inactivity Timeout (Minutes)</label>
              <input
                type="number"
                disabled={!isSuper}
                value={settings.sessionTimeoutMinutes}
                onChange={e => setSettings((prev: any) => ({ ...prev, sessionTimeoutMinutes: parseInt(e.target.value) || 60 }))}
                className="w-full bg-slate-950 border border-slate-850 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 font-semibold"
              />
            </div>
          </div>
        </div>

        {/* IP White-listing Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-black text-slate-200 flex items-center gap-2">
            <Lock size={15} className="text-indigo-400" /> Admin/Super Admin IP Whitelisting
          </h3>
          <div className="border-t border-slate-800/50 pt-4 space-y-3">
            <p className="text-[10px] text-slate-500 font-medium">
              Specify IP addresses or CIDR ranges allowed to access Admin/Super Admin routes. Leave empty to allow any IP.
            </p>
            {isSuper && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 192.168.1.100"
                  value={ipInput}
                  onChange={e => setIpInput(e.target.value)}
                  className="bg-slate-950 border border-slate-850 text-slate-200 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 flex-1 font-mono font-semibold"
                />
                <button
                  type="button"
                  onClick={handleAddIP}
                  className="bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Add IP
                </button>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              {settings.allowedIPs.length === 0 ? (
                <span className="text-xs text-slate-500 italic">No restrictions (open access).</span>
              ) : (
                settings.allowedIPs.map((ip: string) => (
                  <span key={ip} className="bg-slate-950 border border-slate-800/80 text-slate-300 text-[10px] px-2.5 py-1 rounded-lg font-mono font-bold flex items-center gap-1.5">
                    {ip}
                    {isSuper && (
                      <button
                        type="button"
                        onClick={() => handleRemoveIP(ip)}
                        className="text-slate-500 hover:text-slate-300 font-bold cursor-pointer"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* JWT Parameters */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-black text-slate-200 flex items-center gap-2">
            <Lock size={15} className="text-indigo-400" /> Token Parameters
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/50 pt-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Access Token Lifetime</label>
              <input
                type="text"
                disabled={!isSuper}
                value={settings.jwtAccessTokenExpiry}
                onChange={e => setSettings((prev: any) => ({ ...prev, jwtAccessTokenExpiry: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-850 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Refresh Token Lifetime</label>
              <input
                type="text"
                disabled={!isSuper}
                value={settings.jwtRefreshTokenExpiry}
                onChange={e => setSettings((prev: any) => ({ ...prev, jwtRefreshTokenExpiry: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-850 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 font-semibold"
              />
            </div>
          </div>
        </div>

        {isSuper && (
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 bg-indigo-650 hover:bg-indigo-600 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-indigo-900/10 disabled:opacity-55 cursor-pointer"
            >
              {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
              Save Configuration
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
