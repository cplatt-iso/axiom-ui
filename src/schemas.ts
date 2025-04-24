// src/schemas.ts

/**
 * TypeScript interfaces and Zod schemas corresponding to the Pydantic schemas
 * used in the Axiom Flow backend API (v1).
 * - Interfaces are used for API data contracts and general type safety.
 * - Enums are standard TS enums for use in component logic (e.g., dropdowns).
 * - Zod schemas (*FormSchema) are used specifically with react-hook-form/zodResolver for form validation.
 */

import { z } from 'zod';

// Helper for optional nullable fields (used in Zod schemas)
const optionalNullableString = z.string().optional().nullable();
const optionalNullableNumber = z.number().optional().nullable();
// const optionalNullableBoolean = z.boolean().optional().nullable(); // Not currently needed
const optionalNullableDate = z.date().or(z.string()).optional().nullable(); // Accept string for initial parse

// --- Standard TypeScript Enums (for component logic) ---

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

export enum DicomWebSourceAuthTypeEnum {
    NONE = "none",
    BASIC = "basic",
    BEARER = "bearer",
    APIKEY = "apikey"
}
// Create a string literal type from the enum for stricter interface typing
export type DicomWebSourceAuthType = `${DicomWebSourceAuthTypeEnum}`;


// --- API Key Schemas (TypeScript Interfaces) ---

export interface ApiKeyBase {
    name: string;
    expires_at?: string | null; // ISO String date from API
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
    last_used_at?: string | null; // ISO String date from API
    created_at: string; // ISO String date from API
    updated_at: string; // ISO String date from API
    user_id: number;
}

export interface ApiKeyCreateResponse extends Omit<ApiKey, 'last_used_at'> {
    full_key: string; // This is the only time the full key is shown
}

export interface ApiKeyCreatePayload extends ApiKeyCreate {}
export interface ApiKeyUpdatePayload extends ApiKeyUpdate {}


// --- Authentication Schemas (TypeScript Interfaces) ---

export interface GoogleToken {
    token: string;
}

export interface TokenResponse {
    access_token: string;
    token_type: string;
    user?: User; // User type defined below
}

// --- Role Schemas (TypeScript Interfaces) ---

export interface Role {
    id: number;
    name: string;
    description?: string | null;
    created_at: string; // ISO String date from API
    updated_at: string; // ISO String date from API
}

// --- User Schemas (TypeScript Interfaces) ---

export interface UserBase {
    email?: string | null;
    is_active?: boolean | null;
    is_superuser?: boolean | null;
    full_name?: string | null;
    google_id?: string | null;
    picture?: string | null;
}

// Specific payload for the update endpoint if it differs significantly
export interface UserUpdatePayload {
    is_active?: boolean;
    // Add other updatable fields if the PUT endpoint allows them
}

export interface User extends UserBase {
    id: number;
    created_at: string; // ISO String date from API
    updated_at: string; // ISO String date from API
    roles: Role[]; // Array of Role interfaces
}
// Alias if needed elsewhere, but User usually suffices
export type UserWithRoles = User;


// --- Rule Engine Schemas (TypeScript Interfaces) ---

export interface MatchCriterion {
    tag: string;
    op: MatchOperation; // Use the TS Enum here
    value?: any;
}

export interface TagModificationBase { tag: string; }
export interface TagSetModification extends TagModificationBase { action: ModifyAction.SET; value: any; vr?: string | null; }
export interface TagDeleteModification extends TagModificationBase { action: ModifyAction.DELETE; }
export interface TagPrependModification extends TagModificationBase { action: ModifyAction.PREPEND; value: string; }
export interface TagSuffixModification extends TagModificationBase { action: ModifyAction.SUFFIX; value: string; }
export interface TagRegexReplaceModification extends TagModificationBase { action: ModifyAction.REGEX_REPLACE; pattern: string; replacement: string; }
// Discriminated union using TS interfaces and enums
export type TagModification = TagSetModification | TagDeleteModification | TagPrependModification | TagSuffixModification | TagRegexReplaceModification;

export interface StorageDestination {
    type: string;
    config: Record<string, any>; // Generic config object
}

export interface RuleBase {
    name: string;
    description?: string | null;
    is_active?: boolean; // Defaulted to true on backend create typically
    priority?: number; // Defaulted to 0 on backend create typically
    match_criteria: MatchCriterion[];
    tag_modifications: TagModification[];
    destinations: StorageDestination[];
    applicable_sources?: string[] | null;
}

export interface RuleCreate extends RuleBase {
    ruleset_id: number; // Required when creating a rule
}

// Interface for the PUT payload (all fields optional)
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
    created_at: string; // ISO String date from API
    updated_at?: string | null; // ISO String date from API
    is_active: boolean; // Ensure this is not optional in the read model
    priority: number; // Ensure this is not optional in the read model
}

export interface RuleSetBase {
    name: string;
    description?: string | null;
    is_active?: boolean; // Defaulted to true on backend create typically
    priority?: number; // Defaulted to 0 on backend create typically
    execution_mode?: RuleSetExecutionMode; // Use the TS Enum here
}

export interface RuleSetCreate extends RuleSetBase {}

// Interface for the PUT payload (all fields optional)
export interface RuleSetUpdate {
    name?: string | null;
    description?: string | null;
    is_active?: boolean | null;
    priority?: number | null;
    execution_mode?: RuleSetExecutionMode | null;
}

export interface RuleSet extends RuleSetBase {
    id: number;
    created_at: string; // ISO String date from API
    updated_at?: string | null; // ISO String date from API
    rules: Rule[]; // Array of Rule interfaces
    is_active: boolean; // Ensure this is not optional in the read model
    priority: number; // Ensure this is not optional in the read model
    execution_mode: RuleSetExecutionMode; // Ensure this is not optional in the read model
}

// Summary view if needed by API
export interface RuleSetSummary {
    id: number;
    name: string;
    description?: string | null;
    is_active: boolean;
    priority: number;
    execution_mode: RuleSetExecutionMode;
    rule_count: number; // Assuming backend calculates this
    created_at: string;
    updated_at?: string | null;
}


// --- System & Health Schemas (TypeScript Interfaces) ---

export interface ComponentStatus {
    status: string; // Could be 'ok', 'error', 'degraded', 'unknown', etc.
    details: string | null;
}

export interface HealthCheckResponse {
    status: string;
    components: {
        [key: string]: ComponentStatus; // Allows dynamic component keys
    }
}

// Specific structure returned by /dashboard/status (based on previous examples)
export interface SystemStatusReport {
    status: string;
    components: {
        database?: ComponentStatus;
        message_broker?: ComponentStatus;
        api_service?: ComponentStatus;
        dicom_listener?: ComponentStatus;
        celery_workers?: ComponentStatus;
    }
}

// --- DICOMweb Poller Status Schemas (TypeScript Interface) ---
export interface DicomWebSourceStatus {
    id: number;
    source_name: string;
    is_enabled: boolean;
    last_successful_run?: string | null; // ISO String date from API
    last_error_run?: string | null; // ISO String date from API
    last_error_message?: string | null;
    last_processed_timestamp?: string | null; // ISO String date from API
    created_at: string; // ISO String date from API
    updated_at: string; // ISO String date from API (maps to last update/heartbeat)
}

export interface DicomWebPollersStatusResponse {
    pollers: DicomWebSourceStatus[];
}

// --- DIMSE Listener Status Schema (TypeScript Interface) ---
export interface DimseListenerStatus {
    id: number;
    listener_id: string; // The unique instance ID (e.g., storescp_1)
    name?: string | null; // <<-- ADDED: User-defined name from config
    status: string;
    status_message?: string | null;
    host?: string | null;
    port?: number | null;
    ae_title?: string | null;
    last_heartbeat: string; // ISO String date from API
    created_at: string; // ISO String date from API
}

export interface DimseListenersStatusResponse {
    listeners: DimseListenerStatus[];
}

// --- Configuration Schemas ---

// --- DICOMweb Source Configuration ---

export type DicomWebSourceAuthConfig = Record<string, any> | null;
export type DicomWebSourceSearchFilters = Record<string, any> | null;

// TS Interface for reading configurations returned from API
export interface DicomWebSourceConfigRead {
    id: number;
    name: string;
    description?: string | null;
    base_url: string;
    qido_prefix: string;
    wado_prefix: string;
    polling_interval_seconds: number;
    is_enabled: boolean;
    auth_type: DicomWebSourceAuthType; // Use string literal type derived from enum
    auth_config?: DicomWebSourceAuthConfig;
    search_filters?: DicomWebSourceSearchFilters;
    // Note: Does not include created_at/updated_at unless backend adds them to Read schema
}

// TS Interface for the payload when creating
export interface DicomWebSourceConfigCreatePayload {
    name: string;
    description?: string | null;
    base_url: string;
    qido_prefix?: string;
    wado_prefix?: string;
    polling_interval_seconds?: number;
    is_enabled?: boolean;
    auth_type?: DicomWebSourceAuthType;
    auth_config?: DicomWebSourceAuthConfig;
    search_filters?: DicomWebSourceSearchFilters;
}

// TS Interface for the payload when updating
export interface DicomWebSourceConfigUpdatePayload {
    name?: string | null;
    description?: string | null;
    base_url?: string | null;
    qido_prefix?: string | null;
    wado_prefix?: string | null;
    polling_interval_seconds?: number | null;
    is_enabled?: boolean | null;
    auth_type?: DicomWebSourceAuthType | null;
    auth_config?: DicomWebSourceAuthConfig;
    search_filters?: DicomWebSourceSearchFilters;
}

// Zod Schema *only* for the DICOMweb Source Form Validation
export const dicomWebSourceAuthTypeZodSchema = z.nativeEnum(DicomWebSourceAuthTypeEnum);
export const dicomWebSourceFormSchema = z.object({
    name: z.string().min(1, "Name is required").max(100, "Name cannot exceed 100 characters"),
    description: z.string().max(255, "Description cannot exceed 255 characters").optional().nullable(),
    base_url: z.string().url("Must be a valid URL (e.g., http://host:port/path)").min(1, "Base URL is required"),
    qido_prefix: z.string().optional().default("qido-rs"),
    wado_prefix: z.string().optional().default("wado-rs"),
    polling_interval_seconds: z.coerce.number({ invalid_type_error: "Interval must be a number" }).int("Interval must be a whole number").positive("Interval must be greater than 0").min(1, "Interval must be at least 1 second").max(86400, "Interval cannot exceed 1 day (86400s)").default(300),
    is_enabled: z.boolean().default(true),
    auth_type: dicomWebSourceAuthTypeZodSchema.default(DicomWebSourceAuthTypeEnum.NONE),
    auth_config: z.string().nullable().optional().default(null),
    search_filters: z.string().nullable().optional().default(null),
}).refine(data => {
    if ([DicomWebSourceAuthTypeEnum.BASIC, DicomWebSourceAuthTypeEnum.BEARER, DicomWebSourceAuthTypeEnum.APIKEY].includes(data.auth_type)) {
        if (!data.auth_config || !data.auth_config.trim()) { return false; }
        try { const parsed = JSON.parse(data.auth_config);
            if (data.auth_type === DicomWebSourceAuthTypeEnum.BASIC) { return typeof parsed === 'object' && parsed !== null && typeof parsed.username === 'string' && parsed.username.length > 0 && typeof parsed.password === 'string' && parsed.password.length > 0; }
            if (data.auth_type === DicomWebSourceAuthTypeEnum.BEARER) { return typeof parsed === 'object' && parsed !== null && typeof parsed.token === 'string' && parsed.token.length > 0; }
            if (data.auth_type === DicomWebSourceAuthTypeEnum.APIKEY) { return typeof parsed === 'object' && parsed !== null && typeof parsed.header_name === 'string' && parsed.header_name.length > 0 && typeof parsed.key === 'string' && parsed.key.length > 0; }
        } catch (e) { return false; }
    }
    if (data.auth_type === DicomWebSourceAuthTypeEnum.NONE && data.auth_config && data.auth_config.trim()) { try { JSON.parse(data.auth_config); return false; } catch (e) { return true; } }
    return true;
}, { message: "Invalid Auth Config JSON or missing required fields for selected Auth Type.", path: ["auth_config"], }).refine(data => {
    if (data.search_filters && data.search_filters.trim()) { try { const parsed = JSON.parse(data.search_filters); return typeof parsed === 'object' && parsed !== null; } catch (e) { return false; } }
    return true;
}, { message: "Search Filters must be valid JSON object if provided.", path: ["search_filters"], });
export type DicomWebSourceFormData = z.infer<typeof dicomWebSourceFormSchema>;
// --- End DICOMweb Source Configuration ---


// --- DIMSE Listener Configuration Schemas ---

// Define TS Interfaces first for API contracts
export interface DimseListenerConfigBase {
    name: string;
    description?: string | null;
    ae_title: string;
    port: number;
    is_enabled: boolean; // Make non-optional in base, mirroring Pydantic
    instance_id?: string | null;
}
export interface DimseListenerConfigCreatePayload extends DimseListenerConfigBase {}
export interface DimseListenerConfigUpdatePayload extends Partial<Omit<DimseListenerConfigBase, 'is_enabled'>> { // Omit boolean with default from Partial
    is_enabled?: boolean; // Add boolean back explicitly if needed for update
}
export interface DimseListenerConfigRead extends DimseListenerConfigBase {
    id: number;
    created_at: string;
    updated_at: string;
}

// Define Zod Schema *only* for the DIMSE Listener Form Validation
export const dimseListenerFormSchema = z.object({
    name: z.string().min(1, "Listener name is required").max(100),
    description: z.string().optional().nullable(),
    ae_title: z.string()
        .min(1, "AE Title is required")
        .max(16, "AE Title cannot exceed 16 characters")
        .regex(/^[ A-Za-z0-9._-]*$/, "AE Title contains invalid characters.")
        .refine(s => s.trim() === s, "AE Title cannot have leading/trailing spaces")
        .refine(s => s.length > 0, "AE Title cannot be empty after trimming"),
    port: z.coerce // Use coerce for number input
        .number({ invalid_type_error: "Port must be a number" })
        .int("Port must be a whole number")
        .min(1, "Port must be between 1 and 65535")
        .max(65535, "Port must be between 1 and 65535"),
    is_enabled: z.boolean().default(true),
    instance_id: z.string()
        .min(1)
        .max(255)
        .regex(/^[a-zA-Z0-9_.-]+$/, "Instance ID can only contain letters, numbers, underscores, periods, hyphens.")
        .optional()
        .nullable(),
});
export type DimseListenerFormData = z.infer<typeof dimseListenerFormSchema>;

// --- End DIMSE Listener Configuration Schemas ---


// --- Error Schemas (TypeScript Interfaces) ---

export interface ValidationError { loc: (string | number)[]; msg: string; type: string; }
export interface HTTPValidationError { detail?: ValidationError[]; }
export interface ApiError { detail?: string | any; }
