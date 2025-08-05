import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { Environment, Entity, Element } from '../../api/types';
import Graph from './Graph';
import { GraphNode, GraphLink } from './types';
import { useQuery } from 'react-query';
import { api } from '../../api/config';

interface GraphViewProps {
  environment?: Environment[];
  onEntitySelect?: (entity: Entity | null) => void;
  className?: string;
}

/**
 * GraphView component that renders the graph visualization
 * Replaces the old GraphViewD3 implementation with the new modular approach
 */
const GraphView: React.FC<GraphViewProps> = ({
  environment,
  onEntitySelect,
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
      
      const response = await api.get(`/ent/?env=${environment[0].id}`);
      const data = await response.json();
      return data;
    },
    {
      enabled: !!environment?.[0]?.id,
    }
  );

  // Process nodes from entities
  const nodes: GraphNode[] = useMemo(() =>
    entities.map((e: Entity) => {
      const id = e.id;
      const primaryFrame = e.primary_frame;
      if (!primaryFrame) {
        console.log(`Entity ${e.name} has no primary frame.`);
      }

      return {
        id: `entity-${id}`,
        label: e.name ?? `Entity ${id}`,
        entity: e,
        type: 'node',
        frameElements: primaryFrame?.elements?.map((f: Element) => ({
          id: `element-${f.id}`,
          label: f.name ?? `Element ${f.id}`,
          element: f,
          type: 'element',
        })) || [],
      };
    }),
    [entities]
  );

  const links: GraphLink[] = useMemo(() => {
    return entities.flatMap((e: Entity) => {
      const primaryFrame = e.primary_frame;
      if (!primaryFrame) {
        console.log(`Entity ${e.name} has no primary frame.`);
        return [];
      }

      const links: GraphLink[] = [];
      for (const element of primaryFrame.elements) {
        if (element.value) {
          links.push({
            source: `entity-${e.id}`,
            target: `entity-${element.value}`,
            type: 'element',
          });
        }
      }
      return links;
    });
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
    <div
        className={`graph-view-container w-full h-full ${className}`}
        style={{ width: '100%', height: '100%' }}
        onClick={handleBackgroundClick}
      >
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
