import React, { useState, useEffect, useCallback } from 'react';
import { Entity, Frame } from './api/types';
import { getFramesForEntity, createFrame, createElement, setPrimaryFrame, getFrameTypes, FrameType, getFrameElements, FrameElement } from './api/frameApi';

interface EntityViewProps {
  entity: Entity | null;
}

export default function EntityView({ entity }: EntityViewProps) {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newFrameName, setNewFrameName] = useState('');
  const [newFrameDefinition, setNewFrameDefinition] = useState('');
  const [newFrameType, setNewFrameType] = useState('');
  const [frameTypes, setFrameTypes] = useState<FrameType[]>([]);
  const [isLoadingFrameTypes, setIsLoadingFrameTypes] = useState(false);
  const [frameTypesError, setFrameTypesError] = useState<string | null>(null);
  const [frameElements, setFrameElements] = useState<FrameElement[]>([]);
  const [selectedElements, setSelectedElements] = useState<Record<string, string>>({});
  const [isLoadingFrameElements, setIsLoadingFrameElements] = useState(false);
  const [frameElementsError, setFrameElementsError] = useState<string | null>(null);
  
  const loadFrames = useCallback(async () => {
    if (!entity?.id) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const data = await getFramesForEntity(entity.id);
      setFrames(data);
    } catch (err) {
      console.error('Failed to load frames:', err);
      setError('Failed to load frames. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [entity?.id]);

  // Load frame types on component mount
  useEffect(() => {
    const loadFrameTypes = async () => {
      setIsLoadingFrameTypes(true);
      setFrameTypesError(null);
      try {
        const types = await getFrameTypes();
        console.log('Frame types loaded:', types);
        console.log('Frame types length:', types.length);
        setFrameTypes(types);
      } catch (error) {
        console.error('Failed to load frame types:', error);
        setFrameTypesError('Failed to load frame types. Please try again later.');
      } finally {
        console.log('Finished loading frame types');
        setIsLoadingFrameTypes(false);
      }
    };

    loadFrameTypes();
  }, []);

  // Load frame elements when frame type changes
  useEffect(() => {
    const loadFrameElements = async () => {
      if (!newFrameType) {
        setFrameElements([]);
        setSelectedElements({});
        return;
      }

      setIsLoadingFrameElements(true);
      setFrameElementsError(null);
      try {
        const response = await getFrameElements(newFrameType);
        
        // Ensure we have a proper array of frame elements
        const elements = Array.isArray(response.elements) 
          ? response.elements 
          : [];
          
        setFrameElements(elements);
        
        // Initialize selected elements with empty values
        const initialSelected: Record<string, string> = {};
        elements.forEach(element => {
          if (element && typeof element.name === 'string') {
            initialSelected[element.name] = '';
          }
        });
        setSelectedElements(initialSelected);
      } catch (error) {
        console.error('Failed to load frame elements:', error);
        setFrameElementsError('Failed to load frame elements. Please try again later.');
        setFrameElements([]);
        setSelectedElements({});
      } finally {
        setIsLoadingFrameElements(false);
      }
    };

    loadFrameElements();
  }, [newFrameType]);

  // Load frames when entity changes
  useEffect(() => {
    if (entity?.id) {
      loadFrames();
    }
  }, [entity?.id, loadFrames]);

  const handleAddFrame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entity?.id || !newFrameName.trim() || !newFrameType) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // First, create the frame without elements
      // Explicitly exclude elements field to avoid backend validation issues
      const frameCreationData = {
        entity: entity.id,
        name: newFrameName,
        frame_type: newFrameType,
        definition: newFrameDefinition
      };
      
      const newFrame = await createFrame(frameCreationData);
      
      // Then, create elements for the frame if any are provided
      const elementPromises = Object.entries(selectedElements)
        .filter(([name, value]) => value.trim() !== '')
        .map(([name, value]) => {
          // Find the corresponding frame element to get the fnid
          const frameElement = frameElements.find(el => el.name === name);
          return createElement({
            name,
            value,
            frame: newFrame.id,
            fnid: frameElement?.fnid || frameElement?.id // Use fnid if available, otherwise fall back to id
          });
        });
      
      if (elementPromises.length > 0) {
        await Promise.all(elementPromises);
        
        // Reload the frame to get updated elements
        const updatedFrames = await getFramesForEntity(entity.id);
        setFrames(updatedFrames);
      } else {
        // Add the new frame to the list
        setFrames(prev => [...prev, newFrame]);
      }
      
      // Reset form
      setNewFrameName('');
      setNewFrameDefinition('');
      setNewFrameType('');
      setSelectedElements({});
      
      // Show success message
      alert('Frame added successfully!');
    } catch (err) {
      console.error('Failed to add frame:', err);
      setError(err instanceof Error ? err.message : 'Failed to add frame. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPrimary = async (frameId: string) => {
    if (!frameId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await setPrimaryFrame(frameId);
      // Update local state to reflect the new primary frame
      setFrames(frames.map(frame => ({
        ...frame,
        is_primary: frame.id.toString() === frameId,
      })));
    } catch (err) {
      console.error('Failed to set primary frame:', err);
      setError('Failed to set primary frame. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleElementChange = (elementName: string, value: string) => {
    setSelectedElements(prev => ({
      ...prev,
      [elementName]: value
    }));
  };
  
  if (!entity) {
    return (
      <div className="px-4 py-4 h-full w-full bg-slate-100 flex items-center justify-center">
        <div className="text-gray-500">Select a node to view details</div>
      </div>
    );
  }

  // Helper function to render a value in a readable way
  const renderValue = (value: any, keyPrefix: string = ''): React.ReactNode => {
    // Handle null/undefined
    if (value === null || value === undefined) {
      return 'null';
    }
    
    // Handle primitive types
    if (typeof value !== 'object') {
      return String(value);
    }
    
    // Handle arrays
    if (Array.isArray(value)) {
      if (value.length === 0) return '[]';
      
      return (
        <div className="ml-4">
          {value.map((item: any, i: number) => (
            <div key={`${keyPrefix}-${i}`} className="mb-1">
              {renderValue(item, `${keyPrefix}-${i}`)}
            </div>
          ))}
        </div>
      );
    }
    
    // Handle objects
    if (typeof value === 'object' && value !== null) {
      // Special case: If the object has a 'name' property, use that as the display value
      if ('name' in value && typeof value.name === 'string') {
        return value.name;
      }
      
      // For other objects, render their properties
      const entries = Object.entries(value);
      if (entries.length === 0) return '{}';
      
      return (
        <div className="ml-4 border-l-2 border-gray-200 pl-2">
          {entries.map(([k, v]) => (
            <div key={`${keyPrefix}-${k}`} className="mb-1">
              <span className="font-medium text-gray-700">{k}:</span> {renderValue(v, `${keyPrefix}-${k}`)}
            </div>
          ))}
        </div>
      );
    }
    
    // Fallback for any other type
    try {
      return JSON.stringify(value);
    } catch (e) {
      return '[Unserializable value]';
    }
  };

  // Define styling for different core types
  const coreTypeStyles: Record<string, string> = {
    'core': 'text-red-600 font-semibold',
    'core-ue': 'text-amber-600',
    'peripheral': 'text-blue-600',
    'extra-thematic': 'text-purple-600',
    'default': 'text-gray-700'
  };

  // Get display name for core type
  const getCoreTypeDisplay = (coreType: string): string => {
    const normalized = (coreType || '').toLowerCase().trim();
    if (normalized === 'core-ue') return 'Core-Unexpressed';
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  return (
    <div className="px-4 py-4 h-full w-full bg-slate-100 overflow-visible">
      {/* Entity Header */}
      <div className="pb-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800">{entity.name || 'Unnamed Entity'}</h2>
        <div className="mt-2 space-x-2">
          <span className="inline-block px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full">
            {entity.type || 'entity'}
          </span>
          <span className="text-xs text-gray-500">ID: {entity.id}</span>
        </div>
      </div>
      
      {/* Frames Section */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Frames</h3>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}
        
        {/* Frames List */}
        <div className="space-y-3 mb-6">
          {isLoading && !frames.length ? (
            <div className="text-gray-500">Loading frames...</div>
          ) : frames.length === 0 ? (
            <div className="text-gray-500">No frames found for this entity.</div>
          ) : (
            <div className="space-y-2">
              {frames.map((frame) => (
                <div 
                  key={frame.id} 
                  className={`p-3 border rounded-md ${frame.is_primary ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 bg-white'}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {frame.name}
                        {frame.is_primary && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                            Primary
                          </span>
                        )}
                      </h4>
                      {frame.definition && (
                        <p className="mt-1 text-sm text-gray-600">{frame.definition}</p>
                      )}
                      <div className="mt-2 text-xs text-gray-500">
                        {frame.fnid && `FrameNet ID: ${frame.fnid} • `}
                        Updated: {new Date(frame.updated_at || frame.created_at || '').toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {!frame.is_primary && (
                        <button
                          onClick={() => handleSetPrimary(frame.id.toString())}
                          className="text-xs px-2 py-1 bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                          disabled={isLoading}
                        >
                          Set Primary
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Add Frame Form */}
        <div className="mt-6 border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Frame</h3>
          <form onSubmit={handleAddFrame} className="space-y-4">
            <div>
              <label htmlFor="frameName" className="block text-sm font-medium text-gray-700 mb-1">
                Frame Name
              </label>
              <input
                type="text"
                id="frameName"
                value={newFrameName}
                onChange={(e) => setNewFrameName(e.target.value)}
                placeholder="Frame name"
                className="p-2 border rounded w-full"
                required
                disabled={isLoading}
              />
            </div>
            
            <div>
              <label htmlFor="frameType" className="block text-sm font-medium text-gray-700 mb-1">
                Frame Type
              </label>
              {isLoadingFrameTypes ? (
                <div className="p-2 text-gray-500">Loading frame types...</div>
              ) : frameTypesError ? (
                <div className="p-2 text-red-500">{frameTypesError}</div>
              ) : (
                <select
                  id="frameType"
                  value={newFrameType}
                  onChange={(e) => {
                    console.log('Frame type changed to:', e.target.value);
                    setNewFrameType(e.target.value);
                  }}
                  className="p-2 border rounded w-full"
                  required
                  disabled={isLoadingFrameTypes || frameTypes.length === 0}
                  onClick={() => console.log('Dropdown clicked', { isLoadingFrameTypes, frameTypesLength: frameTypes.length })}
                >
                  <option value="">Select a frame type</option>
                  {frameTypes.map((type) => (
                    <option key={type.name} value={type.name}>
                      {type.display_name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            
            <div>
              <label htmlFor="frameDefinition" className="block text-sm font-medium text-gray-700 mb-1">
                Definition (Optional)
              </label>
              <textarea
                id="frameDefinition"
                value={newFrameDefinition}
                onChange={(e) => setNewFrameDefinition(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="A brief description of this frame..."
                disabled={isLoading}
              />
            </div>
            
            {/* Frame Elements */}
            {isLoadingFrameElements ? (
              <div className="p-2 text-gray-500">Loading frame elements...</div>
            ) : frameElementsError ? (
              <div className="p-2 text-red-500">{frameElementsError}</div>
            ) : frameElements.length > 0 ? (
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700">Frame Elements</h4>
                {frameElements.map((element, index) => {
                  if (!element || typeof element !== 'object') {
                    console.warn('Invalid frame element at index', index, ':', element);
                    return null;
                  }
                  
                  const elementName = element.name || `element-${index}`;
                  const elementKey = `element-${elementName}-${index}`;
                  const coreType = (element.core_type || '').toLowerCase().trim();
                  const typeStyle = coreTypeStyles[coreType] || coreTypeStyles.default;
                  const coreTypeDisplay = getCoreTypeDisplay(coreType);
                  
                  return (
                    <div key={elementKey} className="mb-4 p-3 border rounded-lg bg-white shadow-sm">
                      <div className="flex justify-between items-center mb-1">
                        <label 
                          htmlFor={elementKey}
                          className={`text-sm font-medium ${typeStyle}`}
                          title={`${coreTypeDisplay} element`}
                        >
                          {elementName}
                          {coreType === 'core' && (
                            <span className="text-red-500"> *</span>
                          )}
                        </label>
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                          {coreTypeDisplay}
                        </span>
                      </div>
                      <input
                        type="text"
                        id={elementKey}
                        value={selectedElements[elementName] || ''}
                        onChange={(e) => handleElementChange(elementName, e.target.value)}
                        placeholder={`Enter value for ${elementName}`}
                        className="p-2 border rounded w-full mt-1"
                        required={coreType === 'core'}
                      />
                      {element.definition && (
                        <p className="text-xs text-gray-500 mt-1">
                          {typeof element.definition === 'string' 
                            ? element.definition 
                            : JSON.stringify(element.definition)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null}
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading || !newFrameName.trim() || !newFrameType}
                className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                  isLoading || !newFrameName.trim() || !newFrameType ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? 'Adding...' : 'Add Frame'}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Entity Properties */}
      <div className="mt-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Entity Properties</h3>
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <dl className="divide-y divide-gray-200">
            {Object.entries(entity.properties || {}).map(([key, value]) => (
              <div key={key} className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">{key}</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {renderValue(value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
