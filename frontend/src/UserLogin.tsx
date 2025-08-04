import React, { useState } from 'react';
import { api, getCSRFToken, setCSRFToken, setAuthToken } from './api/config';
import { FiMail, FiLock, FiLogIn } from 'react-icons/fi';

interface UserLoginProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  onSwitchToSignUp?: () => void;
}

const UserLogin: React.FC<UserLoginProps> = ({ onSuccess, onError, onSwitchToSignUp }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    
    // Basic validation
    if (!formData.email || !formData.password) {
      setErrors({ form: 'Please fill in all fields' });
      setIsLoading(false);
      return;
    }
    
    try {
      console.log('Attempting login with email:', formData.email);
      
      // First, ensure we have a CSRF token
      const csrfToken = await setCSRFToken();
      if (!csrfToken) {
        throw new Error('Failed to get CSRF token');
      }
      
      // Make the login request using the configured api instance
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000/api'}/auth/token/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken || '',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });
      
      console.log('Login response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Login error response:', errorData);
        throw new Error(errorData.error || 'Login failed');
      }
      
      const responseData = await response.json();
      console.log('Login response data:', responseData);
      
      if (responseData && responseData.token) {
        // Store the token and user data
        setAuthToken(responseData.token);
        
        if (responseData.user_id) {
          localStorage.setItem('user_id', responseData.user_id);
        }
        if (responseData.email) {
          localStorage.setItem('user_email', responseData.email);
        }
        if (responseData.environment_id) {
          localStorage.setItem('current_environment_id', responseData.environment_id);
        }
        
        console.log('Login successful, token stored');
        
        // Verify token is stored
        const storedToken = localStorage.getItem('token');
        console.log('Stored token:', storedToken ? 'Token found' : 'No token found');
        
        if (onSuccess) onSuccess();
      } else {
        throw new Error('No token received in response');
      }
      
    } catch (error: any) {
      console.error('Login error:', error);
      
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        const errorData = await error.response.json().catch(() => ({}));
        errorMessage = errorData.detail || errorData.error || `Server error: ${error.response.status}`;
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = 'No response from server. Please check your connection.';
      } else if (error.message) {
        // Something happened in setting up the request
        errorMessage = error.message;
      }
      
      console.error('Error details:', { error, message: error.message });
      
      setErrors(prev => ({
        ...prev,
        form: errorMessage,
      }));
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Welcome Back</h2>
      
      {errors.form && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
          {errors.form}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiMail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              className={`block w-full pl-10 pr-3 py-2 border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              disabled={isLoading}
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiLock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`pl-10 w-full px-4 py-2 border ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              } rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
              placeholder="Enter your password"
              disabled={isLoading}
            />
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
              Remember me
            </label>
          </div>
          
          <div className="text-sm">
            <button 
              type="button" 
              className="font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              onClick={() => { /* TODO: Implement forgot password functionality */ }}
            >
              Forgot your password?
            </button>
          </div>
        </div>
        
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              'Signing in...'
            ) : (
              <>
                Sign In
                <FiLogIn className="ml-2 h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>
      
      <div className="mt-4 text-center text-sm text-gray-600">
        <p>Don't have an account?{' '}
          <button
            onClick={onSwitchToSignUp}
            className="font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none"
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
};

export default UserLogin;
