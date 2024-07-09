import React, { useEffect, useState } from 'react';
import { useQuery } from 'react-query'
import KeyValSelectionBar from './KeyValSelectionBar.tsx';

export interface Props {
    onEnvSelected: (env: any) => void;
}

export default function EnvironmentsList(props: Props) {
    const [selected, setSelected] = useState(null);
    const { isLoading, isError, data } = useQuery('environments', () => {
        return fetch('http://localhost:8000/api/env')
          .then(response => response.json())
      })

    useEffect(() => {
        props.onEnvSelected(selected);
    }, [selected]);

    if (isLoading) {
        return <p>Loading...</p>
    }

    if (isError) {
        return <p>Error: {isError}</p>
    }

    return (
        <div className = 'h-full w-full bg-slate-200'>
        <KeyValSelectionBar
            title="Environments"
            items={data}
            selected={selected}
            onItemSelected={setSelected}
            display={(env) => env.name}
            k={(env) => env.id}
            v={(env) => env}
          />
        </div>
    )
}
