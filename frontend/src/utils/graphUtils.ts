import { Environment, Entity, Frame } from '../api/types';
import { GraphNode, GraphLink } from '../components/graph/types';

/**
 * Transforms environment data into nodes and links for the graph
 */
export const transformEnvironmentToGraphData = (
  environment: Environment
): { nodes: GraphNode[]; links: GraphLink[] } => {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const nodeMap = new Map<string, GraphNode>();

  // Add entities as nodes
  const entities = (environment as any).entities as Entity[] | undefined;

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

  return { nodes, links };
};

/**
 * Handles frame element assignment
 */
export const handleFrameElementAssignment = async (
  assignment: { frameId: string; elementId: string; role?: string },
  currentEnv: Environment | null,
  onSuccess?: (x: any) => void
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

    onSuccess?.({});
    return;
  } catch (error) {
    console.error('Error assigning frame element:', error);
    throw error;
  }
};
