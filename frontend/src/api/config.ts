// Centralized API configuration
const isProduction = process.env.NODE_ENV === 'production';

// Base URL for all API requests
// Use REACT_APP_API_BASE if available (set in docker-compose), otherwise fallback to default
export const API_BASE_URL = process.env.REACT_APP_API_BASE || 
  (isProduction ? '/api' : 
    (process.env.NODE_ENV === 'development' && process.env.REACT_APP_INTERNAL_API_BASE ? 
      process.env.REACT_APP_INTERNAL_API_BASE : 
      'http://localhost:8000/api'));

interface ApiConfig extends RequestInit {
  headers?: Record<string, string>;
}

// Helper function to get CSRF token
export const getCSRFToken = (): string | null => {
  // Try to get CSRF token from cookie
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  if (match) {
    return match[1];
  }
  
  // Also try with different cookie name patterns
  const csrftokenMatch = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  if (csrftokenMatch) {
    return csrftokenMatch[1];
  }
  
  return null;
};

// Set CSRF token for the session
export const setCSRFToken = async (): Promise<string | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/csrf/`, {
      credentials: 'include',
    });
    
    if (response.ok) {
      // Wait a bit for cookie to be set
      await new Promise(resolve => setTimeout(resolve, 100));
      return getCSRFToken();
    }
    console.error('Failed to get CSRF token - response not OK:', response.status);
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

    // Ensure proper URL construction with a slash between base URL and endpoint
    const fullUrl = url.startsWith('/') ? `${API_BASE_URL}${url}` : `${API_BASE_URL}/${url}`;
    const response = await fetch(fullUrl, {
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

    // Ensure proper URL construction with a slash between base URL and endpoint
    const fullUrl = url.startsWith('/') ? `${API_BASE_URL}${url}` : `${API_BASE_URL}/${url}`;
    const response = await fetch(fullUrl, {
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
