import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children, onTasksLoaded }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginSent, setLoginSent] = useState(false);

  // On mount, check if we have a stored session token
  useEffect(() => {
    const token = localStorage.getItem('tickety_session_token');
    if (token) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      apiClient.get('/api/auth/me')
        .then(res => {
          setUser(res.data);
          // Load user's tasks
          return apiClient.get('/api/tasks');
        })
        .then(res => {
          if (onTasksLoaded && res.data) {
            onTasksLoaded(res.data);
          }
        })
        .catch(() => {
          // Token invalid, clear it
          localStorage.removeItem('tickety_session_token');
          delete apiClient.defaults.headers.common['Authorization'];
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email) => {
    try {
      await apiClient.post('/api/auth/login', { email });
      setLoginSent(true);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || '發送失敗，請稍後再試' };
    }
  }, []);

  const verifyToken = useCallback(async (token) => {
    try {
      const res = await apiClient.get(`/api/auth/verify?token=${token}`);
      const { session_token, email } = res.data;
      localStorage.setItem('tickety_session_token', session_token);
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${session_token}`;
      setUser({ email });
      setLoginSent(false);

      // Load user's tasks after login
      try {
        const tasksRes = await apiClient.get('/api/tasks');
        if (onTasksLoaded && tasksRes.data) {
          onTasksLoaded(tasksRes.data);
        }
      } catch {}

      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || '連結無效或已過期' };
    }
  }, [onTasksLoaded]);

  const logout = useCallback(() => {
    localStorage.removeItem('tickety_session_token');
    delete apiClient.defaults.headers.common['Authorization'];
    setUser(null);
    setLoginSent(false);
  }, []);

  const value = {
    user,
    loading,
    loginSent,
    login,
    verifyToken,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
