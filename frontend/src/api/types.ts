// Shared types for the application

export interface Environment {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  document_count?: number;
}

export interface Entity {
  id: string;
  name: string;
  type?: string;
  frames?: Frame[];
  properties?: Record<string, any>;
  [key: string]: any;
}

export interface Frame {
  id: number;
  name?: string;  // Made optional since we're using frame_type
  frame_type: string;  // Required field for frame type
  definition?: string;
  fnid?: string | number;
  is_primary?: boolean;
  elements?: Element[];
  created_at?: string;
  updated_at?: string;
  entity?: string | number;
}

export interface Element {
  id: string;
  name: string;
  definition?: string;
  core_type?: string;
  frame?: string | number;
  value?: any;
  fnid?: string | number;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
}
