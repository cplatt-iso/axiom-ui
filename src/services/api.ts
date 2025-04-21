// src/services/api.ts

import axios from 'axios'; // Assuming axios is used, adjust if using fetch directly in apiClient
import { AuthContextType } from '../context/AuthContext';
import { API_V1_PREFIX } from '../config/constants';

// --- Import Schemas ---
import {
    Rule,
    RuleCreate,
    RuleUpdate,
    RuleSet, // Changed from Ruleset to RuleSet for consistency
    RuleSetCreate,
    RuleSetUpdate, // Added update type
    ApiKey,
    ApiKeyCreatePayload,
    ApiKeyCreateResponse,
    ApiKeyUpdatePayload,
    User,
    UserUpdatePayload,
    Role,
    HealthCheckResponse,
    SystemStatusReport, // Added for dashboard status
    DicomWebPollersStatusResponse,
    DimseListenerStatus, 
    DimseListenersStatusResponse,
} from './schemas'; // Correct path - Assuming schemas.ts is in the same dir, adjust if not

// --- Auth Context Reference ---
let authContextRef: AuthContextType | null = null;

export const setAuthContextRef = (auth: AuthContextType) => {
    authContextRef = auth;
};

// --- apiClient Implementation ---
interface FetchOptions extends RequestInit {
    useAuth?: boolean;
    parseResponse?: boolean;
}

export const apiClient = async <T>(
    endpoint: string, // Path AFTER /api/v1
    options: FetchOptions = {}
): Promise<T> => {
    const { useAuth = true, headers: customHeaders, parseResponse = true, body, ...restOptions } = options;

    const defaultHeaders: Record<string, string> = {
        ...(body && !(body instanceof FormData) && { 'Content-Type': 'application/json' }),
        'Accept': 'application/json',
    };

    // Auth Check
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

    const headers = { ...defaultHeaders, ...customHeaders };
    const apiBaseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    if (!apiBaseUrl) {
        console.error("Cannot determine window.location.origin. API calls may fail.");
        throw new Error("Cannot determine API base URL.");
    }

    // Always prepend API prefix
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    let apiUrl = `${apiBaseUrl}${API_V1_PREFIX}${cleanEndpoint}`;

    // Cache Buster for GET
    if (!options.method || options.method.toUpperCase() === 'GET') {
        const cacheBuster = `_=${Date.now()}`;
        apiUrl += (apiUrl.includes('?') ? '&' : '?') + cacheBuster;
    }

    // Fetch and Response Handling
    try {
        console.debug(`API Request: ${options.method || 'GET'} ${apiUrl}`, body ? { body: '<hidden>' } : {}); // Hide body in debug
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
                    errorDetail = errorData; // Pass the raw detail for component handling
                } else {
                    errorDetail = errorData.detail || errorData;
                }
            } catch (e) {
                 console.warn(`Could not parse error response body for status ${errorStatus}. Using status text.`);
            }
            console.error(`API Response Error for ${apiUrl}: Status ${errorStatus}, Detail:`, errorDetail);
            const error: Error & { status?: number, detail?: any } = new Error(typeof errorDetail === 'string' ? errorDetail : `HTTP ${errorStatus}`);
            error.status = errorStatus;
            error.detail = errorDetail; // Attach parsed detail if available
            throw error;
        }

        // Handle 204 No Content or cases where we don't parse
        if (response.status === 204 || !parseResponse) {
             // Return null for 204, which might happen if the listener status isn't found
             // Cast to T, assuming caller handles potential null/undefined
             return response.status === 204 ? null as T : undefined as T;
        }

        const data: T = await response.json();
        return data;

    } catch (error) {
        console.error(`API Fetch/Processing Error for ${apiUrl}:`, error instanceof Error ? error.message : error);
        if (error instanceof Error) {
             throw error; // Rethrow the original error (potentially with status/detail)
        } else {
             throw new Error('An unexpected issue occurred during the API call.');
        }
    }
};


// === API Function Definitions ===

// --- System & Health ---
const SYSTEM_ENDPOINT = '/system';

/** Retrieves the list of configured identifiers for known system input sources. */
export const getKnownInputSources = () =>
    apiClient<string[]>(`${SYSTEM_ENDPOINT}/input-sources`);

/** Retrieves the basic system health check report. */
export const getSystemHealth = () =>
    apiClient<HealthCheckResponse>(`${SYSTEM_ENDPOINT}/health`, { useAuth: false }); // Health check likely doesn't need auth

/** Retrieves the detailed dashboard status report. */
export const getDashboardStatus = () => // Assumes uses auth
    apiClient<SystemStatusReport>('/dashboard/status');

/** Fetches the status of configured DICOMweb pollers. */
export const getDicomWebPollersStatus = async (): Promise<DicomWebPollersStatusResponse> => {
    return apiClient<DicomWebPollersStatusResponse>(`${SYSTEM_ENDPOINT}/dicomweb-pollers/status`);
};

// --- NEW Dimse Listener Status Function ---
/** Fetches the status of the main DIMSE listener. Returns null if no status found. */
// export const getDimseListenerStatus = async (): Promise<DimseListenerStatus | null> => {
    // Use apiClient which handles auth and errors.
    // The endpoint returns 200 OK with data OR 200 OK with null body if not found.
    // apiClient handles the null body case gracefully based on the response_model in the endpoint.
//    return apiClient<DimseListenerStatus | null>(`${SYSTEM_ENDPOINT}/dimse-listener/status`);
//};

export const getDimseListenersStatus = async (): Promise<DimseListenersStatusResponse> => { // Update return type
    // Use the plural API path
    return apiClient<DimseListenersStatusResponse>(`${SYSTEM_ENDPOINT}/dimse-listeners/status`); // Update expected type
};
// --- END NEW FUNCTION ---


// --- User Management ---
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
const RULESET_ENDPOINT_BASE = '/rules-engine/rulesets'; // <-- Check if this prefix is correct

export const getRulesets = (skip: number = 0, limit: number = 100) =>
    apiClient<RuleSet[]>(`${RULESET_ENDPOINT_BASE}?skip=${skip}&limit=${limit}`); // Use RuleSet type
export const getRulesetById = (id: number) =>
    apiClient<RuleSet>(`${RULESET_ENDPOINT_BASE}/${id}`); // Use RuleSet type
export const createRuleset = (data: RuleSetCreate) =>
    apiClient<RuleSet>(`${RULESET_ENDPOINT_BASE}`, { // Use RuleSet type
        method: 'POST',
        body: JSON.stringify(data)
    });
export const updateRuleset = (id: number, data: RuleSetUpdate) => // Use RuleSetUpdate type
    apiClient<RuleSet>(`${RULESET_ENDPOINT_BASE}/${id}`, { // Use RuleSet type
        method: 'PUT',
        body: JSON.stringify(data)
    });
export const deleteRuleset = (id: number) =>
    apiClient<void>(`${RULESET_ENDPOINT_BASE}/${id}`, {
        method: 'DELETE',
        parseResponse: false
    });

// --- Rule Management ---
const RULE_ENDPOINT_BASE = '/rules-engine/rules'; // <-- Check if this prefix is correct

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
