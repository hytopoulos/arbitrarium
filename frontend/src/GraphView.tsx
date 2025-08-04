import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useQuery } from 'react-query';
import cytoscape from 'cytoscape';
import type { Core, EventObject, NodeSingular, EdgeSingular, ElementDefinition, LayoutOptions } from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import { Environment, Entity } from './types';
import './types/cytoscape-extensions.d';
import { API_BASE_URL } from './api/config';

// Using dynamic import to bypass TypeScript errors with react-cytoscapejs v2.0.0
const CytoscapeComponent = require('react-cytoscapejs').default as React.ComponentType<{
  elements: ElementDefinition[];
  style?: React.CSSProperties;
  stylesheet?: any[];
  layout?: any;
  cy?: (cy: Core) => void;
  className?: string;
  key?: string | number;
  wheelSensitivity?: number;
  minZoom?: number;
  maxZoom?: number;
  zoom?: number;
  pan?: { x: number; y: number };
  panningEnabled?: boolean;
  userPanningEnabled?: boolean;
  boxSelectionEnabled?: boolean;
  // Add any other required props here
}>;

// Define types for Cytoscape elements
type CytoscapeEvent = EventObject & {
  target: NodeSingular | EdgeSingular | Core;
  stopPropagation?: () => void;
};

type CytoscapeNodeData = {
  id: string;
  label: string;
  entity: Entity;
  [key: string]: any;
};

type CytoscapeNode = {
  data: CytoscapeNodeData;
  position: { x: number; y: number };
  classes?: string;
};

type CytoscapeElement = CytoscapeNode | ElementDefinition;

type Layout = LayoutOptions & {
  name: string;
  animate?: boolean;
  animationEasing?: string;
  animationDuration?: number;
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
};

// Extend the window object to include cytoscape
declare global {
  interface Window {
    cytoscape?: (options?: any) => Core;
  }
}

// Register the cose-bilkent layout
// Using type assertion to bypass TypeScript error for 'use' method
(cytoscape as any).use(coseBilkent);

type CytoscapeType = Core;

interface Props {
  environment?: Environment[];
  onEntitySelect?: (entity: Entity | null) => void;
}

export default function GraphView(props: Props) {
  const [cy, setCy] = useState<CytoscapeType | null>(null);
  const { isLoading, isError, data, error } = useQuery<Entity[]>(['graph', props.environment], async () => {
    if (!props.environment || !props.environment[0]?.id) {
      console.log('No environment selected or environment has no ID');
      return [];
    }
    const envId = props.environment[0].id;
    console.log('Fetching entities for environment:', envId);
    
    try {
      const response = await fetch(`${API_BASE_URL}/ent/?env=${envId}`, {
        headers: {
          'Authorization': `Token ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json() as Entity[];
    } catch (error) {
      console.error('Error fetching entities:', error);
      throw error;
    }
  });

  const elements: CytoscapeElement[] = data ? data.map((entity: Entity) => {
    // Ensure we have a valid entity with required fields
    const { id, name, type, ...restEntity } = entity;
    const entityWithDefaults: Entity = {
      id: id || '',
      name: name || 'Unnamed Entity',
      type: type || 'entity',
      properties: entity.properties || {},
      ...restEntity // Spread any remaining properties
    };
    
    // Create a clean data object for cytoscape
    const nodeData: CytoscapeNodeData = {
      id: entityWithDefaults.id,
      label: entityWithDefaults.name,
      entity: entityWithDefaults,
      // Add any additional properties except those already included
      ...Object.fromEntries(
        Object.entries(entityWithDefaults)
          .filter(([key]) => !['id', 'name', 'type', 'properties'].includes(key))
      )
    };
    
    return {
      data: nodeData,
      position: { x: 0, y: 0 },
      classes: 'entity-node'
    } as CytoscapeElement;
  }) : [];

  // Log when props change
  useEffect(() => {
    console.log('GraphView: Props updated', { 
      envId: props.environment?.[0]?.id,
      onEntitySelect: !!props.onEntitySelect 
    });
  }, [props.environment, props.onEntitySelect]);

  // Set up event listeners when the component mounts or updates
  useEffect(() => {
    if (!cy) {
      console.log('GraphView: Cytoscape instance not ready');
      return;
    }

    console.log('GraphView: Setting up event listeners');

    console.log('GraphView: Setting up event listeners');

    // Define event handlers with proper typing
    const handleNodeTap = (event: cytoscape.EventObject) => {
      console.log('GraphView: Node tap handler called', event);
      const node = event.target;
      console.log('GraphView: Node data:', node.data());
      const entity = node.data('entity') as Entity;
      console.log('GraphView: Extracted entity:', entity);
      console.log('GraphView: onEntitySelect prop exists:', !!props.onEntitySelect);
      
      if (entity && props.onEntitySelect) {
        try {
          console.log('GraphView: Calling onEntitySelect with entity:', entity);
          props.onEntitySelect(entity);
          console.log('GraphView: onEntitySelect call completed');
        } catch (error) {
          console.error('GraphView: Error in onEntitySelect:', error);
        }
      } else {
        console.log('GraphView: No entity or onEntitySelect handler');
      }
    };

    const handleBackgroundTap = () => {
      console.log('GraphView: Background tap handler called');
      if (props.onEntitySelect) {
        props.onEntitySelect(null);
      }
    };

    // Use 'tap' for nodes with higher priority (runs first)
    (cy as any).on('tap', 'node', handleNodeTap);
    
    // Use 'tapstart' for background to prevent interference with node taps
    (cy as any).on('tapstart', (event: cytoscape.EventObject) => {
      // If the tap is on the background (not on a node or edge)
      if (event.target === cy) {
        handleBackgroundTap();
      }
    });

    // Cleanup
    return () => {
      console.log('GraphView: Cleaning up event listeners');
      (cy as any).off('tap', 'node', handleNodeTap);
      (cy as any).off('tapstart');
    };
  }, [cy, props.onEntitySelect]);

  // Handle graph updates - only run when environment changes
  useEffect(() => {
    if (!cy || !elements || elements.length === 0) return;

    let isMounted = true;
    let layout: any = null;

    const updateGraph = () => {
      if (!cy || !isMounted) return;

      try {
        // Get current node positions before any changes
        const positions: Record<string, { x: number; y: number }> = {};
        const nodes = cy.nodes();
        
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          const pos = node.position();
          positions[node.id()] = { x: pos.x, y: pos.y };
        }

        // Batch graph updates
        (cy as any).batch(() => {
          // Get current element IDs
          const currentIds = new Set<string>();
          const allElements = cy.elements();
          
          for (let i = 0; i < allElements.length; i++) {
            currentIds.add(allElements[i].id());
          }
          
          const newIds = new Set<string>();
          for (let i = 0; i < elements.length; i++) {
            newIds.add(elements[i].data.id);
          }
          
          // Remove elements that are no longer in the new data
          const toRemove: string[] = [];
          currentIds.forEach(id => {
            if (!newIds.has(id)) {
              toRemove.push(id);
            }
          });
          
          if (toRemove.length > 0) {
            cy.remove(cy.collection(toRemove.map(id => `#${id}`).join(', ')));
          }
          
          // Add new elements
          const toAdd = elements.filter(el => !currentIds.has(el.data.id));
          if (toAdd.length > 0) {
            (cy as any).add(toAdd);
          }
        });

        // Restore node positions for existing nodes
        const updatedNodes = cy.nodes();
        for (let i = 0; i < updatedNodes.length; i++) {
          const node = updatedNodes[i];
          const pos = positions[node.id()];
          if (pos) {
            node.position(pos);
          }
        }

        // Only run layout if we don't have any positions (first load)
        const hasPositions = Object.keys(positions).length > 0;
        if (elements.length > 0 && !hasPositions) {
          // Cancel any running layout
          if (layout) {
            try { (layout as any).stop(); } catch (e) {}
          }

          layout = (cy as any).layout({
            name: 'cose-bilkent',
            animate: true,
            animationEasing: 'ease-in-out',
            animationDuration: 1000,
            randomize: false,
            componentSpacing: 100,
            nodeRepulsion: 400000,
            nodeOverlap: 20,
            edgeElasticity: 100,
            nestingFactor: 5,
            gravity: 80,
            numIter: 1000,
            initialTemp: 200,
            coolingFactor: 0.95,
            minTemp: 1.0
          });

          (layout as any).run();
        }
      } catch (error) {
        console.error('Error updating graph:', error);
      }
    };

    // Use setTimeout to ensure the component is fully mounted
    const timeoutId = setTimeout(updateGraph, 100);

    // Cleanup function
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      
      if (layout) {
        try { layout.stop(); } catch (e) {}
      }
    };
  // Only run this effect when the environment changes, not on every render
  }, [cy, props.environment?.[0]?.id]);

  // Handle component unmount
  useEffect(() => {
    return () => {
      if (cy) {
        try {
          // @ts-ignore - Cytoscape types are not perfect
          cy.destroy();
        } catch (error) {
          console.error('Error cleaning up cytoscape:', error);
        }
      }
    };
  }, [cy]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Loading graph data...</div>;
  }

  if (isError) {
    return <div className="flex items-center justify-center h-full text-red-500">
      Error loading graph data: {error instanceof Error ? error.message : 'Unknown error'}
    </div>;
  }

  // Only render CytoscapeComponent when we have an environment
  // We'll handle empty states in the component itself
  const shouldRenderGraph = Boolean(props.environment && props.environment.length > 0);
  console.log('GraphView render - environment:', props.environment, 'shouldRenderGraph:', shouldRenderGraph);
  
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-2 bg-gray-100 border-b flex-shrink-0">
        {props.environment?.[0]?.name ? (
          <h3 className="font-semibold">{props.environment[0].name}</h3>
        ) : (
          <p className="text-gray-500">No environment selected</p>
        )}
      </div>
      
      <div className="flex-1 relative min-h-0">
        {shouldRenderGraph ? (
          <CytoscapeComponent
            key={`cy-${props.environment?.[0]?.id || 'no-env'}`}
            className="absolute inset-0 w-full h-full"
            cy={(cy) => {
              // Only set cy if it's not already set
              if (!cy) return;
              setCy(cy);
            }}
            stylesheet={[
              {
                selector: 'node',
                style: {
                  width: 30,
                  height: 30,
                  shape: 'ellipse',
                  'background-color': '#4f46e5',
                  'label': 'data(label)',
                  'font-size': '12px',
                  'color': '#fff',
                  'text-halign': 'center',
                  'text-valign': 'center',
                  'text-wrap': 'wrap',
                  'text-max-width': '80px',
                  'text-overflow-wrap': 'anywhere',
                  'cursor': 'pointer',
                },
              },
              {
                selector: 'node:selected',
                style: {
                  'background-color': '#f59e0b',
                  'border-width': '2px',
                  'border-color': '#fff',
                  'border-style': 'solid'
                }
              },
              {
                selector: 'node.highlighted',
                style: {
                  'background-color': '#f59e0b',
                  'transition-property': 'background-color',
                  'transition-duration': '0.3s'
                }
              },
              {
                selector: 'edge',
                style: {
                  'width': 2,
                  'line-color': '#999',
                  'target-arrow-color': '#999',
                  'target-arrow-shape': 'triangle',
                  'curve-style': 'bezier',
                },
              },
            ]}
            elements={elements}
            layout={{ name: 'cose-bilkent' }}
            style={{ 
              width: '100%', 
              height: '100%', 
              border: '1px solid #ddd',
              minHeight: '400px',
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundColor: '#fff',
              zIndex: 1
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            {elements.length === 0 ? 'No data available' : 'Select an environment'}
          </div>
        )}
      </div>
    </div>
  );
}
