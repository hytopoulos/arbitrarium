import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { Environment, Entity } from '../../api/types';
import Graph from './Graph';
import { GraphNode, GraphLink } from './types';
import { useQuery } from 'react-query';
import { api } from '../../api/config';

interface FrameElementAssignment {
  frameId: string;
  elementId: string;
  role?: string;
}

interface GraphViewProps {
  environment?: Environment[];
  onEntitySelect?: (entity: Entity | null) => void;
  onFrameElementAssign?: (assignment: FrameElementAssignment) => Promise<void>;
  className?: string;
}

/**
 * GraphView component that renders the graph visualization
 * Replaces the old GraphViewD3 implementation with the new modular approach
 */
const GraphView: React.FC<GraphViewProps> = ({
  environment,
  onEntitySelect,
  onFrameElementAssign,
  className = '',
}) => {
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  
  // Fetch entities data
  const { data: entities = [], isLoading, error } = useQuery<Entity[]>(
    ['graph-entities', environment],
    async () => {
      if (!environment?.[0]?.id) {
        return [];
      }
      
      const response = await api.get(`/env/${environment[0].id}/`);
      const data = await response.json();
      return data.entities;
    },
    {
      enabled: !!environment?.[0]?.id,
    }
  );

  // Process nodes from entities
  const nodes: GraphNode[] = useMemo(() => {
    return entities.map((entity: Entity) => ({
      id: `entity-${entity.id}`,
      label: entity.name || `Entity ${entity.id}`,
      entity,
      type: 'node',
    }));
  }, [entities]);

  // Process links between entities
  const links: GraphLink[] = useMemo(() => {
    const result: GraphLink[] = [];
    
    entities.forEach((entity: Entity) => {
      // Add relationships as links
      if (entity.relationships) {
        entity.relationships.forEach((rel: { target_id: string; relationship_type?: string }) => {
          result.push({
            source: `entity-${entity.id}`,
            target: `entity-${rel.target_id}`,
            type: rel.relationship_type || 'related',
          });
        });
      }
      
      // Add frame-element relationships
      if (entity.frame_elements) {
        entity.frame_elements.forEach((fe: { frame_id: string }) => {
          result.push({
            source: `entity-${entity.id}`,
            target: `frame-${fe.frame_id}`,
            type: 'frame-element',
          });
        });
      }
    });
    
    return result;
  }, [entities]);

  // Handle node click
  const handleNodeClick = useCallback((node: GraphNode, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedEntity(node.entity);
    onEntitySelect?.(node.entity);
  }, [onEntitySelect]);

  // Handle background click
  const handleBackgroundClick = useCallback(() => {
    setSelectedEntity(null);
    onEntitySelect?.(null);
  }, [onEntitySelect]);

  // Handle link click
  const handleLinkClick = useCallback((link: GraphLink, event: React.MouseEvent) => {
    event.stopPropagation();
    // Handle link click if needed
  }, []);

  // Handle node drag end
  const handleNodeDragEnd = useCallback((node: GraphNode, event: React.MouseEvent) => {
    // Handle node drag end if needed
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full text-red-500">
        Error loading graph data: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  // Show empty state
  if (!nodes.length) {
    return (
      <div className="flex items-center justify-center w-full h-full text-gray-500">
        No data available for the selected environment
      </div>
    );
  }

  return (
    <div className={`graph-view-container ${className}`} onClick={handleBackgroundClick}>
      <Graph
        nodes={nodes}
        links={links}
        onNodeClick={handleNodeClick}
        onNodeDragEnd={handleNodeDragEnd}
        onLinkClick={handleLinkClick}
        simulationConfig={{
          chargeStrength: -100,
          linkDistance: 100,
          collisionRadius: 30,
        }}
      />
    </div>
  );
};

export default GraphView;
