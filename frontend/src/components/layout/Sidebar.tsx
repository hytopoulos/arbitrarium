import React from 'react';
import { Environment } from '../../api/types';
import { Box, Flex } from './primitives';
import { Button } from './Button';
import { useResponsive } from '../../hooks/useResponsive';
import EnvironmentsList from '../../EnvironmentsList';
import { FiX } from 'react-icons/fi';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
  currentEnv: Environment | null;
  onEnvSelected: (env: Environment | null) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  isMobile,
  currentEnv,
  onEnvSelected,
}) => {
  return (
    <>
      {/* Overlay for mobile */}
      {isMobile && isOpen && (
        <Box
          as="div"
          className="fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <Box
        as="aside"
        className={`${isMobile ? 'fixed' : 'relative'} z-30 w-72 bg-white border-r border-gray-200 h-full transition-all duration-300 ease-in-out shadow-sm ${
          isOpen ? 'translate-x-0' : isMobile ? '-translate-x-full' : 'translate-x-0'
        } ${!isOpen && !isMobile ? 'hidden' : ''}`}
        aria-label="Environments sidebar"
      >
        <Flex direction="col" className="h-full">
          <Box className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Environments</h2>
              <p className="mt-1 text-sm text-gray-500">Select an environment to view</p>
            </div>
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="ml-2 -mr-2"
                aria-label="Close sidebar"
              >
                <FiX className="h-5 w-5" />
              </Button>
            )}
          </Box>
          <Box className="flex-1 overflow-y-auto p-2">
            <EnvironmentsList
              onEnvSelected={(env) => {
                onEnvSelected(env);
                if (isMobile) onClose();
              }}
            />
          </Box>
          <Box className="p-4 border-t border-gray-200 bg-white">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => onEnvSelected(null)}
              disabled={!currentEnv}
            >
              Clear Selection
            </Button>
          </Box>
        </Flex>
      </Box>
    </>
  );
};
