// Type definitions for cytoscape and related modules
declare module 'cytoscape' {
  // Extend the cytoscape module to include the use method
  const cytoscape: {
    (options?: any): Core;
    use(extension: any): void;
  };
  
  export = cytoscape;
  
  // Add collection method to Core interface
  interface Core {
    collection: (elements: string | ElementCollection) => ElementCollection;
    
    // Core methods
    mount: (container: HTMLElement | string) => Core;
    unmount: () => Core;
    destroy: () => void;
    
    // Graph manipulation
    add: (elements: any) => Core;
    remove: (elements: any) => Core;
    elements: (selector?: string) => any;
    nodes: (selector?: string) => any;
    edges: (selector?: string) => any;
    
    // Layout
    layout: (options: any) => any;
    
    // Events
    on: (events: string, selector: string, handler: (event: any) => void) => Core;
    on: (events: string, handler: (event: any) => void) => Core;
    off: (events: string, selector?: string, handler?: (event: any) => void) => Core;
    one: (events: string, selector: string, handler: (event: any) => void) => Core;
    one: (events: string, handler: (event: any) => void) => Core;
    
    // Viewport manipulation
    fit: (options?: any) => Core;
    center: (elements?: any) => Core;
    zoom: (options?: any) => number;
    
    // Other commonly used methods
    stop: () => Core;
    id: () => string;
  }

  interface ElementDefinition {
    group?: 'nodes' | 'edges';
    data: {
      id: string;
      source?: string;
      target?: string;
      [key: string]: any;
    };
    position?: {
      x: number;
      y: number;
    };
    classes?: string | string[];
    selected?: boolean;
    selectable?: boolean;
    locked?: boolean;
    grabbable?: boolean;
    pannable?: boolean;
  }

  interface NodeSingular extends Core {
    id: () => string;
    position: () => { x: number; y: number };
    data: (key?: string) => any;
    isNode: () => boolean;
    isEdge: () => boolean;
    isLoop: () => boolean;
    isSimple: () => boolean;
  }

  interface EdgeSingular extends Core {
    id: () => string;
    source: () => NodeSingular;
    target: () => NodeSingular;
    isEdge: () => boolean;
    isNode: () => boolean;
    isLoop: () => boolean;
    isSimple: () => boolean;
  }

  interface EventObject {
    type: string;
    target: any;
    cy: Core;
    namespace: string;
    timeStamp: number;
    originalEvent?: Event;
    position?: { x: number; y: number };
    renderedPosition?: { x: number; y: number };
  }

  interface LayoutOptions {
    name: string;
    animate?: boolean;
    animationDuration?: number;
    animationEasing?: string;
    [key: string]: any;
  }

  // Extend the global Window interface to include cytoscape
  interface Window {
    cytoscape: (options?: any) => Core;
  }

  // The main cytoscape function
  function cytoscape(options?: any): Core;
  
  // Export types
  export = cytoscape;
  export as namespace cytoscape;
  
  // Export interfaces
  export type { Core, ElementDefinition, NodeSingular, EdgeSingular, EventObject, LayoutOptions };
}

declare module 'react-cytoscapejs' {
  import { Core, ElementDefinition, LayoutOptions } from 'cytoscape';
  import { ComponentType, CSSProperties } from 'react';

  interface Stylesheet {
    selector: string;
    style: {
      [key: string]: string | number | CSSProperties | ((value: any) => string | number);
    };
  }

  interface CytoscapeComponentProps {
    elements: ElementDefinition[];
    style?: CSSProperties;
    stylesheet?: Stylesheet[] | any[];
    layout?: LayoutOptions;
    cy?: (cy: Core) => void;
    className?: string;
    id?: string;
    key?: string | number;
    wheelSensitivity?: number;
    minZoom?: number;
    maxZoom?: number;
    zoom?: number;
    pan?: { x: number; y: number };
    panningEnabled?: boolean;
    userPanningEnabled?: boolean;
    boxSelectionEnabled?: boolean;
    selectionType?: 'additive' | 'single';
    touchTapThreshold?: number;
    desktopTapThreshold?: number;
    autolock?: boolean;
    autoungrabify?: boolean;
    autounselectify?: boolean;
    motionBlur?: boolean;
    motionBlurOpacity?: number;
    wheelSensitivity?: number;
    pixelRatio?: number | 'auto';
    headless?: boolean;
    styleEnabled?: boolean;
    hideEdgesOnViewport?: boolean;
    hideLabelsOnViewport?: boolean;
    textureOnViewport?: boolean;
    motionBlurOnViewport?: boolean;
    motionBlurOpacityOnViewport?: number;
    motionBlurOpacityOffViewport?: number;
    motionBlurTransparency?: number;
    motionBlurTransparencyOnViewport?: number;
    motionBlurTransparencyOffViewport?: number;
    motionBlurDecel?: number;
    motionBlurFps?: number;
    motionBlurFrames?: number;
    motionBlurParticles?: number;
    motionBlurParticleSpeedRatio?: number;
    motionBlurParticleDecel?: number;
    motionBlurParticleFps?: number;
    motionBlurParticleFrames?: number;
    motionBlurParticleOpacity?: number;
    motionBlurParticleSize?: number;
    motionBlurParticleSpeedDecay?: number;
    motionBlurParticleSpeedMin?: number;
    motionBlurParticleSpeedMax?: number;
    motionBlurParticleSpeedThreshold?: number;
    motionBlurParticleSpeedThresholdRatio?: number;
    motionBlurParticleSpeedThresholdMin?: number;
    motionBlurParticleSpeedThresholdMax?: number;
    motionBlurParticleSpeedThresholdRatioMin?: number;
    motionBlurParticleSpeedThresholdRatioMax?: number;
    motionBlurParticleSpeedThresholdRatioThreshold?: number;
    motionBlurParticleSpeedThresholdRatioThresholdMin?: number;
    motionBlurParticleSpeedThresholdRatioThresholdMax?: number;
    motionBlurParticleSpeedThresholdRatioThresholdRatio?: number;
    motionBlurParticleSpeedThresholdRatioThresholdRatioMin?: number;
    motionBlurParticleSpeedThresholdRatioThresholdRatioMax?: number;
    motionBlurParticleSpeedThresholdRatioThresholdRatioThreshold?: number;
    motionBlurParticleSpeedThresholdRatioThresholdRatioThresholdMin?: number;
    motionBlurParticleSpeedThresholdRatioThresholdRatioThresholdMax?: number;
    motionBlurParticleSpeedThresholdRatioThresholdRatioThresholdRatio?: number;
  }

  const CytoscapeComponent: ComponentType<CytoscapeComponentProps>;
  
  export default CytoscapeComponent;
  export { CytoscapeComponent };
  export type { CytoscapeComponentProps };
}

declare module 'cytoscape-cose-bilkent' {
  import { Ext } from 'cytoscape';
  
  interface CoseBilkentLayoutOptions {
    name: 'cose-bilkent';
    animate?: boolean | 'end';
    animationDuration?: number;
    animationEasing?: string;
    randomize?: boolean;
    componentSpacing?: number;
    nodeRepulsion?: number;
    nodeOverlap?: number;
    edgeElasticity?: number;
    nestingFactor?: number;
    gravity?: number;
    numIter?: number;
    initialTemp?: number;
    coolingFactor?: number;
    minTemp?: number;
    nodeDimensionsIncludeLabels?: boolean;
    tilingPaddingVertical?: number;
    tilingPaddingHorizontal?: number;
    gravityRangeCompound?: number;
    gravityCompound?: number;
    gravityRange?: number;
    initialEnergyOnIncremental?: number;
    refresh?: number;
    fit?: boolean;
    padding?: number;
    boundingBox?: {
      x1: number;
      y1: number;
      w: number;
      h: number;
    };
    nodeRepulsion?: (node: any) => number;
    edgeElasticity?: (edge: any) => number;
    nestingFactor?: number;
    nodeDimensionsIncludeLabels?: boolean;
    tilingPaddingVertical?: number;
    tilingPaddingHorizontal?: number;
    gravityRangeCompound?: number;
    gravityCompound?: number;
    gravityRange?: number;
    initialEnergyOnIncremental?: number;
  }
  
  const coseBilkent: Ext;
  
  export = coseBilkent;
  export type { CoseBilkentLayoutOptions };
}
