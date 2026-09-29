import { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMe } from '../api/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const queryClient = useQueryClient();

  const {
    data: user,
    isLoading,
    isError,
    error: meError,
  } = useQuery({
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

  // If we can't identify the current user for ANY reason (401, 500, network
  // blip, ...) we must not keep treating them as authenticated: staying
  // "logged in" with an unknown user silently hides owner-only controls
  // instead of surfacing the problem. A 401 is also handled by the axios
  // interceptor, but that path is best-effort (e.g. it won't fire in tests
  // that mock the API layer), so this is the authoritative fallback.
  useEffect(() => {
    if (isError) {
      logout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isError]);

  const value = {
    token,
    user,
    isAuthenticated: Boolean(token),
    isLoading: Boolean(token) && isLoading,
    isMeError: isError,
    meError,
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
