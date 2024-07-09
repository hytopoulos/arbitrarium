import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { QueryClient, QueryClientProvider } from 'react-query'
import Cookies from 'universal-cookie';
import './App.css';
import KeyValSelectionBar from './KeyValSelectionBar.tsx';
import GraphView from './GraphView.tsx';
import CorpusView from './CorpusView.tsx';
import EnvironmentsList from './EnvironmentsList.tsx';
import EntityView from './EntityView.tsx';

const queryClient = new QueryClient()
const cookies = new Cookies();

function App() {
  const [currentEnv, setCurrentEnv] = useState(null);
  const [refresh, setRefresh] = useState(false);

  // CSRF token
  useEffect(() => {
    axios.get('http://localhost:8000/api/auth')
      .then(response => {
        axios.defaults.headers.post['X-CSRFToken'] = cookies.get('csrftoken');
        console.log(response.data);
      })
      .catch(error => console.error(error));
  }, []);

  useEffect(() => {
    if (refresh) {
      setRefresh(false);
      console.log('refreshing');
    }
  }, [refresh]);

  return (
    <QueryClientProvider client={queryClient}>
      <main className="flex min-h-screen flex-col items-center divide-y divide-black divide-solid">
        <div className="fixed text-3xl pb-3 z-10">
          Arbitrarium - {currentEnv ? currentEnv.name : 'No environment selected'}
        </div>
        <div className="grow grid grid-flow-col w-full items-center font-mono text-sm">
          <EnvironmentsList className="w-1/4" onEnvSelected={setCurrentEnv} />
          <div className="flex flex-col w-full h-full w-1/4">
            <GraphView environment={currentEnv} />
            <div className="flex flex-row w-full h-1/4">
              <EntityView/>
            </div>
          </div>
          <CorpusView className="w-1/4" environment={currentEnv} onAddToEnvironment={() => setRefresh(true)} />
        </div>
      </main>
    </QueryClientProvider >
  );
}

export default App;
