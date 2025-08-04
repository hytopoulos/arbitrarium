import React, { useCallback, useState } from 'react';
import * as d3 from 'd3';
import { GraphNode, FrameElement } from '../../../types/graph';
import { GraphEventHandlers } from '../types';
import IOPin from './IOPin';

// Type for D3 drag event
interface D3DragEvent extends Event {
  sourceEvent: MouseEvent;
  active: number;
  x: number;
  y: number;
  on: (type: string, callback: (event: D3DragEvent) => void) => void;
}

interface GraphNodesProps extends Pick<GraphEventHandlers, 'onNodeClick' | 'onNodeHover' | 'onNodeDrag' | 'onNodeDragEnd'> {
  nodes: GraphNode[];
}

/**
 * Component that renders graph nodes and handles node interactions
 */
const GraphNodes: React.FC<GraphNodesProps> = ({
  nodes,
  onNodeClick,
  onNodeHover,
  onNodeDrag,
  onNodeDragEnd,
}) => {
  // Drag behavior for nodes
  const dragStarted = useCallback((event: any, node: GraphNode) => {
    if (!event.active) return;
    
    // Notify parent component
    onNodeDrag?.(node, { x: event.x || 0, y: event.y || 0 }, event.sourceEvent as React.MouseEvent);
    
    // Apply dragging behavior
    event.on('drag', (e: any) => {
      if (node) {
        node.x = e.x;
        node.y = e.y;
        node.fx = e.x;
        node.fy = e.y;
        
        // Notify parent component of drag
        onNodeDrag?.(node, { x: e.x || 0, y: e.y || 0 }, e.sourceEvent as React.MouseEvent);
      }
    });
    
    // Handle drag end
    event.on('end', (e: any) => {
      if (!event.active) return;
      
      // If this was a click (minimal movement), treat it as a click
      if (node && Math.hypot((e.x || 0) - (node.x || 0), (e.y || 0) - (node.y || 0)) < 5) {
        onNodeClick?.(node, e.sourceEvent as React.MouseEvent);
      }
      
      // Notify parent component of drag end
      onNodeDragEnd?.(node, e.sourceEvent as React.MouseEvent);
    });
  }, [onNodeClick, onNodeDrag, onNodeDragEnd]);

  // Track active pin for hover effects
  const [activePin, setActivePin] = useState<{nodeId: string, elementId: string} | null>(null);

  // Handle mouse enter/leave for hover effects
  const handleMouseEnter = useCallback((event: React.MouseEvent, node: GraphNode) => {
    onNodeHover?.(node, event);
  }, [onNodeHover]);

  const handleMouseLeave = useCallback((event: React.MouseEvent) => {
    onNodeHover?.(null, event);
  }, [onNodeHover]);

  // Handle pin hover
  const handlePinMouseEnter = useCallback((e: React.MouseEvent, element: FrameElement) => {
    e.stopPropagation();
    const node = nodes.find(n => n.frameElements?.some(fe => fe.id === element.id));
    if (node) {
      setActivePin({ nodeId: node.id, elementId: element.id });
    }
  }, [nodes]);

  const handlePinMouseLeave = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setActivePin(null);
  }, []);

  // Calculate pin positions around a node
  const calculatePinPositions = useCallback((node: GraphNode): Array<{x: number, y: number, element: FrameElement}> => {
    if (!node.frameElements || !node.frameElements.length) return [];
    
    const radius = node.radius || 20; // Default radius if not specified
    const angleStep = (2 * Math.PI) / node.frameElements.length;
    
    return node.frameElements.map((element, index) => {
      const angle = index * angleStep - Math.PI / 2; // Start from top
      return {
        x: Math.cos(angle) * (radius + 15), // 15px from node edge
        y: Math.sin(angle) * (radius + 15),
        element
      };
    });
  }, []);

  // Create a color scale for different node types
  const colorScale = d3.scaleOrdinal<string>()
    .domain(['node', 'frame', 'element'])
    .range(['#4f46e5', '#10b981', '#f59e0b']);

  return (
    <g className="graph-nodes">
      {nodes.map((node) => {
        if (node.x === undefined || node.y === undefined) return null;
        
        const pinPositions = calculatePinPositions(node);
        
        return (
          <g
            key={node.id}
            className={`node ${node.type || 'node'}`}
            transform={`translate(${node.x},${node.y})`}
            onMouseEnter={(e) => handleMouseEnter(e as React.MouseEvent, node)}
            onMouseLeave={handleMouseLeave as any}
            ref={(element) => {
              if (!element) return;
              
              // Apply D3 drag behavior
              const drag = d3.drag<SVGGElement, GraphNode>()
                .on('start', (event: any) => dragStarted(event, node));
              
              d3.select(element).call(drag as any);
            }}
          >
            {/* Render IO Pins if node has frame elements */}
            {pinPositions.map(({ x, y, element }: {x: number, y: number, element: FrameElement}, index: number) => (
              <IOPin
                key={`${node.id}-pin-${index}`}
                x={x}
                y={y}
                element={element}
                isActive={activePin?.nodeId === node.id && activePin?.elementId === element.id}
                onMouseEnter={handlePinMouseEnter}
                onMouseLeave={handlePinMouseLeave}
                onMouseDown={(e) => e.stopPropagation()}
              />
            ))}
            
            {/* Node circle */}
            <circle
              r={10}
              fill={colorScale(node.type || 'node')}
              stroke="#fff"
              strokeWidth={2}
              className="node-circle"
            />
            
            {/* Node label */}
            <text
              x={15}
              y={5}
              className="text-xs font-medium fill-gray-800 pointer-events-none"
            >
              {node.label}
            </text>
            
            {/* Node type indicator */}
            {node.type && (
              <text
                x={15}
                y={20}
                className="text-[10px] fill-gray-500 pointer-events-none"
              >
                {node.type}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
};

export { GraphNodes };
