// src/services/api.ts
import { AuthContextType } from '../context/AuthContext';
import { API_V1_PREFIX } from '../config/constants'; // Keep this import

// --- Import Schemas ---
import {
    Rule,
    RuleCreate,
    RuleUpdate,
    Ruleset,
    RulesetCreate,
    ApiKey,
    ApiKeyCreatePayload,
    ApiKeyCreateResponse,
    ApiKeyUpdatePayload,
    User,
    UserUpdatePayload,
    Role,
    HealthCheckResponse, // Keep using the schema type
} from './schemas';

// --- Auth Context Reference ---
let authContextRef: AuthContextType | null = null;

export const setAuthContextRef = (auth: AuthContextType) => {
    authContextRef = auth;
};


// --- apiClient Implementation (Reverted: remove skipApiPrefix) ---
interface FetchOptions extends RequestInit {
    useAuth?: boolean;
    parseResponse?: boolean;
    // skipApiPrefix?: boolean; // <-- REMOVE this option
}

export const apiClient = async <T>(
    endpoint: string, // Path AFTER /api/v1
    options: FetchOptions = {}
): Promise<T> => {
    // const { useAuth = true, headers: customHeaders, parseResponse = true, body, skipApiPrefix = false, ...restOptions } = options; // <-- Revert
    const { useAuth = true, headers: customHeaders, parseResponse = true, body, ...restOptions } = options; // <-- Use this line

    const defaultHeaders: Record<string, string> = {
        ...(body && !(body instanceof FormData) && { 'Content-Type': 'application/json' }),
        'Accept': 'application/json',
    };

    // --- Auth Check (remains the same) ---
    if (useAuth && !authContextRef?.getToken()) {
        const errorMessage = `API call to ${endpoint} requires authentication, but no token or AuthContext is available.`;
        console.error(errorMessage);
        const error: Error & { status?: number } = new Error(errorMessage);
        error.status = 401;
        throw error;
    }
    const token = useAuth ? authContextRef?.getToken() : null;
    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }
    // --- End Auth Check ---

    const headers = { ...defaultHeaders, ...customHeaders };
    const apiBaseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    if (!apiBaseUrl) {
        console.error("Cannot determine window.location.origin. API calls may fail.");
        throw new Error("Cannot determine API base URL.");
    }

    // --- URL Construction (Reverted: Always use prefix) ---
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    // if (skipApiPrefix) { ... } else { ... } // <-- REMOVE conditional logic
    let apiUrl = `${apiBaseUrl}${API_V1_PREFIX}${cleanEndpoint}`; // <-- Always prepend API prefix
    // --- End URL Construction ---

    // --- Cache Buster (remains the same) ---
    if (!options.method || options.method.toUpperCase() === 'GET') {
        const cacheBuster = `_=${Date.now()}`;
        apiUrl += (apiUrl.includes('?') ? '&' : '?') + cacheBuster;
    }

    // --- Fetch and Response Handling (remains the same) ---
    try {
        // ... (fetch logic, response handling, error handling) ...
        console.debug(`API Request: ${options.method || 'GET'} ${apiUrl}`, body ? { body } : {});
        const response = await fetch(apiUrl, {
            ...restOptions,
            headers,
            body,
        });

        if (!response.ok) {
            let errorDetail: string | object = `API Error: ${response.status} ${response.statusText}`;
            const errorStatus = response.status;
            try {
                const errorData = await response.json();
                if (errorStatus === 401 && useAuth && authContextRef?.logout) {
                    console.warn("Received 401 Unauthorized from server, logging out.");
                    errorDetail = "Authentication failed or token expired. Please log in again.";
                    authContextRef.logout();
                } else if (errorStatus === 422 && errorData.detail && Array.isArray(errorData.detail)) {
                    console.warn("Received 422 Validation Error:", errorData.detail);
                    errorDetail = "Validation Error(s): " + errorData.detail.map((err: any) => {
                        const field = err.loc?.slice(1).join('.') || 'general';
                        return `${field}: ${err.msg}`;
                    }).join('; ');
                } else {
                    errorDetail = errorData.detail || errorData;
                }
            } catch (e) {
                 console.warn(`Could not parse error response body for status ${errorStatus}. Using status text.`);
            }
            console.error(`API Response Error for ${apiUrl}: Status ${errorStatus}, Detail:`, errorDetail);
            const error: Error & { status?: number, detail?: any } = new Error(typeof errorDetail === 'string' ? errorDetail : `HTTP ${errorStatus}`);
            error.status = errorStatus;
            error.detail = errorDetail;
            throw error;
        }

        if (response.status === 204 || !parseResponse) {
             return undefined as unknown as T;
        }

        const data: T = await response.json();
        return data;

    } catch (error) {
        console.error(`API Fetch/Processing Error for ${apiUrl}:`, error instanceof Error ? error.message : error);
        if (error instanceof Error) {
             throw error;
        } else {
             throw new Error('An unexpected issue occurred during the API call.');
        }
    }
};


// === API Function Definitions ===

// --- System & Health ---
const SYSTEM_ENDPOINT = '/system'; // Base path for system endpoints

/** Retrieves the list of configured identifiers for known system input sources. */
export const getKnownInputSources = () =>
    apiClient<string[]>(`${SYSTEM_ENDPOINT}/input-sources`); // GET /api/v1/system/input-sources

/** Retrieves the system health check report. */
export const getDashboardStatus = () =>
    apiClient<SystemStatusReport>('/dashboard/status');

// --- User Management ---
// ... (functions remain the same) ...
const USER_ENDPOINT = '/users';

export const getCurrentUser = () => apiClient<User>(`${USER_ENDPOINT}/me`);
export const getUsers = (skip: number = 0, limit: number = 100) =>
    apiClient<User[]>(`${USER_ENDPOINT}?skip=${skip}&limit=${limit}`);
export const updateUser = (userId: number, payload: UserUpdatePayload) =>
    apiClient<User>(`${USER_ENDPOINT}/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
export const assignRoleToUser = (userId: number, roleId: number) =>
    apiClient<User>(`${USER_ENDPOINT}/${userId}/roles`, {
        method: 'POST',
        body: JSON.stringify({ role_id: roleId })
    });
export const removeRoleFromUser = (userId: number, roleId: number) =>
    apiClient<User>(`${USER_ENDPOINT}/${userId}/roles/${roleId}`, {
        method: 'DELETE',
    });

// --- Role Management ---
const ROLE_ENDPOINT = '/roles';

export const getRoles = () =>
    apiClient<Role[]>(`${ROLE_ENDPOINT}`);

// --- API Key Management ---
const APIKEY_ENDPOINT = '/apikeys';

export const getApiKeys = () => apiClient<ApiKey[]>(`${APIKEY_ENDPOINT}`);
export const createApiKey = (data: ApiKeyCreatePayload) =>
    apiClient<ApiKeyCreateResponse>(`${APIKEY_ENDPOINT}`, {
        method: 'POST',
        body: JSON.stringify(data)
    });
export const getApiKey = (id: number) => apiClient<ApiKey>(`${APIKEY_ENDPOINT}/${id}`);
export const deleteApiKey = (id: number) =>
    apiClient<void>(`${APIKEY_ENDPOINT}/${id}`, {
        method: 'DELETE',
        parseResponse: false
    });
export const updateApiKey = (id: number, data: ApiKeyUpdatePayload) =>
    apiClient<ApiKey>(`${APIKEY_ENDPOINT}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });

// --- Ruleset Management ---
// ... (functions remain the same) ...
const RULESET_ENDPOINT_BASE = '/rules-engine/rulesets';

export const getRulesets = (skip: number = 0, limit: number = 100) =>
    apiClient<Ruleset[]>(`${RULESET_ENDPOINT_BASE}?skip=${skip}&limit=${limit}`);
export const getRulesetById = (id: number) =>
    apiClient<Ruleset>(`${RULESET_ENDPOINT_BASE}/${id}`);
export const createRuleset = (data: RulesetCreate) =>
    apiClient<Ruleset>(`${RULESET_ENDPOINT_BASE}`, {
        method: 'POST',
        body: JSON.stringify(data)
    });
export const updateRuleset = (id: number, data: Partial<RulesetCreate>) =>
    apiClient<Ruleset>(`${RULESET_ENDPOINT_BASE}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
export const deleteRuleset = (id: number) =>
    apiClient<void>(`${RULESET_ENDPOINT_BASE}/${id}`, {
        method: 'DELETE',
        parseResponse: false
    });

// --- Rule Management ---
// ... (functions remain the same) ...
const RULE_ENDPOINT_BASE = '/rules-engine/rules';

export const getRulesByRuleset = (rulesetId: number, skip: number = 0, limit: number = 100) =>
    apiClient<Rule[]>(`${RULE_ENDPOINT_BASE}?ruleset_id=${rulesetId}&skip=${skip}&limit=${limit}`);
export const getRuleById = (ruleId: number) =>
    apiClient<Rule>(`${RULE_ENDPOINT_BASE}/${ruleId}`);
export const createRule = (data: RuleCreate) =>
     apiClient<Rule>(`${RULE_ENDPOINT_BASE}`, {
         method: 'POST',
         body: JSON.stringify(data)
     });
export const updateRule = (ruleId: number, data: RuleUpdate) =>
     apiClient<Rule>(`${RULE_ENDPOINT_BASE}/${ruleId}`, {
         method: 'PUT',
         body: JSON.stringify(data)
     });
export const deleteRule = (ruleId: number) =>
     apiClient<void>(`${RULE_ENDPOINT_BASE}/${ruleId}`, {
        method: 'DELETE',
        parseResponse: false
    });

// --- END OF API FUNCTIONS ---
