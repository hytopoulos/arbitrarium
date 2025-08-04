import React, { forwardRef, HTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

export interface BoxProps extends HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType;
  className?: string;
  children?: React.ReactNode;
}

export const Box = forwardRef<HTMLDivElement, BoxProps>(
  ({ as: Component = 'div', className = '', children, ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={twMerge('box-border', className)}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Box.displayName = 'Box';
