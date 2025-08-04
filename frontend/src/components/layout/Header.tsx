import React from 'react';
import { FiRefreshCw, FiLogIn, FiUser, FiLogOut, FiMenu, FiDatabase } from 'react-icons/fi';
import { User, Environment } from '../../types';

interface HeaderProps {
  currentEnv: Environment | null;
  currentUser: User | null;
  onRefresh: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentEnv,
  currentUser,
  onRefresh,
  onLogin,
  onLogout,
  onToggleSidebar,
  isSidebarOpen,
}) => {
  return (
    <header className="bg-indigo-700 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left section - Logo and environment */}
          <div className="flex items-center">
            <button
              onClick={onToggleSidebar}
              className="mr-2 p-2 rounded-md text-indigo-200 hover:text-white hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-white md:hidden"
              aria-label="Toggle menu"
            >
              <FiMenu className="h-6 w-6" />
            </button>
            <div className="flex-shrink-0 flex items-center">
              <FiDatabase className="h-8 w-8 text-indigo-200" />
              <h1 className="ml-2 text-xl font-bold">Arbitrarium</h1>
            </div>
            {currentEnv && (
              <div className="hidden md:ml-6 md:flex md:items-center">
                <div className="ml-4 px-3 py-1 bg-indigo-600 text-indigo-100 rounded-full text-sm font-medium flex items-center">
                  <span className="h-2 w-2 rounded-full bg-green-400 mr-2"></span>
                  {currentEnv.name}
                </div>
              </div>
            )}
          </div>

          {/* Right section - Actions and user */}
          <div className="flex items-center space-x-4">
            <button
              onClick={onRefresh}
              className="p-2 rounded-full text-indigo-200 hover:text-white hover:bg-indigo-600 transition-colors duration-200"
              title="Refresh data"
              aria-label="Refresh data"
            >
              <FiRefreshCw className="h-5 w-5" />
            </button>

            {currentUser ? (
              <div className="flex items-center space-x-4">
                <div className="hidden md:flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center">
                    <FiUser className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-medium">{currentUser.username}</span>
                </div>
                <button
                  onClick={onLogout}
                  className="hidden md:flex items-center space-x-2 bg-white text-indigo-700 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-indigo-50 transition-colors duration-200"
                  title="Logout"
                >
                  <FiLogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onLogin}
                className="flex items-center space-x-2 bg-white text-indigo-700 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-indigo-50 transition-colors duration-200"
                title="Login"
              >
                <FiLogIn className="h-4 w-4" />
                <span>Login</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
