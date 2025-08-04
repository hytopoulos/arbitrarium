import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { 
  GraphNode, 
  GraphLink, 
  GraphProps, 
  GraphEventHandlers,
  D3Simulation
} from '../../types/graph';
import { useGraphSimulation } from 'components/graph/hooks/useGraphSimulation';
import { useGraphZoom } from 'components/graph/hooks/useGraphZoom';
import { GraphNodes } from 'components/graph/nodes/GraphNodes';
import { GraphLinks } from 'components/graph/links/GraphLinks';
import { GraphControls } from 'components/graph/controls/GraphControls';
import { useGraphDimensions } from 'components/graph/hooks/useGraphDimensions';
import './Graph.css';

// Import D3 modules that might be needed for tree-shaking
import 'd3-selection';
import 'd3-zoom';
import 'd3-drag';
import 'd3-force';
import 'd3-scale';
import 'd3-array';



/**
 * Main Graph component that renders a force-directed graph using D3
 */
const Graph: React.FC<GraphProps> = ({
  width = '100%',
  height = '100%',
  nodes = [],
  links = [],
  onNodeClick,
  onNodeHover,
  onNodeDrag,
  onNodeDragEnd,
  onLinkClick,
  onZoom,
  onSimulationTick,
  simulationConfig,
  className = '',
}) => {
  // Refs
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<SVGGElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  
  // Get dimensions from the container
  const dimensions = useGraphDimensions(svgRef);
  
  // Initialize simulation
  const { 
    simulation, 
    nodes: simulationNodes, 
    isRunning,
    pauseSimulation,
    resumeSimulation
  } = useGraphSimulation(nodes, links, dimensions);
  
  // Toggle simulation pause/play
  const togglePause = useCallback(() => {
    if (isPaused) {
      resumeSimulation();
    } else {
      pauseSimulation();
    }
    setIsPaused(!isPaused);
  }, [isPaused, pauseSimulation, resumeSimulation]);
  
  // Initialize zoom behavior
  const { zoomIn, zoomOut, resetZoom } = useGraphZoom(svgRef, dimensions, (transform: d3.ZoomTransform) => {
    onZoom?.(transform);
  });
  
  // Combine event handlers
  const eventHandlers: GraphEventHandlers = useMemo(() => ({
    onNodeClick,
    onNodeHover,
    onNodeDrag,
    onNodeDragEnd,
    onLinkClick,
    onZoom
  }), [onNodeClick, onNodeHover, onNodeDrag, onNodeDragEnd, onLinkClick, onZoom]);
  
  // Call onSimulationTick when simulation updates
  useEffect(() => {
    if (simulation && onSimulationTick) {
      const tickHandler = () => onSimulationTick([...(simulation as D3Simulation).nodes()]);
      simulation.on('tick', tickHandler);
      return () => {
        simulation.on('tick', null);
      };
    }
  }, [simulation, onSimulationTick]);
  
  return (
    <div className={`graph-container ${className}`} style={{ width, height }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        className="graph-svg"
      >
        <g ref={containerRef} className="graph-content">
          <GraphLinks 
            links={links} 
            nodes={simulationNodes} 
            onLinkClick={onLinkClick} 
          />
          <GraphNodes 
            nodes={simulationNodes}
            onNodeClick={onNodeClick}
            onNodeHover={onNodeHover}
            onNodeDrag={onNodeDrag}
            onNodeDragEnd={onNodeDragEnd}
          />
        </g>
      </svg>
      <GraphControls
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetZoom={resetZoom}
        onPause={togglePause}
        isPaused={!isRunning}
      />
    </div>
  );
};

export default Graph;

// Default props
Graph.defaultProps = {
  width: '100%',
  height: '100%',
  className: '',
  simulationConfig: {
    chargeStrength: -100,
    linkDistance: 100,
    collisionRadius: 30,
  },
};
