import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { X, Save, Shield, UserPlus, RefreshCw } from 'lucide-react';

interface UserFormModalProps {
  mode: 'create' | 'edit';
  initialData?: any;
  roleContext: 'super_admin' | 'admin';
  error?: string;
  onSubmit: (userData: any) => Promise<void>;
  onClose: () => void;
}

export default function UserFormModal({ mode, initialData, roleContext, error, onSubmit, onClose }: UserFormModalProps) {
  const { user: currentUser } = useAuth();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'USER'>('USER');
  const [plan, setPlan] = useState<'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE'>('FREE');
  const [maxStatements, setMaxStatements] = useState(50);
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'SUSPENDED'>('ACTIVE');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const isSuper = currentUser?.role === 'SUPER_ADMIN' || roleContext === 'super_admin';
  const isEdit = mode === 'edit';

  useEffect(() => {
    if (isEdit && initialData) {
      setFullName(initialData.fullName || '');
      setUsername(initialData.username || '');
      setPhoneNumber(initialData.phoneNumber || '');
      setRole(initialData.role || 'USER');
      setPlan(initialData.subscription?.plan || 'FREE');
      setMaxStatements(initialData.subscription?.maxStatements ?? 50);
      setStatus(initialData.subscription?.status || 'ACTIVE');
      setPassword('');
      setLocalError(null);
    } else {
      setFullName('');
      setUsername('');
      setPhoneNumber('');
      setPassword('');
      setRole('USER');
      setPlan('FREE');
      setMaxStatements(50);
      setStatus('ACTIVE');
      setLocalError(null);
    }
  }, [initialData, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phoneNumber || (!isEdit && !password) || (!isEdit && !username)) {
      setLocalError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    setLocalError(null);

    try {
      const payload: any = {
        fullName,
        phoneNumber,
        subscription: {
          plan,
          status,
          maxStatements: Number(maxStatements),
        },
      };

      if (!isEdit) {
        payload.username = username;
        payload.password = password;
        payload.role = role;
      }

      await onSubmit(payload);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to save user.';
      setLocalError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = error || localError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs select-none">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl relative flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="h-14 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/30">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-100 flex items-center gap-2">
            {isEdit ? <Save size={14} className="text-indigo-400" /> : <UserPlus size={14} className="text-indigo-400" />}
            {isEdit ? 'Edit User Details' : 'Create New Account'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-355 p-1.5 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body & Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          
          {displayError && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl font-bold">
              {displayError}
            </div>
          )}

          {/* Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">Full Name *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full bg-slate-950 text-slate-100 border border-slate-800 px-3.5 py-2.5 rounded-xl font-medium focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">Phone Number *</label>
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full bg-slate-950 text-slate-100 border border-slate-800 px-3.5 py-2.5 rounded-xl font-medium focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Credentials (only on Create) */}
          {!isEdit && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">Username *</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. johndoe"
                  className="w-full bg-slate-950 text-slate-100 border border-slate-800 px-3.5 py-2.5 rounded-xl font-medium focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">Password *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full bg-slate-950 text-slate-100 border border-slate-800 px-3.5 py-2.5 rounded-xl font-medium focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Role Check (SA only & on Create) */}
          {!isEdit && isSuper && (
            <div>
              <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">Account Role</label>
              <div className="flex items-center gap-4 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-200">
                  <input
                    type="radio"
                    name="role"
                    value="USER"
                    checked={role === 'USER'}
                    onChange={() => setRole('USER')}
                    className="accent-indigo-500"
                  />
                  User Account
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-200">
                  <input
                    type="radio"
                    name="role"
                    value="ADMIN"
                    checked={role === 'ADMIN'}
                    onChange={() => setRole('ADMIN')}
                    className="accent-indigo-500"
                  />
                  Admin Account
                </label>
              </div>
            </div>
          )}

          {/* Subscription Limits */}
          <div className="border-t border-slate-800 pt-4 space-y-4">
            <h4 className="font-bold text-slate-350 flex items-center gap-2">
              <Shield size={14} className="text-indigo-400" /> Subscription Config
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">Plan Level</label>
                <select
                  value={plan}
                  onChange={(e: any) => setPlan(e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 border border-slate-800 px-3 py-2.5 rounded-xl font-bold cursor-pointer focus:outline-none"
                >
                  <option value="FREE">FREE</option>
                  <option value="BASIC">BASIC</option>
                  <option value="PRO">PRO</option>
                  <option value="ENTERPRISE">ENTERPRISE</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">Plan Status</label>
                <select
                  value={status}
                  onChange={(e: any) => setStatus(e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 border border-slate-800 px-3 py-2.5 rounded-xl font-bold cursor-pointer focus:outline-none"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="EXPIRED">EXPIRED</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">Statements Quota *</label>
                <input
                  type="number"
                  required
                  value={maxStatements}
                  onChange={(e) => setMaxStatements(parseInt(e.target.value) || 0)}
                  placeholder="e.g. 50 (-1 = Unlimited)"
                  className="w-full bg-slate-950 text-slate-100 border border-slate-800 px-3.5 py-2.5 rounded-xl font-mono font-bold focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="border-t border-slate-800 pt-5 flex items-center justify-end gap-3 bg-slate-950/20 -mx-6 -mb-6 p-6 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-750 text-slate-350 border border-slate-700 font-bold py-2.5 px-5 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-indigo-650 hover:bg-indigo-600 text-white font-bold py-2.5 px-6 rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-900/10 flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <>
                  <Save size={14} />
                  {isEdit ? 'Save Changes' : 'Create Account'}
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
