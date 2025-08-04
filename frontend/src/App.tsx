import React, { useEffect, useState, useCallback } from 'react';
import { api, setAuthToken, clearAuthToken, setCSRFToken } from './api/config';
import { QueryClient, QueryClientProvider } from 'react-query';
import { FiInfo } from 'react-icons/fi';
import UserLogin from './UserLogin';
import { Environment, Entity, User } from './types';
import { Header } from './components/layout/Header';
import { MainLayout } from './components/layout/MainLayout';
import { Page } from './components/layout/Page';
import { Box } from './components/layout/primitives';
import './App.css';

const queryClient = new QueryClient();

function App() {
  // State declarations
  const [currentEnv, setCurrentEnv] = useState<Environment | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [refresh, setRefresh] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  // Debug log when selectedEntity changes
  useEffect(() => {
    console.log('App: Selected entity changed:', selectedEntity);
  }, [selectedEntity]);
  
  // Debug log when currentEnv changes
  useEffect(() => {
    console.log('App: Current environment changed:', currentEnv);
  }, [currentEnv]);

  // Initialize CSRF token and check authentication status
  const initializeAuth = useCallback(async () => {
    try {
      // Initialize CSRF token
      const csrfToken = await setCSRFToken();
      
      if (csrfToken) {
        // Check if we have a token in localStorage
        const token = localStorage.getItem('token');
        if (token) {
          // Set the authorization header
          setAuthToken(token);
          
          // Fetch user data
          try {
            const response = await api.get('/auth/user/');
            if (response.ok) {
              const userData = await response.json();
              setCurrentUser(userData);
              
              // If we have a currentEnv, refresh its data
              if (currentEnv) {
                await api.get(`/env/${currentEnv.id}/`);
              }
            } else {
              throw new Error('Failed to fetch user data');
            }
          } catch (error) {
            console.error('Failed to fetch user data:', error);
            // If token is invalid, clear it
            localStorage.removeItem('token');
            clearAuthToken();
            setCurrentUser(null);
          }
        }
      }
    } catch (error) {
      console.error('Error initializing authentication:', error);
    }
  }, [currentEnv]);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);
  
  const handleRegistrationSuccess = useCallback(() => {
    setNotification({
      message: 'Registration successful! Please log in.',
      type: 'success'
    });
    setTimeout(() => setNotification(null), 5000);
    setShowLogin(true);
  }, []);
  
  const handleRegistrationError = useCallback((error: string) => {
    setNotification({
      message: error,
      type: 'error'
    });
  }, []);
  
  const handleLoginSuccess = useCallback(async (user?: User) => {
    setShowLogin(false);
    
    // If user object is provided, use it directly
    if (user) {
      setCurrentUser(user);
      setNotification({
        message: 'Login successful!',
        type: 'success'
      });
      return;
    }
    
    // Otherwise, fetch user data from the server
    const token = localStorage.getItem('token');
    if (token) {
      setAuthToken(token);
      
      try {
        const response = await api.get('/auth/user/');
        if (response.ok) {
          const userData = await response.json();
          setCurrentUser(userData);
          setNotification({
            message: 'Login successful!',
            type: 'success'
          });
        } else {
          throw new Error('Failed to fetch user data');
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
        setNotification({
          message: 'Failed to load user data. Please refresh the page.',
          type: 'error'
        });
      }
    }
  }, [setCurrentUser, setNotification]);
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    setNotification({
      message: 'You have been logged out.',
      type: 'success'
    });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleRefresh = () => {
    setRefresh(prev => !prev);
  };

  const handleEnvSelected = (env: Environment | null) => {
    setCurrentEnv(env);
    setSelectedEntity(null);
  };

  const handleAddToEnvironment = () => {
    setRefresh(prev => !prev);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col">
        <Page className="bg-gray-50 flex-1 flex flex-col">
          <Box className="flex-shrink-0">
            <Header
              currentEnv={currentEnv}
              currentUser={currentUser}
              onRefresh={handleRefresh}
              onLogin={() => setShowLogin(true)}
              onLogout={handleLogout}
              onToggleSidebar={toggleSidebar}
              isSidebarOpen={isSidebarOpen}
            />
          </Box>
          
          <Box className="flex-1 overflow-hidden">
            <MainLayout
              currentEnv={currentEnv}
              selectedEntity={selectedEntity}
              onEnvSelected={handleEnvSelected}
              onEntitySelect={setSelectedEntity}
              onAddToEnvironment={handleAddToEnvironment}
              isSidebarOpen={isSidebarOpen}
              onToggleSidebar={toggleSidebar}
            />
          </Box>
          
          <Box as="footer" className="bg-white border-t border-gray-200 py-4">
            <Box className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <p className="text-center text-sm text-gray-500">
                &copy; {new Date().getFullYear()} Arbitrarium. All rights reserved.
              </p>
            </Box>
          </Box>
        </Page>
        
        {/* Notification */}
        {notification && (
          <div 
            className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-md shadow-lg ${
              notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            <div className="flex items-center">
              <FiInfo className="mr-2" />
              <span>{notification.message}</span>
              <button
                onClick={() => setNotification(null)}
                className="ml-4 text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
          </div>
        )}

        {showLogin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Login</h2>
                <button 
                  onClick={() => setShowLogin(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  &times;
                </button>
              </div>
              <UserLogin 
                onSuccess={handleLoginSuccess}
                onError={(error) => setNotification({ message: error, type: 'error' })}
                onSwitchToSignUp={() => {
                  setShowLogin(false);
                  setNotification({
                    message: 'Registration is currently not available. Please contact support.',
                    type: 'error'
                  });
                }}
              />
            </div>
          </div>
        )}
      </div>
    </QueryClientProvider>
  );
};

export default App;
