// src/schemas.ts

/**
 * TypeScript interfaces corresponding to the Pydantic schemas
 * used in the Axiom Flow backend API (v1).
 */

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

// Updated to include new modification actions
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
    expires_at?: string | null; // ISO 8601 format date-time string or null
}

export interface ApiKeyCreate extends ApiKeyBase {}

export interface ApiKeyUpdate {
    name?: string | null;
    is_active?: boolean | null;
    expires_at?: string | null; // ISO 8601 format date-time string or null
}

// Represents an API Key returned by the API (excluding the full key)
export interface ApiKey extends ApiKeyBase {
    id: number;
    prefix: string;
    is_active: boolean;
    last_used_at?: string | null; // ISO 8601 format date-time string or null
    created_at: string; // ISO 8601 format date-time string
    updated_at: string; // ISO 8601 format date-time string
    user_id: number;
}

// Response specifically for the creation endpoint, includes the one-time key
export interface ApiKeyCreateResponse extends Omit<ApiKey, 'last_used_at'> {
    full_key: string;
}

// Specific payload type for creating an API Key via the API
export interface ApiKeyCreatePayload extends ApiKeyCreate {}

// Specific payload type for updating an API Key via the API
export interface ApiKeyUpdatePayload extends ApiKeyUpdate {}


// --- Authentication Schemas ---

export interface GoogleToken {
    token: string; // The ID token received from Google
}

// Represents the response from the backend after Google token verification
export interface TokenResponse {
    access_token: string; // The JWT issued by our backend
    token_type: string; // Typically "bearer"
    user?: User; // Include user details on login/token refresh
}

// --- Role Schemas ---

export interface Role {
    id: number;
    name: string;
    description?: string | null;
    created_at: string; // ISO 8601 format date-time string
    updated_at: string; // ISO 8601 format date-time string
}

// --- User Schemas ---

// Base fields for a User
export interface UserBase {
    email?: string | null; // Email might be null if using other auth methods
    is_active?: boolean | null; // Default: true
    is_superuser?: boolean | null; // Default: false
    full_name?: string | null;
    google_id?: string | null; // Store the unique Google ID
    picture?: string | null; // URL to profile picture from Google
}

// Payload for updating a user (typically by an admin)
export interface UserUpdatePayload {
    is_active?: boolean;
    // Add other fields admin might update (e.g., full_name?)
    // Note: Roles are updated via separate endpoints
}

// User representation returned by the API
export interface User extends UserBase {
    id: number;
    created_at: string; // ISO 8601 format date-time string
    updated_at: string; // ISO 8601 format date-time string
    roles: Role[]; // List of roles assigned to the user
}


// --- Rule Engine Schemas ---

// Match Criterion for a Rule
export interface MatchCriterion {
    tag: string; // DICOM tag string (e.g., "0010,0010" or "PatientName")
    op: MatchOperation; // The comparison operation enum value
    value?: any; // Value for comparison (required for most ops, type depends on op)
}

// --- Tag Modification Discriminated Union ---

// Base interface for all tag modifications
export interface TagModificationBase {
    tag: string; // DICOM tag string
}

// Interface for the 'set' action
export interface TagSetModification extends TagModificationBase {
    action: ModifyAction.SET;
    value: any; // Required value to set
    vr?: string | null; // Optional explicit VR
}

// Interface for the 'delete' action
export interface TagDeleteModification extends TagModificationBase {
    action: ModifyAction.DELETE;
    // No other fields needed for delete
}

// Interface for the 'prepend' action
export interface TagPrependModification extends TagModificationBase {
    action: ModifyAction.PREPEND;
    value: string; // Required string value to prepend
}

// Interface for the 'suffix' action
export interface TagSuffixModification extends TagModificationBase {
    action: ModifyAction.SUFFIX;
    value: string; // Required string value to append
}

// Interface for the 'regex_replace' action
export interface TagRegexReplaceModification extends TagModificationBase {
    action: ModifyAction.REGEX_REPLACE;
    pattern: string; // Required regex pattern
    replacement: string; // Required replacement string
}

// The discriminated union type for Tag Modification
export type TagModification =
    | TagSetModification
    | TagDeleteModification
    | TagPrependModification
    | TagSuffixModification
    | TagRegexReplaceModification;

// --- End Tag Modification ---


// Storage Destination configuration for a Rule
export interface StorageDestination {
    type: string; // Type identifier (e.g., 'filesystem', 'cstore', 'gcs')
    config: Record<string, any>; // Backend-specific config (path, ae_title, bucket etc.)
}

// Base structure for a Rule (common fields for create/update/read)
export interface RuleBase {
    name: string; // Max length 100
    description?: string | null;
    is_active?: boolean; // Default: true in backend schema
    priority?: number; // Default: 0 in backend schema
    match_criteria?: MatchCriterion[]; // List of criteria (implicit AND)
    tag_modifications?: TagModification[]; // <-- Updated to use the union type
    destinations?: StorageDestination[]; // List of destinations
    applicable_sources?: string[] | null; // List of source IDs or null/empty for all
}

// Schema for creating a new Rule (requires linking to a RuleSet)
export interface RuleCreate extends RuleBase {
    ruleset_id: number; // Must link to a ruleset on creation
    // Ensure the lists are initialized if needed when creating objects
    match_criteria: MatchCriterion[];
    tag_modifications: TagModification[]; // <-- Updated to use the union type
    destinations: StorageDestination[];
}

// Schema for updating an existing Rule (all fields optional)
export interface RuleUpdate {
    name?: string | null;
    description?: string | null;
    is_active?: boolean | null;
    priority?: number | null;
    match_criteria?: MatchCriterion[] | null;
    tag_modifications?: TagModification[] | null; // <-- Updated to use the union type
    destinations?: StorageDestination[] | null;
    applicable_sources?: string[] | null; // Allow updating/clearing sources
}

// Schema for a Rule as returned by the API (includes generated fields)
export interface Rule extends RuleBase {
    id: number;
    ruleset_id: number;
    created_at: string; // ISO 8601 format date-time string
    updated_at?: string | null; // ISO 8601 format date-time string or null
    // Ensure the lists are properly typed here too
    match_criteria: MatchCriterion[];
    tag_modifications: TagModification[]; // <-- Updated to use the union type
    destinations: StorageDestination[];
    applicable_sources?: string[] | null; // Allow updating/clearing sources
}


// Base structure for a RuleSet
export interface RuleSetBase {
    name: string; // Max length 100
    description?: string | null;
    is_active?: boolean; // Default: true in backend schema
    priority?: number; // Default: 0 in backend schema
    execution_mode?: RuleSetExecutionMode; // Default: FIRST_MATCH in backend schema
}

// Schema for creating a new RuleSet
export interface RuleSetCreate extends RuleSetBase {}

// Schema for updating an existing RuleSet (all fields optional)
export interface RuleSetUpdate {
    name?: string | null;
    description?: string | null;
    is_active?: boolean | null;
    priority?: number | null;
    execution_mode?: RuleSetExecutionMode | null;
}

// Schema for a RuleSet as returned by the API (includes generated fields)
// Note: 'rules' might only be included when fetching a single RuleSet detail
export interface RuleSet extends RuleSetBase {
    id: number;
    created_at: string; // ISO 8601 format date-time string
    updated_at?: string | null; // ISO 8601 format date-time string or null
    rules?: Rule[]; // List of associated rules (eagerly loaded in some cases)
}

// Schema for RuleSet list views (more lightweight)
export interface RuleSetSummary {
    id: number;
    name: string;
    description?: string | null;
    is_active: boolean;
    priority: number;
    execution_mode: RuleSetExecutionMode;
    rule_count: number; // Calculated count of rules in the ruleset
    created_at: string; // ISO 8601 format date-time string
    updated_at?: string | null; // ISO 8601 format date-time string or null
}


// --- System & Health Schemas ---

// Represents the status of a single component
export interface ComponentStatus {
    status: 'ok' | 'degraded' | 'error' | 'down' | 'unknown' | string; // Allow string for flexibility
    details: string | null;
}

// Structure for the /health endpoint response
export interface HealthCheckResponse {
    status: 'ok' | string; // Overall status
    components: {
        database: ComponentStatus;
        // Add other components reported by backend health check if available
        // message_queue?: ComponentStatus;
        // cache?: ComponentStatus;
    }
}

// Structure for the /dashboard/status endpoint (may be same as HealthCheck or different)
// Assuming it's different for now, define as needed based on actual backend response
export interface SystemStatusReport {
    database: ComponentStatus;
    message_broker: ComponentStatus;
    api_service: ComponentStatus;
    dicom_listener: ComponentStatus;
    celery_workers: ComponentStatus;
    // Add more components if returned by the /dashboard/status endpoint
}


// --- Error Schemas ---

// Represents a single validation error item from FastAPI (HTTP 422)
export interface ValidationError {
    loc: (string | number)[]; // Location of the error (e.g., ['body', 'name'])
    msg: string; // Error message
    type: string; // Type of error (e.g., 'value_error')
}

// Represents the structure of the HTTP 422 response body
export interface HTTPValidationError {
    detail?: ValidationError[];
}

// General API error structure (can be used for non-422 errors)
export interface ApiError {
    detail?: string | any; // Error detail message or object
}
