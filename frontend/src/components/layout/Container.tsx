import React, { forwardRef } from 'react';
import { Box, BoxProps } from './Box';
import { twMerge } from 'tailwind-merge';

export interface ContainerProps extends BoxProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  children?: React.ReactNode;
}

export const Container = forwardRef<HTMLDivElement, ContainerProps>(
  ({
    as = 'div',
    size = 'lg',
    className = '',
    children,
    ...props
  }, ref) => {
    const sizeClasses = {
      'sm': 'max-w-3xl',
      'md': 'max-w-4xl',
      'lg': 'max-w-6xl',
      'xl': 'max-w-7xl',
      'full': 'max-w-full',
    };

    return (
      <Box
        as={as}
        ref={ref}
        className={twMerge(
          'w-full mx-auto px-4 sm:px-6 lg:px-8',
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </Box>
    );
  }
);

Container.displayName = 'Container';
