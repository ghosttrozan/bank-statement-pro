import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface DbUser {
  id: string;
  fullName: string;
  username: string;
  phoneNumber: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
  subscription: {
    plan: 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE';
    status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'SUSPENDED';
    startDate?: string;
    endDate?: string;
    maxStatements: number;
  };
  totalStatementsGenerated: number;
  lastSeenAt?: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: DbUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setTokens: (accessToken: string, refreshToken?: string) => void;
  setUser: (user: DbUser) => void;
  setIsLoading: (isLoading: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      setTokens: (accessToken, refreshToken) =>
        set((state) => ({
          accessToken,
          refreshToken: refreshToken || state.refreshToken,
          isAuthenticated: true,
        })),
      setUser: (user) => set({ user }),
      setIsLoading: (isLoading) => set({ isLoading }),
      clearAuth: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
        }),
    }),
    {
      name: 'statementpro-auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
