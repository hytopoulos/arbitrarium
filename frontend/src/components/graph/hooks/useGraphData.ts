import { useCallback, useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { Environment } from '../../../api/types';
import { GraphNode, GraphLink } from '../types';
import { API_BASE_URL } from '../../../api/config';

interface UseGraphDataProps {
  environment?: Environment[];
  onDataLoad?: (data: { nodes: GraphNode[]; links: GraphLink[] }) => void;
}

/**
 * Hook to fetch and process graph data
 */
export const useGraphData = ({ environment, onDataLoad }: UseGraphDataProps) => {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch entities data
  const { data: entities = [], isLoading: isLoadingEntities } = useQuery<GraphNode[]>(
    ['graph-entities', environment],
    async () => {
      if (!environment?.[0]?.id) return [];
      
      const response = await fetch(`${API_BASE_URL}/api/entities/?environment_id=${environment[0].id}`);
      if (!response.ok) throw new Error('Failed to fetch entities');
      const data = await response.json();
      
      return data.map((entity: any) => ({
        id: `entity-${entity.id}`,
        label: entity.name || `Entity ${entity.id}`,
        entity,
        type: 'node',
      }));
    },
    {
      enabled: !!environment?.[0]?.id,
      onError: (err) => setError(err as Error),
    }
  );

  // Process data when entities are loaded
  useEffect(() => {
    if (isLoadingEntities || !entities.length) return;
    
    const processData = async () => {
      try {
        setIsLoading(true);
        
        // Process nodes
        const processedNodes: GraphNode[] = [...entities];
        
        // Process links (example: relationships between entities)
        const processedLinks: GraphLink[] = [];
        
        // Add relationships as links
        entities.forEach((entity: any) => {
          if (entity.relationships) {
            entity.relationships.forEach((rel: any) => {
              processedLinks.push({
                source: `entity-${entity.id}`,
                target: `entity-${rel.target_id}`,
                type: rel.relationship_type,
              });
            });
          }
        });
        
        setNodes(processedNodes);
        setLinks(processedLinks);
        onDataLoad?.({ nodes: processedNodes, links: processedLinks });
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };
    
    processData();
  }, [entities, isLoadingEntities, onDataLoad]);

  // Add a node to the graph
  const addNode = useCallback((node: Omit<GraphNode, 'id' | 'x' | 'y' | 'vx' | 'vy' | 'index' | 'fx' | 'fy'>) => {
    // Ensure required properties are provided or have defaults
    const newNode: GraphNode = {
      // Required properties with defaults if not provided
      label: node.label || `Node ${Date.now()}`,
      entity: node.entity || { id: `entity-${Date.now()}` },
      // Spread the rest of the node properties
      ...node,
      // Ensure these properties are set correctly
      id: node.id || `node-${Date.now()}`,
      x: node.x || Math.random() * 100,
      y: node.y || Math.random() * 100,
    };
    
    setNodes(prev => [...prev, newNode]);
    return newNode;
  }, []);

  // Add a link between nodes
  const addLink = useCallback((source: string | GraphNode, target: string | GraphNode, type?: string) => {
    const sourceId = typeof source === 'string' ? source : source.id;
    const targetId = typeof target === 'string' ? target : target.id;
    
    // Check if link already exists
    const linkExists = links.some(
      link => (link.source === sourceId && link.target === targetId) || 
              (link.source === targetId && link.target === sourceId)
    );
    
    if (linkExists) return null;
    
    const newLink: GraphLink = {
      source: sourceId,
      target: targetId,
      type,
    };
    
    setLinks(prev => [...prev, newLink]);
    return newLink;
  }, [links]);

  // Update a node
  const updateNode = useCallback((nodeId: string, updates: Partial<GraphNode>) => {
    setNodes(prev => 
      prev.map(node => 
        node.id === nodeId ? { ...node, ...updates } : node
      )
    );
  }, []);

  // Remove a node and its links
  const removeNode = useCallback((nodeId: string) => {
    setNodes(prev => prev.filter(node => node.id !== nodeId));
    setLinks(prev => prev.filter(
      link => link.source !== nodeId && link.target !== nodeId
    ));
  }, []);

  // Remove a link
  const removeLink = useCallback((source: string, target: string) => {
    setLinks(prev => 
      prev.filter(link => 
        !(link.source === source && link.target === target) &&
        !(link.source === target && link.target === source)
      )
    );
  }, []);

  return {
    nodes,
    links,
    isLoading: isLoading || isLoadingEntities,
    error,
    addNode,
    addLink,
    updateNode,
    removeNode,
    removeLink,
  };
};
