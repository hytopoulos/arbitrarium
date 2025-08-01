import React, { useState } from 'react';
import axios from 'axios';
import { FiUser, FiMail, FiLock, FiArrowRight } from 'react-icons/fi';

interface UserRegistrationProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const UserRegistration: React.FC<UserRegistrationProps> = ({ onSuccess, onError }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password1: '',
    password2: '',
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
      newErrors.username = 'Username is required';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password1) {
      newErrors.password1 = 'Password is required';
    } else if (formData.password1.length < 8) {
      newErrors.password1 = 'Password must be at least 8 characters';
    }
    
    if (formData.password1 !== formData.password2) {
      newErrors.password2 = 'Passwords do not match';
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
      const response = await axios.post('http://localhost:8000/api/auth/register/', {
        username: formData.username,
        email: formData.email,
        password: formData.password1,
      });
      
      console.log('Registration successful:', response.data);
      if (onSuccess) onSuccess();
      
    } catch (error: any) {
      console.error('Registration error:', error);
      
      if (error.response?.data) {
        // Handle API validation errors
        const apiErrors = error.response.data;
        const errorMessages: Record<string, string> = {};
        
        Object.entries(apiErrors).forEach(([field, messages]) => {
          errorMessages[field] = Array.isArray(messages) ? messages[0] : String(messages);
        });
        
        setErrors(prev => ({
          ...prev,
          ...errorMessages,
        }));
      }
      
      if (onError) {
        onError(error.response?.data?.detail || 'Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Create an Account</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
            Username
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiUser className="h-5 w-5 text-gray-400" />
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
              placeholder="Enter your username"
            />
          </div>
          {errors.username && (
            <p className="mt-1 text-sm text-red-600">{errors.username}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiMail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`pl-10 w-full px-4 py-2 border ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              } rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
              placeholder="Enter your email"
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="password1" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiLock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="password"
              id="password1"
              name="password1"
              value={formData.password1}
              onChange={handleChange}
              className={`pl-10 w-full px-4 py-2 border ${
                errors.password1 ? 'border-red-500' : 'border-gray-300'
              } rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
              placeholder="Create a password"
            />
          </div>
          {errors.password1 && (
            <p className="mt-1 text-sm text-red-600">{errors.password1}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="password2" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiLock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="password"
              id="password2"
              name="password2"
              value={formData.password2}
              onChange={handleChange}
              className={`pl-10 w-full px-4 py-2 border ${
                errors.password2 ? 'border-red-500' : 'border-gray-300'
              } rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
              placeholder="Confirm your password"
            />
          </div>
          {errors.password2 && (
            <p className="mt-1 text-sm text-red-600">{errors.password2}</p>
          )}
        </div>
        
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              'Creating account...'
            ) : (
              <>
                Create Account
                <FiArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>
      
      <div className="mt-4 text-center text-sm text-gray-600">
        <p>Already have an account?{' '}
          <button
            onClick={() => {
              // Handle login navigation
              console.log('Navigate to login');
            }}
            className="font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
};

export default UserRegistration;
