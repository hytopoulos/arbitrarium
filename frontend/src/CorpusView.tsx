import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useQuery } from 'react-query';
import KeyValSelectionBar from './KeyValSelectionBar.tsx';
import { Environment, User } from './types';

interface CorpusEntry {
  id: number;
  fnname: string;
  definition: string;
  [key: string]: any;
}

export interface Props {
    environment: Environment[] | null;
    currentUser?: User | null;
    onAddToEnvironment?: (item: any) => void;
}

export default function CorpusView(props: Props) {
    const [text, setText] = useState('');
    const [currentEntry, setCurrentEntry] = useState<CorpusEntry | null>(null);
    const [query, setQuery] = useState('');
    const { isLoading, isError, data } = useQuery<CorpusEntry[]>(['corpus', query], () => {
        if (!query) return Promise.resolve([]);
        return fetch(`http://localhost:8000/api/corp/?name=${query}`)
            .then(response => response.json())
    });

    const addToEnvironment = async (item: CorpusEntry) => {
        if (!props.environment?.[0]?.id) {
            console.error('No environment selected');
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found');
            return;
        }

        const data = {
            ...item,
            env: props.environment[0].id,
            name: item.lemma || item.name || 'Unnamed Entity',
            user: props.currentUser?.id
        };

        try {
            const response = await axios.post('http://localhost:8000/api/ent/', data, {
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.cookie.match(/csrftoken=([^;]+)/)?.[1] || ''
                },
                withCredentials: true
            });
            
            console.log('Successfully added to environment:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error adding to environment:', error.response?.data || error.message);
            throw error;
        }
    }

    useEffect(() => {
        const handleAddToEnvironment = async () => {
            if (currentEntry && props.environment) {
                try {
                    const result = await addToEnvironment(currentEntry);
                    if (result) {
                        props.onAddToEnvironment?.(result);
                    }
                } catch (error) {
                    console.error('Failed to add entry to environment:', error);
                } finally {
                    setCurrentEntry(null);
                    setText('');
                }
            }
        };
        
        handleAddToEnvironment();
    }, [currentEntry, props.environment]);

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
