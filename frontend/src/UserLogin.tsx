import React, { useState } from 'react';
import axios from 'axios';
import { FiMail, FiLock, FiLogIn } from 'react-icons/fi';

interface UserLoginProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  onSwitchToSignUp?: () => void;
}

const UserLogin: React.FC<UserLoginProps> = ({ onSuccess, onError, onSwitchToSignUp }) => {
  const [formData, setFormData] = useState({
    username: '',
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
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username or email is required';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Using our custom token authentication endpoint
      const response = await axios.post('http://localhost:8000/api/auth/token/', {
        username: formData.username,
        password: formData.password,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true  // Important for CSRF
      });
      
      console.log('Login response:', response.data);
      
      if (response.data.token) {
        // Store the token in local storage
        localStorage.setItem('token', response.data.token);
        
        // Also store user info if available
        if (response.data.user_id) {
          localStorage.setItem('user_id', response.data.user_id);
        }
        if (response.data.email) {
          localStorage.setItem('user_email', response.data.email);
        }
        
        console.log('Login successful, token stored');
        if (onSuccess) onSuccess();
      } else {
        throw new Error('No token received in response');
      }
      
    } catch (error: any) {
      console.error('Login error:', error);
      
      let errorMessage = 'Invalid username or password';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Clear any existing token on failed login
      localStorage.removeItem('token');
      
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
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
            Username or Email
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiMail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className={`pl-10 w-full px-4 py-2 border ${
                errors.username ? 'border-red-500' : 'border-gray-300'
              } rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
              placeholder="Enter your username or email"
              disabled={isLoading}
            />
          </div>
          {errors.username && (
            <p className="mt-1 text-sm text-red-600">{errors.username}</p>
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
            <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
              Forgot your password?
            </a>
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
