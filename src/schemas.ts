// src/schemas.ts

// --- Enums (Mirroring Backend) ---
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

// --- Base Interfaces ---
export interface MatchCriterion {
    tag: string;
    op: MatchOperation;
    value?: any;
}

// --- Tag Modification Interfaces (Discriminated Union Pattern) ---
export interface TagSetModification {
    action: ModifyAction.SET;
    tag: string;
    value: any;
    vr?: string;
}
export interface TagDeleteModification {
    action: ModifyAction.DELETE;
    tag: string;
}
export interface TagPrependModification {
    action: ModifyAction.PREPEND;
    tag: string;
    value: string;
}
export interface TagSuffixModification {
    action: ModifyAction.SUFFIX;
    tag: string;
    value: string;
}
export interface TagRegexReplaceModification {
    action: ModifyAction.REGEX_REPLACE;
    tag: string;
    pattern: string;
    replacement: string;
}
export type TagModification =
    | TagSetModification
    | TagDeleteModification
    | TagPrependModification
    | TagSuffixModification
    | TagRegexReplaceModification;
// --- End Tag Modification ---

// --- REMOVED old StorageDestination interface ---
// export interface StorageDestination {
//     /** Storage type (e.g., 'filesystem', 'cstore', 'gcs', 'google_healthcare', 'stow_rs') */
//     type: string;
//     /** Backend-specific configuration (e.g., path, ae_title, bucket, project_id, stow_url) */
//     config: Record<string, any>;
// }
// --- END REMOVED ---

// --- ADDED: Storage Backend Config Read Schema (needed for Rule schema) ---
export type AllowedBackendType =
    | "filesystem"
    | "cstore"
    | "gcs"
    | "google_healthcare"
    | "stow_rs";

export interface StorageBackendConfigRead { // Only need the Read version here
    id: number;
    name: string;
    description?: string | null;
    backend_type: AllowedBackendType;
    config: Record<string, any>;
    is_enabled: boolean;
    created_at: string;
    updated_at: string;
}
// --- END ADDED ---


// --- Rule Schemas ---
export interface RuleBase {
    name: string;
    description?: string | null;
    is_active?: boolean;
    priority?: number;
    match_criteria?: MatchCriterion[];
    tag_modifications?: TagModification[];
    // --- REMOVED old destinations field ---
    // destinations?: StorageDestination[];
    // --- END REMOVED ---
    applicable_sources?: string[] | null;
}
export interface RuleCreate extends RuleBase {
    ruleset_id: number;
    // --- ADDED: List of destination config IDs ---
    destination_ids?: number[] | null;
    // --- END ADDED ---
}
export interface RuleUpdate extends Partial<RuleBase> { // Use Partial<RuleBase>
    // --- ADDED: List of destination config IDs ---
    destination_ids?: number[] | null; // Can be null or empty list to clear
    // --- END ADDED ---
}
export interface Rule extends RuleBase {
    id: number;
    ruleset_id: number;
    created_at: string;
    updated_at: string;
    // --- ADDED: Use StorageBackendConfigRead for the relationship ---
    destinations: StorageBackendConfigRead[]; // List of full backend config objects
    // --- END ADDED ---
}

// --- RuleSet Schemas ---
export interface RuleSetBase {
    name: string;
    description?: string | null;
    is_active?: boolean;
    priority?: number;
    execution_mode?: RuleSetExecutionMode;
}
export interface RuleSetCreate extends RuleSetBase {}
export interface RuleSetUpdate extends Partial<RuleSetBase> {}
export interface RuleSet extends RuleSetBase {
    id: number;
    created_at: string;
    updated_at: string;
    rules: Rule[]; // Rules will contain populated destinations
}

// --- User & Role Schemas ---
export interface Role {
    id: number;
    name: string;
    description?: string | null;
    created_at: string;
    updated_at: string;
}
export interface User {
    id: number;
    email: string;
    google_id?: string | null;
    full_name?: string | null;
    picture?: string | null;
    is_active: boolean;
    is_superuser: boolean;
    created_at: string;
    updated_at: string;
    roles: Role[];
}
export interface UserWithRoles extends User {}

// --- API Key Schemas ---
export interface ApiKey {
    id: number;
    name: string;
    prefix: string;
    is_active: boolean;
    expires_at?: string | null;
    last_used_at?: string | null;
    created_at: string;
    updated_at: string;
    user_id: number;
}
export interface ApiKeyCreateResponse extends ApiKey {
    full_key: string;
}

// --- JSON Processing Schemas ---
export interface JsonProcessRequest {
    dicom_json: Record<string, any>;
    ruleset_id?: number | null;
    source_identifier?: string;
}
export interface JsonProcessResponse {
    original_json: Record<string, any>;
    morphed_json: Record<string, any>;
    applied_ruleset_id?: number | null;
    applied_rule_ids: number[];
    source_identifier: string;
    errors: string[];
    warnings?: string[];
}

// --- System Status Schemas ---
export interface ComponentStatus {
    status: string;
    details?: string | null;
}
export interface HealthCheckResponse {
    status: string;
    components: Record<string, ComponentStatus>;
}

// --- DICOMweb Poller Status ---
export interface DicomWebSourceStatus {
    id: number;
    created_at: string;
    updated_at: string;
    source_name: string;
    is_enabled: boolean;
    last_processed_timestamp?: string | null;
    last_successful_run?: string | null;
    last_error_run?: string | null;
    last_error_message?: string | null;
    found_instance_count: number;
    queued_instance_count: number;
    processed_instance_count: number;
}
export interface DicomWebPollersStatusResponse {
    pollers: DicomWebSourceStatus[];
}

// --- DIMSE Listener Status ---
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
    received_instance_count: number;
    processed_instance_count: number;
}
export interface DimseListenersStatusResponse {
    listeners: DimseListenerStatus[];
}

// --- DIMSE Q/R Source Status ---
export interface DimseQrSourceStatus {
    id: number;
    created_at: string;
    updated_at: string;
    name: string;
    is_enabled: boolean;
    remote_ae_title: string;
    remote_host: string;
    remote_port: number;
    last_successful_query?: string | null;
    last_successful_move?: string | null;
    last_error_time?: string | null;
    last_error_message?: string | null;
    found_study_count: number;
    move_queued_study_count: number;
    processed_instance_count: number;
}
export interface DimseQrSourcesStatusResponse {
    sources: DimseQrSourceStatus[];
}


// --- Configuration Schemas ---

// DICOMweb Source Config
export interface DicomWebSourceConfigBase {
    name: string;
    description?: string | null;
    base_url: string;
    qido_prefix?: string;
    wado_prefix?: string;
    polling_interval_seconds?: number;
    is_enabled?: boolean;
    auth_type?: 'none' | 'basic' | 'bearer' | 'apikey';
    auth_config?: Record<string, any> | null;
    search_filters?: Record<string, any> | null;
}
export interface DicomWebSourceConfigCreatePayload extends DicomWebSourceConfigBase {}
export interface DicomWebSourceConfigUpdatePayload extends Partial<DicomWebSourceConfigBase> {}
export interface DicomWebSourceConfigRead extends DicomWebSourceConfigBase {
    id: number;
    created_at: string;
    updated_at: string;
    last_processed_timestamp?: string | null;
    last_successful_run?: string | null;
    last_error_run?: string | null;
    last_error_message?: string | null;
    found_instance_count: number;
    queued_instance_count: number;
    processed_instance_count: number;
}

// DIMSE Listener Config
export interface DimseListenerConfigBase {
    name: string;
    description?: string | null;
    ae_title: string;
    port: number;
    is_enabled?: boolean;
    instance_id?: string | null;
}
export interface DimseListenerConfigCreatePayload extends DimseListenerConfigBase {}
export interface DimseListenerConfigUpdatePayload extends Partial<DimseListenerConfigBase> {}
export interface DimseListenerConfigRead extends DimseListenerConfigBase {
    id: number;
    created_at: string;
    updated_at: string;
}

// DIMSE Q/R Source Config
export interface DimseQueryRetrieveSourceBase {
    name: string;
    description?: string | null;
    remote_ae_title: string;
    remote_host: string;
    remote_port: number;
    local_ae_title?: string;
    polling_interval_seconds?: number;
    is_enabled?: boolean;
    query_level?: 'STUDY' | 'SERIES' | 'PATIENT';
    query_filters?: Record<string, any> | null;
    move_destination_ae_title?: string | null;
}
export interface DimseQueryRetrieveSourceCreatePayload extends DimseQueryRetrieveSourceBase {}
export interface DimseQueryRetrieveSourceUpdatePayload extends Partial<DimseQueryRetrieveSourceBase> {}
export interface DimseQueryRetrieveSourceRead extends DimseQueryRetrieveSourceBase {
    id: number;
    created_at: string;
    updated_at: string;
    last_successful_query?: string | null;
    last_successful_move?: string | null;
    last_error_time?: string | null;
    last_error_message?: string | null;
    found_study_count: number;
    move_queued_study_count: number;
    processed_instance_count: number;
}

// Storage Backend Config
// export type AllowedBackendType = // Already defined above
//     | "filesystem"
//     | "cstore"
//     | "gcs"
//     | "google_healthcare"
//     | "stow_rs";

export interface StorageBackendConfigBase {
    name: string;
    description?: string | null;
    backend_type: AllowedBackendType;
    config: Record<string, any>;
    is_enabled?: boolean;
}
export interface StorageBackendConfigCreatePayload extends StorageBackendConfigBase {}
export interface StorageBackendConfigUpdatePayload extends Partial<StorageBackendConfigBase> {}
// export interface StorageBackendConfigRead extends StorageBackendConfigBase { // Already defined above
//     id: number;
//     created_at: string;
//     updated_at: string;
// }


// --- Form Data Schemas (using Zod for frontend validation) ---
import { z } from 'zod';

// Zod schema for DICOMweb Source Form
export const dicomWebSourceFormSchema = z.object({
    name: z.string().min(1, "Name is required").max(100),
    description: z.string().max(500).nullable().optional(),
    base_url: z.string().url("Must be a valid URL (e.g., http://server:port/path)"),
    qido_prefix: z.string().min(1).max(50).default("qido-rs"),
    wado_prefix: z.string().min(1).max(50).default("wado-rs"),
    polling_interval_seconds: z.coerce.number().int().min(1, "Interval must be at least 1 second").default(300),
    is_enabled: z.boolean().default(true),
    auth_type: z.enum(["none", "basic", "bearer", "apikey"]).default("none"),
    auth_config: z.string().nullable().optional()
        .refine((val) => {
            if (!val || !val.trim()) return true;
            try {
                const parsed = JSON.parse(val);
                return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed);
            } catch { return false; }
        }, { message: "Auth Config must be a valid JSON object string or empty." }),
    search_filters: z.string().nullable().optional()
        .refine((val) => {
            if (!val || !val.trim()) return true;
            try {
                const parsed = JSON.parse(val);
                return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed);
            } catch { return false; }
        }, { message: "Search Filters must be a valid JSON object string or empty." }),
}).refine(data => {
    if (data.auth_type === 'none') return true;
    if (!data.auth_config || !data.auth_config.trim()) {
        return false;
    }
    try {
        const config = JSON.parse(data.auth_config);
        if (data.auth_type === 'basic') {
            return typeof config.username === 'string' && config.username.length > 0 &&
                   typeof config.password === 'string' && config.password.length > 0;
        }
        if (data.auth_type === 'bearer') {
            return typeof config.token === 'string' && config.token.length > 0;
        }
        if (data.auth_type === 'apikey') {
             return typeof config.header_name === 'string' && config.header_name.length > 0 &&
                    typeof config.key === 'string' && config.key.length > 0;
        }
    } catch { return false; }
    return true;
}, {
    message: "Auth Config content does not match the selected Auth Type requirements (e.g., missing 'username'/'password' for basic, 'token' for bearer, 'header_name'/'key' for apikey, or config provided when type is 'none').",
    path: ["auth_config"],
});

export type DicomWebSourceFormData = z.infer<typeof dicomWebSourceFormSchema>;


// Zod schema for DIMSE Listener Config Form
const aeTitleRegex = /^[ A-Za-z0-9._-]{1,16}$/;
const noLeadingTrailingSpace = /^(?!\s)(?!.*\s$).*$/;

export const dimseListenerFormSchema = z.object({
    name: z.string().min(1, "Name is required").max(100),
    description: z.string().max(500).nullable().optional(),
    ae_title: z.string()
        .min(1, "AE Title is required")
        .max(16, "AE Title cannot exceed 16 characters")
        .regex(aeTitleRegex, "AE Title contains invalid characters (Allowed: A-Z a-z 0-9 . _ - SPACE)")
        .regex(noLeadingTrailingSpace, "AE Title cannot have leading or trailing whitespace"),
    port: z.coerce.number().int().min(1, "Port must be between 1 and 65535").max(65535, "Port must be between 1 and 65535").default(11112),
    is_enabled: z.boolean().default(true),
    instance_id: z.string().max(255).nullable().optional()
        .refine(val => !val || /^[a-zA-Z0-9_.-]+$/.test(val), {
            message: "Instance ID can only contain letters, numbers, underscores, periods, and hyphens.",
        })
        .refine(val => !val || noLeadingTrailingSpace.test(val), {
             message: "Instance ID cannot have leading or trailing whitespace.",
        }),
});

export type DimseListenerFormData = z.infer<typeof dimseListenerFormSchema>;

// Zod schema for DIMSE Q/R Source Form
export const dimseQrSourceFormSchema = z.object({
    name: z.string().min(1, "Name is required").max(100),
    description: z.string().max(500).nullable().optional(),
    remote_ae_title: z.string()
        .min(1, "Remote AE Title is required")
        .max(16, "Remote AE Title cannot exceed 16 characters")
        .regex(aeTitleRegex, "Remote AE Title contains invalid characters")
        .regex(noLeadingTrailingSpace, "Remote AE Title cannot have leading/trailing whitespace"),
    remote_host: z.string().min(1, "Remote Host is required")
        .regex(noLeadingTrailingSpace, "Remote Host cannot have leading/trailing whitespace"),
    remote_port: z.coerce.number().int().min(1).max(65535).default(104),
    local_ae_title: z.string()
        .min(1, "Local AE Title is required")
        .max(16, "Local AE Title cannot exceed 16 characters")
        .regex(aeTitleRegex, "Local AE Title contains invalid characters")
        .regex(noLeadingTrailingSpace, "Local AE Title cannot have leading/trailing whitespace")
        .default("AXIOM_QR_SCU"),
    polling_interval_seconds: z.coerce.number().int().min(1).default(300),
    is_enabled: z.boolean().default(true),
    query_level: z.enum(["STUDY", "SERIES", "PATIENT"]).default("STUDY"),
    query_filters: z.string().nullable().optional()
        .refine((val) => {
            if (!val || !val.trim()) return true;
            try {
                const parsed = JSON.parse(val);
                return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed);
            } catch { return false; }
        }, { message: "Query Filters must be a valid JSON object string or empty." }),
    move_destination_ae_title: z.string().max(16).nullable().optional()
        .refine(val => !val || (aeTitleRegex.test(val) && noLeadingTrailingSpace.test(val)), {
            message: "Move Destination AE Title is invalid (check format, length, whitespace)."
        }),
});

export type DimseQrSourceFormData = z.infer<typeof dimseQrSourceFormSchema>;

// Zod schema for Storage Backend Config Form
export const storageBackendFormSchema = z.object({
    name: z.string().min(1, "Name is required").max(100),
    description: z.string().max(500).nullable().optional(),
    backend_type: z.enum([
        "filesystem",
        "cstore",
        "gcs",
        "google_healthcare",
        "stow_rs"
    ]),
    config: z.string()
        .min(1, "Config JSON is required.")
        .refine((val) => {
            if (!val || !val.trim()) return false;
            try {
                const parsed = JSON.parse(val);
                return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed);
            } catch { return false; }
        }, { message: "Config must be a valid JSON object string." }),
    is_enabled: z.boolean().default(true),
});

export type StorageBackendFormData = z.infer<typeof storageBackendFormSchema>;
