import React from 'react';
import { Box } from './primitives';

interface MainContentProps {
  children?: React.ReactNode;
  className?: string;
}

export const MainContent: React.FC<MainContentProps> = ({
  children,
  className = '',
}) => {
  return (
    <Box
      as="main"
      className={`flex-1 flex flex-col overflow-hidden bg-white ${className}`}
    >
      {children}
    </Box>
  );
};
