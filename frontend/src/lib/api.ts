import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-toastify';

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Necessary to send/receive httpOnly cookies cross-origin
});

// ── Request Interceptor ──
api.interceptors.request.use(
  (config) => {
    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// ── Response Interceptor ──
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized (attempt token refresh)
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/api/auth/login') &&
      !originalRequest.url?.includes('/api/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt silent token refresh via rotation endpoint
        const currentRefreshToken = useAuthStore.getState().refreshToken;
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/api/auth/refresh`,
          { refreshToken: currentRefreshToken },
          { withCredentials: true }
        );

        const { accessToken, refreshToken } = refreshResponse.data;
        useAuthStore.getState().setTokens(accessToken, refreshToken);

        // Process any queued requests that failed while refreshing
        processQueue(null, accessToken);
        isRefreshing = false;

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        useAuthStore.getState().clearAuth();
        // Redirect to login if on the client-side
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      const msg = error.response.data?.message || 'Access Denied: You do not have permission.';
      toast.error(msg);
    }

    // Handle 429 Too Many Requests
    if (error.response?.status === 429) {
      toast.warning('Too many requests. Please slow down.');
    }

    return Promise.reject(error);
  }
);

export default api;
