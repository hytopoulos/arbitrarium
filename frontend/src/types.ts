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
  properties?: Record<string, any>;
  [key: string]: any;
}

export interface User {
  id: number;
  username: string;
  email: string;
}
