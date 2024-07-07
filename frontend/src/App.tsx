import React, { useEffect, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import KeyValSelectionBar from './KeyValSelectionBar.tsx';
import GraphView from './GraphView.tsx';
import EntityView from './EntityView.tsx';

const elements = [
  { data: { id: 'one', label: 'Player' }, position: { x: 0, y: 0 } },
  { data: { id: 'two', label: 'Jury' }, position: { x: 100, y: 0 } },
  { data: { source: 'one', target: 'two', label: 'Persuade' } }
];

function App() {
  const [environments, setEnvironments] = useState([]);
  const [currentEnv, setCurrentEnv] = useState(null);

  useEffect(() => {
    fetch('http://localhost:8000/api/env')
      .then(response => response.json())
      .then(data => setEnvironments(data))
      .catch(error => console.error(error));

      console.log(environments);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center pb-24 divide-y divide-black divide-solid">
      <div className="text-3xl pb-3">
        Arbitrarium - {currentEnv ? currentEnv.name : 'No environment selected'}
      </div>
      <div className="grid grid-flow-col z-10 w-full items-center font-mono text-sm">
        <KeyValSelectionBar
          title="Environments"
          items={environments}
          onItemSelected={setCurrentEnv}
          display={(env) => env.name}
          k={(env) => env.id}
          v={(env) => env}
        />
        <GraphView environment={currentEnv} />
        <EntityView />
      </div>
    </main>
  );
}

export default App;
