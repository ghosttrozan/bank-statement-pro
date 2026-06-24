import { create } from 'zustand';

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
  user: DbUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setTokens: (accessToken: string) => void;
  setUser: (user: DbUser) => void;
  setIsLoading: (isLoading: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,
  isLoading: true, // true until initial silent-refresh resolves
  setTokens: (accessToken) => set({ accessToken, isAuthenticated: true }),
  setUser: (user) => set({ user }),
  setIsLoading: (isLoading) => set({ isLoading }),
  clearAuth: () => set({ accessToken: null, user: null, isAuthenticated: false }),
}));
