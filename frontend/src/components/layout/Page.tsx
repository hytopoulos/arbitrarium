import React, { forwardRef } from 'react';
import { Flex, FlexProps } from './Flex';
import { twMerge } from 'tailwind-merge';

export interface PageProps extends FlexProps {
  className?: string;
  children?: React.ReactNode;
}

export const Page = forwardRef<HTMLDivElement, PageProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <Flex
        ref={ref}
        direction="col"
        className={twMerge('min-h-screen w-full', className)}
        {...props}
      >
        {children}
      </Flex>
    );
  }
);

Page.displayName = 'Page';
