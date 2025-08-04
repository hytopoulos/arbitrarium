import { useCallback, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { GraphDimensions } from '../types';

/**
 * Hook to manage zoom and pan behavior for the graph
 */
export const useGraphZoom = (
  svgRef: React.RefObject<SVGSVGElement>,
  dimensions: GraphDimensions,
  onZoom?: (transform: d3.ZoomTransform) => void
) => {
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown>>();
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);

  // Initialize zoom behavior
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current);
    
    // Create zoom behavior
    zoomRef.current = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        const { transform } = event;
        transformRef.current = transform;
        
        // Apply transform to the group containing the graph
        svg.select<SVGGElement>('.graph-content')
          .attr('transform', transform.toString());
        
        // Call the onZoom callback if provided
        onZoom?.(transform);
      });

    // Apply zoom behavior to the SVG
    svg.call(zoomRef.current);

    // Clean up
    return () => {
      svg.on('.zoom', null);
    };
  }, [dimensions, onZoom, svgRef]);

  // Reset zoom to initial state
  const resetZoom = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    
    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current);
    const { width, height } = dimensions;
    
    // Calculate the scale to fit the graph in the viewport
    const scale = 0.9 / Math.max(1, width / dimensions.width, height / dimensions.height);
    const x = (dimensions.width - width * scale) / 2;
    const y = (dimensions.height - height * scale) / 2;
    
    // Apply the transform
    const transform = d3.zoomIdentity
      .translate(x, y)
      .scale(scale);
    
    svg.transition()
      .duration(750)
      .call(zoomRef.current!.transform, transform);
  }, [dimensions, svgRef]);

  // Zoom in/out
  const zoomIn = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    
    d3.select<SVGSVGElement, unknown>(svgRef.current)
      .transition()
      .duration(300)
      .call(zoomRef.current.scaleBy, 1.2);
  }, [svgRef]);

  const zoomOut = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    
    d3.select<SVGSVGElement, unknown>(svgRef.current)
      .transition()
      .duration(300)
      .call(zoomRef.current.scaleBy, 0.8);
  }, [svgRef]);

  // Pan to a specific point
  const panTo = useCallback((x: number, y: number, duration = 1000) => {
    if (!svgRef.current || !zoomRef.current) return;
    
    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current);
    const { width, height } = dimensions;
    const [tx, ty, scale] = [
      -x * transformRef.current.k + width / 2,
      -y * transformRef.current.k + height / 2,
      transformRef.current.k
    ];
    
    const transform = d3.zoomIdentity
      .translate(tx, ty)
      .scale(scale);
    
    svg.transition()
      .duration(duration)
      .call(zoomRef.current!.transform, transform);
  }, [dimensions, svgRef]);

  return {
    transform: transformRef.current,
    resetZoom,
    zoomIn,
    zoomOut,
    panTo,
  };
};
