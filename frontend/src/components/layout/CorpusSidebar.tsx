import React from 'react';
import { Environment } from '../../api/types';
import { Box, Flex } from './primitives';
import { Button } from './Button';
import { FiX } from 'react-icons/fi';
import CorpusView from '../../CorpusView';
import { twMerge } from 'tailwind-merge';

interface CorpusSidebarProps {
  environment: Environment[];
  onAddToEnvironment: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
  className?: string;
}

export const CorpusSidebar: React.FC<CorpusSidebarProps> = ({
  environment,
  onAddToEnvironment,
  isOpen = true,
  onClose,
  isMobile = false,
  className = '',
}) => {
  return (
    <>
      {/* Overlay for mobile */}
      {isMobile && isOpen && (
        <Box
          as="div"
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <Box
        as="aside"
        className={twMerge(
          `${isMobile ? 'fixed' : 'relative'} z-30 w-80 flex flex-col border-l border-gray-200 bg-white h-full transition-transform duration-300 ease-in-out shadow-sm ${
            isOpen ? 'translate-x-0' : isMobile ? 'translate-x-full' : 'translate-x-0'
          } ${!isOpen && !isMobile ? 'hidden' : ''} right-0`,
          className
        )}
        aria-label="Corpus sidebar"
      >
        <Flex direction="col" className="h-full">
          <Box className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Corpus</h2>
              <p className="mt-1 text-sm text-gray-500">View and manage corpus items</p>
            </div>
            {isMobile && onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="ml-2 -mr-2"
                aria-label="Close corpus sidebar"
              >
                <FiX className="h-5 w-5" />
              </Button>
            )}
          </Box>
          <Box className="flex-1 overflow-y-auto">
            <CorpusView
              environment={environment}
              onAddToEnvironment={onAddToEnvironment}
              className="p-2"
            />
          </Box>
        </Flex>
      </Box>
    </>
  );
};
