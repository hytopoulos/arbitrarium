import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { QueryClient, QueryClientProvider } from 'react-query';
import Cookies from 'universal-cookie';
import { FiRefreshCw, FiInfo, FiDatabase, FiUserPlus, FiLogIn, FiUser, FiLogOut } from 'react-icons/fi';
import UserRegistration from './UserRegistration.tsx';
import UserLogin from './UserLogin.tsx';
import './App.css';
import GraphView from './GraphView.tsx';
import CorpusView from './CorpusView.tsx';
import EnvironmentsList from './EnvironmentsList.tsx';
import EntityView from './EntityView.tsx';
import { Environment, Entity, User } from './types';

const queryClient = new QueryClient();
const cookies = new Cookies();

function App() {
  const [currentEnv, setCurrentEnv] = useState<Environment | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  
  // Debug log when selectedEntity changes
  useEffect(() => {
    console.log('App: Selected entity changed:', selectedEntity);
  }, [selectedEntity]);
  
  // Debug log when currentEnv changes
  useEffect(() => {
    console.log('App: Current environment changed:', currentEnv);
  }, [currentEnv]);
  const [refresh, setRefresh] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // Initialize CSRF token and check authentication status
  useEffect(() => {
    // First, get CSRF token
    const initializeCSRF = async () => {
      try {
        // Make a request to the CSRF endpoint to set the CSRF cookie
        await axios.get('http://localhost:8000/api/auth/csrf/', {
          withCredentials: true
        });
        
        // Get the CSRF token from cookies
        const csrfToken = document.cookie.match(/csrftoken=([^;]+)/)?.[1];
        if (csrfToken) {
          axios.defaults.headers.common['X-CSRFToken'] = csrfToken;
          axios.defaults.withCredentials = true;
        }
        
        // Check if user is already logged in
        const token = localStorage.getItem('token');
        if (token) {
          // Set the authorization header for all requests
          axios.defaults.headers.common['Authorization'] = `Token ${token}`;
          
          // Verify token and get user info
          try {
            const response = await axios.get('http://localhost:8000/api/auth/user/');
            setCurrentUser(response.data);
            
            // If we have a current environment, make sure it's still valid
            if (currentEnv) {
              try {
                await axios.get(`http://localhost:8000/api/env/${currentEnv.id}/`);
              } catch (error) {
                // Environment no longer exists or user doesn't have access
                setCurrentEnv(null);
              }
            }
          } catch (error) {
            console.error('Token validation failed:', error);
            // Token is invalid, clear it
            delete axios.defaults.headers.common['Authorization'];
            localStorage.removeItem('token');
            setCurrentUser(null);
          }
        }
      } catch (error) {
        console.error('CSRF initialization error:', error);
        // Continue even if CSRF initialization fails - the backend might have CSRF disabled for some endpoints
      }
    };
    
    initializeCSRF();
    
    // Set up axios response interceptor to handle 401 Unauthorized
    const interceptor = axios.interceptors.response.use(
      response => response,
      async error => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          delete axios.defaults.headers.common['Authorization'];
          localStorage.removeItem('token');
          setCurrentUser(null);
          setNotification({
            message: 'Your session has expired. Please log in again.',
            type: 'error'
          });
        }
        return Promise.reject(error);
      }
    );
    
    // Clean up interceptor on component unmount
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [currentEnv]);
  
  const handleRegistrationSuccess = () => {
    setShowRegistration(false);
    setNotification({
      message: 'Registration successful! Please log in.',
      type: 'success'
    });
    setTimeout(() => setNotification(null), 5000);
    setShowLogin(true); // Show login form after successful registration
  };
  
  const handleRegistrationError = (error: string) => {
    setNotification({
      message: error,
      type: 'error'
    });
  };
  
  const handleLoginSuccess = () => {
    setShowLogin(false);
    const token = localStorage.getItem('token');
    if (token) {
      axios.get('http://localhost:8000/api/auth/user/', {
        headers: {
          'Authorization': `Token ${token}`
        }
      }).then(response => {
        setCurrentUser(response.data);
        setNotification({
          message: 'Login successful!',
          type: 'success'
        });
        setTimeout(() => setNotification(null), 3000);
      });
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    setNotification({
      message: 'You have been logged out.',
      type: 'success'
    });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    if (refresh) {
      setRefresh(false);
      console.log('refreshing');
    }
  }, [refresh]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-indigo-600 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <FiDatabase className="h-6 w-6" />
              <h1 className="text-xl font-bold">Arbitrarium</h1>
            </div>
            <div className="flex items-center space-x-3">
              <FiDatabase className="h-8 w-8 text-indigo-200" />
              <h1 className="text-2xl font-bold">Arbitrarium</h1>
              <span className="ml-2 px-3 py-1 bg-indigo-500 text-indigo-100 rounded-full text-sm font-medium">
                {currentEnv ? currentEnv.name : 'No environment selected'}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setRefresh(true)}
                className="p-2 rounded-full hover:bg-indigo-700 transition-colors duration-200"
                title="Refresh data"
              >
                <FiRefreshCw className={`h-5 w-5 ${refresh ? 'animate-spin' : ''}`} />
              </button>
              
              {currentUser ? (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 text-white">
                    <FiUser className="h-5 w-5" />
                    <span className="hidden md:inline">{currentUser.username}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 bg-white text-indigo-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-50 transition-colors duration-200"
                  >
                    <FiLogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setShowLogin(true)}
                    className="flex items-center space-x-2 text-white hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                  >
                    <FiLogIn className="h-4 w-4" />
                    <span>Login</span>
                  </button>
                  <button
                    onClick={() => setShowRegistration(true)}
                    className="flex items-center space-x-2 bg-white text-indigo-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-50 transition-colors duration-200"
                  >
                    <FiUserPlus className="h-4 w-4" />
                    <span>Sign Up</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </header>
        
        {/* Notification */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-md shadow-lg ${
            notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
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
        
        {/* Registration Modal */}
        {showRegistration && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Create an Account</h2>
                  <button 
                    onClick={() => setShowRegistration(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    &times;
                  </button>
                </div>
                <UserRegistration 
                  onSuccess={handleRegistrationSuccess}
                  onError={handleRegistrationError}
                />
                <div className="mt-4 text-center text-sm text-gray-600">
                  Already have an account?{' '}
                  <button
                    onClick={() => {
                      setShowRegistration(false);
                      setShowLogin(true);
                    }}
                    className="font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    Sign in
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Login Modal */}
        {showLogin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Sign In</h2>
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
                    setShowRegistration(true);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="flex flex-col md:flex-row h-[calc(100vh-180px)]">
              {/* Left Sidebar - Environments */}
              <div className="w-full md:w-1/4 border-r border-gray-200 bg-gray-50 overflow-y-auto">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-lg font-medium text-gray-900">Environments</h2>
                  <p className="mt-1 text-sm text-gray-500">Select an environment to view</p>
                </div>
                <EnvironmentsList onEnvSelected={(env) => {
                  console.log('Environment selected:', env);
                  setCurrentEnv(env);
                  setSelectedEntity(null); // Clear selected entity when changing environments
                }} />
              </div>

              {/* Main Content - Graph and Entity View */}
              <div className="flex-1 flex flex-col border-r border-gray-200">
                {currentEnv ? (
                  <>
                    <div className="flex-1 p-4 overflow-auto">
                      <div key={currentEnv?.id || 'no-env'} className="h-full">
                        <GraphView 
                          environment={currentEnv ? [currentEnv] : []} 
                          onEntitySelect={(entity) => {
                            console.log('App: GraphView onEntitySelect called with:', entity);
                            setSelectedEntity(entity);
                          }} 
                        />
                      </div>
                    </div>
                    <div className="h-1/3 border-t border-gray-200 p-4 overflow-auto">
                      <EntityView entity={selectedEntity} />
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-500">
                    <p>Select an environment to get started</p>
                  </div>
                )}
              </div>

              {/* Right Sidebar - Corpus */}
              <div className="w-full md:w-1/4 bg-white overflow-y-auto">
                {currentEnv ? (
                  <CorpusView environment={[currentEnv]} onAddToEnvironment={() => setRefresh(true)} />
                ) : (
                  <div className="p-4 text-gray-500">
                    <p>Select an environment to view corpus</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Status Bar */}
        <footer className="bg-white border-t border-gray-200 py-2 px-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center text-sm text-gray-500">
            <div className="flex items-center">
              <FiInfo className="mr-1 h-4 w-4" />
              <span>Arbitrarium v1.0.0</span>
            </div>
            <div>
              {new Date().getFullYear()} © Your Company
            </div>
          </div>
        </footer>
      </div>
    </QueryClientProvider>
  );
}

export default App;
