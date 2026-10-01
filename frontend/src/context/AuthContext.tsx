import React, { createContext, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

interface AuthContextProps {
  refreshSession: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextProps | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoading, setIsLoading } = useAuthStore();

  const refreshSession = async () => {
    setIsLoading(false);
  };

  // On mount, stop loading immediately
  useEffect(() => {
    setIsLoading(false);
  }, [setIsLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
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
