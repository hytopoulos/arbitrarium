import React, { useMemo } from 'react';
import * as d3 from 'd3';
import { GraphLink, GraphNode } from '../types';

interface GraphLinksProps {
  links: GraphLink[];
  nodes: GraphNode[];
  onLinkClick?: (link: GraphLink, event: React.MouseEvent) => void;
}

/**
 * Component that renders the links between graph nodes
 */
const GraphLinks: React.FC<GraphLinksProps> = ({ 
  links, 
  nodes,
  onLinkClick,
}) => {
  // Create a map of node IDs to their positions for quick lookup
  const nodeMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    nodes.forEach(node => {
      if (node.x !== undefined && node.y !== undefined) {
        map.set(node.id, { x: node.x, y: node.y });
      }
    });
    return map;
  }, [nodes]);

  // Create a color scale for different link types
  const colorScale = useMemo(() => {
    return d3.scaleOrdinal<string>()
      .domain(['default', 'hierarchy', 'reference', 'dependency'])
      .range(['#9ca3af', '#6b7280', '#4b5563', '#374151']);
  }, []);

  // Process links to include source and target positions
  const processedLinks = useMemo(() => {
    return links
      .map(link => {
        const source = typeof link.source === 'string' ? link.source : link.source.id;
        const target = typeof link.target === 'string' ? link.target : link.target.id;
        
        const sourceNode = nodeMap.get(source);
        const targetNode = nodeMap.get(target);
        
        if (!sourceNode || !targetNode) return null;
        
        return {
          ...link,
          source: source,
          target: target,
          sourceX: sourceNode.x,
          sourceY: sourceNode.y,
          targetX: targetNode.x,
          targetY: targetNode.y,
        };
      })
      .filter(Boolean) as Array<GraphLink & {
        source: string;
        target: string;
        sourceX: number;
        sourceY: number;
        targetX: number;
        targetY: number;
      }>;
  }, [links, nodeMap]);

  // Handle link click
  const handleLinkClick = (link: GraphLink, event: React.MouseEvent) => {
    event.stopPropagation();
    onLinkClick?.(link, event);
  };

  return (
    <g className="graph-links">
      {processedLinks.map((link, index) => (
        <g 
          key={`${link.source}-${link.target}-${index}`}
          className="link-group"
          onClick={(e) => handleLinkClick(link, e)}
          style={{ cursor: 'pointer' }}
        >
          {/* Main link line */}
          <line
            x1={link.sourceX}
            y1={link.sourceY}
            x2={link.targetX}
            y2={link.targetY}
            stroke={colorScale(link.type || 'default')}
            strokeWidth={1.5}
            strokeOpacity={0.6}
            strokeDasharray={link.type === 'hierarchy' ? '5,5' : 'none'}
            className="link-line"
          />
          
          {/* Arrow marker at target (optional) */}
          <defs>
            <marker
              id={`arrow-${index}`}
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon 
                points="0 0, 10 3.5, 0 7" 
                fill={colorScale(link.type || 'default')}
              />
            </marker>
          </defs>
          
          {/* Invisible hit area for better interaction */}
          <line
            x1={link.sourceX}
            y1={link.sourceY}
            x2={link.targetX}
            y2={link.targetY}
            stroke="transparent"
            strokeWidth="10"
            className="link-hit-area"
          />
          
          {/* Link label (if any) */}
          {link.type && (
            <text
              x={(link.sourceX + link.targetX) / 2}
              y={(link.sourceY + link.targetY) / 2 - 5}
              textAnchor="middle"
              className="text-[10px] fill-gray-600 pointer-events-none"
            >
              {link.label || link.type}
            </text>
          )}
        </g>
      ))}
    </g>
  );
};

export { GraphLinks };
