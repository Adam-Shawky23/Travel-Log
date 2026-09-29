import { createContext, useContext, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMe } from '../api/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    enabled: Boolean(token),
    retry: false,
  });

  function loginWithToken(newToken) {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    queryClient.invalidateQueries({ queryKey: ['me'] });
  }

  function logout() {
    localStorage.removeItem('token');
    setToken(null);
    queryClient.removeQueries({ queryKey: ['me'] });
  }

  const value = {
    token,
    user,
    isAuthenticated: Boolean(token),
    isLoading: Boolean(token) && isLoading,
    loginWithToken,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
