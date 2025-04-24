// src/services/api.ts
import { AuthContextType } from '../context/AuthContext';
import {
    UserWithRoles,
    Role,
    ApiKey,
    ApiKeyCreateResponse,
    ApiKeyCreatePayload,
    Ruleset,
    RulesetCreate,
    RulesetUpdate,
    Rule,
    RuleCreate,
    RuleUpdate,
    SystemStatusReport,
    DimseListenersStatusResponse,
    DimseListenerStatus,
    DicomWebPollersStatusResponse,
    DicomWebSourceStatus,
    DicomWebSourceConfigRead,
    DicomWebSourceConfigCreatePayload,
    DicomWebSourceConfigUpdatePayload,
    // Import DIMSE Config Types
    DimseListenerConfigRead,
    DimseListenerConfigCreatePayload,
    DimseListenerConfigUpdatePayload,
} from '../schemas';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// Auth Context Reference
let authContextRef: AuthContextType | null = null;
export const setAuthContextRef = (ref: AuthContextType | null) => {
    console.log("api.ts: Setting AuthContext Reference", ref ? "Instance provided" : "Null");
    authContextRef = ref;
};

// apiClient Helper
interface ApiClientOptions extends RequestInit {
    useAuth?: boolean;
}

export async function apiClient<T>(endpoint: string, options: ApiClientOptions = {}): Promise<T> {
    const { useAuth = true, headers: customHeaders, ...fetchOptions } = options;
    const url = `${API_BASE_URL}${endpoint}`;
    console.debug(`apiClient: Calling ${options.method || 'GET'} ${url}`);
    const headers: HeadersInit = { 'Content-Type': 'application/json', ...customHeaders };

    if (useAuth) {
         const token = authContextRef?.getToken();
         if (!token) {
              console.warn(`apiClient: No token found for authenticated request to ${endpoint}. Proceeding without token.`);
              // Optionally: throw new Error("Authentication token is missing.");
         } else {
              console.debug(`apiClient: Using token starting with ${token.substring(0, 10)}... for ${endpoint}`);
              if (token.startsWith('Api-Key ')) { headers['Authorization'] = token; }
              else if (token.includes('.')) { headers['Authorization'] = `Bearer ${token}`; }
              else { console.warn("apiClient: Token format unclear, sending raw value in Authorization header."); headers['Authorization'] = token; }
         }
    } else {
        console.debug(`apiClient: Auth explicitly disabled for ${endpoint}`);
    }

    try {
        const response = await fetch(url, { ...fetchOptions, headers });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: response.statusText }));
            console.error(`API Error ${response.status} calling ${endpoint}:`, errorData);
            if (response.status === 401 && useAuth) {
                console.warn(`apiClient: Received 401 Unauthorized for ${endpoint}. Logging out.`);
                authContextRef?.logout();
                 throw new Error("Session expired or invalid. Please log in again.");
            }
             const error = new Error(errorData.detail || `HTTP error ${response.status}`) as any;
             error.status = response.status;
             error.detail = errorData.detail;
             throw error;
        }
        if (response.status === 204) { return {} as T; }
        const data: T = await response.json();
        console.debug(`apiClient: Success calling ${endpoint}. Response status: ${response.status}`);
        return data;
    } catch (error: any) {
         console.error(`API Client Fetch Error for ${endpoint}:`, error);
         throw error;
    }
}


// --- API Function Definitions ---

// Users
export const getMe = (): Promise<UserWithRoles> => apiClient<UserWithRoles>('/users/me');
export const getUsers = (): Promise<UserWithRoles[]> => apiClient<UserWithRoles[]>('/users');
export const updateUser = (userId: number, data: Partial<UserWithRoles>): Promise<UserWithRoles> =>
    apiClient<UserWithRoles>(`/users/${userId}`, { method: 'PUT', body: JSON.stringify(data) });
export const assignRoleToUser = (userId: number, roleId: number): Promise<UserWithRoles> =>
     apiClient<UserWithRoles>(`/users/${userId}/roles`, { method: 'POST', body: JSON.stringify({ role_id: roleId }) });
export const removeRoleFromUser = (userId: number, roleId: number): Promise<UserWithRoles> =>
    apiClient<UserWithRoles>(`/users/${userId}/roles/${roleId}`, { method: 'DELETE' });

// Roles
export const getRoles = (): Promise<Role[]> => apiClient<Role[]>('/roles');

// API Keys
export const getApiKeys = (): Promise<ApiKey[]> => apiClient<ApiKey[]>('/apikeys/');
export const createApiKey = (data: ApiKeyCreatePayload): Promise<ApiKeyCreateResponse> =>
    apiClient<ApiKeyCreateResponse>('/apikeys/', { method: 'POST', body: JSON.stringify(data) });
export const deleteApiKey = (keyId: number): Promise<void> =>
    apiClient<void>(`/apikeys/${keyId}`, { method: 'DELETE' });

// RuleSets
export const getRulesets = (): Promise<Ruleset[]> => apiClient<Ruleset[]>('/rules-engine/rulesets');
export const getRulesetById = (id: number): Promise<Ruleset> => apiClient<Ruleset>(`/rules-engine/rulesets/${id}`);
export const createRuleset = (data: RulesetCreate): Promise<Ruleset> =>
    apiClient<Ruleset>('/rules-engine/rulesets', { method: 'POST', body: JSON.stringify(data) });
export const updateRuleset = (id: number, data: RulesetUpdate): Promise<Ruleset> =>
    apiClient<Ruleset>(`/rules-engine/rulesets/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteRuleset = (id: number): Promise<void> =>
    apiClient<void>(`/rules-engine/rulesets/${id}`, { method: 'DELETE' });

// Rules
export const getRulesByRuleset = (rulesetId: number): Promise<Rule[]> => apiClient<Rule[]>(`/rules-engine/rules?ruleset_id=${rulesetId}`);
export const createRule = (data: RuleCreate): Promise<Rule> =>
    apiClient<Rule>('/rules-engine/rules', { method: 'POST', body: JSON.stringify(data) });
export const updateRule = (id: number, data: RuleUpdate): Promise<Rule> =>
    apiClient<Rule>(`/rules-engine/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteRule = (id: number): Promise<void> =>
    apiClient<void>(`/rules-engine/rules/${id}`, { method: 'DELETE' });

// System & Dashboard
export const getDashboardStatus = (): Promise<SystemStatusReport> => apiClient<SystemStatusReport>('/dashboard/status');
export const getKnownInputSources = (): Promise<string[]> => apiClient<string[]>('/system/input-sources');
export const getDimseListenersStatus = (): Promise<DimseListenersStatusResponse> => apiClient<DimseListenersStatusResponse>('/system/dimse-listeners/status');
export const getDicomWebPollersStatus = (): Promise<DicomWebPollersStatusResponse> => apiClient<DicomWebPollersStatusResponse>('/system/dicomweb-pollers/status');


// DICOMweb Configuration Endpoints
export const getDicomWebSources = (skip: number = 0, limit: number = 100): Promise<DicomWebSourceConfigRead[]> =>
    apiClient<DicomWebSourceConfigRead[]>(`/config/dicomweb-sources?skip=${skip}&limit=${limit}`);
export const getDicomWebSourceById = (id: number): Promise<DicomWebSourceConfigRead> =>
    apiClient<DicomWebSourceConfigRead>(`/config/dicomweb-sources/${id}`);
export const createDicomWebSource = (data: DicomWebSourceConfigCreatePayload): Promise<DicomWebSourceConfigRead> =>
    apiClient<DicomWebSourceConfigRead>('/config/dicomweb-sources', { method: 'POST', body: JSON.stringify(data) });
export const updateDicomWebSource = (id: number, data: DicomWebSourceConfigUpdatePayload): Promise<DicomWebSourceConfigRead> =>
    apiClient<DicomWebSourceConfigRead>(`/config/dicomweb-sources/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteDicomWebSource = (id: number): Promise<DicomWebSourceConfigRead> =>
    apiClient<DicomWebSourceConfigRead>(`/config/dicomweb-sources/${id}`, { method: 'DELETE' });


// DIMSE Listener Configuration Endpoints
export const getDimseListenerConfigs = (skip: number = 0, limit: number = 100): Promise<DimseListenerConfigRead[]> =>
    apiClient<DimseListenerConfigRead[]>(`/config/dimse-listeners?skip=${skip}&limit=${limit}`);
export const getDimseListenerConfigById = (id: number): Promise<DimseListenerConfigRead> =>
    apiClient<DimseListenerConfigRead>(`/config/dimse-listeners/${id}`);
export const createDimseListenerConfig = (data: DimseListenerConfigCreatePayload): Promise<DimseListenerConfigRead> =>
    apiClient<DimseListenerConfigRead>('/config/dimse-listeners', { method: 'POST', body: JSON.stringify(data) });
export const updateDimseListenerConfig = (id: number, data: DimseListenerConfigUpdatePayload): Promise<DimseListenerConfigRead> =>
    apiClient<DimseListenerConfigRead>(`/config/dimse-listeners/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteDimseListenerConfig = (id: number): Promise<DimseListenerConfigRead> =>
    apiClient<DimseListenerConfigRead>(`/config/dimse-listeners/${id}`, { method: 'DELETE' });
