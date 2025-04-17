// src/schemas.ts (Example)

export interface Ruleset {
  id: number;
  name: string;
  description: string | null;
  created_at: string; // Assuming ISO string format
  updated_at: string; // Assuming ISO string format
  // Add user relationship if needed/returned by API
  // user_id: number;
}

export interface RulesetCreate {
  name: string;
  description?: string | null;
}

// Add other schemas (User, ApiKey, Rule, etc.) here as needed
