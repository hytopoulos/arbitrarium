import { Frame, Element } from '../types';
import { api } from './config';

export interface FrameType {
  id: number;
  name: string;
  display_name: string;
}

export interface FrameTypesResponse {
  count: number;
  results: FrameType[];
}

export interface FrameElement {
  id: number;
  name: string;
  core_type: string;
  definition: string;
}

export interface FrameElementsResponse {
  frame_type: string;
  elements: FrameElement[];
}

/**
 * Fetches all available frame types
 */
export const getFrameTypes = async (): Promise<FrameType[]> => {
  try {
    const response = await api.get('/framenet/types/');
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        console.error('Failed to parse error response:', e);
      }
      
      const errorMessage = errorData?.detail || `HTTP error! status: ${response.status}`;
      console.error('Failed to fetch frame types:', {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
      });
      throw new Error(`Failed to fetch frame types: ${errorMessage}`);
    }
    
    const data: FrameTypesResponse = await response.json();
    return data.results;
  } catch (error) {
    console.error('Error in getFrameTypes:', error);
    throw error;
  }
};

/**
 * Fetches frames for a specific entity
 */
export const getFramesForEntity = async (entityId: string | number): Promise<Frame[]> => {
  try {
    const response = await api.get(`/frame/?entity=${encodeURIComponent(String(entityId))}`);
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        console.error('Failed to parse error response:', e);
      }
      
      const errorMessage = errorData?.detail || `HTTP error! status: ${response.status}`;
      console.error('Failed to fetch frames:', {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
      });
      throw new Error(`Failed to fetch frames: ${errorMessage}`);
    }
    
    const data = await response.json();
    console.log('Frames data received:', data);
    return data;
  } catch (error) {
    console.error('Error in getFramesForEntity:', error);
    throw error;
  }
};

/**
 * Creates a new frame for an entity
 */
export const createFrame = async (frameData: Partial<Frame>): Promise<Frame> => {
  try {
    console.log('Creating frame with data:', frameData);
    
    // Validate required fields
    const requiredFields = ['entity', 'frame_type', 'name'];
    const missingFields = requiredFields.filter(field => !(field in frameData));
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
    
    const response = await api.post('/frame/', frameData);
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
        console.error('Frame creation failed with:', errorData);
      } catch (e) {
        console.error('Failed to parse error response:', e);
      }
      
      const errorMessage = errorData?.detail || errorData?.error || 
                         `HTTP error! status: ${response.status} ${response.statusText}`;
      throw new Error(`Failed to create frame: ${errorMessage}`);
    }
    
    const result = await response.json();
    console.log('Successfully created frame:', result);
    return result;
  } catch (error) {
    console.error('Error in createFrame:', error);
    throw error;
  }
};

/**
 * Updates an existing frame
 */
export const updateFrame = async (frameId: string, updates: Partial<Frame>): Promise<Frame> => {
  const response = await api.post(`/frame/${frameId}/`, updates, { method: 'PATCH' });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to update frame');
  }
  
  return response.json();
};

/**
 * Deletes a frame
 */
export const deleteFrame = async (frameId: string): Promise<void> => {
  const response = await api.post(`/frame/${frameId}/`, {}, { method: 'DELETE' });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to delete frame');
  }
};

/**
 * Sets a frame as the primary frame for its entity
 */
export const setPrimaryFrame = async (frameId: string): Promise<{ status: string }> => {
  const response = await api.post(`/frame/${frameId}/set_primary/`, {});
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to set primary frame');
  }
  
  return response.json();
};

/**
 * Fetches frame elements for a specific frame type
 */
export const getFrameElements = async (frameType: string): Promise<FrameElementsResponse> => {
  try {
    // Get the authentication token from local storage
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('No authentication token found in localStorage. User may not be logged in.');
      throw new Error('You need to be logged in to access this feature. Please log in and try again.');
    }
    
    // Include the authentication token in the request headers
    const response = await api.get(`/framenet/elements/?frame_type=${encodeURIComponent(frameType)}`, {
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        console.error('Failed to parse error response:', e);
      }
      
      const errorMessage = errorData?.detail || errorData?.error || `HTTP error! status: ${response.status}`;
      console.error('Failed to fetch frame elements:', {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        url: response.url,
      });
      
      // If we get a 401, the token might be invalid or expired
      if (response.status === 401) {
        // Clear the invalid token
        localStorage.removeItem('auth_token');
        // Optionally redirect to login or show a login prompt
        // window.location.href = '/login';
      }
      
      throw new Error(errorMessage || 'Failed to fetch frame elements');
    }
    
    const data: FrameElementsResponse = await response.json();
    console.log('Frame elements response:', data);
    return data;
  } catch (error) {
    console.error('Error in getFrameElements:', error);
    // Re-throw the error with a more user-friendly message if needed
    if (error instanceof Error) {
      throw new Error(`Failed to load frame elements: ${error.message}`);
    }
    throw new Error('An unknown error occurred while fetching frame elements');
  }
};

/**
 * Creates a new element for a frame
 */
export const createElement = async (elementData: Partial<Element>): Promise<Element> => {
  const response = await api.post('/element/', elementData);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to create element');
  }
  
  return response.json();
};
