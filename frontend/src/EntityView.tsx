import React from 'react';
import { Entity } from './types.ts';

interface EntityViewProps {
  entity: Entity | null;
}

export default function EntityView({ entity }: EntityViewProps) {
  console.log('EntityView rendering with entity:', entity);
  
  if (!entity) {
    return (
      <div className="px-4 py-4 h-full w-full bg-slate-100 flex items-center justify-center">
        <div className="text-gray-500">Select a node to view details</div>
      </div>
    );
  }

  // Helper function to render a value in a readable way
  const renderValue = (value: any): React.ReactNode => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return value.map((item, i) => (
      <div key={i} className="ml-4">
        {typeof item === 'object' ? renderValue(item) : String(item)}
      </div>
    ));
    if (typeof value === 'object') return (
      <div className="ml-4">
        {Object.entries(value).map(([k, v]) => (
          <div key={k}>
            <span className="font-medium">{k}:</span> {renderValue(v)}
          </div>
        ))}
      </div>
    );
    return JSON.stringify(value);
  };

  return (
    <div className="px-4 py-4 h-full w-full bg-slate-100 overflow-auto">
      <div className="pb-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800">{entity.name || 'Unnamed Entity'}</h2>
        <div className="mt-2 space-x-2">
          <span className="inline-block px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full">
            {entity.type || 'entity'}
          </span>
          <span className="text-xs text-gray-500">ID: {entity.id}</span>
        </div>
      </div>
      
      <div className="mt-4 space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Properties</h3>
          <dl className="mt-2 space-y-2">
            {Object.entries(entity.properties || {}).map(([key, value]) => (
              <div key={key} className="flex">
                <dt className="w-1/3 text-sm font-medium text-gray-700">{key}:</dt>
                <dd className="text-sm text-gray-900">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {Object.entries(entity).filter(([key]) => !['id', 'name', 'type', 'properties'].includes(key)).length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Additional Info</h3>
            <dl className="mt-2 space-y-2">
              {Object.entries(entity)
                .filter(([key]) => !['id', 'name', 'type', 'properties'].includes(key))
                .map(([key, value]) => (
                  <div key={key} className="flex">
                    <dt className="w-1/3 text-sm font-medium text-gray-700">{key}:</dt>
                    <dd className="text-sm text-gray-900">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </dd>
                  </div>
                ))}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
