// src/services/api.ts
import { AuthContextType } from '../context/AuthContext'; // Import context type
import {
    User, UserWithRoles, Role, ApiKey, ApiKeyCreateResponse,
    Ruleset, Rule, RuleCreate, RuleUpdate, RulesetCreate, RulesetUpdate,
    JsonProcessRequest, JsonProcessResponse,
    HealthCheckResponse, // For dashboard status
    DicomWebPollersStatusResponse, // For DICOMweb poller status
    DimseListenersStatusResponse, // For DIMSE listener status
    DimseQrSourcesStatusResponse, // For DIMSE Q/R source status
    DicomWebSourceConfigRead, DicomWebSourceConfigCreatePayload, DicomWebSourceConfigUpdatePayload, // DICOMweb Config
    DimseListenerConfigRead, DimseListenerConfigCreatePayload, DimseListenerConfigUpdatePayload, // DIMSE Listener Config
    DimseQueryRetrieveSourceRead, DimseQueryRetrieveSourceCreatePayload, DimseQueryRetrieveSourceUpdatePayload, // DIMSE Q/R Config
    StorageBackendConfigRead, StorageBackendConfigCreatePayload, StorageBackendConfigUpdatePayload,
    CrosswalkDataSourceRead,
    CrosswalkDataSourceCreatePayload,
    CrosswalkDataSourceUpdatePayload,
    CrosswalkMapRead,
    CrosswalkMapCreatePayload,
    CrosswalkMapUpdatePayload,
} from '../schemas'; // Assuming schemas are exported from index

// --- Keep Auth Context Reference ---
let authContextRef: AuthContextType | null = null;

export function setAuthContextRef(context: AuthContextType) {
    authContextRef = context;
}
// --- End Auth Context Reference ---

// Base URL for the API from environment variables
// Ensure this uses HTTPS in your production .env file if your site uses HTTPS
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// --- apiClient Function (Keep existing logic) ---
interface ApiClientOptions extends RequestInit {
    useAuth?: boolean; // Control whether to send auth token
    isFormData?: boolean; // Indicate if body is FormData
}

export async function apiClient<T>(
    endpoint: string,
    options: ApiClientOptions = {}
): Promise<T> {
    const { useAuth = true, isFormData = false, ...fetchOptions } = options;
    const headers = new Headers(fetchOptions.headers || {});
    let token: string | null = null;

    if (useAuth) {
        token = authContextRef?.getToken(); // Use function from context
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        } else {
            console.warn(`apiClient: No auth token found for protected endpoint ${endpoint}. Request might fail.`);
            // Optionally throw error or handle redirect here if token is strictly required
        }
    }

    // Only set Content-Type if body exists and it's not FormData
    if (fetchOptions.body && !isFormData && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    } else if (isFormData) {
        // For FormData, DO NOT set Content-Type header; browser handles it with boundary
        // Ensure the body IS actually a FormData object if isFormData is true
        if (!(fetchOptions.body instanceof FormData)) {
             console.error("apiClient: isFormData is true, but body is not FormData.");
             // Handle error appropriately, maybe throw
        }
    }


    const config: RequestInit = {
        ...fetchOptions,
        headers,
    };

    // Construct the final URL - ensure no double slashes if endpoint starts with /
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    console.debug(`apiClient: Fetching ${config.method || 'GET'} ${url}`);

    try {
        const response = await fetch(url, config);

        // Handle successful responses with no content (e.g., 204 No Content)
        if (response.status === 204) {
            console.debug(`apiClient: Received 204 No Content for ${url}`);
            // Return an empty object or null cast as T, depending on expected usage
            // Be cautious with this, ensure calling code handles potential null/empty object
            return null as T;
        }

        // Try to parse JSON, but handle potential non-JSON responses gracefully
        let responseData: any;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            responseData = await response.json();
        } else {
            // If not JSON, maybe just get text? Or handle based on status code?
            // For now, let's assume non-ok non-json is an error text
            responseData = await response.text(); // Get text for error reporting
             if (response.ok) {
                 console.warn(`apiClient: Received non-JSON response for ${url} with status ${response.status}. Returning raw text.`);
                 // If it was status 200 OK but not JSON, maybe return text? Or null?
                 // Returning the text might break type T expectations. Returning null might be safer.
                 return responseData as T; // Or return null as T;
             }
        }


        if (!response.ok) {
            console.error(`apiClient: Error ${response.status} fetching ${url}:`, responseData);
            // Attempt to extract a meaningful error message from JSON or use text
            const errorMessage = (typeof responseData === 'object' && responseData?.detail)
                                 || (typeof responseData === 'object' && responseData?.message)
                                 || (typeof responseData === 'string' ? responseData : `HTTP error ${response.status}`);
            const error: any = new Error(errorMessage);
            error.status = response.status;
            error.detail = (typeof responseData === 'object' ? responseData?.detail : responseData); // Preserve detail
            // If 401 Unauthorized, trigger logout via context
            if (response.status === 401 && useAuth && authContextRef) {
                console.warn(`apiClient: Received 401 Unauthorized for ${url}. Logging out.`);
                authContextRef.logout(); // Trigger logout
            }
            throw error;
        }

        console.debug(`apiClient: Successfully fetched ${url}`);
        return responseData as T;

    } catch (error: any) {
        // Catch fetch errors (network issues) and re-thrown errors from !response.ok
        console.error(`apiClient: Network or processing error fetching ${url}:`, error);
        // Re-throw the error so calling components can handle it
        throw error;
    }
}
// --- End apiClient Function ---


// --- API Key Management ---
export const getApiKeys = (): Promise<ApiKey[]> => apiClient<ApiKey[]>('/apikeys');
export const createApiKey = (name: string): Promise<ApiKeyCreateResponse> => apiClient<ApiKeyCreateResponse>('/apikeys', { method: 'POST', body: JSON.stringify({ name }) });
export const deleteApiKey = (keyId: number): Promise<null> => apiClient<null>(`/apikeys/${keyId}`, { method: 'DELETE' });

// --- User Management ---
export const getUsers = (): Promise<UserWithRoles[]> => apiClient<UserWithRoles[]>('/users');
export const getRoles = (): Promise<Role[]> => apiClient<Role[]>('/roles');
export const assignRoleToUser = (userId: number, roleId: number): Promise<UserWithRoles> => apiClient<UserWithRoles>(`/users/${userId}/roles`, { method: 'POST', body: JSON.stringify({ role_id: roleId }) });
export const removeRoleFromUser = (userId: number, roleId: number): Promise<UserWithRoles> => apiClient<UserWithRoles>(`/users/${userId}/roles/${roleId}`, { method: 'DELETE' });
export const updateUser = (userId: number, data: Partial<{ is_active: boolean }>): Promise<UserWithRoles> => apiClient<UserWithRoles>(`/users/${userId}`, { method: 'PUT', body: JSON.stringify(data) });
export const getCurrentUser = (): Promise<User> => apiClient<User>('/users/me');


// --- Ruleset & Rule Management ---
export const getRulesets = (): Promise<Ruleset[]> => apiClient<Ruleset[]>('/rules-engine/rulesets');
export const getRulesetById = (id: number): Promise<Ruleset> => apiClient<Ruleset>(`/rules-engine/rulesets/${id}`);
export const createRuleset = (data: RulesetCreate): Promise<Ruleset> => apiClient<Ruleset>('/rules-engine/rulesets', { method: 'POST', body: JSON.stringify(data) });
export const updateRuleset = (id: number, data: RulesetUpdate): Promise<Ruleset> => apiClient<Ruleset>(`/rules-engine/rulesets/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteRuleset = (id: number): Promise<null> => apiClient<null>(`/rules-engine/rulesets/${id}`, { method: 'DELETE' });

export const getRulesByRuleset = (rulesetId: number): Promise<Rule[]> => apiClient<Rule[]>(`/rules-engine/rules?ruleset_id=${rulesetId}`);
export const createRule = (data: RuleCreate): Promise<Rule> => apiClient<Rule>('/rules-engine/rules', { method: 'POST', body: JSON.stringify(data) });
export const updateRule = (id: number, data: RuleUpdate): Promise<Rule> => apiClient<Rule>(`/rules-engine/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteRule = (id: number): Promise<null> => apiClient<null>(`/rules-engine/rules/${id}`, { method: 'DELETE' });

// --- JSON Processing ---
export const processJsonHeader = (data: JsonProcessRequest): Promise<JsonProcessResponse> => apiClient<JsonProcessResponse>('/rules-engine/process-json', { method: 'POST', body: JSON.stringify(data) });

// --- System Status ---
export const getDashboardStatus = (): Promise<HealthCheckResponse> => apiClient<HealthCheckResponse>('/dashboard/status');
export const getDicomWebPollersStatus = (): Promise<DicomWebPollersStatusResponse> => apiClient<DicomWebPollersStatusResponse>('/system/dicomweb-pollers/status');
export const getDimseListenersStatus = (): Promise<DimseListenersStatusResponse> => apiClient<DimseListenersStatusResponse>('/system/dimse-listeners/status');
export const getDimseQrSourcesStatus = (): Promise<DimseQrSourcesStatusResponse> => apiClient<DimseQrSourcesStatusResponse>('/system/dimse-qr-sources/status');

// --- Configuration Management ---

// DICOMweb Sources
export const getDicomWebSources = (skip: number = 0, limit: number = 100): Promise<DicomWebSourceConfigRead[]> => apiClient<DicomWebSourceConfigRead[]>(`/config/dicomweb-sources?skip=${skip}&limit=${limit}`);
export const createDicomWebSource = (data: DicomWebSourceConfigCreatePayload): Promise<DicomWebSourceConfigRead> => apiClient<DicomWebSourceConfigRead>('/config/dicomweb-sources', { method: 'POST', body: JSON.stringify(data) });
export const updateDicomWebSource = (id: number, data: DicomWebSourceConfigUpdatePayload): Promise<DicomWebSourceConfigRead> => apiClient<DicomWebSourceConfigRead>(`/config/dicomweb-sources/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteDicomWebSource = (id: number): Promise<DicomWebSourceConfigRead> => apiClient<DicomWebSourceConfigRead>(`/config/dicomweb-sources/${id}`, { method: 'DELETE' }); // Returns deleted object

// DIMSE Listeners
export const getDimseListenerConfigs = (skip: number = 0, limit: number = 100): Promise<DimseListenerConfigRead[]> => apiClient<DimseListenerConfigRead[]>(`/config/dimse-listeners?skip=${skip}&limit=${limit}`);
export const createDimseListenerConfig = (data: DimseListenerConfigCreatePayload): Promise<DimseListenerConfigRead> => apiClient<DimseListenerConfigRead>('/config/dimse-listeners', { method: 'POST', body: JSON.stringify(data) });
export const updateDimseListenerConfig = (id: number, data: DimseListenerConfigUpdatePayload): Promise<DimseListenerConfigRead> => apiClient<DimseListenerConfigRead>(`/config/dimse-listeners/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteDimseListenerConfig = (id: number): Promise<DimseListenerConfigRead> => apiClient<DimseListenerConfigRead>(`/config/dimse-listeners/${id}`, { method: 'DELETE' }); // Returns deleted object

// DIMSE Q/R Sources
export const getDimseQrSources = (skip: number = 0, limit: number = 100): Promise<DimseQueryRetrieveSourceRead[]> => apiClient<DimseQueryRetrieveSourceRead[]>(`/config/dimse-qr-sources?skip=${skip}&limit=${limit}`);
export const createDimseQrSource = (data: DimseQueryRetrieveSourceCreatePayload): Promise<DimseQueryRetrieveSourceRead> => apiClient<DimseQueryRetrieveSourceRead>('/config/dimse-qr-sources', { method: 'POST', body: JSON.stringify(data) });
export const updateDimseQrSource = (id: number, data: DimseQueryRetrieveSourceUpdatePayload): Promise<DimseQueryRetrieveSourceRead> => apiClient<DimseQueryRetrieveSourceRead>(`/config/dimse-qr-sources/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteDimseQrSource = (id: number): Promise<DimseQueryRetrieveSourceRead> => apiClient<DimseQueryRetrieveSourceRead>(`/config/dimse-qr-sources/${id}`, { method: 'DELETE' }); // Returns deleted object

export const getStorageBackendConfigs = (skip: number = 0, limit: number = 100): Promise<StorageBackendConfigRead[]> => apiClient<StorageBackendConfigRead[]>(`/config/storage-backends?skip=${skip}&limit=${limit}`);
export const createStorageBackendConfig = (data: StorageBackendConfigCreatePayload): Promise<StorageBackendConfigRead> => apiClient<StorageBackendConfigRead>('/config/storage-backends', { method: 'POST', body: JSON.stringify(data) });
export const updateStorageBackendConfig = (id: number, data: StorageBackendConfigUpdatePayload): Promise<StorageBackendConfigRead> => apiClient<StorageBackendConfigRead>(`/config/storage-backends/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteStorageBackendConfig = (id: number): Promise<StorageBackendConfigRead> => apiClient<StorageBackendConfigRead>(`/config/storage-backends/${id}`, { method: 'DELETE' }); // Returns deleted object

export const getKnownInputSources = (): Promise<string[]> => apiClient<string[]>('/system/input-sources');


export const getCrosswalkDataSources = (skip = 0, limit = 100): Promise<CrosswalkDataSourceRead[]> =>
    apiClient(`/config/crosswalk/data-sources?skip=${skip}&limit=${limit}`);

export const getCrosswalkDataSourceById = (sourceId: number): Promise<CrosswalkDataSourceRead> =>
    apiClient(`/config/crosswalk/data-sources/${sourceId}`);

export const createCrosswalkDataSource = (payload: CrosswalkDataSourceCreatePayload): Promise<CrosswalkDataSourceRead> =>
    apiClient('/config/crosswalk/data-sources', { method: 'POST', body: JSON.stringify(payload) });

export const updateCrosswalkDataSource = (sourceId: number, payload: CrosswalkDataSourceUpdatePayload): Promise<CrosswalkDataSourceRead> =>
    apiClient(`/config/crosswalk/data-sources/${sourceId}`, { method: 'PUT', body: JSON.stringify(payload) });

export const deleteCrosswalkDataSource = (sourceId: number): Promise<CrosswalkDataSourceRead> =>
    apiClient(`/config/crosswalk/data-sources/${sourceId}`, { method: 'DELETE' });

export const testCrosswalkDataSourceConnection = (sourceId: number): Promise<{ success: boolean; message: string; status_code: number }> =>
    apiClient(`/config/crosswalk/data-sources/${sourceId}/test`, { method: 'POST' });

export const triggerCrosswalkDataSourceSync = (sourceId: number): Promise<{ message: string; task_id: string }> =>
    apiClient(`/config/crosswalk/data-sources/${sourceId}/sync`, { method: 'POST' });

export const getCrosswalkMaps = (dataSourceId?: number, skip = 0, limit = 100): Promise<CrosswalkMapRead[]> => {
    const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
    if (dataSourceId !== undefined) {
        params.append('data_source_id', String(dataSourceId));
    }
    return apiClient(`/config/crosswalk/mappings?${params.toString()}`);
}

export const getCrosswalkMapById = (mapId: number): Promise<CrosswalkMapRead> =>
    apiClient(`/config/crosswalk/mappings/${mapId}`);

export const createCrosswalkMap = (payload: CrosswalkMapCreatePayload): Promise<CrosswalkMapRead> =>
    apiClient('/config/crosswalk/mappings', { method: 'POST', body: JSON.stringify(payload) });

export const updateCrosswalkMap = (mapId: number, payload: CrosswalkMapUpdatePayload): Promise<CrosswalkMapRead> =>
    apiClient(`/config/crosswalk/mappings/${mapId}`, { method: 'PUT', body: JSON.stringify(payload) });

export const deleteCrosswalkMap = (mapId: number): Promise<CrosswalkMapRead> =>
    apiClient(`/config/crosswalk/mappings/${mapId}`, { method: 'DELETE' });
