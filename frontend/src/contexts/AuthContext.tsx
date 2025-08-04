import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { api, setAuthToken, clearAuthToken, setCSRFToken } from '../api/config';

export interface User {
  id: number;
  username: string;
  email: string;
  // Add other user properties as needed
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState<boolean>(false);

  // Check if user is authenticated
  const checkAuth = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setUser(null);
        return false;
      }

      setAuthToken(token);
      const response = await api.get('/auth/user/');
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        return true;
      } else {
        // Token is invalid or expired
        localStorage.removeItem('token');
        clearAuthToken();
        setUser(null);
        return false;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setError('Failed to check authentication status');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      if (initialized) return;
      
      try {
        // First get CSRF token
        await setCSRFToken();
        // Then check auth status
        await checkAuth();
      } catch (error) {
        console.error('Initialization error:', error);
        setError('Failed to initialize authentication');
      } finally {
        setInitialized(true);
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [checkAuth, initialized]);

  // Login function
  const login = useCallback(async (credentials: { username: string; password: string }) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // First ensure we have a CSRF token
      await setCSRFToken();
      
      const response = await api.post('/auth/login/', credentials);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }

      const data = await response.json();
      
      if (data.token) {
        localStorage.setItem('token', data.token);
        setAuthToken(data.token);
        await checkAuth();
      } else {
        throw new Error('No token received');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : 'Login failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [checkAuth]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      await api.post('/auth/logout/', {});
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      clearAuthToken();
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    logout,
    checkAuth,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
