"use client"

import cytoscape from "cytoscape"
import CytoscapeComponent from "react-cytoscapejs"
import coseBilkent from 'cytoscape-cose-bilkent';

cytoscape.use(coseBilkent);

export default function Home() {

  const elements = [
    { data: { id: 'one', label: 'Node 1' }, position: { x: 0, y: 0 } },
    { data: { id: 'two', label: 'Node 2' }, position: { x: 100, y: 0 } },
    { data: { source: 'one', target: 'two', label: 'Edge from Node1 to Node2' } }
 ];

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
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
          elements={elements}
          style={ { width: '600px', height: '600px' } }
          layout={ {name: 'cose-bilkent'} }
        />
      </div>
    </main>
  );
}
