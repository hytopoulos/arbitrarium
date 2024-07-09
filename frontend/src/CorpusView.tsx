import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useQuery } from 'react-query'
import KeyValSelectionBar from './KeyValSelectionBar.tsx';

export interface Props {
    environment?: any[];
    onAddToEnvironment: (item: any) => void;
}

export default function CorpusView(props: Props) {
    const [text, setText] = useState('');
    const [currentEntry, setCurrentEntry] = useState(null);
    const [query, setQuery] = useState('');
    const { isLoading, isError, data } = useQuery(['corpus', query], () => {
        if (!query) return Promise.resolve([]);
        return fetch(`http://localhost:8000/api/corp/?name=${query}`)
            .then(response => response.json())
    });

    const addToEnvironment = (item) => {
        item.env = props.environment.id;
        item.name = item.lemma;
        axios.post(`http://localhost:8000/api/ent/`, item)
            .catch(error => console.error(error.response));
    }

    useEffect(() => {
        if (currentEntry && props.environment) {
            addToEnvironment(currentEntry);
            props.onAddToEnvironment(currentEntry);
        }
        setCurrentEntry(null);
        setText('');
    }, [currentEntry]);

    return (
        <div className='h-full w-full bg-slate-200'>
            <form onSubmit={(e) => {
                e.preventDefault();
                setQuery(text);
            }
            }>
                <input
                    type='text'
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />
                <button type='submit'>Search</button>
            </form>
            <KeyValSelectionBar
                title=''
                items={data ?? []}
                selected={currentEntry?.id}
                onItemSelected={setCurrentEntry}
                display={(entry) => `${entry.fnname} - ${entry.definition}`}
                k={(entry) => entry.id}
                v={(entry) => entry}
            />
        </div>
    )
}
