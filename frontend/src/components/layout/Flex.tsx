import React, { forwardRef } from 'react';
import { Box, BoxProps } from './Box';
import { twMerge } from 'tailwind-merge';

type FlexDirection = 'row' | 'col' | 'row-reverse' | 'col-reverse';
type FlexWrap = 'nowrap' | 'wrap' | 'wrap-reverse';
type JustifyContent = 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly';
type AlignItems = 'start' | 'end' | 'center' | 'baseline' | 'stretch';

export interface FlexProps extends BoxProps {
  direction?: FlexDirection;
  wrap?: FlexWrap;
  justify?: JustifyContent;
  align?: AlignItems;
  className?: string;
  children?: React.ReactNode;
}

export const Flex = forwardRef<HTMLDivElement, FlexProps>(
  ({
    as = 'div',
    direction = 'row',
    wrap = 'nowrap',
    justify = 'start',
    align = 'stretch',
    className = '',
    children,
    ...props
  }, ref) => {
    const directionClasses = {
      'row': 'flex-row',
      'col': 'flex-col',
      'row-reverse': 'flex-row-reverse',
      'col-reverse': 'flex-col-reverse',
    };

    const wrapClasses = {
      'nowrap': 'flex-nowrap',
      'wrap': 'flex-wrap',
      'wrap-reverse': 'flex-wrap-reverse',
    };

    const justifyClasses = {
      'start': 'justify-start',
      'end': 'justify-end',
      'center': 'justify-center',
      'between': 'justify-between',
      'around': 'justify-around',
      'evenly': 'justify-evenly',
    };

    const alignClasses = {
      'start': 'items-start',
      'end': 'items-end',
      'center': 'items-center',
      'baseline': 'items-baseline',
      'stretch': 'items-stretch',
    };

    const flexClasses = [
      'flex',
      directionClasses[direction],
      wrapClasses[wrap],
      justifyClasses[justify],
      alignClasses[align],
    ];

    return (
      <Box
        as={as}
        ref={ref}
        className={twMerge(flexClasses.join(' '), className)}
        {...props}
      >
        {children}
      </Box>
    );
  }
);

Flex.displayName = 'Flex';
