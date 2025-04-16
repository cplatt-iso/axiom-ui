// src/services/api.ts
import { AuthContextType } from '../context/AuthContext';

let authContextRef: AuthContextType | null = null;

export const setAuthContextRef = (auth: AuthContextType) => {
    authContextRef = auth;
};

interface FetchOptions extends RequestInit {
    useAuth?: boolean;
}

// Base apiClient remains the same as your provided version
export const apiClient = async <T>(
    endpoint: string,
    options: FetchOptions = {}
): Promise<T> => {
    const { useAuth = true, headers: customHeaders, ...restOptions } = options;

    const defaultHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };

    const token = useAuth ? authContextRef?.getToken() : null;

    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    } else if (useAuth) {
        console.warn(`API call to ${endpoint} requires auth, but no token found.`);
    }

    const headers = { ...defaultHeaders, ...customHeaders };

    const apiBaseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    if (!apiBaseUrl) {
        console.error("Cannot determine window.location.origin");
        throw new Error("Cannot determine API base URL.");
    }
    let apiUrl = `${apiBaseUrl}/api/v1${endpoint}`;
    if (!options.method || options.method.toUpperCase() === 'GET') {
        const cacheBuster = `_=${Date.now()}`;
        apiUrl += (apiUrl.includes('?') ? '&' : '?') + cacheBuster;
    }
    try {
        console.debug(`API Request: ${options.method || 'GET'} ${apiUrl}`);
        const response = await fetch(apiUrl, {
            ...restOptions,
            headers,
            // cache: 'no-store', // Keep cache control from previous step
        });

        if (!response.ok) {
            let errorDetail = `API Error: ${response.status} ${response.statusText}`;
            try {
                const errorData = await response.json();
                 if (response.status === 401 && useAuth) {
                     errorDetail = "Authentication failed or token expired. Please log in again.";
                     authContextRef?.logout();
                 } else {
                    errorDetail = errorData.detail || JSON.stringify(errorData);
                 }
            } catch (e) { /* Ignore */ }
            console.error(`API Response Error for ${apiUrl}: ${errorDetail}`);
            throw new Error(errorDetail);
        }

        if (response.status === 204) {
            return undefined as T;
        }

        const data: T = await response.json();
        console.debug(`API Response Success for ${apiUrl}:`, data);
        return data;

    } catch (error) {
        console.error(`API Fetch Error for ${apiUrl}:`, error);
	console.error(`>>> apiClient: CATCH BLOCK for ${apiUrl}:`, error);
        throw error;
    }
};

export interface Role { // Reflects Role schema from backend
    id: number;
    name: string;
    description?: string;
    // created_at/updated_at maybe excluded if not needed in UI often
}

export interface UserWithRoles { // Reflects User schema from backend
    id: number;
    email: string;
    full_name?: string;
    is_active: boolean;
    is_superuser: boolean;
    google_id?: string;
    picture?: string;
    created_at: string;
    updated_at: string;
    roles: Role[]; // Include the list of Role objects
}

export interface UserUpdatePayload { // For updating user status etc.
    is_active?: boolean;
    // Add other updatable fields if needed (e.g., full_name)
}

// --- Helper Functions for User/Role Management ---
export const getUsers = (skip: number = 0, limit: number = 100) =>
    apiClient<UserWithRoles[]>(`/users/?skip=${skip}&limit=${limit}`); // Assumes GET /users

export const getRoles = () =>
    apiClient<Role[]>(`/roles/`); // Assumes GET /roles

export const updateUser = (userId: number, payload: UserUpdatePayload) =>
    apiClient<UserWithRoles>(`/users/${userId}`, { // Assumes PUT /users/{id}
        method: 'PUT',
        body: JSON.stringify(payload)
    });

export const assignRoleToUser = (userId: number, roleId: number) =>
    apiClient<UserWithRoles>(`/users/${userId}/roles`, { // Assumes POST /users/{id}/roles
        method: 'POST',
        body: JSON.stringify({ role_id: roleId }) // Assumes backend expects {role_id: X}
    });

export const removeRoleFromUser = (userId: number, roleId: number) =>
    apiClient<UserWithRoles>(`/users/${userId}/roles/${roleId}`, { // Assumes DELETE /users/{id}/roles/{id}
        method: 'DELETE'
    });

interface ApiKey { id: number; name: string; prefix: string; is_active: boolean; created_at: string; updated_at: string; last_used_at?: string; user_id: number;}
interface ApiKeyCreateResponse extends ApiKey { full_key: string; }

export const getApiKeys = () => apiClient<ApiKey[]>('/apikeys/');
export const createApiKey = (data: { name: string }) => apiClient<ApiKeyCreateResponse>('/apikeys/', { method: 'POST', body: JSON.stringify(data) });
export const getApiKey = (id: number) => apiClient<ApiKey>(`/apikeys/${id}`);
export const deleteApiKey = (id: number) => apiClient<void>(`/apikeys/${id}`, { method: 'DELETE' });
export const updateApiKey = (id: number, data: { name?: string; is_active?: boolean; expires_at?: string | null }) => apiClient<ApiKey>(`/apikeys/${id}`, { method: 'PUT', body: JSON.stringify(data) });
