import * as React from 'react';
import { Core, ElementDefinition, LayoutOptions, StylesheetStyle } from 'cytoscape';

declare module 'react-cytoscapejs' {
  export interface CytoscapeComponentProps {
    elements: ElementDefinition[];
    style?: React.CSSProperties;
    stylesheet?: StylesheetStyle[] | any;
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

  const CytoscapeComponent: React.ComponentType<CytoscapeComponentProps>;
  
  export default CytoscapeComponent;
  export { CytoscapeComponent };
  export type { CytoscapeComponentProps };
}
