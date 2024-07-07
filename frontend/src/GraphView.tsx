import React, { useEffect, useState } from 'react';
import cytoscape from 'cytoscape';
import CytoscapeComponent from "react-cytoscapejs"
import coseBilkent from 'cytoscape-cose-bilkent';

cytoscape.use(coseBilkent);

export interface Props {
  environment?: any[];
}

export default class GraphView extends React.Component<Props> {
  constructor(props: Props) {
    super(props);
  }

  makeElements() {
    const { environment } = this.props;

    const elements = environment.entities.map((entity) => {
      return { data: { id: entity.id, label: entity.id }, position: { x: 0, y: 0 } };
    })

    return elements;
  }

  render() {
    const { environment } = this.props;

    return (
      <>
        <CytoscapeComponent
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
          elements={environment ? this.makeElements() : []}
          style={{ width: '600px', height: '600px' }}
          layout={{ name: 'cose-bilkent' }}
        />
      </>
    );
  }
}
