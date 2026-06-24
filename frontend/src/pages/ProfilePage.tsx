import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { User, Shield, CreditCard, Key, LogOut, ArrowLeft, RefreshCw, Eye, EyeOff } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'react-toastify';

export default function ProfilePage() {
  const { user, logout, logoutAll } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    try {
      await api.patch('/api/auth/change-password', {
        currentPassword,
        newPassword,
      });
      toast.success('Password changed successfully! Please log in again.');
      // Session has been cleared in hook/backend, we redirect to login
      logout();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to change password';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const planName = user.subscription.plan;
  const maxLimit = user.subscription.maxStatements;
  const currentCount = user.totalStatementsGenerated;
  const usagePercentage = maxLimit === -1 ? 0 : Math.min(100, (currentCount / maxLimit) * 100);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 font-sans selection:bg-indigo-500 selection:text-white">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Navigation / Header */}
        <div className="flex items-center justify-between">
          <Link
            to="/generator"
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-100 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Generator
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={logout}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-750 font-bold px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer"
            >
              <LogOut size={13} />
              Logout
            </button>
            <button
              onClick={logoutAll}
              className="flex items-center gap-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-450 border border-rose-500/20 font-bold px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer"
            >
              <LogOut size={13} />
              Logout All Devices
            </button>
          </div>
        </div>

        {/* Dashboard Title */}
        <div className="border-b border-slate-800 pb-5">
          <h1 className="text-3xl font-black tracking-tight text-slate-100">My Profile</h1>
          <p className="text-sm text-slate-400 mt-1">Manage your account information, subscription, and password.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Left Column: Profile Card */}
          <div className="md:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-indigo-650/10 border-2 border-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mb-4">
                <User size={36} />
              </div>
              <h2 className="text-lg font-bold text-slate-100">{user.fullName}</h2>
              <span className="text-xs text-slate-500 mt-0.5">@{user.username}</span>

              {/* Role Chip */}
              <span className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                user.role === 'SUPER_ADMIN'
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                  : user.role === 'ADMIN'
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  : 'bg-slate-800 text-slate-350 border border-slate-700'
              }`}>
                <Shield size={10} />
                {user.role.replace('_', ' ')}
              </span>
            </div>

            <div className="border-t border-slate-800/80 pt-4 space-y-3 text-xs leading-relaxed text-slate-350">
              <div className="flex justify-between">
                <span>Phone:</span>
                <span className="font-semibold text-slate-200">{user.phoneNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Joined:</span>
                <span className="font-semibold text-slate-200">
                  {user.lastSeenAt ? new Date(user.lastSeenAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Columns */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Subscription Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 uppercase tracking-wider">
                <CreditCard size={16} className="text-indigo-400" /> Subscription & Limits
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/50">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase mb-1">Active Plan</span>
                  <span className="text-base font-extrabold text-indigo-400">{planName}</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/50">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase mb-1">Account Status</span>
                  <span className={`text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full inline-block ${
                    user.subscription.status === 'ACTIVE'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-450 border border-rose-500/20'
                  }`}>
                    {user.subscription.status}
                  </span>
                </div>
              </div>

              {/* Progress Bar for Statement Usage Limit */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-400">Statement Generation Quota</span>
                  <span className="text-slate-200">
                    {currentCount} / {maxLimit === -1 ? 'Unlimited' : maxLimit}
                  </span>
                </div>
                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800/50">
                  <div
                    className="bg-indigo-500 h-full transition-all duration-550 rounded-full"
                    style={{ width: `${maxLimit === -1 ? 100 : usagePercentage}%` }}
                  ></div>
                </div>
                {maxLimit !== -1 && (
                  <p className="text-[10px] text-slate-500 font-medium">
                    You have generated {currentCount} statements out of your plan limit of {maxLimit}.
                  </p>
                )}
              </div>
            </div>

            {/* Change Password Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 uppercase tracking-wider">
                <Key size={16} className="text-indigo-400" /> Change Password
              </h3>

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrent ? 'text' : 'password'}
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="w-full bg-slate-950 text-slate-100 border border-slate-800 pl-4 pr-12 py-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent(!showCurrent)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-350 cursor-pointer"
                      >
                        {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNew ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="w-full bg-slate-950 text-slate-100 border border-slate-800 pl-4 pr-12 py-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-355 cursor-pointer"
                      >
                        {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full bg-slate-950 text-slate-100 border border-slate-800 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6 rounded-xl text-xs uppercase tracking-wider transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-900/10 disabled:opacity-50"
                >
                  {loading ? <RefreshCw size={14} className="animate-spin" /> : 'Update Password'}
                </button>
              </form>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
