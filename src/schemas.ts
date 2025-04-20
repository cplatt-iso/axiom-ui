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
    match_criteria: MatchCriterion[]; // Changed from optional for create/read
    tag_modifications: TagModification[]; // Changed from optional for create/read
    destinations: StorageDestination[]; // Changed from optional for create/read
    applicable_sources?: string[] | null;
}

export interface RuleCreate extends RuleBase {
    ruleset_id: number;
}

// Make fields truly optional for update payload
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

// Renamed Ruleset -> RuleSet for consistency
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
    rules: Rule[]; // Now uses correct Rule type
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
    status: 'ok' | 'degraded' | 'error' | 'down' | 'unknown' | string;
    details: string | null;
}

export interface HealthCheckResponse {
    status: 'ok' | string;
    components: {
        database: ComponentStatus;
        // Add other components reported by backend health check if available
    }
}

// Structure for the /dashboard/status endpoint response
export interface SystemStatusReport {
    database: ComponentStatus;
    message_broker: ComponentStatus;
    api_service: ComponentStatus;
    dicom_listener: ComponentStatus;
    celery_workers: ComponentStatus;
}

// --- NEW DICOMweb Poller Schemas ---
export interface DicomWebSourceStatus {
    source_name: string;
    is_enabled: boolean;
    last_processed_timestamp?: string | null; // ISO 8601 datetime string
    last_successful_run?: string | null;    // ISO 8601 datetime string
    last_error_run?: string | null;       // ISO 8601 datetime string
    last_error_message?: string | null;
}

export interface DicomWebPollersStatusResponse {
    pollers: DicomWebSourceStatus[];
}
// --- END NEW SCHEMAS ---

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
