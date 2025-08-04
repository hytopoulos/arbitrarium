import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { api } from './api/config';
import { Environment, User } from './types';

interface CorpusEntry {
    id: number;
    fnid: number;
    fnname: string;
    definition: string;
    depth?: number;
    frequency?: number;
    lemma?: string;
    wnid?: string;
    wnname?: string;
}

interface Props {
    environment: Environment[] | null;
    currentUser?: User | null;
    onAddToEnvironment?: (item: any) => void;
    className?: string;
}

const CorpusView: React.FC<Props> = ({
    environment,
    currentUser = null,
    onAddToEnvironment,
    className = ''
}) => {
    const [text, setText] = useState('');
    const [query, setQuery] = useState('');
    const [currentEntry, setCurrentEntry] = useState<CorpusEntry | null>(null);

    const { data = [], isLoading, error } = useQuery<CorpusEntry[], Error>(
        ['corpus', query],
        async () => {
            if (!query) return [];
            console.log('Fetching corpus with query:', query);
            try {
                const url = `/corp/?name=${encodeURIComponent(query)}`;
                console.log('API Request URL:', url);
                
                const response = await api.get(url);
                console.log('API Response status:', response.status, response.statusText);
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({
                        status: response.status,
                        statusText: response.statusText
                    }));
                    console.error('API Error response:', errorData);
                    throw new Error(errorData.detail || `Failed to fetch corpus: ${response.status} ${response.statusText}`);
                }
                
                const result = await response.json();
                console.log('API Success response:', result);
                return result;
            } catch (err) {
                console.error('Error in corpus fetch:', err);
                throw err;
            }
        },
        {
            enabled: !!query,
            retry: 2,
            refetchOnWindowFocus: false
        }
    );

    useEffect(() => {
        const handleAddToEnvironment = async () => {
            if (!currentEntry || !environment || environment.length === 0) return;
            
            try {
                if (!currentEntry.wnid) {
                    throw new Error('Cannot add entry to environment: missing wnid');
                }
                
                const envId = environment[0].id;
                
                const data = {
                    name: currentEntry.fnname,
                    definition: currentEntry.definition,
                    wnid: currentEntry.wnid,
                    env: envId,
                    fnid: currentEntry.fnid,
                    lemma: currentEntry.lemma || '',
                    wnname: currentEntry.wnname || ''
                };
                
                const response = await api.post('/ent/', data);
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.detail || 'Failed to add to environment');
                }
                
                if (onAddToEnvironment) {
                    onAddToEnvironment(await response.json());
                }
                
                setCurrentEntry(null);
            } catch (err) {
                console.error('Error adding to environment:', err);
            }
        };
        
        if (currentEntry) {
            handleAddToEnvironment();
        }
    }, [currentEntry, environment, onAddToEnvironment]);

    if (isLoading) return <div className={`p-4 ${className}`}>Loading corpus data...</div>;
    if (error) return <div className={`p-4 text-red-600 ${className}`}>Error: {error.message}</div>;

    return (
        <div className={`flex flex-col h-full ${className}`}>
            <form 
                onSubmit={(e) => {
                    e.preventDefault();
                    setQuery(text);
                }}
                className="mb-4"
            >
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Search Corpus</h2>
                <div className="relative">
                    <input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Search corpus..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        aria-label="Search corpus"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <button 
                        type="submit"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                        aria-label="Search"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </button>
                </div>
            </form>
            
            <div className="flex-1 overflow-y-auto">
                {data.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        {query ? 'No results found' : 'Enter a search term to find corpus entries'}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {data.map((entry) => (
                            <div key={entry.id} className="p-3 border border-gray-200 rounded-lg bg-white shadow-sm hover:shadow transition-shadow">
                                <h3 className="font-medium text-gray-900">{entry.fnname}</h3>
                                <p className="mt-1 text-sm text-gray-600 line-clamp-2">{entry.definition}</p>
                                {entry.wnname && (
                                    <p className="mt-1 text-xs text-gray-500">
                                        <span className="font-medium">WordNet:</span> {entry.wnname}
                                    </p>
                                )}
                                <button
                                    onClick={() => setCurrentEntry(entry)}
                                    className={`mt-2 w-full px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                        environment?.length
                                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                    }`}
                                    disabled={!environment?.length}
                                    title={!environment?.length ? 'No environment selected' : `Add ${entry.fnname} to environment`}
                                >
                                    Add to Environment
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CorpusView;
