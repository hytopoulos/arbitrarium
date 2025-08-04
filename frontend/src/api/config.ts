// Centralized API configuration
const isProduction = process.env.NODE_ENV === 'production';

// Base URL for all API requests
export const API_BASE_URL = isProduction ? '/api' : 'http://localhost:8000/api';

interface ApiConfig extends RequestInit {
  headers?: Record<string, string>;
}

// Helper function to get CSRF token
export const getCSRFToken = (): string | null => {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : null;
};

// Set CSRF token for the session
export const setCSRFToken = async (): Promise<string | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/csrf/`, {
      credentials: 'include',
    });
    
    if (response.ok) {
      return getCSRFToken();
    }
    return null;
  } catch (error) {
    console.error('Error setting CSRF token:', error);
    return null;
  }
};

// Set authentication token for API requests
export const setAuthToken = (token: string): void => {
  localStorage.setItem('token', token);
  // The token will be included in the Authorization header by the api instance
};

// Clear authentication token
export const clearAuthToken = (): void => {
  localStorage.removeItem('token');
  // The token will be removed from the Authorization header by the api instance
};

// API instance with default config
export const api = {
  get: async (url: string, config: ApiConfig = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Token ${token}` } : {}),
      'X-CSRFToken': getCSRFToken() || '',
      ...(config.headers || {})
    };

    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...config,
      method: 'GET',
      headers,
      credentials: 'include' as const,
      mode: 'cors' as const
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.detail || 'Request failed');
      (error as any).status = response.status;
      (error as any).data = errorData;
      throw error;
    }

    return response;
  },

  post: async (url: string, data: any, config: ApiConfig = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Token ${token}` } : {}),
      'X-CSRFToken': getCSRFToken() || '',
      ...(config.headers || {})
    };

    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...config,
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      credentials: 'include' as const,
      mode: 'cors' as const
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.detail || 'Request failed');
      (error as any).status = response.status;
      (error as any).data = errorData;
      throw error;
    }

    return response;
  }
};
