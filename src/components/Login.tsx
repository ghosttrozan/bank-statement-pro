import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Lock, Eye, EyeOff, Landmark } from 'lucide-react';
import { logToSystem } from '../lib/dbBridge';

export default function Login() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Get redirect path or default to generator
  const from = (location.state as any)?.from?.pathname || '/generator';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (password === '@Lkaif') {
      sessionStorage.setItem('isAuthenticated', 'true');
      toast.success('Login Successful', { theme: 'dark' });
      logToSystem('SYSTEM', 'INFO', 'User authenticated successfully. Access token generated.');
      navigate(from, { replace: true });
    } else {
      toast.error('Invalid Password', { theme: 'dark' });
      logToSystem('SYSTEM', 'WARN', 'Authentication challenge failed: Invalid password supplied.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto w-full max-w-md animate-fadeIn">
        {/* Visual Brand Box */}
        <div className="flex flex-col items-center justify-center space-y-3 mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-indigo-100">
            B
          </div>
          <div className="text-center">
            <h1 className="font-sans font-bold text-slate-900 tracking-tight text-2xl leading-tight">StatementPro</h1>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 block">SECURE GATEWAY</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white py-8 px-4 shadow-xl border border-slate-100 sm:rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="password" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Security Password
              </label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={16} />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder-slate-400 font-medium"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all cursor-pointer shadow-indigo-100"
              >
                Access Workspace
              </button>
            </div>
          </form>

          {/* Prompt info */}
          <div className="mt-6 border-t border-slate-100 pt-5 text-center text-[10px] text-slate-400 font-medium">
            Protected workspace active. Unauthorized attempts are logged.
          </div>
        </div>
      </div>
    </div>
  );
}
