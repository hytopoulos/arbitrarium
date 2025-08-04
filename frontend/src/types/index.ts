export interface User {
  id: number;
  username: string;
  email: string;
  // Add other user properties as needed
}

export interface FrameElement {
  id: number;
  name: string;
  type: string;
  role?: string;
  properties?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface Frame {
  id: number;
  name: string;
  description?: string;
  elements?: FrameElement[];
  created_at: string;
  updated_at: string;
  environment_id: number;
}

export interface Relationship {
  id: number;
  source_entity: number;
  target_entity: number;
  relationship_type: string;
  properties?: Record<string, any>;
  created_at: string;
  updated_at: string;
  environment_id: number;
}

export interface Environment {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  document_count?: number;
  
  // Relationships
  frames?: Frame[];
  entities?: Entity[];
  relationships?: Relationship[];
}

export interface Entity {
  id: number;
  name: string;
  type: string;
  environment_id: number;
  properties?: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Add other entity properties as needed
}

// Add other types as needed
