import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Environment, Entity } from '../../api/types';
import { useResponsive } from '../../hooks/useResponsive';
import { Box, Flex } from './primitives';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { CorpusSidebar } from './CorpusSidebar';
import Graph from '../graph/Graph';
import EntityView from '../../EntityView';
import { ToastContainer, toast } from 'react-toastify';
import { transformEnvironmentToGraphData, handleFrameElementAssignment } from '../../utils/graphUtils';
import 'react-toastify/dist/ReactToastify.css';
import GraphView from 'components/graph/GraphView';

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
  const handleFrameElementAssign = useCallback(async (assignment: { frameId: string; elementId: string; role?: string }) => {
    if (!currentEnv) return;
    
    try {
      const updatedEnv = await handleFrameElementAssignment(
        assignment,
        currentEnv,
        (updatedEnv) => {
          toast.success(`Successfully assigned element as '${assignment.role || 'element'}'`);
          onEnvSelected(updatedEnv);
        }
      );
      
      return updatedEnv;
    } catch (error) {
      console.error('Failed to assign frame element:', error);
      toast.error('Failed to assign frame element. Please try again.');
      throw error;
    }
  }, [currentEnv, onEnvSelected]);
  
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
                <GraphView environment={[currentEnv]} />
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
