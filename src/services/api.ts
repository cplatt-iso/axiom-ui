// import json5 from 'json5';
import { AuthContextType } from '../context/AuthContext';
import { format } from 'date-fns';
import { 
    CrosswalkDataSourceUpdatePayload,
    CrosswalkDataSourceRead,
    CrosswalkDataSourceCreatePayload, 
} from '@/schemas/crosswalkDataSourceSchema';   

import {
    CrosswalkMapRead,
    CrosswalkMapCreatePayload, 
    CrosswalkMapUpdatePayload,
} from '@/schemas/crosswalkMappingSchema'

import { 
    OrdersApiResponse,
} from '@/schemas/orderSchema';

import {
    OrderEvidenceApiResponse,
} from '@/schemas/orderEvidenceSchema';

import {
    FacilityCreate,
    FacilityUpdate,
    FacilityRead,
} from '@/schemas/facilitySchema';

import {
    ModalityCreate,
    ModalityUpdate,
    ModalityRead,
} from '@/schemas/modalitySchema';


import {
    // From ruleSchema.ts (assuming index.ts re-exports them correctly)
    RulesetCreate,
    RulesetUpdate,
    RuleCreate,
    RuleUpdate,
    Rule, // This should be Rule (from RuleSchema)
    Ruleset, // This should be Ruleset (from RulesetSchema)

    // From apiKeySchema.ts
    ApiKey,
    ApiKeyCreate,
    ApiKeyCreateResponse,
    // ApiKeyUpdate, // This one is unused in api.ts per your problems.txt, but good to keep if schemas/index.ts exports it

    // From userSchema.ts (assuming index.ts re-exports them)
    UserWithRoles,
    Role,
    UserUpdate as UserRoleUpdatePayload, // Assuming UserUpdate is exported from userSchema

    // From system.ts (or dashboardSchema.ts via index.ts)
    SystemStatusReport, // Check where this actually lives and is exported from
    ComponentStatus,    // Check where this actually lives and is exported from
    SystemInfo,         // This is from system.ts, seems okay

    // From dicomWebSourceSchema.ts (via index.ts)
    DicomWebSourceConfigRead,
    DicomWebSourceConfigCreatePayload,
    DicomWebSourceConfigUpdatePayload,
    // DicomWebSourceStatus, // This is unused in api.ts per problems.txt

    // From dimseListenerSchema.ts (via index.ts)
    DimseListenerConfigRead,
    DimseListenerConfigCreatePayload,
    DimseListenerConfigUpdatePayload,
    // DimseListenerStatus, // This is unused in api.ts per problems.txt

    // From dimseQrSourceSchema.ts (via index.ts)
    DimseQueryRetrieveSourceRead,
    DimseQueryRetrieveSourceCreatePayload,
    DimseQueryRetrieveSourceUpdatePayload,
    // DimseQrSourceStatus, // This is unused in api.ts per problems.txt

    // From storageBackendSchema.ts (via index.ts)
    StorageBackendConfigRead,
    StorageBackendConfigCreatePayload,
    StorageBackendConfigUpdateApiPayload,

    // From scheduleSchema.ts (via index.ts) - CRITICAL CHANGE HERE
    Schedule, // RENAME: This is what you likely mean by 'Schedule' for reading
    ScheduleCreate,
    ScheduleUpdate,

    // From dashboardSchema.ts (via index.ts)
    DicomWebPollersStatusResponse,
    DimseListenersStatusResponse,
    DimseQrSourcesStatusResponse,

    // From aiAssistSchema.ts (via index.ts)
    RuleGenRequest,
    RuleGenResponse,

    // From googleHealthcareSourceSchema.ts (via index.ts)
    GoogleHealthcareSourceRead,
    GoogleHealthcareSourceCreate,
    GoogleHealthcareSourceUpdate,
    GoogleHealthcareSourcesStatusResponse,
    // GoogleHealthcareSourceFormData, // Already imported separately below

    // From spannerSchema.ts (via index.ts)
    SpannerConfigRead,
    SpannerConfigCreate,
    SpannerConfigUpdate,
    SpannerSourceMappingRead,
    SpannerSourceMappingCreate,
    SpannerSourceMappingUpdate,
    SpannerServiceStatus,
    SpannerServicesStatusResponse,
    AvailableSource,
    SpannerMetrics,
    ServiceControlRequest,
    ServiceControlResponse,

    DiskUsageStats // from system.ts
} from '@/schemas/';

import { 
    AiPromptConfigRead,
    AiPromptConfigCreatePayload, // Add this
    AiPromptConfigUpdatePayload,
    // AiPromptConfigSummary, // If you use it
 } from '@/schemas/aiPromptConfigSchema';

import {
    DataBrowserQueryRequest,
    DataBrowserQueryResponse
} from '../schemas/data_browser';

// --- API Configuration ---
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

interface ApiOptions extends RequestInit {
    params?: Record<string, string | number | boolean | (string | number)[]>;
    useAuth?: boolean;
}

let authContextRef: AuthContextType | null = null;

export function setAuthContextRef(context: AuthContextType): void {
    authContextRef = context;
}

export const getOrders = (params: {
  pageIndex: number;
  pageSize: number;
  search?: string;
  modalities?: string[];
  statuses?: string[];
  dateRange?: { from?: Date; to?: Date };
}): Promise<OrdersApiResponse> => {
  const { pageIndex, pageSize, search, modalities, statuses, dateRange } = params;
  
  const apiParams: Record<string, string | number | string[]> = {
    skip: pageIndex * pageSize,
    limit: pageSize,
  };

  if (search) {
    apiParams.search = search;
  }
  if (modalities && modalities.length > 0) {
    apiParams.modalities = modalities;
  }
  if (statuses && statuses.length > 0) {
    apiParams.statuses = statuses;
  }
  if (dateRange?.from) {
    apiParams.start_date = format(dateRange.from, "yyyy-MM-dd");
  }
  if (dateRange?.to) {
    apiParams.end_date = format(dateRange.to, "yyyy-MM-dd");
  }

  return apiClient('/orders/', { params: apiParams });
};

export const deleteOrder = (orderId: number): Promise<void> => {
  return apiClient(`/orders/${orderId}`, { method: 'DELETE' });
};

export const getOrderEvidence = (accessionNumber: string): Promise<OrderEvidenceApiResponse> => {
  return apiClient('/order-evidence/', { 
    params: { accession_number: accessionNumber }
  });
};

export const deleteAllOrders = async (): Promise<void> => {
  // First, get all orders to know what to delete
  const allOrdersResponse = await apiClient<OrdersApiResponse>('/orders/', { 
    params: { skip: 0, limit: 10000 } // Get a large number to capture all orders
  });
  
  if (allOrdersResponse.items.length === 0) {
    return; // No orders to delete
  }
  
  // Delete each order individually and collect results
  const deleteResults = await Promise.allSettled(
    allOrdersResponse.items.map(order => deleteOrder(order.id))
  );
  
  // Check if any deletions failed
  const failedDeletions = deleteResults.filter(result => result.status === 'rejected');
  
  if (failedDeletions.length > 0) {
    const successCount = deleteResults.length - failedDeletions.length;
    throw new Error(
      `Partially completed: ${successCount}/${deleteResults.length} orders deleted. ${failedDeletions.length} failed.`
    );
  }
};

export const apiClient = async <T>(
    endpoint: string,
    options: ApiOptions = {}
): Promise<T> => {
    const { params, useAuth = true, ...fetchOptions } = options;

    // Construct the full URL
    // Ensure the endpoint starts with a slash
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    // Check if API_BASE_URL already ends with /api/v1 and if the endpoint starts with it.
    // This is to avoid duplication like /api/v1/api/v1/
    let url: string;
    if (API_BASE_URL.endsWith('/api/v1') && cleanEndpoint.startsWith('/api/v1')) {
        url = `${API_BASE_URL.replace(/\/api\/v1$/, '')}${cleanEndpoint}`;
    } else if (!cleanEndpoint.startsWith('/api/v1') && !API_BASE_URL.endsWith('/api/v1')) {
        // If neither has /api/v1, and we are not hitting the root, add it.
        // The VITE_API_BASE_URL should ideally contain the /api/v1 path.
        // This logic is a fallback.
        const basePath = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
        url = `${basePath}/api/v1${cleanEndpoint}`;
    }
    else {
        url = `${API_BASE_URL}${cleanEndpoint}`;
    }

    if (params) {
        const queryParams = new URLSearchParams();
        for (const key in params) {
            if (Object.prototype.hasOwnProperty.call(params, key)) {
                const value = params[key];
                if (value !== null && value !== undefined) {
                    if (Array.isArray(value)) {
                        value.forEach(item => queryParams.append(key, String(item)));
                    } else {
                        queryParams.set(key, String(value));
                    }
                }
            }
        }
        const query: string = queryParams.toString();
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
            let errorData: { detail?: unknown } | { detail: string } | Record<string, unknown>;
            const contentType: string | null = response.headers.get("content-type");
            try {
                if (contentType && contentType.includes("application/json")) {
                    errorData = await response.json();
                } else {
                     errorData = { detail: await response.text() || `HTTP error ${response.status}` };
                }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (_) {
                 errorData = { detail: `HTTP error ${response.status}: Failed to parse error response.` };
            }
            console.error(`API Client Error: ${response.status} ${response.statusText} for ${url}`, errorData);

            // If we get a 401, the token is bad. Log the user out.
            if (response.status === 401 && authContextRef) {
                console.log("API Client: Received 401 Unauthorized. Logging out.");
                authContextRef.logout();
            }

            const detail = (typeof errorData === 'object' && errorData !== null && 'detail' in errorData && typeof errorData.detail === 'string')
                ? errorData.detail
                : `HTTP error ${response.status}`;

            const error = new Error(detail) as Error & { status?: number; detail?: string };
            error.status = response.status;
            error.detail = detail;
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

export const getGoogleHealthcareSourcesStatus = (): Promise<GoogleHealthcareSourcesStatusResponse> => {
    return apiClient<GoogleHealthcareSourcesStatusResponse>('/system/google-healthcare-sources/status');
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
export const updateStorageBackendConfig = (id: number, data: StorageBackendConfigUpdateApiPayload): Promise<StorageBackendConfigRead> => {
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
    const url = `/config/crosswalk/mappings`;
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

export const deleteGoogleHealthcareSource = async (id: number): Promise<void> => {
    return apiClient<void>(`/config/google-healthcare-sources/${id}`, { method: 'DELETE' });
};

export const getAiPromptConfigs = (
    skip: number = 0,
    limit: number = 100,
    is_enabled?: boolean | null, // Optional filter - THIS IS THE THIRD ARGUMENT
    dicom_tag_keyword?: string | null, // Optional filter
    model_identifier?: string | null // Optional filter
): Promise<AiPromptConfigRead[]> => {
    const params: Record<string, string | number | boolean> = { skip, limit }; // Start with skip and limit

    // Conditionally add filters to the params object if they are provided
    if (is_enabled !== undefined && is_enabled !== null) {
        params.is_enabled = is_enabled;
    }
    if (dicom_tag_keyword) { 
        params.dicom_tag_keyword = dicom_tag_keyword;
    }
    if (model_identifier) { 
        params.model_identifier = model_identifier;
    }
    
    // REMOVE TRAILING SLASH from endpoint string for consistency
    return apiClient<AiPromptConfigRead[]>('/config/ai-prompts/', { params }); 
};

export const getAiPromptConfigById = (id: number): Promise<AiPromptConfigRead> => {
    return apiClient<AiPromptConfigRead>(`/config/ai-prompts/${id}`);
};

export const createAiPromptConfig = (
    data: AiPromptConfigCreatePayload
): Promise<AiPromptConfigRead> => {
    return apiClient<AiPromptConfigRead>('/config/ai-prompts/', {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const updateAiPromptConfig = (
    id: number,
    data: AiPromptConfigUpdatePayload
): Promise<AiPromptConfigRead> => {
    return apiClient<AiPromptConfigRead>(`/config/ai-prompts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};

export const deleteAiPromptConfig = (id: number): Promise<AiPromptConfigRead> => { // Backend returns deleted obj
    return apiClient<AiPromptConfigRead>(`/config/ai-prompts/${id}`, { method: 'DELETE' });
};

export const createGoogleHealthcareSource = async (
    payload: GoogleHealthcareSourceCreate 
): Promise<GoogleHealthcareSourceRead> => {

    return apiClient<GoogleHealthcareSourceRead>(
        '/config/google-healthcare-sources/', 
        { method: 'POST', body: JSON.stringify(payload) }
    );
};

export const updateGoogleHealthcareSource = async (
    id: number,
    payload: GoogleHealthcareSourceUpdate 
): Promise<GoogleHealthcareSourceRead> => {
    return apiClient<GoogleHealthcareSourceRead>(
        `/config/google-healthcare-sources/${id}`, 
        { method: 'PUT', body: JSON.stringify(payload) }
    );
};

// Facility API Functions
export const getFacilities = async (params?: { 
    skip?: number; 
    limit?: number; 
    is_active?: boolean; 
}): Promise<FacilityRead[]> => {
    return apiClient<FacilityRead[]>('/facilities/', { params });
};

export const getFacilityById = async (id: number): Promise<FacilityRead> => {
    return apiClient<FacilityRead>(`/facilities/${id}`);
};

export const createFacility = async (data: FacilityCreate): Promise<FacilityRead> => {
    return apiClient<FacilityRead>('/facilities/', {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const updateFacility = async (id: number, data: FacilityUpdate): Promise<FacilityRead> => {
    return apiClient<FacilityRead>(`/facilities/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};

export const deleteFacility = async (id: number): Promise<void> => {
    return apiClient<void>(`/facilities/${id}`, { method: 'DELETE' });
};

export const getFacilityModalities = async (facilityId: number, params?: {
    is_active?: boolean;
    is_dmwl_enabled?: boolean;
    modality_type?: string;
}): Promise<ModalityRead[]> => {
    return apiClient<ModalityRead[]>(`/facilities/${facilityId}/modalities`, { params });
};

// Modality API Functions
export const getModalities = async (params?: {
    skip?: number;
    limit?: number;
    facility_id?: number;
    modality_type?: string;
    is_active?: boolean;
    is_dmwl_enabled?: boolean;
    department?: string;
}): Promise<ModalityRead[]> => {
    return apiClient<ModalityRead[]>('/modalities/', { params });
};

export const getModalityById = async (id: number): Promise<ModalityRead> => {
    return apiClient<ModalityRead>(`/modalities/${id}`);
};

export const createModality = async (data: ModalityCreate): Promise<ModalityRead> => {
    return apiClient<ModalityRead>('/modalities/', {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const updateModality = async (id: number, data: ModalityUpdate): Promise<ModalityRead> => {
    return apiClient<ModalityRead>(`/modalities/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};

export const deleteModality = async (id: number): Promise<void> => {
    return apiClient<void>(`/modalities/${id}`, { method: 'DELETE' });
};

export const checkAeTitleAvailability = async (aeTitle: string, excludeId?: number): Promise<{ available: boolean }> => {
    const params = excludeId ? { exclude_id: excludeId } : undefined;
    return apiClient<{ available: boolean }>(`/modalities/check-ae-title/${aeTitle}`, {
        method: 'POST',
        params,
    });
};

// ==========================================
// SPANNER CONFIGURATION API FUNCTIONS
// ==========================================
// NOTE: All spanner endpoints are REAL and functional in the backend.
// These replaced the previous mock implementations since spanner endpoints exist.

// Spanner Configuration Management
export const getSpannerConfigs = (skip: number = 0, limit: number = 100): Promise<SpannerConfigRead[]> => {
    return apiClient<{ configs: SpannerConfigRead[]; total: number }>('/config/spanner', { params: { skip, limit } })
        .then(response => response.configs);
};

export const getSpannerConfigById = (id: number): Promise<SpannerConfigRead> => {
    return apiClient<SpannerConfigRead>(`/config/spanner/${id}`);
};

export const createSpannerConfig = (data: SpannerConfigCreate): Promise<SpannerConfigRead> => {
    return apiClient<SpannerConfigRead>('/config/spanner', { 
        method: 'POST', 
        body: JSON.stringify(data) 
    });
};

export const updateSpannerConfig = (id: number, data: SpannerConfigUpdate): Promise<SpannerConfigRead> => {
    return apiClient<SpannerConfigRead>(`/config/spanner/${id}`, { 
        method: 'PUT', 
        body: JSON.stringify(data) 
    });
};

export const deleteSpannerConfig = (id: number): Promise<void> => {
    return apiClient<void>(`/config/spanner/${id}`, { method: 'DELETE' });
};

// Helper function to transform source mapping data for API calls
const transformSourceMappingForApi = (data: Partial<SpannerSourceMappingCreate | SpannerSourceMappingUpdate>) => {
    console.log('🔍 transformSourceMappingForApi - Input data:', data);
    
    if (!data.source_id || data.source_id <= 0 || !data.source_type) {
        console.log('❌ Invalid source_id or missing source_type, returning original data');
        return data;
    }
    
    const { source_id, source_type, ...restData } = data;
    
    // The backend requires ALL source ID fields to be present
    // Set unused fields to 0 instead of null or omitting them
    const apiData: Record<string, unknown> = { 
        ...restData, 
        source_type,
        dimse_qr_source_id: 0,
        dicomweb_source_id: 0,
        google_healthcare_source_id: 0,
    };
    
    // Set the appropriate field based on source_type
    switch (source_type) {
        case 'dimse_qr':
            apiData.dimse_qr_source_id = source_id;
            break;
        case 'dicomweb':
            apiData.dicomweb_source_id = source_id;
            break;
        case 'google_healthcare':
            apiData.google_healthcare_source_id = source_id;
            break;
        default:
            console.warn('Unknown source_type:', source_type);
            // Fallback to generic source_id if unknown type
            apiData.source_id = source_id;
    }
    
    console.log('✅ transformSourceMappingForApi - Output data:', apiData);
    return apiData;
};

// Helper function to transform API response data back to frontend format
const transformSourceMappingFromApi = (data: Record<string, unknown>): SpannerSourceMappingRead => {
    const source_type = data.source_type as SpannerSourceMappingRead['source_type'];
    if (!source_type) {
        // This case should ideally not happen if the API is consistent.
        // We return it as-is but cast, which might be unsafe.
        // Consider logging an error here.
        return data as SpannerSourceMappingRead;
    }
    
    let source_id: number | undefined;
    
    // Extract source_id from the appropriate field based on source_type
    switch (source_type) {
        case 'dimse_qr':
            source_id = data.dimse_qr_source_id as number;
            delete data.dimse_qr_source_id;
            break;
        case 'dicomweb':
            source_id = data.dicomweb_source_id as number;
            delete data.dicomweb_source_id;
            break;
        case 'google_healthcare':
            source_id = data.google_healthcare_source_id as number;
            delete data.google_healthcare_source_id;
            break;
        default:
            // This handles any other case, though we expect one of the above
            source_id = data.source_id as number;
    }
    
    // Ensure source_id is a number, defaulting to 0 if it's not found.
    // This prevents the return type from having an `undefined` id.
    const final_source_id = source_id ?? 0;

    return { ...data, source_id: final_source_id, source_type: source_type } as SpannerSourceMappingRead;
};

// Source Mapping Management
export const getSpannerSourceMappings = (spannerId: number): Promise<SpannerSourceMappingRead[]> => {
    return apiClient<{ mappings: Record<string, unknown>[]; total: number }>(`/config/spanner/${spannerId}/sources`)
        .then(response => response.mappings.map(transformSourceMappingFromApi));
};

export const createSpannerSourceMapping = (spannerId: number, data: Omit<SpannerSourceMappingCreate, 'spanner_config_id'>): Promise<SpannerSourceMappingRead> => {
    // Transform the data to match backend API expectations
    const transformedData = { ...data, spanner_config_id: spannerId };
    const apiData = transformSourceMappingForApi(transformedData);
    
    return apiClient<Record<string, unknown>>(`/config/spanner/${spannerId}/sources`, { 
        method: 'POST', 
        body: JSON.stringify(apiData) 
    }).then(transformSourceMappingFromApi);
};

export const updateSpannerSourceMapping = (spannerId: number, mappingId: number, data: SpannerSourceMappingUpdate): Promise<SpannerSourceMappingRead> => {
    // Transform the data if it contains source_id and source_type
    const apiData = transformSourceMappingForApi(data);
    
    return apiClient<Record<string, unknown>>(`/config/spanner/${spannerId}/sources/${mappingId}`, { 
        method: 'PUT', 
        body: JSON.stringify(apiData) 
    }).then(transformSourceMappingFromApi);
};

export const deleteSpannerSourceMapping = (spannerId: number, mappingId: number): Promise<void> => {
    return apiClient<void>(`/config/spanner/${spannerId}/sources/${mappingId}`, { method: 'DELETE' });
};

// Reorder source mappings (for drag-and-drop)
export const reorderSpannerSourceMappings = (spannerId: number, mappingIds: number[]): Promise<SpannerSourceMappingRead[]> => {
    return apiClient<SpannerSourceMappingRead[]>(`/config/spanner/${spannerId}/sources/reorder`, { 
        method: 'POST', 
        body: JSON.stringify({ mapping_ids: mappingIds }) 
    });
};

// Service Management
export const getSpannerServicesStatus = (): Promise<SpannerServicesStatusResponse> => {
    return apiClient<SpannerServicesStatusResponse>('/spanner/services/status');
};

export const startSpannerServices = (): Promise<ServiceControlResponse> => {
    return apiClient<ServiceControlResponse>('/spanner/services/start', { method: 'POST' });
};

export const stopSpannerServices = (): Promise<ServiceControlResponse> => {
    return apiClient<ServiceControlResponse>('/spanner/services/stop', { method: 'POST' });
};

export const restartSpannerService = (serviceId: string): Promise<ServiceControlResponse> => {
    return apiClient<ServiceControlResponse>(`/spanner/services/restart/${serviceId}`, { method: 'POST' });
};

// Available Sources (for dropdowns and selection)
export const getAvailableDimseQrSources = (): Promise<AvailableSource[]> => {
    return apiClient<DimseQueryRetrieveSourceRead[]>('/config/dimse-qr-sources', { params: { skip: 0, limit: 500 } }).then(sources => 
        sources.map(s => ({
            id: s.id,
            name: s.name,
            description: s.description || undefined,
            type: 'dimse_qr' as const,
            status: s.is_active ? 'active' : 'inactive',
            created_at: s.created_at,
        }))
    );
};

export const getAvailableDicomWebSources = (): Promise<AvailableSource[]> => {
    return apiClient<DicomWebSourceConfigRead[]>('/config/dicomweb-sources', { params: { skip: 0, limit: 500 } }).then(sources => 
        sources.map(s => ({
            id: s.id,
            name: s.name,
            description: s.description || undefined,
            type: 'dicomweb' as const,
            status: s.is_active ? 'active' : 'inactive',
            created_at: s.created_at,
        }))
    );
};

export const getAvailableGoogleHealthcareSources = (): Promise<AvailableSource[]> => {
    return apiClient<GoogleHealthcareSourceRead[]>('/config/google-healthcare-sources/', { params: { skip: 0, limit: 500 } }).then(sources => 
        sources.map(s => ({
            id: s.id,
            name: s.name,
            description: s.description || undefined,
            type: 'google_healthcare' as const,
            status: s.is_active ? 'active' : 'inactive',
            created_at: s.created_at,
        }))
    );
};

export const getAllAvailableSources = async (): Promise<AvailableSource[]> => {
    const [dimseQr, dicomWeb, googleHealthcare] = await Promise.all([
        getAvailableDimseQrSources().catch(() => []),
        getAvailableDicomWebSources().catch(() => []),
        getAvailableGoogleHealthcareSources().catch(() => []),
    ]);
    
    return [...dimseQr, ...dicomWeb, ...googleHealthcare];
};

// Mock metrics data with extended interface to include timestamp for filtering
interface MockSpannerMetrics extends SpannerMetrics {
    timestamp: string; // Additional field for mock data filtering
}

const mockMetricsData: MockSpannerMetrics[] = [
    {
        spanner_config_id: 1,
        spanner_config_name: "Enterprise Main PACS Query Spanner",
        timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        total_queries: 450,
        successful_queries: 425,
        failed_queries: 25,
        average_response_time_ms: 1250,
        median_response_time_ms: 980,
        p95_response_time_ms: 2100,
        total_results_before_dedup: 1250,
        total_results_after_dedup: 980,
        deduplication_rate: 0.216,
        source_metrics: [
            {
                source_id: 1,
                source_name: "Main Hospital PACS",
                source_type: 'dimse_qr' as const,
                queries: 150,
                successes: 142,
                failures: 8,
                avg_response_time_ms: 1100,
                success_rate: 0.947,
            },
            {
                source_id: 2,
                source_name: "Radiology DICOM Web",
                source_type: 'dicomweb' as const,
                queries: 200,
                successes: 192,
                failures: 8,
                avg_response_time_ms: 1350,
                success_rate: 0.96,
            },
            {
                source_id: 3,
                source_name: "Cardiology Archive",
                source_type: 'dimse_qr' as const,
                queries: 100,
                successes: 91,
                failures: 9,
                avg_response_time_ms: 1400,
                success_rate: 0.91,
            }
        ],
        from_date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        to_date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000).toISOString()
    },
    {
        spanner_config_id: 1,
        spanner_config_name: "Enterprise Main PACS Query Spanner",
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        total_queries: 520,
        successful_queries: 495,
        failed_queries: 25,
        average_response_time_ms: 1180,
        median_response_time_ms: 920,
        p95_response_time_ms: 1950,
        total_results_before_dedup: 1480,
        total_results_after_dedup: 1124,
        deduplication_rate: 0.241,
        source_metrics: [
            {
                source_id: 1,
                source_name: "Main Hospital PACS",
                source_type: 'dimse_qr' as const,
                queries: 180,
                successes: 172,
                failures: 8,
                avg_response_time_ms: 1050,
                success_rate: 0.956,
            },
            {
                source_id: 2,
                source_name: "Radiology DICOM Web",
                source_type: 'dicomweb' as const,
                queries: 220,
                successes: 212,
                failures: 8,
                avg_response_time_ms: 1280,
                success_rate: 0.964,
            },
            {
                source_id: 3,
                source_name: "Cardiology Archive",
                source_type: 'dimse_qr' as const,
                queries: 120,
                successes: 111,
                failures: 9,
                avg_response_time_ms: 1350,
                success_rate: 0.925,
            }
        ],
        from_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        to_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000).toISOString()
    },
    {
        spanner_config_id: 2,
        spanner_config_name: "Emergency Department Query Spanner",
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        total_queries: 380,
        successful_queries: 365,
        failed_queries: 15,
        average_response_time_ms: 890,
        median_response_time_ms: 750,
        p95_response_time_ms: 1400,
        total_results_before_dedup: 920,
        total_results_after_dedup: 780,
        deduplication_rate: 0.152,
        source_metrics: [
            {
                source_id: 4,
                source_name: "Emergency PACS",
                source_type: 'dimse_qr' as const,
                queries: 190,
                successes: 183,
                failures: 7,
                avg_response_time_ms: 820,
                success_rate: 0.963,
            },
            {
                source_id: 5,
                source_name: "Trauma Archive",
                source_type: 'dicomweb' as const,
                queries: 190,
                successes: 182,
                failures: 8,
                avg_response_time_ms: 960,
                success_rate: 0.958,
            }
        ],
        from_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        to_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000).toISOString()
    },
    {
        spanner_config_id: 3,
        spanner_config_name: "Multi-Site Research Query Spanner",
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        total_queries: 680,
        successful_queries: 642,
        failed_queries: 38,
        average_response_time_ms: 1520,
        median_response_time_ms: 1200,
        p95_response_time_ms: 2800,
        total_results_before_dedup: 2100,
        total_results_after_dedup: 1580,
        deduplication_rate: 0.248,
        source_metrics: [
            {
                source_id: 6,
                source_name: "Research Site A",
                source_type: 'google_healthcare' as const,
                queries: 170,
                successes: 158,
                failures: 12,
                avg_response_time_ms: 1680,
                success_rate: 0.929,
            },
            {
                source_id: 7,
                source_name: "Research Site B",
                source_type: 'dimse_qr' as const,
                queries: 170,
                successes: 162,
                failures: 8,
                avg_response_time_ms: 1420,
                success_rate: 0.953,
            },
            {
                source_id: 8,
                source_name: "Research Site C",
                source_type: 'dicomweb' as const,
                queries: 170,
                successes: 158,
                failures: 12,
                avg_response_time_ms: 1580,
                success_rate: 0.929,
            },
            {
                source_id: 9,
                source_name: "Central Archive",
                source_type: 'dimse_qr' as const,
                queries: 170,
                successes: 164,
                failures: 6,
                avg_response_time_ms: 1400,
                success_rate: 0.965,
            }
        ],
        from_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        to_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000).toISOString()
    },
    {
        spanner_config_id: 1,
        spanner_config_name: "Enterprise Main PACS Query Spanner",
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        total_queries: 590,
        successful_queries: 565,
        failed_queries: 25,
        average_response_time_ms: 1350,
        median_response_time_ms: 1050,
        p95_response_time_ms: 2200,
        total_results_before_dedup: 1620,
        total_results_after_dedup: 1240,
        deduplication_rate: 0.235,
        source_metrics: [
            {
                source_id: 1,
                source_name: "Main Hospital PACS",
                source_type: 'dimse_qr' as const,
                queries: 200,
                successes: 192,
                failures: 8,
                avg_response_time_ms: 1200,
                success_rate: 0.96,
            },
            {
                source_id: 2,
                source_name: "Radiology DICOM Web",
                source_type: 'dicomweb' as const,
                queries: 240,
                successes: 232,
                failures: 8,
                avg_response_time_ms: 1450,
                success_rate: 0.967,
            },
            {
                source_id: 3,
                source_name: "Cardiology Archive",
                source_type: 'dimse_qr' as const,
                queries: 150,
                successes: 141,
                failures: 9,
                avg_response_time_ms: 1500,
                success_rate: 0.94,
            }
        ],
        from_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        to_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000).toISOString()
    },
    {
        spanner_config_id: 2,
        spanner_config_name: "Emergency Department Query Spanner",
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        total_queries: 420,
        successful_queries: 405,
        failed_queries: 15,
        average_response_time_ms: 950,
        median_response_time_ms: 800,
        p95_response_time_ms: 1600,
        total_results_before_dedup: 1020,
        total_results_after_dedup: 870,
        deduplication_rate: 0.147,
        source_metrics: [
            {
                source_id: 4,
                source_name: "Emergency PACS",
                source_type: 'dimse_qr' as const,
                queries: 210,
                successes: 203,
                failures: 7,
                avg_response_time_ms: 880,
                success_rate: 0.967,
            },
            {
                source_id: 5,
                source_name: "Trauma Archive",
                source_type: 'dicomweb' as const,
                queries: 210,
                successes: 202,
                failures: 8,
                avg_response_time_ms: 1020,
                success_rate: 0.962,
            }
        ],
        from_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        to_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000).toISOString()
    },
    {
        spanner_config_id: 3,
        spanner_config_name: "Multi-Site Research Query Spanner",
        timestamp: new Date().toISOString(),
        total_queries: 720,
        successful_queries: 698,
        failed_queries: 22,
        average_response_time_ms: 1420,
        median_response_time_ms: 1150,
        p95_response_time_ms: 2500,
        total_results_before_dedup: 2380,
        total_results_after_dedup: 1820,
        deduplication_rate: 0.235,
        source_metrics: [
            {
                source_id: 6,
                source_name: "Research Site A",
                source_type: 'google_healthcare' as const,
                queries: 180,
                successes: 174,
                failures: 6,
                avg_response_time_ms: 1580,
                success_rate: 0.967,
            },
            {
                source_id: 7,
                source_name: "Research Site B",
                source_type: 'dimse_qr' as const,
                queries: 180,
                successes: 174,
                failures: 6,
                avg_response_time_ms: 1320,
                success_rate: 0.967,
            },
            {
                source_id: 8,
                source_name: "Research Site C",
                source_type: 'dicomweb' as const,
                queries: 180,
                successes: 175,
                failures: 5,
                avg_response_time_ms: 1480,
                success_rate: 0.972,
            },
            {
                source_id: 9,
                source_name: "Central Archive",
                source_type: 'dimse_qr' as const,
                queries: 180,
                successes: 175,
                failures: 5,
                avg_response_time_ms: 1300,
                success_rate: 0.972,
            }
        ],
        from_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        to_date: new Date().toISOString()
    }
];

// Metrics and Analytics
export const getSpannerMetrics = (
    spannerId?: number, 
    fromDate?: string, 
    toDate?: string
): Promise<SpannerMetrics[]> => {
    // Use mock data for now since backend endpoints don't exist yet
    return new Promise((resolve) => {
        setTimeout(() => {
            let filteredData = [...mockMetricsData];
            
            // Filter by spanner config if provided
            if (spannerId) {
                filteredData = filteredData.filter(m => m.spanner_config_id === spannerId);
            }
            
            // Filter by date range if provided
            if (fromDate) {
                const fromDateTime = new Date(fromDate);
                filteredData = filteredData.filter(m => new Date(m.timestamp) >= fromDateTime);
            }
            
            if (toDate) {
                const toDateTime = new Date(toDate);
                filteredData = filteredData.filter(m => new Date(m.timestamp) <= toDateTime);
            }
            
            // Convert to SpannerMetrics type (remove timestamp field)
            const convertedData: SpannerMetrics[] = filteredData.map(({ ...metrics }) => metrics);
            
            resolve(convertedData);
        }, 300); // Simulate network delay
    });
    
    // Real API call (commented out until backend is ready)
    // const params: Record<string, unknown> = {};
    // if (spannerId) params.spanner_id = spannerId;
    // if (fromDate) params.from_date = fromDate;
    // if (toDate) params.to_date = toDate;
    // return apiClient<SpannerMetrics[]>('/spanner/metrics', { params });
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getSpannerConfigMetrics = (spannerId: number, _?: string, __?: string): Promise<SpannerMetrics> => {
    // Use mock data for now since backend endpoints don't exist yet
    return new Promise((resolve) => {
        setTimeout(() => {
            // Find the most recent metrics for this spanner config
            const configMetrics = mockMetricsData
                .filter(m => m.spanner_config_id === spannerId)
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
            
            // Convert to SpannerMetrics type (remove timestamp field)
            const result = configMetrics || mockMetricsData[0];
            const { ...metrics } = result;
            
            resolve(metrics);
        }, 200);
    });
    
    // Real API call (commented out until backend is ready)
    // const params: Record<string, unknown> = {};
    // if (fromDate) params.from_date = fromDate;
    // if (toDate) params.to_date = toDate;
    // return apiClient<SpannerMetrics>(`/spanner/metrics/${spannerId}`, { params });
};

// Test and Validation
export const testSpannerConfig = (id: number): Promise<{ success: boolean; message: string; details?: Record<string, unknown> }> => {
    return apiClient<{ success: boolean; message: string; details?: Record<string, unknown> }>(`/config/spanner/${id}/test`, { 
        method: 'POST',
        body: JSON.stringify({}) // Backend expects a body even if empty
    });
};

export const validateSpannerSourceMapping = (
    spannerId: number, 
    mappingData: Omit<SpannerSourceMappingCreate, 'spanner_config_id'>
): Promise<{ valid: boolean; issues: string[] }> => {
    return apiClient<{ valid: boolean; issues: string[] }>(`/config/spanner/${spannerId}/sources/validate`, { 
        method: 'POST', 
        body: JSON.stringify(mappingData) 
    });
};

// Bulk Operations
export const bulkUpdateSpannerConfigs = (
    updates: { id: number; data: SpannerConfigUpdate }[]
): Promise<{ successful: number; failed: number; errors: Record<string, unknown>[] }> => {
    return apiClient<{ successful: number; failed: number; errors: Record<string, unknown>[] }>('/config/spanner/bulk-update', { 
        method: 'POST', 
        body: JSON.stringify({ updates }) 
    });
};

export const bulkEnableSpannerConfigs = (ids: number[], enabled: boolean): Promise<ServiceControlResponse> => {
    return apiClient<ServiceControlResponse>('/config/spanner/bulk-enable', { 
        method: 'POST', 
        body: JSON.stringify({ ids, enabled }) 
    });
};

// Import/Export
export const exportSpannerConfigs = (ids?: number[]): Promise<Blob> => {
    const params: Record<string, string> = {};
    if (ids) {
        params.ids = ids.join(',');
    }
    return apiClient<Blob>('/config/spanner/export', { 
        params,
        headers: { Accept: 'application/json' }
    });
};

export const importSpannerConfigs = (file: File): Promise<{ 
    imported: number; 
    skipped: number; 
    errors: string[] 
}> => {
    const formData = new FormData();
    formData.append('file', file);
    
    return apiClient<{ imported: number; skipped: number; errors: string[] }>('/config/spanner/import', { 
        method: 'POST', 
        body: formData 
    });
};


export type { UserWithRoles };

export type {
    Ruleset,
    Rule,
    ApiKey,
    ApiKeyCreate,
    ApiKeyCreateResponse,
    // ApiKeyUpdate, // If needed by other components
    UserRoleUpdatePayload, // Already UserUpdate as UserRoleUpdatePayload
    Role,
    SystemStatusReport,
    ComponentStatus,
    DicomWebSourceConfigRead,
    DicomWebSourceConfigCreatePayload,
    DicomWebSourceConfigUpdatePayload,
    // DicomWebSourceStatus, // If needed
    DimseListenerConfigRead,
    DimseListenerConfigCreatePayload,
    DimseListenerConfigUpdatePayload,
    // DimseListenerStatus, // If needed
    StorageBackendConfigRead,
    StorageBackendConfigCreatePayload,
    StorageBackendConfigUpdateApiPayload,
    Schedule, // Use the corrected name
    ScheduleCreate,
    ScheduleUpdate,
    DimseQueryRetrieveSourceRead,
    DimseQueryRetrieveSourceCreatePayload,
    DimseQueryRetrieveSourceUpdatePayload,
    // DimseQrSourceStatus, // If needed
    RuleGenRequest,
    RuleGenResponse,
    SystemInfo,
    GoogleHealthcareSourceRead,
    GoogleHealthcareSourceCreate,
    GoogleHealthcareSourceUpdate,
    DiskUsageStats,
    DicomWebPollersStatusResponse,
    DimseListenersStatusResponse,
    DimseQrSourcesStatusResponse,
    AiPromptConfigRead,
    AiPromptConfigCreatePayload,
    AiPromptConfigUpdatePayload,
    DataBrowserQueryRequest,
    DataBrowserQueryResponse,
    CrosswalkDataSourceRead,
    CrosswalkDataSourceCreatePayload,
    CrosswalkDataSourceUpdatePayload,
    CrosswalkMapRead,
    CrosswalkMapCreatePayload,
    CrosswalkMapUpdatePayload,
    FacilityCreate,
    FacilityUpdate,
    FacilityRead,
    ModalityCreate,
    ModalityUpdate,
    ModalityRead,
    // Add any other types that components import from api.ts
    // For example, if RulesetCreate, RulesetUpdate are used by components directly from api.ts
    RulesetCreate, 
    RulesetUpdate, 
    RuleCreate, 
    RuleUpdate,
    OrdersApiResponse,
    
    // Spanner types
    SpannerConfigRead,
    SpannerConfigCreate,
    SpannerConfigUpdate,
    SpannerSourceMappingRead,
    SpannerSourceMappingCreate,
    SpannerSourceMappingUpdate,
    SpannerServiceStatus,
    SpannerServicesStatusResponse,
    AvailableSource,
    SpannerMetrics,
    ServiceControlRequest,
    ServiceControlResponse,
};

export default apiClient;
