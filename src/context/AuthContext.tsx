/**
 * AuthContext
 * -----------
 * Session is maintained entirely via an HttpOnly cookie set by the backend.
 * JavaScript NEVER sees, stores, or handles the session token directly.
 *
 * On app load: calls /api/admin/session with cookie → backend validates.
 * On login:    backend sets the HttpOnly cookie in its response.
 * On logout:   backend clears the cookie server-side.
 *
 * This eliminates the localStorage XSS token-theft vector entirely.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { verifySession, logout as apiLogout } from '../api/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;       // called after successful login API call
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // On mount: verify session by having the browser send the HttpOnly cookie
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isValid = await verifySession();
        setIsAuthenticated(isValid);
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  /**
   * Called by AdminLogin after a successful POST /api/admin/login.
   * The backend already set the HttpOnly cookie in its response — we
   * just update React state here.
   */
  const login = () => {
    setIsAuthenticated(true);
  };

  const logout = async () => {
    try {
      // Tell the backend to invalidate the session and clear the cookie
      await apiLogout();
    } catch (error) {
      // Log only in non-production
      if (import.meta.env.DEV) console.error('[Logout error]', error);
    }
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
