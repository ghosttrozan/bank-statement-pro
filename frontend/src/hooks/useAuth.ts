import { useAuthStore, DbUser } from '../store/authStore';

export const useAuth = () => {
  const { user, accessToken, isAuthenticated, isLoading, setTokens, setUser, clearAuth } = useAuthStore();

  const login = async (loginIdentifier: string, password: string): Promise<void> => {
    const validUsername = (import.meta.env.VITE_AUTH_USERNAME || 'admin').trim().toLowerCase();
    const validPhone = (import.meta.env.VITE_AUTH_PHONE || '9876543210').trim();
    const validPassword = import.meta.env.VITE_AUTH_PASSWORD || 'admin123';

    const inputId = (loginIdentifier || '').trim().toLowerCase();

    if ((inputId === validUsername || inputId === validPhone.toLowerCase()) && password === validPassword) {
      const authUser: DbUser = {
        id: 'admin-local-1',
        fullName: 'Administrator',
        username: import.meta.env.VITE_AUTH_USERNAME || 'admin',
        phoneNumber: import.meta.env.VITE_AUTH_PHONE || '9876543210',
        role: 'SUPER_ADMIN',
        subscription: {
          plan: 'ENTERPRISE',
          status: 'ACTIVE',
          maxStatements: 999999,
        },
        totalStatementsGenerated: 0,
      };

      setTokens('local-jwt-token-admin', 'local-refresh-token-admin');
      setUser(authUser);
      return;
    }

    throw new Error('Invalid username/phone or password');
  };

  const logout = async (): Promise<void> => {
    clearAuth();
  };

  const logoutAll = async (): Promise<void> => {
    clearAuth();
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
