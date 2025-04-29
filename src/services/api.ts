// src/services/api.ts
import { AuthContextType } from '../context/AuthContext'; // Keep original import

import {
    Ruleset, RulesetCreate, RulesetUpdate, Rule, RuleCreate, RuleUpdate,
    ApiKey, ApiKeyCreate, ApiKeyCreateResponse, ApiKeyUpdate, UserWithRoles, Role,
    UserUpdate as UserRoleUpdatePayload, SystemStatusReport,
    DicomWebSourceStatus, DicomWebPollersStatusResponse, DimseListenerStatus,
    DimseListenersStatusResponse, DicomWebSourceConfigRead, DicomWebSourceConfigCreatePayload,
    DicomWebSourceConfigUpdatePayload, DimseListenerConfigRead, DimseListenerConfigCreatePayload,
    DimseListenerConfigUpdatePayload, StorageBackendConfigRead, StorageBackendConfigCreatePayload,
    StorageBackendConfigUpdatePayload, Schedule, ScheduleCreate, ScheduleUpdate,
    DimseQueryRetrieveSourceRead, DimseQueryRetrieveSourceCreatePayload, DimseQueryRetrieveSourceUpdatePayload,
    DimseQrSourceStatus, DimseQrSourcesStatusResponse, CrosswalkDataSourceRead,
    CrosswalkDataSourceCreatePayload, CrosswalkDataSourceUpdatePayload, CrosswalkMapRead,
    CrosswalkMapCreatePayload, CrosswalkMapUpdatePayload, RuleGenRequest, RuleGenResponse,
    SystemInfo,
} from '../schemas'; 

import { DiskUsageStats } from '@/schemas';

import {
    DataBrowserQueryRequest,
    DataBrowserQueryResponse
} from '../schemas/data_browser';

let authContextRef: AuthContextType | null = null;

export function setAuthContextRef(context: AuthContextType) {
    console.log("API Service: AuthContext reference set.");
    authContextRef = context;
}

// --- Keep original Base URL Determination ---
const determineApiBaseUrl = (): string => {
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    const apiPrefix = '/api/v1'; // Define standard prefix

    if (envUrl) {
        let baseUrl = envUrl.trim();
        // Ensure it ends without a trailing slash for consistency before adding prefix
        if (baseUrl.endsWith('/')) {
            baseUrl = baseUrl.slice(0, -1);
        }
        // Force HTTPS unless explicitly http://
        if (baseUrl.startsWith('http://')) {
             console.warn("VITE_API_BASE_URL starts with http://. Using insecure connection.");
             // return baseUrl + apiPrefix; // Use this if you MUST allow http
              return baseUrl.replace(/^http:/, 'https:') + apiPrefix; // Force https
        }
        if (!baseUrl.startsWith('https://')) {
            // Prepend https if no protocol specified
            if (!baseUrl.includes('://')) {
                 console.warn(`VITE_API_BASE_URL (${baseUrl}) lacks protocol, defaulting to HTTPS.`);
                 return `https://${baseUrl}${apiPrefix}`;
            }
            // Handle other cases or just return as is? For safety, force https or log error
            console.error(`VITE_API_BASE_URL (${baseUrl}) has unexpected format. Forcing HTTPS.`);
            return `https://${baseUrl.split('://')[1] || baseUrl}${apiPrefix}`; // Attempt to fix
        }
        // Already starts with https://
        return baseUrl + apiPrefix;
    } else {
        // Fallback: Use current window's origin + standard API prefix
        // This works if API and UI are served from the same domain/port
        // during development or production (behind a proxy).
        if (typeof window !== 'undefined') {
            // window.location.origin includes the protocol (http/https) and domain/port
            return `${window.location.origin}${apiPrefix}`;
        } else {
            // Fallback for non-browser environments (shouldn't happen in frontend)
            console.warn("Cannot determine window origin, defaulting to relative path for API.");
            return apiPrefix; // Relative path
        }
    }
};

const API_BASE_URL = determineApiBaseUrl();
// --- END Base URL Determination ---

console.log(`API Service: Using base URL: ${API_BASE_URL}`);

// --- Keep original ApiOptions interface ---
interface ApiOptions extends RequestInit {
    params?: Record<string, string>; // Keep original type for params
    useAuth?: boolean;
}

// --- Keep original apiClient function ---
export const apiClient = async <T>(
    endpoint: string,
    options: ApiOptions = {}
): Promise<T> => {
    const { params, useAuth = true, ...fetchOptions } = options;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    // Construct URL ensuring no double slashes between base and endpoint
    let url = API_BASE_URL.endsWith('/')
              ? `${API_BASE_URL.slice(0,-1)}${cleanEndpoint}`
              : `${API_BASE_URL}${cleanEndpoint}`;
    // General double slash cleanup (might be redundant now)
    url = url.replace(/([^:]\/)\/+/g, "$1");

    if (params) {
        // Keep original params handling
        const query = new URLSearchParams(params).toString();
        if (query) {
            url += `?${query}`;
        }
    }

    const headers = new Headers(fetchOptions.headers || {});
    if (!headers.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }
    if (!headers.has('Accept')) {
        headers.set('Accept', 'application/json');
    }

    if (useAuth) {
        // Keep original token fetching logic
        const token = authContextRef?.getToken();
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        } else {
            console.warn(`API Client: Auth requested for ${endpoint}, but no token found.`);
        }
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
            // Keep original error creation
            const error: any = new Error(errorData?.detail || `HTTP error ${response.status}`);
            error.status = response.status;
            error.detail = errorData?.detail;
            throw error;
        }

        if (response.status === 204) {
            console.debug(`API Client: Received 204 No Content for ${url}`);
            // Keep original 204 handling
            return {} as T;
        }

        const data: T = await response.json();
        console.debug(`API Client: Successfully received data for ${url}`);
        return data;
    } catch (error) {
        console.error(`API Client Fetch Error for ${url}:`, error);
        throw error;
    }
};
// --- End original apiClient function ---


// --- Keep ALL original Specific API Function Exports ---
export const getRulesets = (): Promise<Ruleset[]> => apiClient<Ruleset[]>('/rules-engine/rulesets');
export const getRulesetById = (id: number): Promise<Ruleset> => apiClient<Ruleset>(`/rules-engine/rulesets/${id}`);
export const createRuleset = (data: RulesetCreate): Promise<Ruleset> => apiClient<Ruleset>('/rules-engine/rulesets', { method: 'POST', body: JSON.stringify(data) });
export const updateRuleset = (id: number, data: RulesetUpdate): Promise<Ruleset> => apiClient<Ruleset>(`/rules-engine/rulesets/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteRuleset = (id: number): Promise<void> => apiClient<void>(`/rules-engine/rulesets/${id}`, { method: 'DELETE' });
export const getRulesByRuleset = (rulesetId: number): Promise<Rule[]> => apiClient<Rule[]>(`/rules-engine/rules?ruleset_id=${rulesetId}`);
export const getRuleById = (id: number): Promise<Rule> => apiClient<Rule>(`/rules-engine/rules/${id}`);
export const createRule = (data: RuleCreate): Promise<Rule> => apiClient<Rule>('/rules-engine/rules', { method: 'POST', body: JSON.stringify(data) });
export const updateRule = (id: number, data: RuleUpdate): Promise<Rule> => apiClient<Rule>(`/rules-engine/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteRule = (id: number): Promise<void> => apiClient<void>(`/rules-engine/rules/${id}`, { method: 'DELETE' });
export const getApiKeys = (): Promise<ApiKey[]> => apiClient<ApiKey[]>('/apikeys/');
export const createApiKey = (data: ApiKeyCreate): Promise<ApiKeyCreateResponse> => apiClient<ApiKeyCreateResponse>('/apikeys/', { method: 'POST', body: JSON.stringify(data) });
export const deleteApiKey = (id: number): Promise<void> => apiClient<void>(`/apikeys/${id}`, { method: 'DELETE' });
export const getUsers = (): Promise<UserWithRoles[]> => apiClient<UserWithRoles[]>('/users');
export const getRoles = (): Promise<Role[]> => apiClient<Role[]>('/roles');
export const assignRoleToUser = (userId: number, roleId: number): Promise<UserWithRoles> => apiClient<UserWithRoles>(`/users/${userId}/roles`, { method: 'POST', body: JSON.stringify({ role_id: roleId }) });
export const removeRoleFromUser = (userId: number, roleId: number): Promise<UserWithRoles> => apiClient<UserWithRoles>(`/users/${userId}/roles/${roleId}`, { method: 'DELETE' });
export const updateUser = (userId: number, data: UserRoleUpdatePayload): Promise<UserWithRoles> => apiClient<UserWithRoles>(`/users/${userId}`, { method: 'PUT', body: JSON.stringify(data) });
export const getDashboardStatus = (): Promise<SystemStatusReport> => apiClient<SystemStatusReport>('/dashboard/status');
export const getDicomWebPollersStatus = (): Promise<DicomWebPollersStatusResponse> => apiClient<DicomWebPollersStatusResponse>('/system/dicomweb-pollers/status');
export const getDimseListenersStatus = (): Promise<DimseListenersStatusResponse> => apiClient<DimseListenersStatusResponse>('/system/dimse-listeners/status');
export const getDimseQrSourcesStatus = (): Promise<DimseQrSourcesStatusResponse> => apiClient<DimseQrSourcesStatusResponse>('/system/dimse-qr-sources/status');
export const getKnownInputSources = (): Promise<string[]> => apiClient<string[]>('/system/input-sources');
export const createDicomWebSource = (data: DicomWebSourceConfigCreatePayload): Promise<DicomWebSourceConfigRead> => apiClient<DicomWebSourceConfigRead>('/config/dicomweb-sources', { method: 'POST', body: JSON.stringify(data) });
export const updateDicomWebSource = (id: number, data: DicomWebSourceConfigUpdatePayload): Promise<DicomWebSourceConfigRead> => apiClient<DicomWebSourceConfigRead>(`/config/dicomweb-sources/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteDicomWebSource = (id: number): Promise<DicomWebSourceConfigRead> => apiClient<DicomWebSourceConfigRead>(`/config/dicomweb-sources/${id}`, { method: 'DELETE' });
export const getDimseListenerConfigs = (skip: number = 0, limit: number = 100): Promise<DimseListenerConfigRead[]> => apiClient<DimseListenerConfigRead[]>(`/config/dimse-listeners?skip=${skip}&limit=${limit}`);
export const createDimseListenerConfig = (data: DimseListenerConfigCreatePayload): Promise<DimseListenerConfigRead> => apiClient<DimseListenerConfigRead>('/config/dimse-listeners', { method: 'POST', body: JSON.stringify(data) });
export const updateDimseListenerConfig = (id: number, data: DimseListenerConfigUpdatePayload): Promise<DimseListenerConfigRead> => apiClient<DimseListenerConfigRead>(`/config/dimse-listeners/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteDimseListenerConfig = (id: number): Promise<DimseListenerConfigRead> => apiClient<DimseListenerConfigRead>(`/config/dimse-listeners/${id}`, { method: 'DELETE' });
export const getStorageBackendConfigs = (skip: number = 0, limit: number = 100): Promise<StorageBackendConfigRead[]> => apiClient<StorageBackendConfigRead[]>(`/config/storage-backends?skip=${skip}&limit=${limit}`);
export const createStorageBackendConfig = (data: StorageBackendConfigCreatePayload): Promise<StorageBackendConfigRead> => apiClient<StorageBackendConfigRead>('/config/storage-backends', { method: 'POST', body: JSON.stringify(data) });
export const updateStorageBackendConfig = (id: number, data: StorageBackendConfigUpdatePayload): Promise<StorageBackendConfigRead> => apiClient<StorageBackendConfigRead>(`/config/storage-backends/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteStorageBackendConfig = (id: number): Promise<StorageBackendConfigRead> => apiClient<StorageBackendConfigRead>(`/config/storage-backends/${id}`, { method: 'DELETE' });
export const getSchedules = (skip: number = 0, limit: number = 100): Promise<Schedule[]> => apiClient<Schedule[]>(`/config/schedules?skip=${skip}&limit=${limit}`);
export const createSchedule = (data: ScheduleCreate): Promise<Schedule> => apiClient<Schedule>('/config/schedules', { method: 'POST', body: JSON.stringify(data) });
export const updateSchedule = (id: number, data: ScheduleUpdate): Promise<Schedule> => apiClient<Schedule>(`/config/schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteSchedule = (id: number): Promise<Schedule> => apiClient<Schedule>(`/config/schedules/${id}`, { method: 'DELETE' });
export const createDimseQrSource = (data: DimseQueryRetrieveSourceCreatePayload): Promise<DimseQueryRetrieveSourceRead> => apiClient<DimseQueryRetrieveSourceRead>('/config/dimse-qr-sources', { method: 'POST', body: JSON.stringify(data) });
export const updateDimseQrSource = (id: number, data: DimseQueryRetrieveSourceUpdatePayload): Promise<DimseQueryRetrieveSourceRead> => apiClient<DimseQueryRetrieveSourceRead>(`/config/dimse-qr-sources/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteDimseQrSource = (id: number): Promise<DimseQueryRetrieveSourceRead> => apiClient<DimseQueryRetrieveSourceRead>(`/config/dimse-qr-sources/${id}`, { method: 'DELETE' });
export const getCrosswalkDataSources = (skip: number = 0, limit: number = 100): Promise<CrosswalkDataSourceRead[]> => apiClient<CrosswalkDataSourceRead[]>(`/config/crosswalk/data-sources?skip=${skip}&limit=${limit}`);
export const createCrosswalkDataSource = (data: CrosswalkDataSourceCreatePayload): Promise<CrosswalkDataSourceRead> => apiClient<CrosswalkDataSourceRead>('/config/crosswalk/data-sources', { method: 'POST', body: JSON.stringify(data) });
export const updateCrosswalkDataSource = (id: number, data: CrosswalkDataSourceUpdatePayload): Promise<CrosswalkDataSourceRead> => apiClient<CrosswalkDataSourceRead>(`/config/crosswalk/data-sources/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteCrosswalkDataSource = (id: number): Promise<CrosswalkDataSourceRead> => apiClient<CrosswalkDataSourceRead>(`/config/crosswalk/data-sources/${id}`, { method: 'DELETE' });
export const testCrosswalkDataSourceConnection = (id: number): Promise<{ success: boolean; message: string }> => apiClient<{ success: boolean; message: string }>(`/config/crosswalk/data-sources/${id}/test`, { method: 'POST' });
export const triggerCrosswalkDataSourceSync = (id: number): Promise<{ task_id: string }> => apiClient<{ task_id: string }>(`/config/crosswalk/data-sources/${id}/sync`, { method: 'POST' });
export const getCrosswalkMaps = (dataSourceId: number | undefined, skip: number = 0, limit: number = 100): Promise<CrosswalkMapRead[]> => { let url = `/config/crosswalk/mappings?skip=${skip}&limit=${limit}`; if (dataSourceId !== undefined) { url += `&data_source_id=${dataSourceId}`; } return apiClient<CrosswalkMapRead[]>(url); };
export const createCrosswalkMap = (data: CrosswalkMapCreatePayload): Promise<CrosswalkMapRead> => apiClient<CrosswalkMapRead>('/config/crosswalk/mappings', { method: 'POST', body: JSON.stringify(data) });
export const updateCrosswalkMap = (id: number, data: CrosswalkMapUpdatePayload): Promise<CrosswalkMapRead> => apiClient<CrosswalkMapRead>(`/config/crosswalk/mappings/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteCrosswalkMap = (id: number): Promise<CrosswalkMapRead> => apiClient<CrosswalkMapRead>(`/config/crosswalk/mappings/${id}`, { method: 'DELETE' });

export const getSystemInfo = async (): Promise<SystemInfo> => apiClient<SystemInfo>('/system/info');

export const suggestRule = async (requestData: RuleGenRequest): Promise<RuleGenResponse> => {
    console.log("API: Calling suggestRule with prompt:", requestData.prompt);
    return apiClient<RuleGenResponse>('/ai-assist/suggest-rule', {
        method: 'POST',
        body: JSON.stringify(requestData),
        useAuth: true, // Requires authentication
    });
};

// --- ADDED: Data Browser Query Function ---
export const submitDataBrowserQuery = (request: DataBrowserQueryRequest): Promise<DataBrowserQueryResponse> => {
    // Uses the existing apiClient, inheriting its auth logic and base URL handling
    return apiClient<DataBrowserQueryResponse>('/data-browser/query', {
        method: 'POST',
        body: JSON.stringify(request),
        useAuth: true // Ensure authentication is used for this endpoint
    });
};

export const getDiskUsage = async (path?: string): Promise<DiskUsageStats> => {
    const endpoint = path ? `/system/disk-usage?path_to_check=${encodeURIComponent(path)}` : '/system/disk-usage';
    return apiClient<DiskUsageStats>(endpoint); // Defaults to GET
};

export const getDicomWebSources = (skip: number = 0, limit: number = 100): Promise<DicomWebSourceConfigRead[]> => {
    // --- Add these logs ---
    console.log(`>>> [getDicomWebSources] ENTERED. Received - skip: ${skip} (type: ${typeof skip}), limit: ${limit} (type: ${typeof limit})`);
    const url = `/config/dicomweb-sources?skip=${skip}&limit=${limit}`;
    console.log(`>>> [getDicomWebSources] Constructed URL: ${url}`);
    // --- End logs ---
    return apiClient<DicomWebSourceConfigRead[]>(url); // Existing call
};

export const getDimseQrSources = (skip: number = 0, limit: number = 100): Promise<DimseQueryRetrieveSourceRead[]> => {
    // --- Add these logs ---
    console.log(`>>> [getDimseQrSources] ENTERED. Received - skip: ${skip} (type: ${typeof skip}), limit: ${limit} (type: ${typeof limit})`);
    const url = `/config/dimse-qr-sources?skip=${skip}&limit=${limit}`;
    console.log(`>>> [getDimseQrSources] Constructed URL: ${url}`);
    // --- End logs ---
    return apiClient<DimseQueryRetrieveSourceRead[]>(url); // Existing call
};

export type { UserWithRoles };
// --- END Original Exports ---

export default apiClient; // Keep default export
