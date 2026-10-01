import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Landmark, Eye, EyeOff, User, Phone, Lock, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/generator', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const [loginType, setLoginType] = useState<'username' | 'phone'>('username');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname || '/generator';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setErrorMsg('Please fill in all fields');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      await login(identifier, password);
      toastSuccess();
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error('[Login Error]', err);
      const msg = err.message || 'Invalid username/phone or password';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const toastSuccess = () => {
    // We can rely on react-toastify or simply redirect since login is successful
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background radial gradients for premium depth */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-8 rounded-3xl shadow-2xl relative z-10">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 mb-4 animate-pulse">
            <Landmark size={28} />
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">StatementPro</h1>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest mt-1">SaaS Management Portal</p>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-2 bg-slate-950 p-1 rounded-xl mb-4 border border-slate-800/50">
          <button
            type="button"
            onClick={() => {
              setLoginType('username');
              setIdentifier('');
              setErrorMsg(null);
            }}
            className={`py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              loginType === 'username'
                ? 'bg-slate-850 text-indigo-400 shadow-sm border border-slate-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User size={13} />
            Username
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginType('phone');
              setIdentifier('');
              setErrorMsg(null);
            }}
            className={`py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              loginType === 'phone'
                ? 'bg-slate-850 text-indigo-400 shadow-sm border border-slate-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Phone size={13} />
            Phone Number
          </button>
        </div>

        {/* Environment Credentials Notice */}
        <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 p-2.5 rounded-xl text-xs mb-5 flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-400">Credentials (.env):</span>
          <span className="font-mono text-[11px] font-bold text-indigo-300 bg-slate-950 px-2 py-0.5 rounded border border-indigo-500/20">
            {import.meta.env.VITE_AUTH_USERNAME || 'admin'} / {import.meta.env.VITE_AUTH_PASSWORD || 'admin123'}
          </span>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-450 p-3.5 rounded-xl text-xs font-semibold mb-5 flex items-start gap-2.5">
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">
              {loginType === 'username' ? 'Username' : 'Phone Number'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-550">
                {loginType === 'username' ? <User size={16} /> : <Phone size={16} />}
              </div>
              <input
                type={loginType === 'username' ? 'text' : 'tel'}
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={loginType === 'username' ? 'e.g. jndoe' : 'e.g. 9999999999'}
                className="w-full bg-slate-950/80 text-slate-100 border border-slate-800/80 pl-11 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all font-medium placeholder-slate-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-550">
                <Lock size={16} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/80 text-slate-100 border border-slate-800/80 pl-11 pr-12 py-3 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all font-medium placeholder-slate-700"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-550 hover:text-slate-300 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-650 to-violet-600 hover:from-indigo-600 hover:to-violet-500 text-white font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/20 active:scale-98 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer mt-6 disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="text-center mt-6">
          <p className="text-[10px] text-slate-650 leading-relaxed font-semibold">
            Protected by multi-tier RBAC & JWT Session rotation.<br />
            Authorized access only.
          </p>
        </div>
      </div>
    </div>
  );
}
