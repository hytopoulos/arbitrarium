import { Entity } from '../../../api/types';

/**
 * Base node type for the graph
 */
export interface GraphNode {
  id: string;
  label: string;
  entity: Entity;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  relatedTo?: string | number;
  type?: 'node' | 'frame' | 'element';
  [key: string]: any; // Allow additional properties
}

/**
 * Base link/edge type for the graph
 */
export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type?: string;
  [key: string]: any; // Allow additional properties
}

/**
 * Graph data structure
 */
export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

/**
 * Dimensions for the graph container
 */
export interface GraphDimensions {
  width: number;
  height: number;
}

/**
 * Position coordinates
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Event handlers for graph interactions
 */
export interface GraphEventHandlers {
  onNodeClick?: (node: GraphNode, event: React.MouseEvent) => void;
  onNodeHover?: (node: GraphNode | null, event: React.MouseEvent) => void;
  onNodeDrag?: (node: GraphNode, position: Position, event: React.MouseEvent) => void;
  onNodeDragEnd?: (node: GraphNode, event: React.MouseEvent) => void;
  onLinkClick?: (link: GraphLink, event: React.MouseEvent) => void;
  onZoom?: (transform: d3.ZoomTransform) => void;
}

/**
 * Configuration for the graph simulation
 */
export interface SimulationConfig {
  // Force simulation configuration
  chargeStrength?: number;
  linkDistance?: number;
  collisionRadius?: number;
  // Other simulation parameters
  [key: string]: any;
}

/**
 * Props for the main Graph component
 */
export interface GraphProps extends Partial<GraphEventHandlers> {
  // Data
  nodes?: GraphNode[];
  links?: GraphLink[];
  // Dimensions
  width?: number | string;
  height?: number | string;
  // Styling
  className?: string;
  // Configuration
  simulationConfig?: SimulationConfig;
  // Callbacks
  onDataLoad?: (data: GraphData) => void;
  onSimulationTick?: (nodes: GraphNode[]) => void;
}
