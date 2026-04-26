/**
 * Auth context — provides user, token, isAuthenticated, login(), logout().
 * Token persisted in localStorage. JWT decoded for user info.
 */
import { createContext, useState, useCallback, useMemo } from 'react';
import apiClient, { TOKEN_KEY } from '../config/api-client.js';

export const AuthContext = createContext(null);

function decodeToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return { email: payload.email, role: payload.role, fullName: payload.fullName };
  } catch {
    return null;
  }
}

function loadStoredAuth() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return { token: null, user: null };
  const user = decodeToken(token);
  return user ? { token, user } : { token: null, user: null };
}

export function AuthProvider({ children }) {
  const initial = loadStoredAuth();
  const [token, setToken] = useState(initial.token);
  const [user, setUser] = useState(initial.user);

  const login = useCallback(async (email, password) => {
    const { data } = await apiClient.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = data.data;
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
    return newUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ token, user, isAuthenticated: !!token, login, logout }),
    [token, user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
