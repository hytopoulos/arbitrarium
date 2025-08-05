import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { FiInfo } from 'react-icons/fi';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useEnvironments } from './hooks/useEnvironments';
import UserLogin from './UserLogin';
import { Entity } from './api/types';
import { MainLayout } from './components/layout/MainLayout';
import { Page } from './components/layout/Page';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function AppContent() {
  const { user, isAuthenticated, isLoading: isAuthLoading, error: authError, logout } = useAuth();
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  
  const {
    currentEnv,
    environments,
    isSidebarOpen,
    isLoading: isEnvsLoading,
    error: envError,
    selectEnvironment,
    toggleSidebar,
    refreshCurrentEnv,
  } = useEnvironments();
  
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      setShowLogin(true);
    }
  }, [isAuthLoading, isAuthenticated]);
  
  useEffect(() => {
    if (authError) {
      setNotification({
        message: authError,
        type: 'error'
      });
    }
  }, [authError]);
  
  useEffect(() => {
    if (envError) {
      setNotification({
        message: envError instanceof Error ? envError.message : 'Error loading environments',
        type: 'error'
      });
    }
  }, [envError]);
  
  const handleRegistrationSuccess = () => {
    setNotification({
      message: 'Registration successful! Please log in.',
      type: 'success'
    });
    setTimeout(() => setNotification(null), 5000);
    setShowLogin(true);
  };
  
  const handleRegistrationError = (error: string) => {
    setNotification({
      message: error,
      type: 'error'
    });
  };
  
  const handleLoginSuccess = () => {
    setShowLogin(false);
    setNotification({
      message: 'Login successful!',
      type: 'success'
    });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleLogout = () => {
    logout();
    setNotification({
      message: 'You have been logged out.',
      type: 'success'
    });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleRefresh = () => {
    refreshCurrentEnv();
  };

  const handleEnvSelected = (env: any) => {
    selectEnvironment(env);
    setSelectedEntity(null);
  };

  const handleAddToEnvironment = () => {
    // Add to environment logic
  };

  const handleToggleSidebar = () => {
    toggleSidebar();
  };

  if (isAuthLoading || isEnvsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {notification && (
        <div 
          className={`fixed top-4 right-4 p-4 rounded-md z-50 ${
            notification.type === 'success' 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}
        >
          <div className="flex items-center">
            <FiInfo className="mr-2" />
            <span>{notification.message}</span>
            <button 
              onClick={() => setNotification(null)}
              className="ml-4 text-gray-500 hover:text-gray-700"
              aria-label="Close notification"
            >
              &times;
            </button>
          </div>
        </div>
      )}
      
      {showLogin ? (
        <div className="flex items-center justify-center min-h-screen">
          <UserLogin 
            onSuccess={handleLoginSuccess}
            onError={(error) => setNotification({ message: error, type: 'error' })}
            onSwitchToSignUp={() => {
              // This will be handled by the UserLogin component itself
            }}
          />
        </div>
      ) : (
        <Page>
          <MainLayout
            currentEnv={currentEnv}
            selectedEntity={selectedEntity}
            onEnvSelected={handleEnvSelected}
            onEntitySelect={setSelectedEntity}
            onAddToEnvironment={handleAddToEnvironment}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={handleToggleSidebar}
          />
        </Page>
      )}
    </div>
  );
}

export default App;
