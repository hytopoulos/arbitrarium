import { useState, useEffect, RefObject } from 'react';
import { GraphDimensions } from '../types';

type ElementRef = HTMLElement | SVGSVGElement;

/**
 * Hook to manage graph container dimensions and handle resizing
 */
export const useGraphDimensions = (
  containerRef: RefObject<ElementRef>,
  initialDimensions: Partial<GraphDimensions> = {}
): GraphDimensions => {
  const [dimensions, setDimensions] = useState<GraphDimensions>({
    width: typeof initialDimensions.width === 'number' ? initialDimensions.width : 800,
    height: typeof initialDimensions.height === 'number' ? initialDimensions.height : 600,
  });

  // Update dimensions when container size changes
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (!containerRef.current) return;
      
      const { width, height } = containerRef.current.getBoundingClientRect();
      
      setDimensions({
        width: Math.max(width, 300), // Ensure minimum width
        height: Math.max(height, 300), // Ensure minimum height
      });
    };

    // Initial dimensions
    updateDimensions();

    // Create a ResizeObserver to handle container resizing
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);

    // Clean up
    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
      resizeObserver.disconnect();
    };
  }, [containerRef]);

  return dimensions;
};
