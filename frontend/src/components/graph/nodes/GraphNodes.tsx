import React, { useCallback } from 'react';
import * as d3 from 'd3';
import { GraphNode } from '../types';
import { GraphEventHandlers } from '../types';

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

  // Handle mouse enter/leave for hover effects
  const handleMouseEnter = useCallback((event: React.MouseEvent, node: GraphNode) => {
    onNodeHover?.(node, event);
  }, [onNodeHover]);

  const handleMouseLeave = useCallback((event: React.MouseEvent) => {
    onNodeHover?.(null, event);
  }, [onNodeHover]);

  // Create a color scale for different node types
  const colorScale = d3.scaleOrdinal<string>()
    .domain(['node', 'frame', 'element'])
    .range(['#4f46e5', '#10b981', '#f59e0b']);

  return (
    <g className="graph-nodes">
      {nodes.map((node) => {
        if (node.x === undefined || node.y === undefined) return null;
        
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
