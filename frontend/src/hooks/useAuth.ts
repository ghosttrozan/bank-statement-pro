import { useAuthStore } from '../store/authStore';
import api from '../lib/api';

export const useAuth = () => {
  const { user, accessToken, isAuthenticated, isLoading, setTokens, setUser, clearAuth } = useAuthStore();

  const login = async (loginIdentifier: string, password: string): Promise<void> => {
    const res = await api.post('/api/auth/login', { loginIdentifier, password });
    const { accessToken: token, user: userData } = res.data;
    setTokens(token);
    setUser(userData);
  };

  const logout = async (): Promise<void> => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      clearAuth();
    }
  };

  const logoutAll = async (): Promise<void> => {
    try {
      await api.post('/api/auth/logout-all');
    } finally {
      clearAuth();
    }
  };

  return {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    login,
    logout,
    logoutAll,
  };
};
