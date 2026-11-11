import { createContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [operator, setOperator] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('busgo_token'));
  const [loading, setLoading] = useState(true);

  // Load authenticated user profile from backend
  const loadUser = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      if (response && response.data && response.data.user) {
        setUser(response.data.user);
        setOperator(response.data.operator || null);
      } else {
        setUser(null);
        setOperator(null);
      }
    } catch (err) {
      // Session does not exist or expired
      localStorage.removeItem('busgo_token');
      setUser(null);
      setOperator(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Customer login
  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token: receivedToken, data } = response;

    if (receivedToken) {
      localStorage.setItem('busgo_token', receivedToken);
      setToken(receivedToken);
    }

    if (data && data.user) {
      setUser(data.user);
      setOperator(data.operator || null);
    }

    return data;
  };

  // Customer registration
  const register = async (userData) => {
    const response = await api.post('/auth/register', userData);
    const { token: receivedToken, data } = response;

    if (receivedToken) {
      localStorage.setItem('busgo_token', receivedToken);
      setToken(receivedToken);
    }

    if (data && data.user) {
      setUser(data.user);
      setOperator(null);
    }

    return data;
  };

  // Operator onboarding registration
  const registerOperator = async (operatorData) => {
    const response = await api.post('/auth/operator-register', operatorData);
    const { token: receivedToken, data } = response;

    if (receivedToken) {
      localStorage.setItem('busgo_token', receivedToken);
      setToken(receivedToken);
    }

    if (data && data.user) {
      setUser(data.user);
      setOperator(data.operator || null);
    }

    return data;
  };

  // Logout
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // Ignore network error on logout
    } finally {
      localStorage.removeItem('busgo_token');
      setUser(null);
      setOperator(null);
      setToken(null);
    }
  };

  // Profile update
  const updateProfile = async (profileData) => {
    const response = await api.put('/auth/profile', profileData);
    if (response && response.data && response.data.user) {
      setUser(response.data.user);
      if (response.data.operator) {
        setOperator(response.data.operator);
      }
    }
    return response.data;
  };

  const value = {
    user,
    operator,
    token,
    loading,
    isAuthenticated: !!user,
    role: user?.role || null,
    isOperatorApproved: operator?.approvalStatus === 'approved',
    login,
    register,
    registerOperator,
    logout,
    updateProfile,
    refreshUser: loadUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

