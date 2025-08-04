import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from 'react-query';
import * as d3 from 'd3';
import { Simulation, SimulationNodeDatum, SimulationLinkDatum } from 'd3';
import { Environment, Entity } from './types';

interface GraphNode extends SimulationNodeDatum {
  id: string;
  label: string;
  entity: Entity;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  relatedTo?: string | number;
}

interface GraphLink extends SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface Props {
  environment?: Environment[];
  onEntitySelect?: (entity: Entity | null) => void;
  className?: string;
}

const GraphViewD3: React.FC<Props> = ({ environment, onEntitySelect, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const simulationRef = useRef<Simulation<GraphNode, GraphLink> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  
  // Update dimensions when container size changes
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: Math.max(width, 300), // Ensure minimum width
          height: Math.max(height, 300) // Ensure minimum height
        });
      }
    };
    
    // Initial dimensions
    updateDimensions();
    
    // Update on window resize
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Fetch data when environment changes
  const { data: entities = [], isLoading: isQueryLoading } = useQuery<Entity[]>(
    ['graph', environment], 
    async () => {
      setIsLoading(true);
      setError(null);
      
      if (!environment?.[0]?.id) return [];
      
      try {
        const response = await fetch(`http://localhost:8000/api/ent/?env=${environment[0].id}`, {
          headers: {
            'Authorization': `Token ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        throw err;
      } finally {
        setIsLoading(false);
      }
  });

  // Process data into nodes and links
  const graphData: GraphData = React.useMemo(() => {
    if (!entities.length) return { nodes: [], links: [] };
    
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeMap = new Map<string, GraphNode>();
    
    // Create nodes
    entities.forEach((entity: Entity) => {
      const node: GraphNode = {
        id: entity.id.toString(),
        label: entity.name || `Node ${entity.id}`,
        entity,
        relatedTo: (entity as any).relatedTo, // Add type assertion for relatedTo
      };
      nodes.push(node);
      nodeMap.set(node.id, node);
    });
    
    // Create links based on relationships
    entities.forEach((entity: Entity) => {
      const sourceNode = nodeMap.get(entity.id.toString());
      
      // Handle different possible relationship properties
      const relatedIds: (string | number)[] = [];
      
      // Check for different possible relationship properties
      if ((entity as any).relatedTo) {
        relatedIds.push((entity as any).relatedTo);
      }
      
      if ((entity as any).relationships) {
        relatedIds.push(...(entity as any).relationships);
      }
      
      // Create links for each relationship
      relatedIds.forEach(relatedId => {
        const targetNode = nodeMap.get(relatedId.toString());
        if (sourceNode && targetNode) {
          links.push({
            source: sourceNode,
            target: targetNode,
          });
        }
      });
    });
    
    return { nodes, links };
  }, [entities]);

  // Set up the D3 force simulation and rendering
  useEffect(() => {
    if (!svgRef.current) return;
    
    // Clear previous simulation
    const currentSimulation = simulationRef.current;
    if (currentSimulation) {
      currentSimulation.stop();
      simulationRef.current = null;
    }
    
    if (!graphData.nodes.length) return;
    
    const { width, height } = dimensions;
    
    // Clear previous simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }
    
    // Calculate the ideal link distance based on number of nodes
    const nodeCount = graphData.nodes.length;
    const baseLinkDistance = 120;
    const maxLinkDistance = 200;
    
    // Adjust link distance based on node count
    const linkDistance = Math.min(
      baseLinkDistance * Math.max(1, Math.log10(nodeCount)),
      maxLinkDistance
    );
    
    // Create force simulation with optimized parameters
    const simulation = d3.forceSimulation<GraphNode>(graphData.nodes)
      // Repel nodes from each other
      .force('charge', d3.forceManyBody()
        .strength(-200 * Math.min(1, 100 / nodeCount)) // Scale with node count
        .distanceMax(300)
      )
      // Center the graph in the viewport
      .force('center', d3.forceCenter(width / 2, height / 2))
      // Add collision detection to prevent node overlap
      .force('collision', d3.forceCollide()
        .radius(20)
        .strength(0.7)
      )
      // Define link forces
      .force('link', d3.forceLink<GraphNode, GraphLink>(graphData.links)
        .id((d: GraphNode) => d.id)
        .distance(linkDistance)
        .strength(0.3)
      )
      // Weaker positioning forces for more natural movement
      .force('x', d3.forceX(width / 2).strength(0.02))
      .force('y', d3.forceY(height / 2).strength(0.02));
    
    // Store simulation reference
    simulationRef.current = simulation;
    
    // Auto-stop simulation when it's cooled down (alpha < alphaMin)
    simulation.on('tick', () => {
      if (simulation.alpha() < simulation.alphaMin()) {
        simulation.stop();
      }
    });
    
    // Optimize simulation for smooth dragging
    simulation.alphaDecay(0.05)
      .velocityDecay(0.6)
      .alphaTarget(0.1)
      .alpha(1)
      .restart();
    
    // Create SVG elements
    const svg = d3.select(svgRef.current);
    
    // Clear previous content
    svg.selectAll('*').remove();
    
    // Create a container for the graph elements
    const g = svg.append('g').attr('class', 'graph-container');
    
    // Add zoom behavior with initial transform
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .filter(event => {
        // Only allow zoom with wheel or touch, not with mouse drag
        return (event.type === 'wheel') || 
               (event.type === 'dblclick') ||
               (event.type.startsWith('touch'));
      })
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        g.attr('transform', `translate(${event.transform.x},${event.transform.y}) scale(${event.transform.k})`);
      });
    
    // Store zoom reference
    zoomRef.current = zoom;
    
    // Apply initial zoom transform
    const initialZoom = d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(0.9);
    
    // Apply zoom behavior to the SVG
    svg.call(zoom)
      .call(zoom.transform, initialZoom);
    
    // Add pan behavior for the canvas
    let isPanning = false;
    let lastX: number, lastY: number;
    
    svg.on('mousedown', function(event: MouseEvent) {
      // Only start panning if not clicking on a node
      if (event.target === this) {
        isPanning = true;
        lastX = event.clientX;
        lastY = event.clientY;
        svg.style('cursor', 'grabbing');
        event.preventDefault();
      }
    });
    
    svg.on('mousemove', function(event: MouseEvent) {
      if (isPanning) {
        const dx = event.clientX - lastX;
        const dy = event.clientY - lastY;
        lastX = event.clientX;
        lastY = event.clientY;
        
        const currentTransform = d3.zoomTransform(svg.node() as Element);
        const newTransform = currentTransform.translate(dx / currentTransform.k, dy / currentTransform.k);
        
        // Apply the new transform
        g.attr('transform', `translate(${newTransform.x},${newTransform.y}) scale(${newTransform.k})`);
        // Update the zoom state without triggering another event
        const selection = d3.select<SVGSVGElement, unknown>(svg.node() as SVGSVGElement);
        selection.call(zoom.transform, newTransform);
      }
    });
    
    const endPan = () => {
      isPanning = false;
      svg.style('cursor', 'grab');
    };
    
    svg.on('mouseup', endPan);
    svg.on('mouseleave', endPan);
    
    // Set initial cursor style
    svg.style('cursor', 'grab');
    
    // Add double-click to reset zoom
    svg.on('dblclick.zoom', null); // Remove default double-click behavior
    svg.on('dblclick', function(event: MouseEvent) {
      // Only reset zoom if clicking on the background
      if (event.target === this) {
        svg.transition()
          .duration(750)
          .call(zoom.transform as any, initialZoom);
      }
    });
    
    // Create links with selection state
    const link = svg.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(graphData.links)
      .join('line')
      .attr('stroke', (d: GraphLink) => {
        // Highlight links connected to selected node
        if (!selectedNode) return '#999';
        const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
        const targetId = typeof d.target === 'object' ? d.target.id : d.target;
        return (sourceId === selectedNode.id || targetId === selectedNode.id) 
          ? '#ff7f0e' 
          : '#999';
      })
      .attr('stroke-opacity', (d: GraphLink) => {
        if (!selectedNode) return 0.6;
        const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
        const targetId = typeof d.target === 'object' ? d.target.id : d.target;
        return (sourceId === selectedNode.id || targetId === selectedNode.id) 
          ? 1 
          : 0.2;
      })
      .attr('stroke-width', (d: GraphLink) => {
        if (!selectedNode) return 1.5;
        const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
        const targetId = typeof d.target === 'object' ? d.target.id : d.target;
        return (sourceId === selectedNode.id || targetId === selectedNode.id) 
          ? 2.5 
          : 1;
      })
      .attr('stroke-linecap', 'round');
    
    // Create nodes
    const node = svg.append('g')
      .attr('class', 'nodes')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(graphData.nodes)
      .join('g')
      .call(drag(simulation) as any);
    
    // Add circles to nodes with hover and click handlers
    node.append('circle')
      .attr('r', 10)
      .attr('fill', (d: GraphNode) => d === selectedNode ? '#ff7f0e' : '#1f77b4')
      .attr('stroke', (d: GraphNode) => d === selectedNode ? '#ff9e4f' : '#fff')
      .attr('stroke-width', (d: GraphNode) => d === selectedNode ? 3 : 2)
      .on('mouseover', function() {
        d3.select(this).attr('r', 12);
      })
      .on('mouseout', function(d) {
        d3.select(this).attr('r', d === selectedNode ? 12 : 10);
      })
      .on('click', function(event: MouseEvent, d: GraphNode) {
        event.stopPropagation();
        const newSelectedNode = d === selectedNode ? null : d;
        setSelectedNode(newSelectedNode);
        onEntitySelect?.(newSelectedNode?.entity || null);
        
        // Update link styles when selection changes
        link
          .attr('stroke', (l: GraphLink) => {
            if (!newSelectedNode) return '#999';
            const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
            const targetId = typeof l.target === 'object' ? l.target.id : l.target;
            return (sourceId === newSelectedNode.id || targetId === newSelectedNode.id) 
              ? '#ff7f0e' 
              : '#999';
          })
          .attr('stroke-opacity', (l: GraphLink) => {
            if (!newSelectedNode) return 0.6;
            const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
            const targetId = typeof l.target === 'object' ? l.target.id : l.target;
            return (sourceId === newSelectedNode.id || targetId === newSelectedNode.id) 
              ? 1 
              : 0.2;
          })
          .attr('stroke-width', (l: GraphLink) => {
            if (!newSelectedNode) return 1.5;
            const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
            const targetId = typeof l.target === 'object' ? l.target.id : l.target;
            return (sourceId === newSelectedNode.id || targetId === newSelectedNode.id) 
              ? 2.5 
              : 1;
          });
      });
    
    // Add labels with better positioning and styling
    const labels = node.append('text')
      .text((d: GraphNode) => d.label)
      .attr('x', 15)
      .attr('y', 5)
      .attr('font-size', '12px')
      .attr('fill', (d: GraphNode) => d === selectedNode ? '#ff7f0e' : '#333')
      .attr('font-weight', (d: GraphNode) => d === selectedNode ? 'bold' : 'normal')
      .attr('pointer-events', 'none')
      .attr('text-anchor', 'start')
      .attr('dy', '0.35em')
      .attr('dx', '0.5em');
      
    // Add background rectangles for better label readability
    labels.each(function() {
      const bbox = this.getBBox();
      const parent = this.parentNode as Element; // Type assertion for parentNode
      d3.select(parent)
        .insert('rect', 'text')
        .attr('x', bbox.x - 2)
        .attr('y', bbox.y - 2)
        .attr('width', bbox.width + 4)
        .attr('height', bbox.height + 4)
        .attr('rx', 4)
        .attr('ry', 4)
        .attr('fill', 'rgba(255, 255, 255, 0.85)')
        .attr('stroke', 'none');
    });
    
    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: GraphLink) => (d.source as GraphNode).x || 0)
        .attr('y1', (d: GraphLink) => (d.source as GraphNode).y || 0)
        .attr('x2', (d: GraphLink) => (d.target as GraphNode).x || 0)
        .attr('y2', (d: GraphLink) => (d.target as GraphNode).y || 0);
      
      node.attr('transform', (d: GraphNode) => `translate(${d.x},${d.y})`);
    });
    
    // Handle window resize
    const handleResize = () => {
      if (!svgRef.current) return;
      
      const container = svgRef.current.parentElement;
      if (!container) return;
      
      const { width, height } = container.getBoundingClientRect();
      setDimensions({ width, height });
      simulation.force('center', d3.forceCenter(width / 2, height / 2));
      simulation.alpha(0.3).restart();
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    // Store simulation reference
    simulationRef.current = simulation;
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      simulation.stop();
    };
  }, [graphData, dimensions, selectedNode, onEntitySelect]);
  
  // Improved drag behavior with better click handling
  const drag = (simulation: Simulation<GraphNode, GraphLink>) => {
    let isDragging = false;
    let startX: number, startY: number;
    const DRAG_THRESHOLD = 3; // Reduced threshold for better responsiveness
    let dragCheck: NodeJS.Timeout;

    function dragstarted(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) {
      // Prevent text selection during drag
      event.sourceEvent.preventDefault();
      
      // Store start position
      startX = event.x;
      startY = event.y;
      
      // Add a small delay before considering it a drag
      dragCheck = setTimeout(() => {
        if (!isDragging) {
          isDragging = true;
          if (!event.active) simulation.alphaTarget(0.1).restart();
          
          // Fix the node's position during drag
          d.fx = d.x;
          d.fy = d.y;
          
          // Add visual feedback
          d3.select(event.sourceEvent.target)
            .classed('dragging', true)
            .raise();
        }
      }, 100); // 100ms delay before drag starts

      // Clean up on mouseup
      d3.select(window).on('mouseup.dragcheck', () => {
        clearTimeout(dragCheck);
        d3.select(window).on('mouseup.dragcheck', null);
        if (isDragging) {
          d.fx = d.x;
          d.fy = d.y;
        }
      }, { once: true });
    }
    
    function dragged(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) {
      if (!isDragging) return;
      
      // Update node position
      d.fx = event.x;
      d.fy = event.y;
      
      // Keep simulation active
      simulation.alpha(0.5);
    }
    
    function dragended(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) {
      // Clean up any remaining listeners and timeout
      clearTimeout(dragCheck);
      d3.select(window)
        .on('mouseup.dragcheck', null)
        .on('mousemove.dragcheck', null);
      
      if (!isDragging) {
        // Handle click if not dragging
        const newSelectedNode = d === selectedNode ? null : d;
        setSelectedNode(newSelectedNode);
        onEntitySelect?.(newSelectedNode?.entity || null);
        return;
      }

      isDragging = false;
      
      // Release node but keep position
      d.fx = null;
      d.fy = null;
      
      // Remove visual feedback
      d3.select(event.sourceEvent.target)
        .classed('dragging', false);
      
      // Let the simulation settle
      simulation.alpha(0.3).restart();
    }
    
    return d3.drag<SVGGElement, GraphNode>()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);
  };

  if (isLoading || isQueryLoading) {
    return (
      <div className={`flex items-center justify-center w-full h-full bg-gray-50 ${className}`}>
        <div className="text-center p-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading graph data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center w-full h-full bg-red-50 ${className}`}>
        <div className="text-center p-4">
          <div className="text-red-500 text-4xl mb-2">⚠️</div>
          <h3 className="text-lg font-medium text-red-800">Error loading graph</h3>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!graphData.nodes.length) {
    return (
      <div className={`flex items-center justify-center w-full h-full bg-gray-50 ${className}`}>
        <div className="text-center p-4">
          <div className="text-gray-400 text-4xl mb-2">📊</div>
          <h3 className="text-lg font-medium text-gray-700">No data available</h3>
          <p className="text-gray-500 text-sm mt-1">The selected environment has no entities to display.</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`w-full h-full relative ${className}`}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        className="block"
      />
      <defs>
        <marker 
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#999" />
        </marker>
      </defs>
    </div>
  );
};

export default GraphViewD3;
