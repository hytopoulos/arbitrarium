import { useCallback, useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GraphNode, GraphLink, SimulationConfig } from '../types';

/**
 * Hook to manage D3 force simulation
 */
export const useGraphSimulation = (
  nodes: GraphNode[],
  links: GraphLink[],
  dimensions: { width: number; height: number },
  config: SimulationConfig = {}
) => {
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const [simulationNodes, setSimulationNodes] = useState<GraphNode[]>(nodes);
  const [isRunning, setIsRunning] = useState(false);

  // Initialize simulation
  useEffect(() => {
    if (!dimensions.width || !dimensions.height) return;

    // Create a new simulation if one doesn't exist
    if (!simulationRef.current) {
      simulationRef.current = d3
        .forceSimulation<GraphNode>(nodes)
        .force(
          'link',
          d3
            .forceLink<GraphNode, GraphLink>(links)
            .id((d) => d.id)
            .distance(config.linkDistance ?? 100)
        )
        .force('charge', d3.forceManyBody().strength(config.chargeStrength ?? -100))
        .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
        .force('collision', d3.forceCollide(config.collisionRadius ?? 30))
        .force('x', d3.forceX())
        .force('y', d3.forceY())
        .on('tick', () => {
          setSimulationNodes([...simulationRef.current?.nodes() || []]);
        });

      setIsRunning(true);
    }

    // Update simulation on config changes
    const simulation = simulationRef.current;
    simulation.nodes(nodes);
    simulation.force<d3.ForceLink<GraphNode, GraphLink>>('link')?.links(links);

    // Restart simulation with new data
    simulation.alpha(0.3).restart();

    return () => {
      simulation.stop();
    };
  }, [nodes, links, dimensions, config]);

  // Update simulation on config changes
  useEffect(() => {
    if (!simulationRef.current) return;

    const simulation = simulationRef.current;
    
    if (config.linkDistance !== undefined) {
      simulation.force<d3.ForceLink<GraphNode, GraphLink>>('link')?.distance(config.linkDistance);
    }
    
    if (config.chargeStrength !== undefined) {
      simulation.force('charge', d3.forceManyBody().strength(config.chargeStrength));
    }
    
    if (config.collisionRadius !== undefined) {
      simulation.force('collision', d3.forceCollide(config.collisionRadius));
    }
    
    simulation.alpha(0.3).restart();
  }, [config]);

  // Pause/resume simulation
  const pauseSimulation = useCallback(() => {
    if (simulationRef.current) {
      simulationRef.current.stop();
      setIsRunning(false);
    }
  }, []);

  const resumeSimulation = useCallback(() => {
    if (simulationRef.current) {
      simulationRef.current.alpha(0.3).restart();
      setIsRunning(true);
    }
  }, []);

  // Manually tick the simulation
  const tickSimulation = useCallback((iterations = 1) => {
    if (simulationRef.current) {
      for (let i = 0; i < iterations; i++) {
        simulationRef.current.tick();
      }
      setSimulationNodes([...simulationRef.current.nodes()]);
    }
  }, []);

  return {
    simulation: simulationRef.current,
    nodes: simulationNodes,
    isRunning,
    pauseSimulation,
    resumeSimulation,
    tickSimulation,
  };
};
