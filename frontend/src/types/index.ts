export interface User {
  id: number;
  username: string;
  email: string;
  // Add other user properties as needed
}

export interface Environment {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  // Add other environment properties as needed
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
