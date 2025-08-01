import React, { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { FiAlertCircle, FiLoader, FiPlus, FiServer, FiCheck } from 'react-icons/fi';
import { Environment } from './types.ts';

interface Props {
  onEnvSelected: (env: Environment | null) => void;
}

export default function EnvironmentsList({ onEnvSelected }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { 
    isLoading, 
    isError, 
    data: environments = [],
    error 
  } = useQuery<Environment[]>('environments', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch('http://localhost:8000/api/env', {
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to fetch environments');
    }
    return response.json();
  });

  const handleEnvClick = (env: Environment) => {
    // Only update if the environment is different from the currently selected one
    if (selectedId !== env.id) {
      console.log('Selecting new environment:', env.name);
      setSelectedId(env.id);
      onEnvSelected(env);
    } else {
      console.log('Environment already selected:', env.name);
    }
  };

  // Set initial selected environment
  useEffect(() => {
    if (environments.length > 0 && !selectedId) {
      const defaultEnv = environments[0];
      if (defaultEnv) {
        console.log('Setting initial environment:', defaultEnv.name);
        setSelectedId(defaultEnv.id);
        onEnvSelected(defaultEnv);
      }
    }
  }, [environments, selectedId, onEnvSelected]);

  const filteredEnvs = environments.filter(env => 
    env.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <FiLoader className="animate-spin h-8 w-8 mb-2 text-indigo-500" />
        <p>Loading environments...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 text-red-600 bg-red-50 rounded-md">
        <div className="flex items-center">
          <FiAlertCircle className="h-5 w-5 mr-2" />
          <span>Error loading environments: {error instanceof Error ? error.message : 'Unknown error'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search and Add */}
      <div className="p-3 space-y-2">
        <div className="relative">
          <input
            type="text"
            placeholder="Search environments..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        <button
          className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          onClick={() => { /* Handle create new environment */ }}
        >
          <FiPlus className="mr-2 h-4 w-4" />
          New Environment
        </button>
      </div>

      {/* Environments List */}
      <div className="flex-1 overflow-y-auto">
        {filteredEnvs.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchQuery ? 'No matching environments found' : 'No environments available'}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredEnvs.map((env) => (
              <li 
                key={env.id}
                className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors ${
                  selectedId === env.id 
                    ? 'bg-indigo-50 border-l-4 border-indigo-500' 
                    : 'hover:bg-gray-50 border-l-4 border-transparent'
                }`}
                onClick={() => handleEnvClick(env)}
              >
                <div className="flex items-center min-w-0 flex-1">
                  <FiServer className={`h-5 w-5 mr-3 ${selectedId === env.id ? 'text-indigo-500' : 'text-gray-400'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {env.name}
                        {selectedId === env.id && (
                          <FiCheck className="ml-1.5 h-4 w-4 text-green-500 inline" />
                        )}
                      </p>
                      <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">
                        {env.updated_at ? `Updated ${formatDate(env.updated_at)}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center mt-1 text-xs text-gray-500">
                      <span>Created: {formatDate(env.created_at)}</span>
                      {env.document_count !== undefined && (
                        <span className="ml-2">
                          • {env.document_count} {env.document_count === 1 ? 'document' : 'documents'}
                        </span>
                      )}
                    </div>
                    {env.description && (
                      <p className="mt-1 text-xs text-gray-500 truncate">{env.description}</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
