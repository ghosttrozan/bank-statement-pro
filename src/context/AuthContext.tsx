import React, { createContext, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';

interface AuthContextProps {
  refreshSession: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextProps | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoading, isAuthenticated, setIsLoading, setTokens, setUser, clearAuth } = useAuthStore();
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const refreshSession = async () => {
    try {
      // Call token rotation refresh route (reads httpOnly cookie)
      const res = await api.post('/api/auth/refresh');
      const { accessToken } = res.data;
      setTokens(accessToken);

      // Fetch own profile
      const userRes = await api.get('/api/auth/me');
      setUser(userRes.data.user);
    } catch (err) {
      clearAuth();
    } finally {
      setIsLoading(false);
    }
  };

  // On mount, perform initial session check
  useEffect(() => {
    refreshSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set up periodic silent refreshes (every 14 minutes, since access token expires in 15m)
  useEffect(() => {
    if (isAuthenticated) {
      refreshIntervalRef.current = setInterval(() => {
        api.post('/api/auth/refresh').then((res) => {
          const { accessToken } = res.data;
          setTokens(accessToken);
        }).catch(() => {
          clearAuth();
        });
      }, 14 * 60 * 1000);
    } else {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isAuthenticated, setTokens, clearAuth]);



  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
        <div className="relative flex items-center justify-center">
          {/* Animated Spinner Outer Ring */}
          <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
          {/* Animated Inner Ring */}
          <div className="absolute w-10 h-10 border-4 border-violet-500/20 border-b-violet-500 rounded-full animate-spin [animation-direction:reverse]"></div>
        </div>
        <h2 className="mt-6 text-lg font-semibold tracking-wide text-indigo-200 animate-pulse">
          Securing Session...
        </h2>
        <p className="mt-2 text-sm text-slate-500">StatementPro SaaS Portal</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
};
