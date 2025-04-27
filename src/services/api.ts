// src/services/api.ts
import { AuthContextType } from '../context/AuthContext'; // Import context type
// --- Import Schemas ---
import {
    Ruleset, RulesetCreate, RulesetUpdate,
    Rule, RuleCreate, RuleUpdate,
    ApiKey, ApiKeyCreate, ApiKeyCreateResponse, ApiKeyUpdate,
    UserWithRoles, Role, UserUpdate as UserRoleUpdatePayload, // Use specific type for user role update
    SystemStatusReport,
    DicomWebSourceStatus, DicomWebPollersStatusResponse,
    DimseListenerStatus, DimseListenersStatusResponse,
    DicomWebSourceConfigRead, DicomWebSourceConfigCreatePayload, DicomWebSourceConfigUpdatePayload,
    DimseListenerConfigRead, DimseListenerConfigCreatePayload, DimseListenerConfigUpdatePayload,
    StorageBackendConfigRead, StorageBackendConfigCreatePayload, StorageBackendConfigUpdatePayload,
    Schedule, ScheduleCreate, ScheduleUpdate,
    DimseQueryRetrieveSourceRead, DimseQueryRetrieveSourceCreatePayload, DimseQueryRetrieveSourceUpdatePayload,
    DimseQrSourceStatus, DimseQrSourcesStatusResponse, // Import status schemas too
    CrosswalkDataSourceRead, CrosswalkDataSourceCreatePayload, CrosswalkDataSourceUpdatePayload,
    CrosswalkMapRead, CrosswalkMapCreatePayload, CrosswalkMapUpdatePayload
} from '../schemas';

// Store a reference to the AuthContext
let authContextRef: AuthContextType | null = null;

export function setAuthContextRef(context: AuthContextType) {
    console.log("API Service: AuthContext reference set.");
    authContextRef = context;
}

// Base URL for the API (adjust if your backend runs elsewhere)
// Use environment variable or a default
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api/v1';
console.log(`API Service: Using base URL: ${API_BASE_URL}`);

// Type for API options
interface ApiOptions extends RequestInit {
    params?: Record<string, string>; // For query parameters
    useAuth?: boolean; // Flag to control adding Auth header (defaults to true)
}

// Centralized API client function
export const apiClient = async <T>(
    endpoint: string,
    options: ApiOptions = {}
): Promise<T> => {
    const { params, useAuth = true, ...fetchOptions } = options;
    let url = `${API_BASE_URL}${endpoint}`;

    // Append query parameters if provided
    if (params) {
        const query = new URLSearchParams(params).toString();
        if (query) {
            url += `?${query}`;
        }
    }

    // Prepare headers
    const headers = new Headers(fetchOptions.headers || {});
    if (!headers.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }
    if (!headers.has('Accept')) {
        headers.set('Accept', 'application/json');
    }

    // Add Authorization header if useAuth is true and token is available
    if (useAuth) {
        const token = authContextRef?.getToken();
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
            // console.debug(`API Client: Sending request to ${endpoint} with Bearer token.`);
        } else {
            console.warn(`API Client: Auth requested for ${endpoint}, but no token found.`);
            // Optionally throw an error or proceed without auth depending on requirements
            // throw new Error("Authentication token is missing");
        }
    } else {
        // console.debug(`API Client: Sending request to ${endpoint} without auth header.`);
    }

    fetchOptions.headers = headers;

    try {
        console.debug(`API Client: Fetching ${fetchOptions.method || 'GET'} ${url}`);
        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
            let errorData;
            const contentType = response.headers.get("content-type");
            try {
                if (contentType && contentType.includes("application/json")) {
                    errorData = await response.json();
                } else {
                     errorData = { detail: await response.text() || `HTTP error ${response.status}` };
                }
            } catch (e) {
                 errorData = { detail: `HTTP error ${response.status}: Failed to parse error response.` };
            }
            console.error(`API Client Error: ${response.status} ${response.statusText} for ${url}`, errorData);
            // Throw an error object that includes status and detail
            const error: any = new Error(errorData?.detail || `HTTP error ${response.status}`);
            error.status = response.status;
            error.detail = errorData?.detail; // Attach detail if available
            throw error;
        }

        // Handle potential 204 No Content responses
        if (response.status === 204) {
            console.debug(`API Client: Received 204 No Content for ${url}`);
            return {} as T; // Return an empty object or null/undefined as appropriate for type T
        }

        // Assume JSON response for successful requests unless specifically handled otherwise
        const data: T = await response.json();
        console.debug(`API Client: Successfully received data for ${url}`);
        return data;
    } catch (error) {
        console.error(`API Client Fetch Error for ${url}:`, error);
        // Re-throw the error (could be the custom error thrown above or a network error)
        throw error;
    }
};


// --- Specific API Function Exports ---

// Rulesets
export const getRulesets = (): Promise<Ruleset[]> => apiClient<Ruleset[]>('/rules-engine/rulesets');
export const getRulesetById = (id: number): Promise<Ruleset> => apiClient<Ruleset>(`/rules-engine/rulesets/${id}`);
export const createRuleset = (data: RulesetCreate): Promise<Ruleset> => apiClient<Ruleset>('/rules-engine/rulesets', { method: 'POST', body: JSON.stringify(data) });
export const updateRuleset = (id: number, data: RulesetUpdate): Promise<Ruleset> => apiClient<Ruleset>(`/rules-engine/rulesets/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteRuleset = (id: number): Promise<void> => apiClient<void>(`/rules-engine/rulesets/${id}`, { method: 'DELETE' }); // Use void for 204

// Rules
export const getRulesByRuleset = (rulesetId: number): Promise<Rule[]> => apiClient<Rule[]>(`/rules-engine/rules?ruleset_id=${rulesetId}`);
export const getRuleById = (id: number): Promise<Rule> => apiClient<Rule>(`/rules-engine/rules/${id}`);
export const createRule = (data: RuleCreate): Promise<Rule> => apiClient<Rule>('/rules-engine/rules', { method: 'POST', body: JSON.stringify(data) });
export const updateRule = (id: number, data: RuleUpdate): Promise<Rule> => apiClient<Rule>(`/rules-engine/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteRule = (id: number): Promise<void> => apiClient<void>(`/rules-engine/rules/${id}`, { method: 'DELETE' });

// API Keys
export const getApiKeys = (): Promise<ApiKey[]> => apiClient<ApiKey[]>('/apikeys/');
export const createApiKey = (data: ApiKeyCreate): Promise<ApiKeyCreateResponse> => apiClient<ApiKeyCreateResponse>('/apikeys/', { method: 'POST', body: JSON.stringify(data) });
// export const updateApiKey = (id: number, data: ApiKeyUpdate): Promise<ApiKey> => apiClient<ApiKey>(`/apikeys/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteApiKey = (id: number): Promise<void> => apiClient<void>(`/apikeys/${id}`, { method: 'DELETE' });

// Users & Roles
export const getUsers = (): Promise<UserWithRoles[]> => apiClient<UserWithRoles[]>('/users/');
export const getRoles = (): Promise<Role[]> => apiClient<Role[]>('/roles/');
export const assignRoleToUser = (userId: number, roleId: number): Promise<UserWithRoles> => apiClient<UserWithRoles>(`/users/${userId}/roles`, { method: 'POST', body: JSON.stringify({ role_id: roleId }) });
export const removeRoleFromUser = (userId: number, roleId: number): Promise<UserWithRoles> => apiClient<UserWithRoles>(`/users/${userId}/roles/${roleId}`, { method: 'DELETE' });
export const updateUser = (userId: number, data: UserRoleUpdatePayload): Promise<UserWithRoles> => apiClient<UserWithRoles>(`/users/${userId}`, { method: 'PUT', body: JSON.stringify(data) });

// System & Dashboard Status
export const getDashboardStatus = (): Promise<SystemStatusReport> => apiClient<SystemStatusReport>('/dashboard/status');
export const getDicomWebPollersStatus = (): Promise<DicomWebPollersStatusResponse> => apiClient<DicomWebPollersStatusResponse>('/system/dicomweb-pollers/status');
export const getDimseListenersStatus = (): Promise<DimseListenersStatusResponse> => apiClient<DimseListenersStatusResponse>('/system/dimse-listeners/status');
export const getDimseQrSourcesStatus = (): Promise<DimseQrSourcesStatusResponse> => apiClient<DimseQrSourcesStatusResponse>('/system/dimse-qr-sources/status'); // Added
export const getKnownInputSources = (): Promise<string[]> => apiClient<string[]>('/system/input-sources');

// Config: DICOMweb Sources
export const getDicomWebSources = (skip: number = 0, limit: number = 100): Promise<DicomWebSourceConfigRead[]> => apiClient<DicomWebSourceConfigRead[]>(`/config/dicomweb-sources?skip=${skip}&limit=${limit}`);
export const createDicomWebSource = (data: DicomWebSourceConfigCreatePayload): Promise<DicomWebSourceConfigRead> => apiClient<DicomWebSourceConfigRead>('/config/dicomweb-sources', { method: 'POST', body: JSON.stringify(data) });
export const updateDicomWebSource = (id: number, data: DicomWebSourceConfigUpdatePayload): Promise<DicomWebSourceConfigRead> => apiClient<DicomWebSourceConfigRead>(`/config/dicomweb-sources/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteDicomWebSource = (id: number): Promise<DicomWebSourceConfigRead> => apiClient<DicomWebSourceConfigRead>(`/config/dicomweb-sources/${id}`, { method: 'DELETE' }); // Returns deleted obj

// Config: DIMSE Listeners
export const getDimseListenerConfigs = (skip: number = 0, limit: number = 100): Promise<DimseListenerConfigRead[]> => apiClient<DimseListenerConfigRead[]>(`/config/dimse-listeners?skip=${skip}&limit=${limit}`);
export const createDimseListenerConfig = (data: DimseListenerConfigCreatePayload): Promise<DimseListenerConfigRead> => apiClient<DimseListenerConfigRead>('/config/dimse-listeners', { method: 'POST', body: JSON.stringify(data) });
export const updateDimseListenerConfig = (id: number, data: DimseListenerConfigUpdatePayload): Promise<DimseListenerConfigRead> => apiClient<DimseListenerConfigRead>(`/config/dimse-listeners/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteDimseListenerConfig = (id: number): Promise<DimseListenerConfigRead> => apiClient<DimseListenerConfigRead>(`/config/dimse-listeners/${id}`, { method: 'DELETE' }); // Returns deleted obj

// Config: Storage Backends
export const getStorageBackendConfigs = (skip: number = 0, limit: number = 100): Promise<StorageBackendConfigRead[]> => apiClient<StorageBackendConfigRead[]>(`/config/storage-backends?skip=${skip}&limit=${limit}`);
export const createStorageBackendConfig = (data: StorageBackendConfigCreatePayload): Promise<StorageBackendConfigRead> => apiClient<StorageBackendConfigRead>('/config/storage-backends', { method: 'POST', body: JSON.stringify(data) });
export const updateStorageBackendConfig = (id: number, data: StorageBackendConfigUpdatePayload): Promise<StorageBackendConfigRead> => apiClient<StorageBackendConfigRead>(`/config/storage-backends/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteStorageBackendConfig = (id: number): Promise<StorageBackendConfigRead> => apiClient<StorageBackendConfigRead>(`/config/storage-backends/${id}`, { method: 'DELETE' }); // Returns deleted obj

// --- ADDED: Config: Schedules ---
export const getSchedules = (skip: number = 0, limit: number = 100): Promise<Schedule[]> => apiClient<Schedule[]>(`/config/schedules?skip=${skip}&limit=${limit}`);
export const createSchedule = (data: ScheduleCreate): Promise<Schedule> => apiClient<Schedule>('/config/schedules', { method: 'POST', body: JSON.stringify(data) });
export const updateSchedule = (id: number, data: ScheduleUpdate): Promise<Schedule> => apiClient<Schedule>(`/config/schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteSchedule = (id: number): Promise<Schedule> => apiClient<Schedule>(`/config/schedules/${id}`, { method: 'DELETE' }); // Returns deleted obj
// --- END ADDED ---

// Config: DIMSE Q/R Sources
export const getDimseQrSources = (skip: number = 0, limit: number = 100): Promise<DimseQueryRetrieveSourceRead[]> => apiClient<DimseQueryRetrieveSourceRead[]>(`/config/dimse-qr-sources?skip=${skip}&limit=${limit}`);
export const createDimseQrSource = (data: DimseQueryRetrieveSourceCreatePayload): Promise<DimseQueryRetrieveSourceRead> => apiClient<DimseQueryRetrieveSourceRead>('/config/dimse-qr-sources', { method: 'POST', body: JSON.stringify(data) });
export const updateDimseQrSource = (id: number, data: DimseQueryRetrieveSourceUpdatePayload): Promise<DimseQueryRetrieveSourceRead> => apiClient<DimseQueryRetrieveSourceRead>(`/config/dimse-qr-sources/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteDimseQrSource = (id: number): Promise<DimseQueryRetrieveSourceRead> => apiClient<DimseQueryRetrieveSourceRead>(`/config/dimse-qr-sources/${id}`, { method: 'DELETE' });

// Config: Crosswalk Data Sources
export const getCrosswalkDataSources = (skip: number = 0, limit: number = 100): Promise<CrosswalkDataSourceRead[]> => apiClient<CrosswalkDataSourceRead[]>(`/config/crosswalk/data-sources?skip=${skip}&limit=${limit}`);
export const createCrosswalkDataSource = (data: CrosswalkDataSourceCreatePayload): Promise<CrosswalkDataSourceRead> => apiClient<CrosswalkDataSourceRead>('/config/crosswalk/data-sources', { method: 'POST', body: JSON.stringify(data) });
export const updateCrosswalkDataSource = (id: number, data: CrosswalkDataSourceUpdatePayload): Promise<CrosswalkDataSourceRead> => apiClient<CrosswalkDataSourceRead>(`/config/crosswalk/data-sources/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteCrosswalkDataSource = (id: number): Promise<CrosswalkDataSourceRead> => apiClient<CrosswalkDataSourceRead>(`/config/crosswalk/data-sources/${id}`, { method: 'DELETE' });
export const testCrosswalkDataSourceConnection = (id: number): Promise<{ success: boolean; message: string }> => apiClient<{ success: boolean; message: string }>(`/config/crosswalk/data-sources/${id}/test`, { method: 'POST' });
export const triggerCrosswalkDataSourceSync = (id: number): Promise<{ task_id: string }> => apiClient<{ task_id: string }>(`/config/crosswalk/data-sources/${id}/sync`, { method: 'POST' });

// Config: Crosswalk Maps
export const getCrosswalkMaps = (dataSourceId: number | undefined, skip: number = 0, limit: number = 100): Promise<CrosswalkMapRead[]> => {
    let url = `/config/crosswalk/mappings?skip=${skip}&limit=${limit}`;
    if (dataSourceId !== undefined) { url += `&data_source_id=${dataSourceId}`; }
    return apiClient<CrosswalkMapRead[]>(url);
};
export const createCrosswalkMap = (data: CrosswalkMapCreatePayload): Promise<CrosswalkMapRead> => apiClient<CrosswalkMapRead>('/config/crosswalk/mappings', { method: 'POST', body: JSON.stringify(data) });
export const updateCrosswalkMap = (id: number, data: CrosswalkMapUpdatePayload): Promise<CrosswalkMapRead> => apiClient<CrosswalkMapRead>(`/config/crosswalk/mappings/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteCrosswalkMap = (id: number): Promise<CrosswalkMapRead> => apiClient<CrosswalkMapRead>(`/config/crosswalk/mappings/${id}`, { method: 'DELETE' });

export default apiClient; // Optional: Export default if needed elsewhere
