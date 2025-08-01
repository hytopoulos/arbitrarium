import React, { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import cytoscape, { Core } from 'cytoscape';
import CytoscapeComponent from "react-cytoscapejs";
import coseBilkent from 'cytoscape-cose-bilkent';
import { Environment, Entity } from './types.ts';

type CytoscapeType = Core;

cytoscape.use(coseBilkent);

interface Props {
  environment?: Environment[];
  onEntitySelect?: (entity: Entity | null) => void;
}

export default function GraphView(props: Props) {
  const [cy, setCy] = useState<CytoscapeType | null>(null);
  const { isLoading, isError, data, error } = useQuery(['graph', props.environment], () => {
    if (!props.environment || !props.environment[0]?.id) {
      console.log('No environment selected or environment has no ID');
      return Promise.resolve([]);
    }
    const envId = props.environment[0].id;
    console.log('Fetching entities for environment:', envId);
    return fetch(`http://localhost:8000/api/ent/?env=${envId}`, {
      headers: {
        'Authorization': `Token ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .catch(error => {
      console.error('Error fetching entities:', error);
      throw error;
    });
  });

  const elements = data ? data.map((entity) => {
    // Ensure we have a valid entity with required fields
    const entityWithDefaults = {
      id: entity.id || '',
      name: entity.name || 'Unnamed Entity',
      type: entity.type || 'entity',
      properties: entity.properties || {},
      ...entity // Spread any additional properties
    };
    
    return {
      data: { 
        id: entityWithDefaults.id, 
        label: entityWithDefaults.name,
        entity: entityWithDefaults // Store full entity data for selection
      },
      position: { x: 0, y: 0 },
      classes: 'entity-node'
    };
  }) : [];

  // Log when props change
  useEffect(() => {
    console.log('GraphView: Props updated', { 
      envId: props.environment?.[0]?.id,
      onEntitySelect: !!props.onEntitySelect 
    });
  }, [props.environment, props.onEntitySelect]);

  // Handle node selection
  useEffect(() => {
    if (!cy) {
      console.log('GraphView: Cytoscape instance not ready');
      return;
    }

    console.log('GraphView: Setting up node selection handlers');

    const handleNodeSelect = (evt: any) => {
      console.log('GraphView: Node tap event:', evt);
      const node = evt.target;
      
      if (node.isNode()) {
        const nodeId = node.id();
        const nodeData = node.data();
        console.log('GraphView: Node clicked', { nodeId, nodeData });
        
        // Get the full entity data from the node
        const entityData = node.data('entity');
        console.log('GraphView: Entity data from node:', entityData);
        
        if (entityData) {
          // Create a new object to ensure React detects the change
          const entity = { ...entityData };
          console.log('GraphView: Calling onEntitySelect with:', entity);
          
          // Ensure we have a valid function to call
          if (typeof props.onEntitySelect === 'function') {
            props.onEntitySelect(entity);
          } else {
            console.error('GraphView: onEntitySelect is not a function', props.onEntitySelect);
          }
        } else {
          console.warn('GraphView: Node clicked but no entity data found:', nodeId);
        }
      }
    };

    const handleUnselect = () => {
      console.log('GraphView: Background tap - clearing selection');
      if (typeof props.onEntitySelect === 'function') {
        props.onEntitySelect(null);
      }
    };

    // Add event listeners with names for easier debugging
    const nodeTapHandler = (e: any) => {
      console.log('GraphView: Node tap handler called');
      // Prevent the event from propagating to the background
      e.stopPropagation();
      handleNodeSelect(e);
    };
    
    const backgroundTapHandler = (e: any) => {
      // Only handle background taps, not taps on nodes or edges
      if (e.target === cy) {
        console.log('GraphView: Background tap handler called');
        handleUnselect();
      }
    };

    console.log('GraphView: Adding event listeners');
    
    // Use 'tap' for nodes with higher priority (runs first)
    cy.on('tap', 'node', nodeTapHandler, { priority: 1 });
    
    // Use 'tap' for background with lower priority (runs after node tap)
    cy.on('tap', backgroundTapHandler, { priority: 0 });

    // Cleanup
    return () => {
      console.log('GraphView: Cleaning up event listeners');
      cy.off('tap', 'node', nodeTapHandler);
      cy.off('tap', backgroundTapHandler);
    };
  }, [cy, props.onEntitySelect]);

  // Handle graph updates
  useEffect(() => {
    if (!cy || elements.length === 0) return;

    let isMounted = true;
    let layout: any = null;

    const updateGraph = () => {
      if (!cy || !isMounted) return;

      try {
        // Batch graph updates
        cy.batch(() => {
          // @ts-ignore - Cytoscape types are not perfect
          const currentElements = cy.elements();
          
          // Only update if elements have changed
          if (JSON.stringify(currentElements.map(e => e.id())) !== 
              JSON.stringify(elements.map(e => e.data.id))) {
            // @ts-ignore - Cytoscape types are not perfect
            cy.elements().remove();
            // @ts-ignore - Cytoscape types are not perfect
            cy.add(elements);
          }
        });

        // Only run layout if we have elements
        if (elements.length > 0) {
          // Cancel any running layout
          if (layout) {
            try { layout.stop(); } catch (e) {}
          }

          // @ts-ignore - Cytoscape types are not perfect
          layout = cy.layout({
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

          layout.run();
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
      
      // Don't destroy the cytoscape instance here as it's managed by CytoscapeComponent
    };
  }, [cy, elements]);

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
  const shouldRenderGraph = !!props.environment?.[0]?.id;
  console.log('GraphView render - environment:', props.environment, 'shouldRenderGraph:', shouldRenderGraph);
  
  return (
    <div className="flex flex-col h-full">
      <div className="p-2 bg-gray-100 border-b">
        {props.environment?.[0]?.name ? (
          <h3 className="font-semibold">{props.environment[0].name}</h3>
        ) : (
          <p className="text-gray-500">No environment selected</p>
        )}
      </div>
      
      <div className="flex-1 relative">
        {shouldRenderGraph ? (
          <CytoscapeComponent
            key={`cy-${props.environment?.[0]?.id || 'no-env'}`}
            className="w-full h-full"
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
            style={{ width: '100%', height: '100%', border: '1px solid #ddd' }}
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
