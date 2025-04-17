// src/services/api.ts
import { AuthContextType } from '../context/AuthContext';

// Import schemas - Ensure these interfaces match backend schemas (e.g., app/schemas/)
// It's generally better to define these in a separate `src/schemas.ts` file and import them here.
// Example: import { Ruleset, RulesetCreate, Rule, ... } from '../schemas';

let authContextRef: AuthContextType | null = null;

export const setAuthContextRef = (auth: AuthContextType) => {
    authContextRef = auth;
};

// --- Interfaces (Define or Import from src/schemas.ts) ---
// It's highly recommended to move these to a dedicated schemas file (e.g., src/schemas.ts)

export interface ComponentStatus {
    status: 'ok' | 'degraded' | 'error' | 'down' | 'unknown' | string; // Allow string for flexibility
    details: string | null;
}

export interface SystemStatusReport {
    database: ComponentStatus;
    message_broker: ComponentStatus;
    api_service: ComponentStatus;
    dicom_listener: ComponentStatus;
    celery_workers: ComponentStatus;
    // Add more components as needed
}

export interface Role {
    id: number;
    name: string;
    description?: string;
}

export interface UserWithRoles {
    id: number;
    email: string;
    full_name?: string;
    is_active: boolean;
    is_superuser: boolean;
    google_id?: string;
    picture?: string;
    created_at: string;
    updated_at: string;
    roles: Role[];
}

export interface UserUpdatePayload {
    is_active?: boolean;
}

export interface MatchCriterion {
    tag: string; // DICOM Tag (e.g., "0010,0010")
    op: 'eq' | 'ne' | 'gt' | 'lt' | 'ge' | 'le' | 'contains' | 'startswith' | 'endswith' | 'exists' | 'notexists'; // Example operators
    value?: any; // Can be string, number, boolean, or array for some ops
}

export interface TagModification {
    action: 'set' | 'delete';
    tag: string; // DICOM Tag
    value?: any; // Required for 'set'
    vr?: string; // Optional Value Representation for 'set'
}

export interface StorageDestination {
    type: 'dicom_cstore' | 'filesystem' | string; // Extend with more types
    config: Record<string, any>; // Type-specific configuration (e.g., { host: '...', port: 11112, ae_title: '...' } for cstore)
}

export interface Rule {
    id: number;
    name: string;
    description?: string | null;
    is_active: boolean;
    priority: number;
    match_criteria: MatchCriterion[];
    tag_modifications: TagModification[];
    destinations: StorageDestination[];
    ruleset_id: number;
    created_at: string;
    updated_at: string;
}

export interface Ruleset {
    id: number;
    name: string;
    description?: string | null;
    // These fields might be part of the schema based on backend model/schemas.py
    is_active?: boolean;
    priority?: number;
    execution_mode?: 'FIRST_MATCH' | 'ALL_MATCHES';
    rules?: Rule[]; // Included when fetching a single ruleset, maybe not in lists
    created_at: string;
    updated_at: string;
    // user_id?: number; // If returned by backend
}

export interface RulesetCreate {
  name: string;
  description?: string | null;
  // Include other fields if they are part of the create schema in backend
  is_active?: boolean;
  priority?: number;
  execution_mode?: 'FIRST_MATCH' | 'ALL_MATCHES';
}

// Assuming RuleCreate requires ruleset_id and other non-generated fields
export interface RuleCreate {
    name: string;
    ruleset_id: number; // Must be provided when creating
    description?: string | null;
    is_active?: boolean;
    priority?: number;
    match_criteria: MatchCriterion[];
    tag_modifications: TagModification[];
    destinations: StorageDestination[];
}

// RuleUpdate likely allows partial updates of RuleCreate fields
export type RuleUpdate = Partial<Omit<RuleCreate, 'ruleset_id'>>; // ruleset_id usually not updatable

export interface ApiKey {
    id: number;
    name: string;
    prefix: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    last_used_at?: string | null;
    user_id: number;
}

export interface ApiKeyCreateResponse extends ApiKey {
    full_key: string; // Only returned on creation
}

// Re-export types if they are defined here, for easier import elsewhere
// export type { Role, UserWithRoles, ..., Rule, Ruleset, ... };


// --- apiClient Implementation ---
interface FetchOptions extends RequestInit {
    useAuth?: boolean;
    parseResponse?: boolean; // To handle non-JSON responses like 204 No Content
}

/**
 * Generic API client function for making fetch requests.
 * Handles adding the base URL, authorization header, JSON parsing,
 * error handling, and automatic logout on 401.
 */
export const apiClient = async <T>(
    endpoint: string, // Path *after* /api/v1 (e.g., /users/, /rules-engine/rulesets)
    options: FetchOptions = {}
): Promise<T> => {
    // Setting default for parseResponse
    const { useAuth = true, headers: customHeaders, parseResponse = true, body, ...restOptions } = options;

    const defaultHeaders: Record<string, string> = {
        // Only set Content-Type if there's a body and it's not FormData
        ...(body && !(body instanceof FormData) && { 'Content-Type': 'application/json' }),
        'Accept': 'application/json', // We generally expect JSON back
    };

    // Ensure authContextRef is available if needed
    if (useAuth && !authContextRef) {
         console.error("AuthContext ref is not set in api.ts. Ensure setAuthContextRef is called.");
         // Depending on strictness, you might throw an error here
         // throw new Error("Authentication context is not available for API client.");
    }

    const token = useAuth ? authContextRef?.getToken() : null;

    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    } else if (useAuth) {
        console.warn(`API call to ${endpoint} requires auth, but no token found.`);
        // Depending on strictness, you might throw an error here if token is absolutely required
        // throw new Error("Authentication token is missing for protected endpoint.");
    }

    const headers = { ...defaultHeaders, ...customHeaders };

    // Ensure window.location.origin is available (not in SSR)
    const apiBaseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    if (!apiBaseUrl) {
        console.error("Cannot determine window.location.origin");
        throw new Error("Cannot determine API base URL.");
    }
    // Ensure endpoint starts with '/' and construct full URL
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    let apiUrl = `${apiBaseUrl}/api/v1${cleanEndpoint}`; // Prepends /api/v1

    // Add cache buster only for GET requests
    if (!options.method || options.method.toUpperCase() === 'GET') {
        const cacheBuster = `_=${Date.now()}`;
        apiUrl += (apiUrl.includes('?') ? '&' : '?') + cacheBuster;
    }

    try {
        console.debug(`API Request: ${options.method || 'GET'} ${apiUrl}`, body ? { body } : {}); // Log body only if it exists
        const response = await fetch(apiUrl, {
            ...restOptions,
            headers,
            body, // Pass body directly (expects stringified JSON or FormData)
        });

        // --- Error Handling ---
        if (!response.ok) {
            let errorDetail = `API Error: ${response.status} ${response.statusText}`;
            const errorStatus = response.status;
            try {
                // Try to parse backend error detail
                const errorData = await response.json();
                if (errorStatus === 401 && useAuth && authContextRef?.logout) {
                     console.warn("Received 401 Unauthorized, logging out.");
                    errorDetail = "Authentication failed or token expired. Please log in again.";
                    authContextRef.logout(); // Automatically log out user
                } else if (errorStatus === 422 && errorData.detail && Array.isArray(errorData.detail)) {
                    // --- Format FastAPI 422 Validation Errors ---
                    console.warn("Received 422 Validation Error:", errorData.detail);
                    errorDetail = "Validation Error(s): " + errorData.detail.map((err: any) => {
                        // err.loc gives the location, e.g., ["body", "name"] -> "name"
                        // err.msg gives the error message
                        // err.type gives the error type
                        const field = err.loc?.slice(1).join('.') || 'general'; // Try to get field name
                        return `${field}: ${err.msg}`;
                    }).join('; ');
                    // --- End Formatting ---
                } else {
                    // Use detail field if available, otherwise stringify the whole error data
                    errorDetail = errorData.detail || JSON.stringify(errorData);
                }
            } catch (e) {
                // If parsing error JSON fails (e.g., HTML error page), use the status text
                 console.warn(`Could not parse error response body for status ${errorStatus}. Using status text.`);
                 // errorDetail remains as initially set
            }
            console.error(`API Response Error for ${apiUrl}: Status ${errorStatus}, Detail: ${errorDetail}`);
            // Throw an error object with status and message
            const error: Error & { status?: number } = new Error(errorDetail);
            error.status = errorStatus;
            throw error;
        }

        // --- Success Handling ---
        // Handle 204 No Content or cases where we don't want to parse JSON
        if (response.status === 204 || !parseResponse) {
            console.debug(`API Response Success (Status ${response.status}, Not Parsing): ${options.method || 'GET'} ${apiUrl}`);
            // Return undefined for void promises or non-JSON responses
            // Use `as unknown as T` to satisfy TypeScript for void returns
            return undefined as unknown as T;
        }

        // Parse successful JSON response
        const data: T = await response.json();
        console.debug(`API Response Success (Status ${response.status}) for ${apiUrl}:`, data);
        return data;

    } catch (error) {
        // Catch fetch errors (network issues) or errors thrown above
        // Log the error that was actually thrown (could be network error or the custom one)
        console.error(`API Fetch/Processing Error for ${apiUrl}:`, error instanceof Error ? error.message : error);

        // Check if it's the custom error with status code, otherwise it might be a network error
        if (error instanceof Error && 'status' in error) {
             // This is likely our custom error thrown above
             throw error;
        } else {
             // Likely a network error (TypeError: Failed to fetch) or other unexpected issue
             // Wrap it in a standard Error object if it isn't already
             const networkError = error instanceof Error ? error : new Error('Network error or unexpected issue during API call.');
             throw networkError; // Re-throw the wrapped/original error
        }
    }
};

// --- User API Functions --- (Assuming trailing slash based on previous context)
const USER_ENDPOINT = '/users';
export const getUsers = (skip: number = 0, limit: number = 100) =>
    apiClient<UserWithRoles[]>(`${USER_ENDPOINT}/?skip=${skip}&limit=${limit}`); // GET /users/?...
export const updateUser = (userId: number, payload: UserUpdatePayload) =>
    apiClient<UserWithRoles>(`${USER_ENDPOINT}/${userId}/`, { // PUT /users/{id}/
        method: 'PUT',
        body: JSON.stringify(payload)
    });
export const assignRoleToUser = (userId: number, roleId: number) =>
    apiClient<UserWithRoles>(`${USER_ENDPOINT}/${userId}/roles`, { // POST /users/{id}/roles/
        method: 'POST',
        body: JSON.stringify({ role_id: roleId })
    });
export const removeRoleFromUser = (userId: number, roleId: number) =>
    apiClient<UserWithRoles>(`${USER_ENDPOINT}/${userId}/roles/${roleId}`, { // DELETE /users/{id}/roles/{id}/
        method: 'DELETE',
        parseResponse: false // Expect 204 No Content or similar
    });

export const getSystemStatus = () =>
    apiClient<SystemStatusReport>('/dashboard/status'); // No trailing slash    

// --- Role API Functions --- (Assuming trailing slash based on previous context)
const ROLE_ENDPOINT = '/roles';
export const getRoles = () =>
    apiClient<Role[]>(`${ROLE_ENDPOINT}/`); // GET /roles/


// --- API Key API Functions --- (Assuming trailing slash based on previous context)
const APIKEY_ENDPOINT = '/apikeys';
export const getApiKeys = () => apiClient<ApiKey[]>(`${APIKEY_ENDPOINT}/`); // GET /apikeys/
export const createApiKey = (data: { name: string }) => apiClient<ApiKeyCreateResponse>(`${APIKEY_ENDPOINT}/`, { method: 'POST', body: JSON.stringify(data) }); // POST /apikeys/
export const getApiKey = (id: number) => apiClient<ApiKey>(`${APIKEY_ENDPOINT}/${id}/`); // GET /apikeys/{id}/
export const deleteApiKey = (id: number) => apiClient<void>(`${APIKEY_ENDPOINT}/${id}/`, { method: 'DELETE', parseResponse: false }); // DELETE /apikeys/{id}/
export const updateApiKey = (id: number, data: { name?: string; is_active?: boolean; expires_at?: string | null }) => apiClient<ApiKey>(`${APIKEY_ENDPOINT}/${id}/`, { method: 'PUT', body: JSON.stringify(data) }); // PUT /apikeys/{id}/


// --- Ruleset API Functions --- (Using /rules-engine base, no trailing slashes)
const RULESET_ENDPOINT_BASE = '/rules-engine/rulesets'; // Path after /api/v1

export const getRulesets = (skip: number = 0, limit: number = 100) =>
    apiClient<Ruleset[]>(`${RULESET_ENDPOINT_BASE}?skip=${skip}&limit=${limit}`); // GET /api/v1/rules-engine/rulesets

export const getRulesetById = (id: number) =>
    apiClient<Ruleset>(`${RULESET_ENDPOINT_BASE}/${id}`); // GET /api/v1/rules-engine/rulesets/{id}

export const createRuleset = (data: RulesetCreate) =>
    apiClient<Ruleset>(`${RULESET_ENDPOINT_BASE}`, { // POST /api/v1/rules-engine/rulesets
        method: 'POST',
        body: JSON.stringify(data)
    });

export const updateRuleset = (id: number, data: Partial<RulesetCreate>) => // Assuming update uses same partial shape
    apiClient<Ruleset>(`${RULESET_ENDPOINT_BASE}/${id}`, { // PUT /api/v1/rules-engine/rulesets/{id}
        method: 'PUT',
        body: JSON.stringify(data)
    });

export const deleteRuleset = (id: number) =>
    apiClient<void>(`${RULESET_ENDPOINT_BASE}/${id}`, { // DELETE /api/v1/rules-engine/rulesets/{id}
        method: 'DELETE',
        parseResponse: false // Expect 204 No Content
    });


// --- Rule API Functions --- (Using /rules-engine base, no trailing slashes)
const RULE_ENDPOINT_BASE = '/rules-engine/rules'; // Path after /api/v1

// Get rules filtered by ruleset_id using query parameter
export const getRulesByRuleset = (rulesetId: number, skip: number = 0, limit: number = 100) =>
    apiClient<Rule[]>(`${RULE_ENDPOINT_BASE}?ruleset_id=${rulesetId}&skip=${skip}&limit=${limit}`); // GET /api/v1/rules-engine/rules?ruleset_id=...

// Get a single rule by its ID
export const getRuleById = (ruleId: number) =>
    apiClient<Rule>(`${RULE_ENDPOINT_BASE}/${ruleId}`); // GET /api/v1/rules-engine/rules/{rule_id}

// Create a new rule (ensure RuleCreate includes ruleset_id)
export const createRule = (data: RuleCreate) =>
     apiClient<Rule>(`${RULE_ENDPOINT_BASE}`, { // POST /api/v1/rules-engine/rules
         method: 'POST',
         body: JSON.stringify(data)
     });

// Update an existing rule
export const updateRule = (ruleId: number, data: RuleUpdate) =>
     apiClient<Rule>(`${RULE_ENDPOINT_BASE}/${ruleId}`, { // PUT /api/v1/rules-engine/rules/{rule_id}
         method: 'PUT',
         body: JSON.stringify(data)
     });

// Delete a rule
export const deleteRule = (ruleId: number) =>
     apiClient<void>(`${RULE_ENDPOINT_BASE}/${ruleId}`, { // DELETE /api/v1/rules-engine/rules/{rule_id}
        method: 'DELETE',
        parseResponse: false // Expect 204 No Content
    });

// --- END OF API FUNCTIONS ---
