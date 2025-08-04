import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useQuery } from 'react-query';
import * as d3 from 'd3';
import { Simulation, SimulationNodeDatum, SimulationLinkDatum } from 'd3';
import { Environment, Entity, Frame } from './types';
import { FrameElement, getFrameById, getFrameElementsById } from './api/frameApi';
import { API_BASE_URL } from './api/config';

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

export interface FrameElementAssignment {
  frameId: string;
  elementId: string;
  role?: string;
}

interface Props {
  environment?: Environment[];
  onEntitySelect?: (entity: Entity | null) => void;
  onFrameElementAssign?: (assignment: FrameElementAssignment) => Promise<void>;
  className?: string;
}

const GraphViewD3: React.FC<Props> = ({
  environment,
  onEntitySelect,
  onFrameElementAssign,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragEndPos, setDragEndPos] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingLink, setIsDraggingLink] = useState(false);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [assignmentData, setAssignmentData] = useState<{
    frameId: string;
    elementId: string;
  } | null>(null);

  // Refs
  const simulationRef = useRef<Simulation<GraphNode, GraphLink> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const linkLineRef = useRef<SVGLineElement | null>(null);
  const dragStartNodeRef = useRef<GraphNode | null>(null);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const dragEndPosRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);

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
        const response = await fetch(`${API_BASE_URL}/ent/?env=${environment[0].id}`, {
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

  // Define interface for frame data
  interface FrameData {
    id: number;
    elements: FrameElement[];
    frame_type?: string;
    [key: string]: any; // Allow other properties
  }

  // Fetch primary frame for each entity
  const { data: frameElementsMap, isLoading: isLoadingFrames } = useQuery<Record<number, FrameData>>(
    ['entityFrames', entities],
    async () => {
      if (!entities || entities.length === 0) {
        console.log('No entities provided, skipping frame elements fetch');
        return {};
      }
      
      console.log('Fetching frame elements for entities:', entities.map(e => e.name || e.id));
      
      try {
        // Get unique frame IDs from entities
        const frameIds = new Set<number>();
        entities.forEach(entity => {
          if (entity.frames?.[0]) {
            // Handle both string and number IDs
            const frameId = typeof entity.frames[0] === 'object' && entity.frames[0] !== null && 'id' in entity.frames[0] 
              ? entity.frames[0].id 
              : entity.frames[0];
              
            // Convert to number for backend API calls
            const frameIdNum = typeof frameId === 'string' ? parseInt(frameId, 10) : frameId;
            if (typeof frameIdNum === 'number' && !isNaN(frameIdNum)) {
              frameIds.add(frameIdNum);
            } else {
              console.warn(`Invalid frame ID for entity ${entity.id}:`, frameId);
            }
          } else {
            console.log(`Entity ${entity.id} has no frames`, entity);
          }
        });
        
        console.log('Unique frame IDs to fetch:', Array.from(frameIds));
        
        if (frameIds.size === 0) {
          console.log('No valid frame IDs found in entities');
          return {};
        }
        
        // Fetch all needed frames with their elements in parallel
        const framesData = await Promise.all(
          Array.from(frameIds).map(async (frameId) => {
            console.log(`Fetching frame and elements for frame ID: ${frameId}`);
            try {
              // First get the frame
              console.log(`Fetching frame with ID: ${frameId}`);
              const frame = await getFrameById(frameId);
              console.log(`Fetched frame ${frameId}:`, frame);
              
              // Then get its elements
              console.log(`Fetching elements for frame ID: ${frameId}`);
              const elements = await getFrameElementsById(frameId);
              console.log(`Fetched ${elements.length} elements for frame ${frameId}`);
              
              const combinedData = { 
                ...frame, 
                elements,
                // Ensure we have a frame_type for compatibility
                frame_type: frame.frame_type || frame.name
              };
              
              console.log(`Combined frame data for ${frameId}:`, combinedData);
              return combinedData;
            } catch (error) {
              console.error(`Error fetching frame ${frameId}:`, error);
              return null;
            }
          })
        );
        
        // Convert array to map
        const framesMap: Record<number, FrameData> = {};
        framesData.forEach((frame, index) => {
          if (frame && frame.id !== undefined) {
            framesMap[frame.id] = frame;
          } else {
            console.warn(`Skipping invalid frame data at index ${index}:`, frame);
          }
        });
        
        console.log('Frames map created with keys:', Object.keys(framesMap));
        return framesMap;
      } catch (error) {
        console.error('Error in frame elements fetch:', {
          error,
          message: error instanceof Error ? error.message : 'Unknown error',
          entities: entities.map(e => ({ id: e.id, name: e.name }))
        });
        return {};
      }
    },
    {
      enabled: !!entities && entities.length > 0,
      onError: (error) => console.error('Error in frames query:', error),
      // Don't retry failed requests to avoid excessive API calls
      retry: false,
      // Cache results for 5 minutes
      staleTime: 5 * 60 * 1000,
    }
  );

  // Set up the D3 force simulation and rendering
  useEffect(() => {
    if (!svgRef.current) return;
    
    // Clear previous simulation
    const currentSimulation = simulationRef.current;
    if (currentSimulation) {
      currentSimulation.stop();
    }

    if (!graphData.nodes.length) return;

    const { width, height } = dimensions;

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

    svg.on('mousedown', function (event: MouseEvent) {
      // Only start panning if not clicking on a node
      if (event.target === this) {
        isPanning = true;
        lastX = event.clientX;
        lastY = event.clientY;
        svg.style('cursor', 'grabbing');
        event.preventDefault();
      }
    });

    svg.on('mousemove', function (event: MouseEvent) {
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
    svg.on('dblclick', function (event: MouseEvent) {
      // Only reset zoom if clicking on the background
      if (event.target === this) {
        svg.transition()
          .duration(750)
          .call(zoom.transform as any, initialZoom);
      }
    });

    // Create link group for permanent links
    const linkGroup = svg.append('g').attr('class', 'links');

    // Create a separate group for the temporary link that will be on top
    const tempLinkGroup = svg.append('g')
      .attr('class', 'temp-links')
      .style('z-index', '1000')
      .style('position', 'relative');

    // Create the temporary drag line with high visibility
    const tempLink = tempLinkGroup.append('line')
      .attr('class', 'temp-link')
      .style('display', 'none')
      .style('pointer-events', 'none')
      .style('z-index', '1001')
      .attr('stroke', '#ff0000') // Bright red for visibility
      .attr('stroke-dasharray', '5,3')
      .attr('stroke-width', 4)
      .attr('opacity', 1)
      .attr('stroke-linecap', 'round');

    // Add debug info
    console.log('Temporary link element created:', tempLink.node());

    // Store reference to the line element
    linkLineRef.current = tempLink.node();

    // Make sure the temp links are rendered on top of other elements
    tempLinkGroup.raise();

    // Create links with selection state
    const link = linkGroup
      .selectAll<SVGLineElement, GraphLink>('line:not(.temp-link)')
      .data(graphData.links)
      .join('line')
      .attr('class', 'link') // Add class for easier selection
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

    // Create nodes group
    const nodesGroup = svg.append('g').attr('class', 'nodes');

    // Handle node drag start
    const handleNodeDragStart = (event: any, d: GraphNode) => {
      event.sourceEvent.stopPropagation();
      console.log('Drag started from node:', d.id);
      isDraggingRef.current = true;
      dragStartNodeRef.current = d;
      dragStartPosRef.current = { x: d.x || 0, y: d.y || 0 };
      setIsDraggingLink(true);

      // Update temporary link line
      d3.select(linkLineRef.current)
        .style('display', 'block')
        .attr('x1', d.x || 0)
        .attr('y1', d.y || 0)
        .attr('x2', d.x || 0)
        .attr('y2', d.y || 0);

      const tempLinkGroup = d3.select('.temp-links');
      tempLinkGroup.raise();
    };

    // Handle node drag
    const handleNodeDrag = (event: any, d: GraphNode) => {
      if (!isDraggingRef.current) return;

      // Update line end position to follow mouse
      d3.select(linkLineRef.current)
        .attr('x2', event.x)
        .attr('y2', event.y);

      dragEndPosRef.current = { x: event.x, y: event.y };
    };

    // Handle node drag end
    const handleNodeDragEnd = (event: any, d: GraphNode) => {
      if (!isDraggingRef.current) return;

      console.log('Drag ended');

      // Hide the temporary link line
      d3.select(linkLineRef.current).style('display', 'none');

      // Find if we're over a node
      if (dragEndPosRef.current) {
        const targetNode = graphData.nodes.find(n => {
          if (!dragEndPosRef.current || !n.x || !n.y) return false;
          const dx = n.x - dragEndPosRef.current!.x;
          const dy = n.y - dragEndPosRef.current!.y;
          return Math.sqrt(dx * dx + dy * dy) < 20; // 20px hit radius
        });

        // If dropped on a different node, show assignment dialog
        if (targetNode && dragStartNodeRef.current && targetNode.id !== dragStartNodeRef.current.id) {
          console.log('Dropped on node:', targetNode.id);
          setAssignmentData({
            frameId: dragStartNodeRef.current.id,
            elementId: targetNode.id
          });
          setShowAssignmentDialog(true);
        }
      }

      // Clean up
      isDraggingRef.current = false;
      dragStartNodeRef.current = null;
      dragEndPosRef.current = null;
      setIsDraggingLink(false);
    };

    // Handle node click
    const handleNodeClick = (event: any, d: GraphNode) => {
      // Skip if this is a ctrl+click (we handle that in drag)
      if (event.ctrlKey || event.metaKey) return;
      event.stopPropagation();
      const newSelectedNode = d === selectedNode ? null : d;
      setSelectedNode(newSelectedNode);
      onEntitySelect?.(newSelectedNode?.entity || null);

      // Update link styles when selection changes
      d3.selectAll<SVGLineElement, GraphLink>('.link')
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
    };

    // Render nodes using D3's data join
    const nodeElements = nodesGroup
      .selectAll<SVGGElement, GraphNode>('g.node')
      .data(graphData.nodes, (d: GraphNode) => d.id);

    // Enter selection
    const nodeEnter = nodeElements.enter()
      .append('g')
      .attr('class', 'node')
      .call(drag(simulation) as any);

    // Add circle for each node
    nodeEnter.append('circle')
      .attr('r', 10)
      .attr('fill', d => d === selectedNode ? '#ff7f0e' : '#1f77b4')
      .attr('stroke', d => d === selectedNode ? '#ff9e4f' : '#fff')
      .attr('stroke-width', d => d === selectedNode ? 3 : 2)
      .on('click', handleNodeClick)
      .call(d3.drag<SVGCircleElement, GraphNode>()
        .filter(event => (event.ctrlKey || event.metaKey) && event.button === 0)
        .on('start', handleNodeDragStart)
        .on('drag', handleNodeDrag)
        .on('end', handleNodeDragEnd)
      );

    // Add IO pins for frame elements
    nodeEnter.each(function(d) {
      const node = d as any; // Temporary type assertion
      console.log('Node entity:', node.entity);
      console.log('Node frame IDs:', node.entity.frames);
      
      // Skip if no frames
      if (!Array.isArray(node.entity.frames) || node.entity.frames.length === 0) {
        console.log('No frames data available for node:', node.entity.name);
        return;
      }
      
      // Skip if frame elements not loaded yet
      if (!frameElementsMap) {
        console.log('Frame elements not loaded yet for node:', node.entity.name);
        // Still render the node without IO pins
        return;
      }
      
      console.log('Node frames for', node.entity.name, ':', node.entity.frames);
      
      // Get the first frame ID
      const primaryFrameId = Number(node.entity.frames[0]);
      console.log('Primary frame ID for', node.entity.name, ':', primaryFrameId);
      if (isNaN(primaryFrameId)) {
        console.log('Invalid frame ID for node:', node.entity.name);
        return;
      }
      
      const primaryFrame = frameElementsMap[primaryFrameId];
      console.log('Primary frame data:', primaryFrame);
      
      // If no frame data, skip
      if (!primaryFrame) {
        console.log('No frame data found for frame ID:', primaryFrameId);
        return;
      }
      
      // Get frame elements data
      const frameData = frameElementsMap[primaryFrameId];
      if (!frameData) {
        return;
      }
      
      // Use the elements property from the Frame interface
      const frameElements = Array.isArray(frameData.elements) ? frameData.elements : [];
      console.log(`Frame ${frameData.id} elements data:`, frameData.elements);
      console.log(`Processed frameElements for node ${d.entity.name}:`, frameElements);
      
      console.log(`Node ${d.entity.name} (frame: ${frameData.name || frameData.frame_type || 'Unknown'}):`,
        `${frameElements.length} frame elements`
      );
      
      if (frameElements.length === 0) {
        console.log('No elements found for frame');
        console.log('Available frames in map:', Object.keys(frameElementsMap));
      }
      
      const nodeGroup = d3.select(this);
      
      console.log(`Creating ${frameElements.length} IO pins for node ${d.entity.name}`);
      
      // Create pins for all frame elements
      frameElements.forEach((element: any, index: number) => {
        const elementName = element.name || `Element ${index + 1}`;
        const elementDefinition = element.definition || element.description || elementName;
        
        const angle = (index / Math.max(1, frameElements.length)) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * 25; // 25px from center
        const y = Math.sin(angle) * 25;
        
        console.log(`Creating IO pin ${index} for ${d.entity.name}:`, elementName);
        
        const pin = nodeGroup.append('circle')
          .attr('class', 'io-pin')
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', 4)
          .attr('fill', '#666')
          .attr('stroke', '#fff')
          .attr('stroke-width', 1)
          .attr('opacity', 1);
          
        pin.append('title')
          .text(elementDefinition);
      });

      // Add label
      nodeGroup.append('text')
        .attr('class', 'node-label')
        .attr('x', 15)
        .attr('y', 5)
        .text(d.entity.name || `Node ${d.id.slice(0, 4)}`);
    });

    // Update selection
    const nodeUpdate = nodeEnter.merge(nodeElements);

    // Update node styles based on selection
    nodeUpdate.select('circle')
      .attr('fill', d => d === selectedNode ? '#ff7f0e' : '#1f77b4')
      .attr('stroke', d => d === selectedNode ? '#ff9e4f' : '#fff')
      .attr('stroke-width', d => d === selectedNode ? 3 : 2);

    // Exit selection
    nodeElements.exit().remove();

    // Update positions on simulation tick
    simulation.on('tick', () => {
      // Update link positions
      link
        .attr('x1', (d: GraphLink) => {
          const source = d.source as GraphNode;
          return source.x || 0;
        })
        .attr('y1', (d: GraphLink) => {
          const source = d.source as GraphNode;
          return source.y || 0;
        })
        .attr('x2', (d: GraphLink) => {
          const target = d.target as GraphNode;
          return target.x || 0;
        })
        .attr('y2', (d: GraphLink) => {
          const target = d.target as GraphNode;
          return target.y || 0;
        });

      // Update node positions
      nodesGroup.selectAll<SVGGElement, GraphNode>('g.node')
        .attr('transform', (d) => `translate(${d.x || 0},${d.y || 0})`);

      // Update IO pin positions
      if (frameElementsMap) {
        nodesGroup.selectAll<SVGGElement, GraphNode>('g.node')
          .each(function(d) {
            const primaryFrame = d.entity.frames?.[0];
            if (!primaryFrame) return;
            
            // Handle case where primaryFrame is a number (ID) or an object with id
            let frameId: number | null = null;
            if (typeof primaryFrame === 'number') {
              frameId = primaryFrame;
            } else if (typeof primaryFrame === 'object' && primaryFrame !== null && 'id' in primaryFrame) {
              frameId = typeof primaryFrame.id === 'number' ? primaryFrame.id : null;
            }
            
            if (frameId === null || !frameElementsMap) return;
            
            // Use type assertion to ensure TypeScript understands the index type
            const frameData = (frameElementsMap as Record<number, FrameData>)[frameId];
            if (!frameData) return;
            
            const coreElements = Array.isArray(frameData.elements) ? frameData.elements : [];
            const existingElements = (typeof primaryFrame === 'object' && Array.isArray(primaryFrame.elements)) 
              ? primaryFrame.elements 
              : [];
            const elementMap = new Map(existingElements.map((el: any) => [el.name, el]));
            const nodeGroup = d3.select(this);
            
            // Update positions for all frame elements
            const frameElements = Array.isArray(frameData.elements) ? frameData.elements : [];
            if (frameElements.length > 0) {
              frameElements.forEach((element: any, index: number) => {
                const angle = (index / Math.max(1, frameElements.length)) * Math.PI * 2 - Math.PI / 2;
                const x = Math.cos(angle) * 25;
                const y = Math.sin(angle) * 25;
                
                // Select IO pins by class and index
                const ioPins = nodeGroup.selectAll('circle.io-pin').nodes();
                if (ioPins[index]) {
                  d3.select(ioPins[index] as SVGCircleElement)
                    .attr('cx', x)
                    .attr('cy', y);
                }
              });
            }
          });
      }
    });

    // Handle window resize with debounce
    const handleResize = () => {
      if (!svgRef.current) return;

      const container = svgRef.current.parentElement;
      if (!container) return;

      const { width, height } = container.getBoundingClientRect();

      // Only update if dimensions actually changed
      if (Math.abs(width - dimensions.width) > 10 || Math.abs(height - dimensions.height) > 10) {
        setDimensions({ width, height });
      }

      // Update simulation center without causing re-render
      simulation.force('center', d3.forceCenter(width / 2, height / 2));
      simulation.alpha(0.3).restart();
    };

    // Debounce resize handler
    let resizeTimer: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', debouncedResize);

    // Initial setup
    handleResize();

    // Store simulation reference
    simulationRef.current = simulation;

    // Cleanup
    return () => {
      window.removeEventListener('resize', debouncedResize);
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
      clearTimeout(resizeTimer);
    };
  }, [graphData.nodes.length, frameElementsMap, dimensions]); // Re-run when graph data, frame elements, or dimensions change

  // Improved drag behavior with better click handling
  const drag = (simulation: Simulation<GraphNode, GraphLink>) => {
    let isDragging = false;
    let startX: number, startY: number;
    const DRAG_THRESHOLD = 3; // Reduced threshold for better responsiveness
    let dragCheck: NodeJS.Timeout;

    function dragstarted(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) {
      // Prevent text selection during drag
      event.sourceEvent.preventDefault();

      // Skip drag behavior if Ctrl/Cmd is pressed (handled by mousedown handler)
      if (event.sourceEvent.ctrlKey || event.sourceEvent.metaKey) {
        event.on('drag', null);
        event.on('end', null);
        return;
      }

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

  // Handle frame element assignment
  const handleAssignFrameElement = async (role: string) => {
    if (!assignmentData || !onFrameElementAssign) return;

    try {
      await onFrameElementAssign({
        ...assignmentData,
        role
      });
    } catch (error) {
      console.error('Failed to assign frame element:', error);
    } finally {
      setShowAssignmentDialog(false);
      setAssignmentData(null);
    }
  };

  return (
    <div ref={containerRef} className={`w-full h-full relative ${className}`}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        className="block"
        style={{
          cursor: isDraggingLink ? 'crosshair' : 'grab',
          userSelect: 'none'
        }}
      >
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
      </svg>

      {/* Frame Element Assignment Dialog */}
      {showAssignmentDialog && assignmentData && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-lg font-medium mb-4">Assign as Frame Element</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role in Frame
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter role (e.g., 'agent', 'patient')"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      handleAssignFrameElement(e.currentTarget.value.trim());
                    }
                  }}
                  autoFocus
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowAssignmentDialog(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                    if (input?.value.trim()) {
                      handleAssignFrameElement(input.value.trim());
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                >
                  Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GraphViewD3;
