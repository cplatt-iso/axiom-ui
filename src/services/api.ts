// frontend/src/services/api.ts
import { AuthContextType } from '../context/AuthContext';

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
    GoogleHealthcareSourceRead,
    GoogleHealthcareSourceCreate,
    GoogleHealthcareSourceUpdate,
} from '../schemas';
import { DiskUsageStats } from '@/schemas';
import {
    DataBrowserQueryRequest,
    DataBrowserQueryResponse
} from '../schemas/data_browser';
import { GoogleHealthcareSourceFormData } from '@/schemas/googleHealthcareSourceSchema';
import json5 from 'json5';

let authContextRef: AuthContextType | null = null;

export function setAuthContextRef(context: AuthContextType): void {
    authContextRef = context;
}

const determineApiBaseUrl = (): string => {
    const envUrl: string | undefined = import.meta.env.VITE_API_BASE_URL;
    const apiPrefix: string = '/api/v1';

    let origin: string = '';
    let protocol: string = 'https';

    if (typeof window !== 'undefined') {
        origin = window.location.origin;
        protocol = window.location.protocol.replace(':', '');
    } else {
        console.warn("Cannot determine window origin, API calls might fail if relative path doesn't work.");
    }

    if (envUrl) {
        let baseUrl: string = envUrl.trim();
        if (baseUrl.endsWith('/')) {
            baseUrl = baseUrl.slice(0, -1);
        }

        if (baseUrl.includes('://')) {
            if (baseUrl.startsWith('http://')) {
                console.warn("VITE_API_BASE_URL starts with http://. Forcing HTTPS for API calls.");
                baseUrl = baseUrl.replace(/^http:/, 'https:');
            } else if (!baseUrl.startsWith('https://')) {
                 console.error(`VITE_API_BASE_URL (${baseUrl}) has unexpected protocol. Forcing HTTPS.`);
                 const domainPart: string = baseUrl.split('://')[1] || baseUrl;
                 baseUrl = `https://${domainPart}`;
            }
        } else {
            console.warn(`VITE_API_BASE_URL (${baseUrl}) seems relative or domain-only. Prepending origin: ${origin}`);
            if (baseUrl.startsWith('/')) {
                baseUrl = baseUrl.substring(1);
            }
            baseUrl = `${origin}/${baseUrl}`.replace(/([^:]\/)\/+/g, "$1");
        }
         return `${baseUrl}${apiPrefix}`;

    } else {
        if (!origin) {
             console.error("Cannot determine API base URL: No VITE_API_BASE_URL and no window origin.");
             return apiPrefix;
        }
        return `${origin}${apiPrefix}`;
    }
};

const API_BASE_URL: string = determineApiBaseUrl();

console.log(`API Service: Using base URL: ${API_BASE_URL}`);

interface ApiOptions extends RequestInit {
    params?: Record<string, string | number | boolean | null | undefined>;
    useAuth?: boolean;
}

export const apiClient = async <T>(
    endpoint: string,
    options: ApiOptions = {}
): Promise<T> => {
    const { params, useAuth = true, ...fetchOptions } = options;

    let cleanEndpoint: string = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    // --- TRAILING SLASH WORKAROUND REMOVED ---

    let url: string = `${API_BASE_URL}${cleanEndpoint}`; // Construct URL directly

    if (params) {
        const filteredParams: Record<string, string> = {};
        for (const key in params) {
            if (Object.prototype.hasOwnProperty.call(params, key)) {
                const value: string | number | boolean | null | undefined = params[key];
                if (value !== null && value !== undefined && ['string', 'number', 'boolean'].includes(typeof value)) {
                    filteredParams[key] = String(value);
                } else if (value !== null && value !== undefined) {
                    console.warn(`API Client: Parameter '${key}' has non-primitive value (${typeof value}), excluding from query string.`);
                }
            }
        }
        const query: string = new URLSearchParams(filteredParams).toString();
        if (query) {
            url += `?${query}`;
        }
    }

    const headers: Headers = new Headers(fetchOptions.headers || {});
    if (!headers.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }
    if (!headers.has('Accept')) {
        headers.set('Accept', 'application/json');
    }

    if (useAuth) {
        const token: string | null | undefined = authContextRef?.getToken();
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        } else {
            console.warn(`API Client: Auth requested for ${endpoint}, but no token found.`);
        }
    }

    fetchOptions.headers = headers;

    try {
        const response: Response = await fetch(url, fetchOptions);

        if (!response.ok) {
            let errorData: any;
            const contentType: string | null = response.headers.get("content-type");
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
            const error: any = new Error(errorData?.detail || `HTTP error ${response.status}`);
            error.status = response.status;
            error.detail = errorData?.detail;
            throw error;
        }

        if (response.status === 204) {
            return {} as T;
        }

        const data: T = await response.json();
        return data;
    } catch (error) {
        console.error(`API Client Fetch Error for ${url}:`, error);
        throw error;
    }
}; // End apiClient


// --- Keep ALL OTHER FUNCTIONS THE SAME ---
export const getRulesets = (): Promise<Ruleset[]> => {
    return apiClient<Ruleset[]>('/rules-engine/rulesets');
};
export const getRulesetById = (id: number): Promise<Ruleset> => {
    return apiClient<Ruleset>(`/rules-engine/rulesets/${id}`);
};
export const createRuleset = (data: RulesetCreate): Promise<Ruleset> => {
    return apiClient<Ruleset>('/rules-engine/rulesets', { method: 'POST', body: JSON.stringify(data) });
};
export const updateRuleset = (id: number, data: RulesetUpdate): Promise<Ruleset> => {
    return apiClient<Ruleset>(`/rules-engine/rulesets/${id}`, { method: 'PUT', body: JSON.stringify(data) });
};
export const deleteRuleset = (id: number): Promise<void> => {
    return apiClient<void>(`/rules-engine/rulesets/${id}`, { method: 'DELETE' });
};
export const getRulesByRuleset = (rulesetId: number): Promise<Rule[]> => {
    return apiClient<Rule[]>(`/rules-engine/rules`, { params: { ruleset_id: rulesetId } });
};
export const getRuleById = (id: number): Promise<Rule> => {
    return apiClient<Rule>(`/rules-engine/rules/${id}`);
};
export const createRule = (data: RuleCreate): Promise<Rule> => {
    return apiClient<Rule>('/rules-engine/rules', { method: 'POST', body: JSON.stringify(data) });
};
export const updateRule = (id: number, data: RuleUpdate): Promise<Rule> => {
    return apiClient<Rule>(`/rules-engine/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) });
};
export const deleteRule = (id: number): Promise<void> => {
    return apiClient<void>(`/rules-engine/rules/${id}`, { method: 'DELETE' });
};
export const getApiKeys = (): Promise<ApiKey[]> => {
    return apiClient<ApiKey[]>('/apikeys/');
};
export const createApiKey = (data: ApiKeyCreate): Promise<ApiKeyCreateResponse> => {
    return apiClient<ApiKeyCreateResponse>('/apikeys/', { method: 'POST', body: JSON.stringify(data) });
};
export const deleteApiKey = (id: number): Promise<void> => {
    return apiClient<void>(`/apikeys/${id}`, { method: 'DELETE' });
};
export const getUsers = (): Promise<UserWithRoles[]> => {
    return apiClient<UserWithRoles[]>('/users');
};
export const getRoles = (): Promise<Role[]> => {
    return apiClient<Role[]>('/roles');
};
export const assignRoleToUser = (userId: number, roleId: number): Promise<UserWithRoles> => {
    return apiClient<UserWithRoles>(`/users/${userId}/roles`, { method: 'POST', body: JSON.stringify({ role_id: roleId }) });
};
export const removeRoleFromUser = (userId: number, roleId: number): Promise<UserWithRoles> => {
    return apiClient<UserWithRoles>(`/users/${userId}/roles/${roleId}`, { method: 'DELETE' });
};
export const updateUser = (userId: number, data: UserRoleUpdatePayload): Promise<UserWithRoles> => {
    return apiClient<UserWithRoles>(`/users/${userId}`, { method: 'PUT', body: JSON.stringify(data) });
};
export const getDashboardStatus = (): Promise<SystemStatusReport> => {
    return apiClient<SystemStatusReport>('/dashboard/status');
};
export const getDicomWebPollersStatus = (): Promise<DicomWebPollersStatusResponse> => {
    return apiClient<DicomWebPollersStatusResponse>('/system/dicomweb-pollers/status');
};
export const getDimseListenersStatus = (): Promise<DimseListenersStatusResponse> => {
    return apiClient<DimseListenersStatusResponse>('/system/dimse-listeners/status');
};
export const getDimseQrSourcesStatus = (): Promise<DimseQrSourcesStatusResponse> => {
    return apiClient<DimseQrSourcesStatusResponse>('/system/dimse-qr-sources/status');
};
export const getKnownInputSources = (): Promise<string[]> => {
    return apiClient<string[]>('/system/input-sources');
};
export const createDicomWebSource = (data: DicomWebSourceConfigCreatePayload): Promise<DicomWebSourceConfigRead> => {
    return apiClient<DicomWebSourceConfigRead>('/config/dicomweb-sources', { method: 'POST', body: JSON.stringify(data) });
};
export const updateDicomWebSource = (id: number, data: DicomWebSourceConfigUpdatePayload): Promise<DicomWebSourceConfigRead> => {
    return apiClient<DicomWebSourceConfigRead>(`/config/dicomweb-sources/${id}`, { method: 'PUT', body: JSON.stringify(data) });
};
export const deleteDicomWebSource = (id: number): Promise<DicomWebSourceConfigRead> => {
    return apiClient<DicomWebSourceConfigRead>(`/config/dicomweb-sources/${id}`, { method: 'DELETE' });
};
export const getDimseListenerConfigs = (skip: number = 0, limit: number = 100): Promise<DimseListenerConfigRead[]> => {
    return apiClient<DimseListenerConfigRead[]>(`/config/dimse-listeners`, { params: { skip, limit } });
};
export const createDimseListenerConfig = (data: DimseListenerConfigCreatePayload): Promise<DimseListenerConfigRead> => {
    return apiClient<DimseListenerConfigRead>('/config/dimse-listeners', { method: 'POST', body: JSON.stringify(data) });
};
export const updateDimseListenerConfig = (id: number, data: DimseListenerConfigUpdatePayload): Promise<DimseListenerConfigRead> => {
    return apiClient<DimseListenerConfigRead>(`/config/dimse-listeners/${id}`, { method: 'PUT', body: JSON.stringify(data) });
};
export const deleteDimseListenerConfig = (id: number): Promise<DimseListenerConfigRead> => {
    return apiClient<DimseListenerConfigRead>(`/config/dimse-listeners/${id}`, { method: 'DELETE' });
};
export const getStorageBackendConfigs = (skip: number = 0, limit: number = 100): Promise<StorageBackendConfigRead[]> => {
    return apiClient<StorageBackendConfigRead[]>(`/config/storage-backends`, { params: { skip, limit } });
};
export const createStorageBackendConfig = (data: StorageBackendConfigCreatePayload): Promise<StorageBackendConfigRead> => {
    return apiClient<StorageBackendConfigRead>('/config/storage-backends', { method: 'POST', body: JSON.stringify(data) });
};
export const updateStorageBackendConfig = (id: number, data: StorageBackendConfigUpdatePayload): Promise<StorageBackendConfigRead> => {
    return apiClient<StorageBackendConfigRead>(`/config/storage-backends/${id}`, { method: 'PUT', body: JSON.stringify(data) });
};
export const deleteStorageBackendConfig = (id: number): Promise<StorageBackendConfigRead> => {
    return apiClient<StorageBackendConfigRead>(`/config/storage-backends/${id}`, { method: 'DELETE' });
};
export const getSchedules = (skip: number = 0, limit: number = 100): Promise<Schedule[]> => {
    return apiClient<Schedule[]>(`/config/schedules`, { params: { skip, limit } });
};
export const createSchedule = (data: ScheduleCreate): Promise<Schedule> => {
    return apiClient<Schedule>('/config/schedules', { method: 'POST', body: JSON.stringify(data) });
};
export const updateSchedule = (id: number, data: ScheduleUpdate): Promise<Schedule> => {
    return apiClient<Schedule>(`/config/schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) });
};
export const deleteSchedule = (id: number): Promise<Schedule> => {
    return apiClient<Schedule>(`/config/schedules/${id}`, { method: 'DELETE' });
};
export const createDimseQrSource = (data: DimseQueryRetrieveSourceCreatePayload): Promise<DimseQueryRetrieveSourceRead> => {
    return apiClient<DimseQueryRetrieveSourceRead>('/config/dimse-qr-sources', { method: 'POST', body: JSON.stringify(data) });
};
export const updateDimseQrSource = (id: number, data: DimseQueryRetrieveSourceUpdatePayload): Promise<DimseQueryRetrieveSourceRead> => {
    return apiClient<DimseQueryRetrieveSourceRead>(`/config/dimse-qr-sources/${id}`, { method: 'PUT', body: JSON.stringify(data) });
};
export const deleteDimseQrSource = (id: number): Promise<DimseQueryRetrieveSourceRead> => {
    return apiClient<DimseQueryRetrieveSourceRead>(`/config/dimse-qr-sources/${id}`, { method: 'DELETE' });
};
export const getCrosswalkDataSources = (skip: number = 0, limit: number = 100): Promise<CrosswalkDataSourceRead[]> => {
    return apiClient<CrosswalkDataSourceRead[]>(`/config/crosswalk/data-sources`, { params: { skip, limit } });
};
export const createCrosswalkDataSource = (data: CrosswalkDataSourceCreatePayload): Promise<CrosswalkDataSourceRead> => {
    return apiClient<CrosswalkDataSourceRead>('/config/crosswalk/data-sources', { method: 'POST', body: JSON.stringify(data) });
};
export const updateCrosswalkDataSource = (id: number, data: CrosswalkDataSourceUpdatePayload): Promise<CrosswalkDataSourceRead> => {
    return apiClient<CrosswalkDataSourceRead>(`/config/crosswalk/data-sources/${id}`, { method: 'PUT', body: JSON.stringify(data) });
};
export const deleteCrosswalkDataSource = (id: number): Promise<CrosswalkDataSourceRead> => {
    return apiClient<CrosswalkDataSourceRead>(`/config/crosswalk/data-sources/${id}`, { method: 'DELETE' });
};
export const testCrosswalkDataSourceConnection = (id: number): Promise<{ success: boolean; message: string }> => {
    return apiClient<{ success: boolean; message: string }>(`/config/crosswalk/data-sources/${id}/test`, { method: 'POST' });
};
export const triggerCrosswalkDataSourceSync = (id: number): Promise<{ task_id: string }> => {
    return apiClient<{ task_id: string }>(`/config/crosswalk/data-sources/${id}/sync`, { method: 'POST' });
};
export const getCrosswalkMaps = (dataSourceId: number | undefined, skip: number = 0, limit: number = 100): Promise<CrosswalkMapRead[]> => {
    let url = `/config/crosswalk/mappings`;
    return apiClient<CrosswalkMapRead[]>(url, { params: { skip, limit, ...(dataSourceId !== undefined && { data_source_id: dataSourceId }) } });
};
export const createCrosswalkMap = (data: CrosswalkMapCreatePayload): Promise<CrosswalkMapRead> => {
    return apiClient<CrosswalkMapRead>('/config/crosswalk/mappings', { method: 'POST', body: JSON.stringify(data) });
};
export const updateCrosswalkMap = (id: number, data: CrosswalkMapUpdatePayload): Promise<CrosswalkMapRead> => {
    return apiClient<CrosswalkMapRead>(`/config/crosswalk/mappings/${id}`, { method: 'PUT', body: JSON.stringify(data) });
};
export const deleteCrosswalkMap = (id: number): Promise<CrosswalkMapRead> => {
    return apiClient<CrosswalkMapRead>(`/config/crosswalk/mappings/${id}`, { method: 'DELETE' });
};
export const getSystemInfo = async (): Promise<SystemInfo> => {
    return apiClient<SystemInfo>('/system/info');
};
export const suggestRule = async (requestData: RuleGenRequest): Promise<RuleGenResponse> => {
    return apiClient<RuleGenResponse>('/ai-assist/suggest-rule', { method: 'POST', body: JSON.stringify(requestData), useAuth: true, });
};
export const submitDataBrowserQuery = (request: DataBrowserQueryRequest): Promise<DataBrowserQueryResponse> => {
    return apiClient<DataBrowserQueryResponse>('/data-browser/query', { method: 'POST', body: JSON.stringify(request), useAuth: true });
};
export const getDiskUsage = async (path?: string): Promise<DiskUsageStats> => {
    const endpoint = path ? `/system/disk-usage` : '/system/disk-usage';
    return apiClient<DiskUsageStats>(endpoint, { ...(path && { params: { path_to_check: path } }) });
};
export const getDicomWebSources = (skip: number = 0, limit: number = 100): Promise<DicomWebSourceConfigRead[]> => {
    return apiClient<DicomWebSourceConfigRead[]>(`/config/dicomweb-sources`, { params: { skip, limit } });
};
export const getDimseQrSources = (skip: number = 0, limit: number = 100): Promise<DimseQueryRetrieveSourceRead[]> => {
    return apiClient<DimseQueryRetrieveSourceRead[]>(`/config/dimse-qr-sources`, { params: { skip, limit } });
};

export const getGoogleHealthcareSources = async (skip: number = 0, limit: number = 100): Promise<GoogleHealthcareSourceRead[]> => {
    return apiClient<GoogleHealthcareSourceRead[]>(`/config/google-healthcare-sources/`, { params: { skip, limit } });
};

export const getGoogleHealthcareSource = async (id: number): Promise<GoogleHealthcareSourceRead> => {
    return apiClient<GoogleHealthcareSourceRead>(`/config/google-healthcare-sources/${id}`);
};

export const createGoogleHealthcareSource = async (
    data: GoogleHealthcareSourceFormData
): Promise<GoogleHealthcareSourceRead> => {
    let parsedFilters: Record<string, any> | null = null;
    if (data.query_filters && data.query_filters.trim()) {
        try {
            parsedFilters = json5.parse(data.query_filters);
        } catch (e) {
             console.error("Error parsing query_filters on create", e);
             throw new Error(`Invalid JSON in query_filters: ${e instanceof Error ? e.message : String(e)}`);
        }
    }
    const payload: GoogleHealthcareSourceCreate = {
        ...data,
        query_filters: parsedFilters,
        description: data.description?.trim() || null,
    };
    return apiClient<GoogleHealthcareSourceRead>('/config/google-healthcare-sources/', { method: 'POST', body: JSON.stringify(payload) });
};

export const updateGoogleHealthcareSource = async (
    id: number,
    data: Partial<GoogleHealthcareSourceFormData>
): Promise<GoogleHealthcareSourceRead> => {
    let parsedFilters: Record<string, any> | null | undefined = undefined;
    if (data.query_filters !== undefined) {
        if (data.query_filters && data.query_filters.trim()) {
             try {
                 parsedFilters = json5.parse(data.query_filters);
             } catch (e) {
                  console.error("Error parsing query_filters on update", e);
                  throw new Error(`Invalid JSON in query_filters: ${e instanceof Error ? e.message : String(e)}`);
             }
        } else {
             parsedFilters = null;
        }
    }

    const payload: Partial<GoogleHealthcareSourceUpdate> = {
        ...data,
        ...(parsedFilters !== undefined && { query_filters: parsedFilters }),
        ...(data.description !== undefined && { description: data.description?.trim() || null }),
    };
    if (parsedFilters === undefined) {
        delete payload.query_filters;
    }

    return apiClient<GoogleHealthcareSourceRead>(`/config/google-healthcare-sources/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
};


export const deleteGoogleHealthcareSource = async (id: number): Promise<void> => {
    return apiClient<void>(`/config/google-healthcare-sources/${id}`, { method: 'DELETE' });
};


export type { UserWithRoles };
export default apiClient;
