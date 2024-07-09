import React, { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import cytoscape from 'cytoscape';
import CytoscapeComponent from "react-cytoscapejs";
import coseBilkent from 'cytoscape-cose-bilkent';

cytoscape.use(coseBilkent);

export interface Props {
  environment?: any[];
}

export default function GraphView(props: Props) {
  const [cy, setCy] = useState(null);
  const { isLoading, isError, data } = useQuery(['graph', props.environment], () => {
    if (!props.environment) return Promise.resolve([]);
    return fetch(`http://localhost:8000/api/ent/?env=${props.environment.id}`)
      .then(response => response.json())
  });

  const elements = data ? data.map((entity, index) => {
    return { data: { id: entity.id, label: entity.name }, position: { x: 0, y: 0 } };
  }) : [];

  useEffect(() => {
    if (cy) {
      cy.elements().remove();
      cy.add(elements);
      cy.layout({ name: 'cose-bilkent' }).run();
    }
  }, [data]);

  return (
    <>
      <CytoscapeComponent
        className="w-full h-full"
        cy={(cy) => setCy(cy)}
        stylesheet={[
          {
            selector: 'node',
            'style': {
              width: 20,
              height: 20,
              shape: 'rectangle'
            }
          },
          {
            selector: "node[label]",
            style: {
              label: "data(label)",
              "font-size": "12",
              color: "black",
              "text-halign": "center",
              "text-valign": "center",
            },
          },
        ]}
        elements={[]}
        style={{ border: '1px solid black'}}
        layout={{ name: 'cose-bilkent' }}
        autoRefreshLayout={true}
        responsive={true}
      />
    </>
  );
}
