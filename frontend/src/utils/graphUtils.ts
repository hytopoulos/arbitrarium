import { Environment, Entity } from '../types';
import { GraphNode, GraphLink } from '../types/graph';

// Local type definitions for frame elements and relationships
interface LocalFrameElement {
  id: string;
  name: string;
  type: string;
  role: string;
  properties?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

interface Frame {
  id: number;
  name: string;
  description?: string;
  elements?: LocalFrameElement[];
  created_at: string;
  updated_at: string;
  environment_id: number;
}

interface Relationship {
  id: number;
  source_entity: number;
  target_entity: number;
  relationship_type: string;
  properties?: Record<string, any>;
  created_at: string;
  updated_at: string;
  environment_id: number;
}

/**
 * Transforms environment data into nodes and links for the graph
 */
export const transformEnvironmentToGraphData = (
  environment: Environment
): { nodes: GraphNode[]; links: GraphLink[] } => {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const nodeMap = new Map<string, GraphNode>();

  // Add frames as nodes
  const frames = (environment as any).frames as Frame[] | undefined;
  const entities = (environment as any).entities as Entity[] | undefined;
  const relationships = (environment as any).relationships as Relationship[] | undefined;

  frames?.forEach((frame: Frame) => {
    const node: GraphNode = {
      id: `frame-${frame.id}`,
      label: frame.name,
      entity: frame,
      type: 'frame',
      frameElements: frame.elements?.map((elem) => ({
        id: `element-${elem.id}`,
        name: elem.name || `Element ${elem.id}`,
        type: elem.type || 'element',
        role: elem.role || 'element',
        properties: elem.properties,
        created_at: elem.created_at,
        updated_at: elem.updated_at
      }))
    };
    nodes.push(node);
    nodeMap.set(`frame-${frame.id}`, node);
  });

  // Add entities as nodes
  entities?.forEach((entity: Entity) => {
    const node: GraphNode = {
      id: `entity-${entity.id}`,
      label: entity.name || `Entity ${entity.id}`,
      entity: entity,
      type: 'node'
    };
    nodes.push(node);
    nodeMap.set(`entity-${entity.id}`, node);
  });

  // Add relationships as links
  relationships?.forEach((rel: Relationship) => {
    const source = nodeMap.get(`entity-${rel.source_entity}`);
    const target = nodeMap.get(`entity-${rel.target_entity}`);
    
    if (source && target) {
      links.push({
        source: source.id,
        target: target.id,
        type: rel.relationship_type,
        label: rel.relationship_type
      });
    }
  });

  return { nodes, links };
};

/**
 * Handles frame element assignment
 */
export const handleFrameElementAssignment = async (
  assignment: { frameId: string; elementId: string; role?: string },
  currentEnv: Environment | null,
  onSuccess?: (updatedEnv: Environment) => void
) => {
  if (!currentEnv) return;
  
  try {
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/frame-elements/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': document.cookie.match(/\bcsrftoken=([^;]*)/)?.[1] || '',
      },
      body: JSON.stringify({
        frame: assignment.frameId,
        element: assignment.elementId,
        role: assignment.role || 'element',
        environment: currentEnv.id
      }),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to assign frame element');
    }

    // Create a new environment object with the updated frame elements
    const updatedEnv = { ...currentEnv };
    const frames = (updatedEnv as any).frames as Frame[] | undefined;
    const entities = (updatedEnv as any).entities as Entity[] | undefined;
    
    const frame = frames?.find((f: Frame) => f.id.toString() === assignment.frameId);
    if (frame) {
      const element = entities?.find((e: Entity) => e.id.toString() === assignment.elementId);
      if (element) {
        frame.elements = frame.elements || [];
        frame.elements.push({
          id: assignment.elementId.toString(),
          name: element.name || `Element ${assignment.elementId}`,
          type: 'entity',
          role: assignment.role || 'element',
          properties: element.properties,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    }

    onSuccess?.(updatedEnv);
    return updatedEnv;
  } catch (error) {
    console.error('Error assigning frame element:', error);
    throw error;
  }
};
