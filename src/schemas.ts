// src/schemas.ts

/**
 * TypeScript interfaces corresponding to the Pydantic schemas
 * used in the Axiom Flow backend API (v1).
 */

import { z } from 'zod';

// --- Enums ---

export enum RuleSetExecutionMode {
    FIRST_MATCH = "FIRST_MATCH",
    ALL_MATCHES = "ALL_MATCHES",
}

export enum MatchOperation {
    EQUALS = "eq",
    NOT_EQUALS = "ne",
    GREATER_THAN = "gt",
    LESS_THAN = "lt",
    GREATER_EQUAL = "ge",
    LESS_EQUAL = "le",
    CONTAINS = "contains",
    STARTS_WITH = "startswith",
    ENDS_WITH = "endswith",
    EXISTS = "exists",
    NOT_EXISTS = "not_exists",
    REGEX = "regex",
    IN = "in",
    NOT_IN = "not_in",
}

export enum ModifyAction {
    SET = "set",
    DELETE = "delete",
    PREPEND = "prepend",
    SUFFIX = "suffix",
    REGEX_REPLACE = "regex_replace",
}

// --- API Key Schemas ---

export interface ApiKeyBase {
    name: string;
    expires_at?: string | null;
}

export interface ApiKeyCreate extends ApiKeyBase {}

export interface ApiKeyUpdate {
    name?: string | null;
    is_active?: boolean | null;
    expires_at?: string | null;
}

export interface ApiKey extends ApiKeyBase {
    id: number;
    prefix: string;
    is_active: boolean;
    last_used_at?: string | null;
    created_at: string;
    updated_at: string;
    user_id: number;
}

export interface ApiKeyCreateResponse extends Omit<ApiKey, 'last_used_at'> {
    full_key: string;
}

export interface ApiKeyCreatePayload extends ApiKeyCreate {}
export interface ApiKeyUpdatePayload extends ApiKeyUpdate {}


// --- Authentication Schemas ---

export interface GoogleToken {
    token: string;
}

export interface TokenResponse {
    access_token: string;
    token_type: string;
    user?: User;
}

// --- Role Schemas ---

export interface Role {
    id: number;
    name: string;
    description?: string | null;
    created_at: string;
    updated_at: string;
}

// --- User Schemas ---

export interface UserBase {
    email?: string | null;
    is_active?: boolean | null;
    is_superuser?: boolean | null;
    full_name?: string | null;
    google_id?: string | null;
    picture?: string | null;
}

export interface UserUpdatePayload {
    is_active?: boolean;
}

export interface User extends UserBase {
    id: number;
    created_at: string;
    updated_at: string;
    roles: Role[];
}


// --- Rule Engine Schemas ---

export interface MatchCriterion {
    tag: string;
    op: MatchOperation;
    value?: any;
}

// --- Tag Modification Discriminated Union ---
export interface TagModificationBase { tag: string; }
export interface TagSetModification extends TagModificationBase { action: ModifyAction.SET; value: any; vr?: string | null; }
export interface TagDeleteModification extends TagModificationBase { action: ModifyAction.DELETE; }
export interface TagPrependModification extends TagModificationBase { action: ModifyAction.PREPEND; value: string; }
export interface TagSuffixModification extends TagModificationBase { action: ModifyAction.SUFFIX; value: string; }
export interface TagRegexReplaceModification extends TagModificationBase { action: ModifyAction.REGEX_REPLACE; pattern: string; replacement: string; }
export type TagModification = TagSetModification | TagDeleteModification | TagPrependModification | TagSuffixModification | TagRegexReplaceModification;
// --- End Tag Modification ---

export interface StorageDestination {
    type: string;
    config: Record<string, any>;
}

export interface RuleBase {
    name: string;
    description?: string | null;
    is_active?: boolean;
    priority?: number;
    match_criteria: MatchCriterion[];
    tag_modifications: TagModification[];
    destinations: StorageDestination[];
    applicable_sources?: string[] | null;
}

export interface RuleCreate extends RuleBase {
    ruleset_id: number;
}

export interface RuleUpdate {
    name?: string | null;
    description?: string | null;
    is_active?: boolean | null;
    priority?: number | null;
    match_criteria?: MatchCriterion[] | null;
    tag_modifications?: TagModification[] | null;
    destinations?: StorageDestination[] | null;
    applicable_sources?: string[] | null;
}

export interface Rule extends RuleBase {
    id: number;
    ruleset_id: number;
    created_at: string;
    updated_at?: string | null;
}

export interface RuleSetBase {
    name: string;
    description?: string | null;
    is_active?: boolean;
    priority?: number;
    execution_mode?: RuleSetExecutionMode;
}

export interface RuleSetCreate extends RuleSetBase {}

export interface RuleSetUpdate {
    name?: string | null;
    description?: string | null;
    is_active?: boolean | null;
    priority?: number | null;
    execution_mode?: RuleSetExecutionMode | null;
}

export interface RuleSet extends RuleSetBase {
    id: number;
    created_at: string;
    updated_at?: string | null;
    rules: Rule[];
}

export interface RuleSetSummary {
    id: number;
    name: string;
    description?: string | null;
    is_active: boolean;
    priority: number;
    execution_mode: RuleSetExecutionMode;
    rule_count: number;
    created_at: string;
    updated_at?: string | null;
}


// --- System & Health Schemas ---

export interface ComponentStatus {
    status: 'ok' | 'error' | 'degraded' | 'unknown' | string;
    details: string | null;
}

export interface HealthCheckResponse {
    status: 'ok' | 'error' | 'degraded' | 'unknown' | string;
    components: {
        [key: string]: ComponentStatus;
        database: ComponentStatus;
    }
}

export interface SystemStatusReport {
    database: ComponentStatus;
    message_broker: ComponentStatus;
    api_service: ComponentStatus;
    dicom_listener: ComponentStatus;
    celery_workers: ComponentStatus;
}

// --- DICOMweb Poller Status Schemas ---
export interface DicomWebSourceStatus {
    id: number;
    source_name: string;
    is_enabled: boolean;
    last_successful_run?: string | null;
    last_error_run?: string | null;
    last_error_message?: string | null;
    last_processed_timestamp?: string | null;
    created_at: string;
    last_heartbeat: string;
}

export interface DicomWebPollersStatusResponse {
    pollers: DicomWebSourceStatus[];
}

// --- DIMSE Listener Status Schema ---
export interface DimseListenerStatus {
    id: number;
    listener_id: string;
    status: string;
    status_message?: string | null;
    host?: string | null;
    port?: number | null;
    ae_title?: string | null;
    last_heartbeat: string;
    created_at: string;
}

export interface DimseListenersStatusResponse {
    listeners: DimseListenerStatus[];
}

// --- Configuration Schemas ---

// --- DICOMweb Source Configuration Schemas ---

// Add 'apikey'
export type DicomWebSourceAuthType = "none" | "basic" | "bearer" | "apikey"; // <-- ADDED 'apikey'

export type DicomWebSourceAuthConfig = Record<string, any> | null;
export type DicomWebSourceSearchFilters = Record<string, any> | null;

// Interface for reading configurations returned from API (uses 'name')
// Matches the corrected DicomWebSourceConfigRead Pydantic schema
export interface DicomWebSourceConfigRead {
    id: number;
    name: string; // API response uses 'name'
    description?: string | null;
    base_url: string;
    qido_prefix: string;
    wado_prefix: string;
    polling_interval_seconds: number;
    is_enabled: boolean;
    auth_type: DicomWebSourceAuthType; // Includes 'apikey'
    auth_config?: DicomWebSourceAuthConfig;
    search_filters?: DicomWebSourceSearchFilters;
}

// Interface for the payload when creating (matches backend Create Pydantic schema)
export interface DicomWebSourceConfigCreatePayload {
    name: string; // API expects 'name'
    description?: string | null;
    base_url: string;
    qido_prefix?: string;
    wado_prefix?: string;
    polling_interval_seconds?: number;
    is_enabled?: boolean;
    auth_type?: DicomWebSourceAuthType; // Includes 'apikey'
    auth_config?: DicomWebSourceAuthConfig;
    search_filters?: DicomWebSourceSearchFilters;
}

// Interface for the payload when updating (matches backend Update Pydantic schema)
export interface DicomWebSourceConfigUpdatePayload {
    name?: string | null; // API expects 'name'
    description?: string | null;
    base_url?: string | null;
    qido_prefix?: string | null;
    wado_prefix?: string | null;
    polling_interval_seconds?: number | null;
    is_enabled?: boolean | null;
    auth_type?: DicomWebSourceAuthType | null; // Includes 'apikey'
    auth_config?: DicomWebSourceAuthConfig;
    search_filters?: DicomWebSourceSearchFilters;
}

// --- Zod Schema for DICOMweb Source Form Validation ---
// Add 'apikey' to enum
export const dicomWebSourceAuthTypeSchema = z.enum(["none", "basic", "bearer", "apikey"]); // <-- ADDED 'apikey'

export const dicomWebSourceFormSchema = z.object({
    // Fields match form/payload structure
    name: z.string().min(1, "Name is required").max(100, "Name cannot exceed 100 characters"),
    description: z.string().max(255, "Description cannot exceed 255 characters").optional().nullable(),
    base_url: z.string().url("Must be a valid URL (e.g., http://host:port/path)").min(1, "Base URL is required"),
    qido_prefix: z.string().optional().default("qido-rs"),
    wado_prefix: z.string().optional().default("wado-rs"),
    polling_interval_seconds: z.coerce
        .number({ invalid_type_error: "Interval must be a number" })
        .int("Interval must be a whole number")
        .positive("Interval must be greater than 0")
        .min(1, "Interval must be at least 1 second")
        .max(86400, "Interval cannot exceed 1 day (86400s)")
        .default(300),
    is_enabled: z.boolean().default(true),
    auth_type: dicomWebSourceAuthTypeSchema.default("none"), // Now includes 'apikey'
    auth_config: z.string().nullable().optional().default(null), // Still string from Textarea
    search_filters: z.string().nullable().optional().default(null), // Still string from Textarea

// Updated refine block to include 'apikey'
}).refine(data => {
    if (data.auth_type === 'basic' || data.auth_type === 'bearer' || data.auth_type === 'apikey') { // <-- Include 'apikey'
        if (!data.auth_config || !data.auth_config.trim()) {
            return false; // Require non-empty config for these types
        }
        try {
            const parsed = JSON.parse(data.auth_config);
            if (data.auth_type === 'basic') {
                return typeof parsed === 'object' && parsed !== null &&
                       typeof parsed.username === 'string' && parsed.username.length > 0 &&
                       typeof parsed.password === 'string' && parsed.password.length > 0;
            }
            if (data.auth_type === 'bearer') {
                 return typeof parsed === 'object' && parsed !== null &&
                        typeof parsed.token === 'string' && parsed.token.length > 0;
            }
            // --- ADDED API Key structure validation ---
            if (data.auth_type === 'apikey') {
                 return typeof parsed === 'object' && parsed !== null &&
                        typeof parsed.header_name === 'string' && parsed.header_name.length > 0 &&
                        typeof parsed.key === 'string' && parsed.key.length > 0;
            }
             // --- END API Key validation ---
        } catch (e) {
            return false; // Invalid JSON
        }
    }
    // For 'none' type: reject non-empty JSON
    if (data.auth_type === 'none' && data.auth_config && data.auth_config.trim()) {
         try {
             JSON.parse(data.auth_config);
             return false;
         } catch (e) {
             return true; // Allow non-JSON garbage
         }
    }
    return true;
}, {
    message: "Invalid Auth Config JSON or missing required fields for selected Auth Type.",
    path: ["auth_config"],
}).refine(data => { // Search filters validation remains same
    if (data.search_filters && data.search_filters.trim()) {
        try {
            const parsed = JSON.parse(data.search_filters);
            return typeof parsed === 'object' && parsed !== null;
        } catch (e) {
            return false;
        }
    }
    return true;
}, {
    message: "Search Filters must be valid JSON object if provided.",
    path: ["search_filters"],
});

// DicomWebSourceFormData type derived from Zod schema
export type DicomWebSourceFormData = z.infer<typeof dicomWebSourceFormSchema>;

// --- End Zod Schema ---


// --- Error Schemas ---

export interface ValidationError {
    loc: (string | number)[];
    msg: string;
    type: string;
}

export interface HTTPValidationError {
    detail?: ValidationError[];
}

export interface ApiError {
    detail?: string | any;
}
