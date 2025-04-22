// src/services/api.ts

import axios from 'axios'; // Assuming axios is used, adjust if using fetch directly in apiClient
import { AuthContextType } from '../context/AuthContext';
import { API_V1_PREFIX } from '../config/constants'; // Ensure this is '/api/v1' (no trailing slash)

// --- Import Schemas ---
import {
    Rule,
    RuleCreate,
    RuleUpdate,
    RuleSet,
    RuleSetCreate,
    RuleSetUpdate,
    ApiKey,
    ApiKeyCreatePayload,
    ApiKeyCreateResponse,
    ApiKeyUpdatePayload,
    User,
    UserUpdatePayload,
    Role,
    HealthCheckResponse,
    SystemStatusReport,
    DicomWebPollersStatusResponse,
    DimseListenerStatus,
    DimseListenersStatusResponse,
    DicomWebSourceConfigRead,
    DicomWebSourceConfigCreate,
    DicomWebSourceConfigUpdate,
} from './schemas'; // Ensure path is correct

// --- Import Sonner ---
import { toast } from 'sonner'; // Import Sonner toast function

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
    endpoint: string, // Expect path STARTING WITH '/' e.g., '/config/dicomweb-sources'
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
        toast.error(errorMessage); // Notify user via toast
        const error: Error & { status?: number } = new Error(errorMessage);
        error.status = 401;
        throw error;
    }
    const token = useAuth ? authContextRef?.getToken() : null;
    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const headers = { ...defaultHeaders, ...customHeaders };

    // --- CORRECTED URL CONSTRUCTION ---
    // Ensure endpoint starts with '/' if it doesn't (belt-and-suspenders)
    const safeEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    // Simple concatenation assuming API_V1_PREFIX is like '/api/v1' (no trailing slash)
    // This creates a relative URL like '/api/v1/config/dicomweb-sources'
    let apiUrl = `${API_V1_PREFIX}${safeEndpoint}`;
    // --- END CORRECTED URL CONSTRUCTION ---


    // Cache Buster for GET
    if (!options.method || options.method.toUpperCase() === 'GET') {
        const cacheBuster = `_=${Date.now()}`;
        apiUrl += (apiUrl.includes('?') ? '&' : '?') + cacheBuster;
    }

    // Fetch and Response Handling
    try {
        // Use the relative URL for the fetch request
        console.debug(`API Request: ${options.method || 'GET'} ${apiUrl}`, body ? { body: '<hidden>' } : {});
        const response = await fetch(apiUrl, { // Fetch uses the relative apiUrl
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
                    // Optionally trigger logout immediately if context provides it
                    authContextRef.logout();
                } else if (errorStatus === 422 && errorData.detail && Array.isArray(errorData.detail)) {
                    console.warn("Received 422 Validation Error:", errorData.detail);
                    // Format validation errors for display if needed, or pass raw
                    errorDetail = errorData; // Pass the raw detail
                } else {
                     // Prioritize detail if it exists, otherwise use the errorData or status text
                    errorDetail = errorData.detail || errorData || `HTTP ${errorStatus} ${response.statusText}`;
                }
            } catch (e) {
                 // Error parsing JSON body - use status text
                 console.warn(`Could not parse error response body for status ${errorStatus}. Using status text.`);
                 errorDetail = `HTTP ${errorStatus} ${response.statusText}`; // Fallback detail
            }
            console.error(`API Response Error for ${apiUrl}: Status ${errorStatus}, Detail:`, errorDetail);
            // Send detail to toast if it's a string or a simplified message
            const toastMessage = typeof errorDetail === 'string' ? errorDetail :
                                  (errorStatus === 422 ? 'Validation Error' : `API Error ${errorStatus}`);
            toast.error(toastMessage);
            const error: Error & { status?: number, detail?: any } = new Error(typeof errorDetail === 'string' ? errorDetail : `HTTP ${errorStatus}`);
            error.status = errorStatus;
            error.detail = errorDetail; // Attach parsed detail if available
            throw error;
        }

        // Handle 204 No Content or cases where we don't parse
        if (response.status === 204 || !parseResponse) {
             return undefined as T;
        }

        const data: T = await response.json();
        return data;

    } catch (error) {
        console.error(`API Fetch/Processing Error for ${apiUrl}:`, error instanceof Error ? error.message : error);
        // Ensure error is always an Error object before re-throwing
        if (error instanceof Error) {
             // Avoid double-toasting if the error originated from the !response.ok block (it already has status)
             if (!('status' in error)) {
                toast.error(error.message || 'An unexpected network error occurred.');
             }
             throw error;
        } else {
             // If it's not an Error object (e.g., just a string), create one
             const genericError = new Error('An unexpected issue occurred during the API call.');
             toast.error(genericError.message);
             throw genericError;
        }
    }
};


// === API Function Definitions ===
// (Ensure template literals `` are used correctly below where needed)

// --- System & Health ---
const SYSTEM_ENDPOINT = '/system';

export const getKnownInputSources = () =>
    apiClient<string[]>(`${SYSTEM_ENDPOINT}/input-sources`);

export const getSystemHealth = () =>
    apiClient<HealthCheckResponse>(`${SYSTEM_ENDPOINT}/health`, { useAuth: false });

export const getDashboardStatus = () =>
    apiClient<SystemStatusReport>('/dashboard/status'); // No variable, quotes are fine

export const getDicomWebPollersStatus = async (): Promise<DicomWebPollersStatusResponse> => {
    return apiClient<DicomWebPollersStatusResponse>(`${SYSTEM_ENDPOINT}/dicomweb-pollers/status`);
};

export const getDimseListenersStatus = async (): Promise<DimseListenersStatusResponse> => {
    return apiClient<DimseListenersStatusResponse>(`${SYSTEM_ENDPOINT}/dimse-listeners/status`);
};


// --- User Management ---
const USER_ENDPOINT = '/users'; // Base constant

export const getCurrentUser = () => apiClient<User>(`${USER_ENDPOINT}/me`);
export const getUsers = (skip: number = 0, limit: number = 100) =>
    apiClient<User[]>(`${USER_ENDPOINT}?skip=${skip}&limit=${limit}`); // Use backticks for query params
export const updateUser = (userId: number, payload: UserUpdatePayload) =>
    apiClient<User>(`${USER_ENDPOINT}/${userId}`, { // Use backticks for path param
        method: 'PUT',
        body: JSON.stringify(payload)
    });
export const assignRoleToUser = (userId: number, roleId: number) =>
    apiClient<User>(`${USER_ENDPOINT}/${userId}/roles`, { // Use backticks for path param
        method: 'POST',
        body: JSON.stringify({ role_id: roleId })
    });
export const removeRoleFromUser = (userId: number, roleId: number) =>
    apiClient<User>(`${USER_ENDPOINT}/${userId}/roles/${roleId}`, { // Use backticks for path params
        method: 'DELETE',
    });

// --- Role Management ---
const ROLE_ENDPOINT = '/roles'; // Base constant

export const getRoles = () =>
    apiClient<Role[]>(`${ROLE_ENDPOINT}`);

// --- API Key Management ---
const APIKEY_ENDPOINT = '/apikeys'; // Base constant

export const getApiKeys = () => apiClient<ApiKey[]>(`${APIKEY_ENDPOINT}`);
export const createApiKey = (data: ApiKeyCreatePayload) =>
    apiClient<ApiKeyCreateResponse>(`${APIKEY_ENDPOINT}`, {
        method: 'POST',
        body: JSON.stringify(data)
    });
export const getApiKey = (id: number) => apiClient<ApiKey>(`${APIKEY_ENDPOINT}/${id}`); // Use backticks
export const deleteApiKey = (id: number) =>
    apiClient<void>(`${APIKEY_ENDPOINT}/${id}`, { // Use backticks
        method: 'DELETE',
        parseResponse: false
    });
export const updateApiKey = (id: number, data: ApiKeyUpdatePayload) =>
    apiClient<ApiKey>(`${APIKEY_ENDPOINT}/${id}`, { // Use backticks
        method: 'PUT',
        body: JSON.stringify(data)
    });

// --- Ruleset Management ---
const RULESET_ENDPOINT_BASE = '/rules-engine/rulesets'; // Base constant

export const getRulesets = (skip: number = 0, limit: number = 100) =>
    apiClient<RuleSet[]>(`${RULESET_ENDPOINT_BASE}?skip=${skip}&limit=${limit}`); // Use backticks
export const getRulesetById = (id: number) =>
    apiClient<RuleSet>(`${RULESET_ENDPOINT_BASE}/${id}`); // Use backticks
export const createRuleset = (data: RuleSetCreate) =>
    apiClient<RuleSet>(`${RULESET_ENDPOINT_BASE}`, {
        method: 'POST',
        body: JSON.stringify(data)
    });
export const updateRuleset = (id: number, data: RuleSetUpdate) =>
    apiClient<RuleSet>(`${RULESET_ENDPOINT_BASE}/${id}`, { // Use backticks
        method: 'PUT',
        body: JSON.stringify(data)
    });
export const deleteRuleset = (id: number) =>
    apiClient<void>(`${RULESET_ENDPOINT_BASE}/${id}`, { // Use backticks
        method: 'DELETE',
        parseResponse: false
    });

// --- Rule Management ---
const RULE_ENDPOINT_BASE = '/rules-engine/rules'; // Base constant

export const getRulesByRuleset = (rulesetId: number, skip: number = 0, limit: number = 100) =>
    apiClient<Rule[]>(`${RULE_ENDPOINT_BASE}?ruleset_id=${rulesetId}&skip=${skip}&limit=${limit}`); // Use backticks
export const getRuleById = (ruleId: number) =>
    apiClient<Rule>(`${RULE_ENDPOINT_BASE}/${ruleId}`); // Use backticks
export const createRule = (data: RuleCreate) =>
     apiClient<Rule>(`${RULE_ENDPOINT_BASE}`, {
         method: 'POST',
         body: JSON.stringify(data)
     });
export const updateRule = (ruleId: number, data: RuleUpdate) =>
     apiClient<Rule>(`${RULE_ENDPOINT_BASE}/${ruleId}`, { // Use backticks
         method: 'PUT',
         body: JSON.stringify(data)
     });
export const deleteRule = (ruleId: number) =>
     apiClient<void>(`${RULE_ENDPOINT_BASE}/${ruleId}`, { // Use backticks
        method: 'DELETE',
        parseResponse: false
    });


// --- Configuration Management ---

// --- DICOMweb Source Configuration ---
const DICOMWEB_CONFIG_ENDPOINT = '/config/dicomweb-sources'; // Base constant

export const createDicomWebSource = (data: DicomWebSourceConfigCreate) =>
    apiClient<DicomWebSourceConfigRead>(`${DICOMWEB_CONFIG_ENDPOINT}`, {
        method: 'POST',
        body: JSON.stringify(data),
    });

export const getDicomWebSources = (skip: number = 0, limit: number = 100) =>
    apiClient<DicomWebSourceConfigRead[]>(`${DICOMWEB_CONFIG_ENDPOINT}?skip=${skip}&limit=${limit}`); // Use backticks

export const getDicomWebSourceById = (id: number) =>
    apiClient<DicomWebSourceConfigRead>(`${DICOMWEB_CONFIG_ENDPOINT}/${id}`); // Use backticks

export const updateDicomWebSource = (id: number, data: DicomWebSourceConfigUpdate) =>
    apiClient<DicomWebSourceConfigRead>(`${DICOMWEB_CONFIG_ENDPOINT}/${id}`, { // Use backticks
        method: 'PUT',
        body: JSON.stringify(data),
    });

export const deleteDicomWebSource = (id: number) =>
    apiClient<void>(`${DICOMWEB_CONFIG_ENDPOINT}/${id}`, { // Use backticks
        method: 'DELETE',
        parseResponse: false
    });
// --- END DICOMweb Source Configuration ---

// --- END OF API FUNCTIONS ---
