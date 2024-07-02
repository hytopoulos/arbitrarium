"use client"

import cytoscape from "cytoscape"
import CytoscapeComponent from "react-cytoscapejs"
import coseBilkent from 'cytoscape-cose-bilkent';

cytoscape.use(coseBilkent);

export default function Home() {

  const elements = [
    { data: { id: 'one', label: 'Player' }, position: { x: 0, y: 0 } },
    { data: { id: 'two', label: 'Jury' }, position: { x: 100, y: 0 } },
    { data: { source: 'one', target: 'two', label: 'Persuade' } }
 ];

  return (
    <main className="flex min-h-screen flex-col items-center pb-24 divide-y divide-black divide-solid">
      <div className="text-3xl pb-3">
        Arbitrarium
      </div>
      <div className="grid grid-flow-col z-10 w-full items-center font-mono text-sm">
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
        <div className="px-4 py-4 h-full w-full bg-slate-300 items-start">
          <div className="pb-4 font-bold text-xl">Jury</div>
          <div className="">
            <p>Persuade [speaker=Player, addressee=Jury, content=Verdict, degree=0.1] </p>
            <p>Capability [degree=0.5, event=Verdict] </p>
          </div>
        </div>
      </div>
    </main>
  );
}
