import { FC, RefObject } from 'react';
import * as d3 from 'd3';

declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

// D3 Simulation type
export type D3Simulation = d3.Simulation<GraphNode, GraphLink> & {
  nodes(): GraphNode[];
  force(name: string, force: any): D3Simulation;
  alpha(alpha: number): D3Simulation;
  alphaTarget(alpha: number): D3Simulation;
  alphaMin(alpha: number): D3Simulation;
  alphaDecay(rate: number): D3Simulation;
  velocityDecay(rate: number): D3Simulation;
  find(x: number, y: number, radius: number): GraphNode | undefined;
  on(typenames: string, listener: (this: D3Simulation, ...args: any[]) => void): D3Simulation;
  restart(): D3Simulation;
  stop(): D3Simulation;
  tick(): void;
};

// Graph types
export interface FrameElement {
  id: string;
  name: string;
  type: string;
  // Add other frame element properties as needed
  [key: string]: any;
}

export interface GraphNode {
  id: string;
  label: string;
  entity: any; // You might want to replace 'any' with a more specific type
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  relatedTo?: string | number;
  type?: 'node' | 'frame' | 'element';
  frameElements?: FrameElement[]; // For nodes that have IO pins
  radius?: number; // For pin positioning
  [key: string]: any; // Allow additional properties
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type?: string;
  [key: string]: any; // Allow additional properties
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface GraphDimensions {
  width: number;
  height: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface GraphEventHandlers {
  onNodeClick?: (node: GraphNode, event: React.MouseEvent) => void;
  onNodeHover?: (node: GraphNode | null, event: React.MouseEvent) => void;
  onNodeDrag?: (node: GraphNode, position: Position, event: React.MouseEvent) => void;
  onNodeDragEnd?: (node: GraphNode, event: React.MouseEvent) => void;
  onLinkClick?: (link: GraphLink, event: React.MouseEvent) => void;
  onZoom?: (transform: d3.ZoomTransform) => void;
}

export interface SimulationConfig {
  chargeStrength?: number;
  linkDistance?: number;
  collisionRadius?: number;
  width?: number;
  height?: number;
  centerX?: number;
  centerY?: number;
}

export interface GraphProps extends Partial<GraphEventHandlers> {
  nodes?: GraphNode[];
  links?: GraphLink[];
  width?: number | string;
  height?: number | string;
  className?: string;
  simulationConfig?: SimulationConfig;
  onDataLoad?: (data: GraphData) => void;
  onSimulationTick?: (nodes: GraphNode[]) => void;
}

// Component declarations
declare module 'components/graph/nodes/GraphNodes' {
  import { FC } from 'react';
  import { GraphNode, GraphEventHandlers } from 'types/graph';
  
  interface GraphNodesProps extends Pick<GraphEventHandlers, 'onNodeClick' | 'onNodeHover' | 'onNodeDrag' | 'onNodeDragEnd'> {
    nodes: GraphNode[];
  }
  
  const GraphNodes: FC<GraphNodesProps>;
  export default GraphNodes;
}

declare module 'components/graph/links/GraphLinks' {
  import { FC } from 'react';
  import { GraphLink, GraphNode } from 'types/graph';
  
  interface GraphLinksProps {
    links: GraphLink[];
    nodes: GraphNode[];
    onLinkClick?: (link: GraphLink, event: React.MouseEvent) => void;
  }
  
  const GraphLinks: FC<GraphLinksProps>;
  export default GraphLinks;
}

declare module 'components/graph/controls/GraphControls' {
  import { FC } from 'react';
  
  interface GraphControlsProps {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onResetZoom: () => void;
    onPause: () => void;
    isPaused: boolean;
  }
  
  const GraphControls: FC<GraphControlsProps>;
  export default GraphControls;
}

declare module 'components/graph/hooks/useGraphDimensions' {
  import { RefObject } from 'react';
  import { GraphDimensions } from 'types/graph';
  
  const useGraphDimensions: <T extends HTMLElement | SVGSVGElement>(
    ref: RefObject<T>
  ) => GraphDimensions;
  
  export default useGraphDimensions;
}

declare module 'components/graph/hooks/useGraphSimulation' {
  import { GraphNode, GraphLink, SimulationConfig } from 'types/graph';
  
  interface UseGraphSimulationReturn {
    simulation: any; // Replace with proper D3 simulation type if needed
    nodes: GraphNode[];
    isRunning: boolean;
    pauseSimulation: () => void;
    resumeSimulation: () => void;
  }
  
  const useGraphSimulation: (
    nodes: GraphNode[],
    links: GraphLink[],
    config?: SimulationConfig
  ) => UseGraphSimulationReturn;
  
  export default useGraphSimulation;
}

declare module 'components/graph/hooks/useGraphZoom' {
  import { RefObject } from 'react';
  import { GraphDimensions } from 'types/graph';
  
  interface UseGraphZoomReturn {
    zoomIn: () => void;
    zoomOut: () => void;
    resetZoom: () => void;
  }
  
  type ZoomHandler = (transform: d3.ZoomTransform) => void;
  
  const useGraphZoom: (
    svgRef: RefObject<SVGSVGElement>,
    dimensions: GraphDimensions,
    onZoom?: ZoomHandler
  ) => UseGraphZoomReturn;
  
  export default useGraphZoom;
}
