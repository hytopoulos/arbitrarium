import React, { useState, useEffect } from 'react';
import { Environment, Entity } from '../../types';
import { useResponsive } from '../../hooks/useResponsive';
import { Box, Flex } from './primitives';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { CorpusSidebar } from './CorpusSidebar';
import GraphView, { FrameElementAssignment } from '../../GraphViewD3';
import EntityView from '../../EntityView';
import { ToastContainer, toast } from 'react-toastify';
import { apiRequest } from '../../utils/api';
import 'react-toastify/dist/ReactToastify.css';

type GraphViewProps = {
  environment: Environment[];
  onEntitySelect: (entity: Entity | null) => void;
};

export interface MainLayoutProps {
  currentEnv: Environment | null;
  selectedEntity: Entity | null;
  onEnvSelected: (env: Environment | null) => void;
  onEntitySelect: (entity: Entity | null) => void;
  onAddToEnvironment: () => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  currentEnv,
  selectedEntity,
  onEnvSelected,
  onEntitySelect,
  onAddToEnvironment,
  isSidebarOpen,
  onToggleSidebar,
}) => {
  const { isMobile } = useResponsive();

  // Handle frame element assignment
  const handleFrameElementAssign = async (assignment: FrameElementAssignment) => {
    try {
      // Make API call to create the frame element relationship
      await apiRequest('/api/frame-elements/', {
        method: 'POST',
        body: JSON.stringify({
          frame: assignment.frameId,
          element: assignment.elementId,
          role: assignment.role || 'element',
          environment: currentEnv?.id
        })
      });

      // Show success message
      toast.success(`Successfully assigned element as '${assignment.role}'`);
      
      // Instead of toggling the environment, we'll just refresh the current environment
      // This prevents the infinite update loop
      if (currentEnv) {
        // Force a re-render by creating a new object reference
        onEnvSelected({ ...currentEnv });
      }
      
    } catch (error) {
      console.error('Failed to assign frame element:', error);
      toast.error('Failed to assign frame element. Please try again.');
    }
  };

  // Close sidebar when an environment is selected on mobile
  useEffect(() => {
    if (isMobile && currentEnv && isSidebarOpen) {
      onToggleSidebar();
    }
  }, [currentEnv, isMobile, isSidebarOpen, onToggleSidebar]);

  return (
    <Flex className="flex-1 overflow-hidden relative">
      {/* Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={onToggleSidebar}
        isMobile={isMobile}
        currentEnv={currentEnv}
        onEnvSelected={onEnvSelected}
      />

      {/* Main Content */}
      <MainContent className="transition-all duration-200 ease-in-out">
        {currentEnv ? (
          <>
            <Box className="flex-1 overflow-auto">
              <div className="w-full h-full min-h-[60vh]">
                <GraphView 
                  environment={[currentEnv]} 
                  onEntitySelect={onEntitySelect}
                  onFrameElementAssign={handleFrameElementAssign}
                />
              </div>
            </Box>
            {selectedEntity && (
              <Box className="border-t border-gray-200 p-4 bg-white">
                <EntityView entity={selectedEntity} />
              </Box>
            )}
          </>
        ) : (
          <Flex className="flex-1 items-center justify-center p-8 text-center">
            <div className="max-w-md">
              <h2 className="text-lg font-medium text-gray-900 mb-2">No Environment Selected</h2>
              <p className="text-gray-500">
                {isMobile ? 'Tap the menu button to select an environment' : 'Select an environment from the sidebar to get started'}
              </p>
            </div>
          </Flex>
        )}
      </MainContent>

      {/* Corpus Sidebar */}
      <CorpusSidebar 
        environment={currentEnv ? [currentEnv] : []}
        onAddToEnvironment={onAddToEnvironment}
        className={!currentEnv ? 'hidden' : ''}
      />
      
      {/* Toast Notifications */}
      <ToastContainer 
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </Flex>
  );
};

export default MainLayout;
