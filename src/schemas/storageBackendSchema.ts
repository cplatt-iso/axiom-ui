// src/schemas/storageBackendSchema.ts
import { z } from 'zod';

// --- Enums ---
export const allowedBackendTypeEnum = z.enum([
    "filesystem",
    "cstore",
    "gcs",
    "google_healthcare",
    "stow_rs"
]);
export type AllowedBackendType = z.infer<typeof allowedBackendTypeEnum>;

export const stowRsAuthTypeEnum = z.enum([
    "none",
    "basic",
    "bearer",
    "apikey"
]);
export type StowRsAuthType = z.infer<typeof stowRsAuthTypeEnum>;

// --- Constants ---
const AE_TITLE_PATTERN_STRICT = /^[A-Za-z0-9._-]{1,16}$/; // No leading/trailing spaces
const AE_TITLE_PATTERN_FORM = /^[ A-Za-z0-9._-]{1,16}$/; // Allows for trimming
const SECRET_NAME_PATTERN = /^[a-zA-Z0-9-_/.]{1,512}$/;
const URL_PATTERN = /^https?:\/\/.+/;

// --- Form Data Schema (Flat structure for React Hook Form) ---
export const storageBackendFormSchema = z.object({
    // Common fields
    name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less."),
    backend_type: allowedBackendTypeEnum,
    is_enabled: z.boolean().optional(), // Changed from .default(true) to .optional()
    description: z.string().max(500, "Description must be 500 characters or less.").optional().nullable(),

    // Filesystem
    path: z.string().max(512).optional().nullable(),

    // CStore
    remote_ae_title: z.string().max(16, "AE Title max 16 chars").regex(AE_TITLE_PATTERN_FORM, "Invalid AE Title format (A-Z, a-z, 0-9, ., _, - space allowed but will be trimmed).").optional().nullable(),
    remote_host: z.string().max(255).optional().nullable(),
    remote_port: z.coerce.number().int().min(1).max(65535).optional().nullable(),
    local_ae_title: z.string().max(16, "AE Title max 16 chars").regex(AE_TITLE_PATTERN_FORM, "Invalid AE Title format (A-Z, a-z, 0-9, ., _, - space allowed but will be trimmed).").optional().nullable(),
    
    tls_enabled: z.boolean().default(false).optional(), // CStore specific
    tls_ca_cert_secret_name: z.string().max(512).regex(SECRET_NAME_PATTERN, "Invalid Secret Name format.").optional().nullable(), // Shared by CStore & STOW-RS
    
    tls_client_cert_secret_name: z.string().max(512).regex(SECRET_NAME_PATTERN, "Invalid Secret Name format.").optional().nullable(), // CStore mTLS
    tls_client_key_secret_name: z.string().max(512).regex(SECRET_NAME_PATTERN, "Invalid Secret Name format.").optional().nullable(), // CStore mTLS

    // GCS
    bucket: z.string().max(255).optional().nullable(),
    prefix: z.string().max(512).refine(s => s === null || s === undefined || s.trim() === '' || !s.startsWith('/'), {message: "Prefix should not start with '/', can be blank."}).optional().nullable(),

    // Google Healthcare
    gcp_project_id: z.string().max(255).optional().nullable(),
    gcp_location: z.string().max(100).optional().nullable(),
    gcp_dataset_id: z.string().max(100).optional().nullable(),
    gcp_dicom_store_id: z.string().max(100).optional().nullable(),

    // STOW-RS
    base_url: z.string().max(512).refine(val => val === null || val === undefined || val.trim() === '' || URL_PATTERN.test(val), {message: "Must be a valid URL (e.g., http://... or https://...)"}).optional().nullable(),
    stow_auth_type: stowRsAuthTypeEnum.optional(), // Changed from .default("none").optional() to just .optional()
    stow_basic_auth_username_secret_name: z.string().max(512).regex(SECRET_NAME_PATTERN, "Invalid Secret Name format.").optional().nullable(),
    stow_basic_auth_password_secret_name: z.string().max(512).regex(SECRET_NAME_PATTERN, "Invalid Secret Name format.").optional().nullable(),
    stow_bearer_token_secret_name: z.string().max(512).regex(SECRET_NAME_PATTERN, "Invalid Secret Name format.").optional().nullable(),
    stow_api_key_secret_name: z.string().max(512).regex(SECRET_NAME_PATTERN, "Invalid Secret Name format.").optional().nullable(),
    stow_api_key_header_name_override: z.string().max(100).optional().nullable(),

}).superRefine((data, ctx) => {
    if (data.backend_type === 'filesystem' && (!data.path || data.path.trim() === '')) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['path'], message: 'Path is required.' });
    }
    if (data.backend_type === 'cstore') {
        if (!data.remote_ae_title || data.remote_ae_title.trim() === '') ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['remote_ae_title'], message: 'Remote AE Title is required.' });
        if (data.remote_ae_title && data.remote_ae_title.trim() !== data.remote_ae_title) ctx.addIssue({code: z.ZodIssueCode.custom, path: ['remote_ae_title'], message: 'AE Title cannot have leading/trailing spaces.'});
        if (!data.remote_host || data.remote_host.trim() === '') ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['remote_host'], message: 'Remote Host is required.' });
        if (data.remote_port === null || data.remote_port === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['remote_port'], message: 'Remote Port is required.' });
        if(data.local_ae_title && data.local_ae_title.trim() !== data.local_ae_title) ctx.addIssue({code: z.ZodIssueCode.custom, path: ['local_ae_title'], message: 'AE Title cannot have leading/trailing spaces.'});

        if (data.tls_enabled && (!data.tls_ca_cert_secret_name || data.tls_ca_cert_secret_name.trim() === '')) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['tls_ca_cert_secret_name'], message: "CA Secret Name for CStore TLS is required." });
        }
        const cstoreHasClientCert = !!(data.tls_client_cert_secret_name && data.tls_client_cert_secret_name.trim());
        const cstoreHasClientKey = !!(data.tls_client_key_secret_name && data.tls_client_key_secret_name.trim());
        if (cstoreHasClientCert !== cstoreHasClientKey) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['tls_client_cert_secret_name'], message: "For CStore mTLS, provide both Client Cert and Key Secret Names, or neither." });
        }
        if ((cstoreHasClientCert || cstoreHasClientKey) && !data.tls_enabled) {
             ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['tls_client_cert_secret_name'], message: "CStore mTLS fields only if TLS enabled." });
        }
    }
    if (data.backend_type === 'gcs' && (!data.bucket || data.bucket.trim() === '')) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['bucket'], message: 'GCS Bucket name is required.' });
    }
    if (data.backend_type === 'google_healthcare') {
        if (!data.gcp_project_id?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['gcp_project_id'], message: 'GCP Project ID is required.' });
        if (!data.gcp_location?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['gcp_location'], message: 'GCP Location is required.' });
        if (!data.gcp_dataset_id?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['gcp_dataset_id'], message: 'Healthcare Dataset ID is required.' });
        if (!data.gcp_dicom_store_id?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['gcp_dicom_store_id'], message: 'DICOM Store ID is required.' });
    }
    if (data.backend_type === 'stow_rs') {
        if (!data.base_url || data.base_url.trim() === '') {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['base_url'], message: 'Base URL is required.' });
        }
        const authType = data.stow_auth_type || 'none';
        if (authType === 'basic') {
            if (!data.stow_basic_auth_username_secret_name?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['stow_basic_auth_username_secret_name'], message: 'Username Secret Name is required for Basic auth.' });
            if (!data.stow_basic_auth_password_secret_name?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['stow_basic_auth_password_secret_name'], message: 'Password Secret Name is required for Basic auth.' });
        } else if (authType === 'bearer') {
            if (!data.stow_bearer_token_secret_name?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['stow_bearer_token_secret_name'], message: 'Bearer Token Secret Name is required for Bearer auth.' });
        } else if (authType === 'apikey') {
            if (!data.stow_api_key_secret_name?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['stow_api_key_secret_name'], message: 'API Key Secret Name is required.' });
            if (!data.stow_api_key_header_name_override?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['stow_api_key_header_name_override'], message: 'API Key Header Name is required (e.g., X-API-Key).' });
        }
    }
});
export type StorageBackendFormData = z.infer<typeof storageBackendFormSchema>;


// --- API Payload Schemas (Matching Backend Pydantic Discriminated Union for Create) ---
const baseApiSchema = z.object({
    name: z.string().min(1).max(100).transform(s => s.trim()),
    description: z.string().max(500).nullish().transform(s => s ? s.trim() : null),
    is_enabled: z.boolean(),
});

const filesystemApiSchema = baseApiSchema.extend({
    backend_type: z.literal("filesystem"),
    path: z.string().min(1, "Path is required"),
});

// Define the base object for CStore before superRefine
const cstoreApiBaseObject = baseApiSchema.extend({
    backend_type: z.literal("cstore"),
    remote_ae_title: z.string().min(1).max(16).regex(AE_TITLE_PATTERN_STRICT, "Invalid AE Title format (no leading/trailing spaces).").transform(s => s.trim()),
    remote_host: z.string().min(1).transform(s => s.trim()),
    remote_port: z.number().int().min(1).max(65535),
    local_ae_title: z.string().max(16).regex(AE_TITLE_PATTERN_STRICT, "Invalid AE Title format (no leading/trailing spaces).").nullish().transform(s => s ? s.trim() : null),
    tls_enabled: z.boolean().default(false),
    tls_ca_cert_secret_name: z.string().min(1).regex(SECRET_NAME_PATTERN).nullish(),
    tls_client_cert_secret_name: z.string().min(1).regex(SECRET_NAME_PATTERN).nullish(),
    tls_client_key_secret_name: z.string().min(1).regex(SECRET_NAME_PATTERN).nullish(),
});
// cstoreApiSchema can still be exported and used if its refined version is needed elsewhere
export const cstoreApiSchema = cstoreApiBaseObject.superRefine((data, ctx) => {
    if (data.tls_enabled && !data.tls_ca_cert_secret_name) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['tls_ca_cert_secret_name'], message: "CStore: CA Cert Secret Name required if TLS enabled." });
    }
    const hasClientCert = !!data.tls_client_cert_secret_name;
    const hasClientKey = !!data.tls_client_key_secret_name;
    if (hasClientCert !== hasClientKey) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['tls_client_cert_secret_name'], message: "CStore: Both client cert and key secret names required for mTLS, or neither." });
    }
    if((hasClientCert || hasClientKey) && !data.tls_enabled){
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['tls_client_cert_secret_name'], message: "CStore: mTLS fields only if TLS enabled." });
    }
});

const gcsApiSchema = baseApiSchema.extend({
    backend_type: z.literal("gcs"),
    bucket: z.string().min(1),
    prefix: z.string().refine(s => s === null || s === undefined || s === '' || !s.startsWith('/'), {message: "Prefix should not start with '/'"}).nullish(),
});

const googleHealthcareApiSchema = baseApiSchema.extend({
    backend_type: z.literal("google_healthcare"),
    gcp_project_id: z.string().min(1),
    gcp_location: z.string().min(1),
    gcp_dataset_id: z.string().min(1),
    gcp_dicom_store_id: z.string().min(1),
});

// Define the base object for STOW-RS before superRefine
const stowRsApiBaseObject = baseApiSchema.extend({
    backend_type: z.literal("stow_rs"),
    base_url: z.string().min(1).url("Must be a valid URL"),
    auth_type: stowRsAuthTypeEnum.optional(),
    basic_auth_username_secret_name: z.string().min(1).regex(SECRET_NAME_PATTERN).nullish(),
    basic_auth_password_secret_name: z.string().min(1).regex(SECRET_NAME_PATTERN).nullish(),
    bearer_token_secret_name: z.string().min(1).regex(SECRET_NAME_PATTERN).nullish(),
    api_key_secret_name: z.string().min(1).regex(SECRET_NAME_PATTERN).nullish(),
    api_key_header_name_override: z.string().min(1).nullish(),
    tls_ca_cert_secret_name: z.string().min(1).regex(SECRET_NAME_PATTERN).nullish(),
});
// stowRsApiSchema can still be exported and used if its refined version is needed elsewhere
export const stowRsApiSchema = stowRsApiBaseObject.superRefine((data, ctx) => {
    const authType = data.auth_type || 'none';
    if (authType === 'basic') {
        if (!data.basic_auth_username_secret_name) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['basic_auth_username_secret_name'], message: "Username secret required for basic auth." });
        if (!data.basic_auth_password_secret_name) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['basic_auth_password_secret_name'], message: "Password secret required for basic auth." });
    } else if (authType === 'bearer') {
        if (!data.bearer_token_secret_name) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['bearer_token_secret_name'], message: "Bearer token secret required for bearer auth." });
    } else if (authType === 'apikey') {
        if (!data.api_key_secret_name) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['api_key_secret_name'], message: "API key secret required." });
        if (!data.api_key_header_name_override) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['api_key_header_name_override'], message: "API key header name required." });
    }
});

export const StorageBackendConfigCreatePayloadSchema = z.discriminatedUnion("backend_type", [
    filesystemApiSchema,
    cstoreApiBaseObject, // Use the base ZodObject
    gcsApiSchema,
    googleHealthcareApiSchema,
    stowRsApiBaseObject, // Use the base ZodObject
]);
export type StorageBackendConfigCreatePayload = z.infer<typeof StorageBackendConfigCreatePayloadSchema>;


// --- API Update Payload Schema (Flat, all optional, for PATCH) ---
export const StorageBackendConfigUpdateApiPayloadSchema = z.object({
    name: z.string().min(1).max(100).optional().transform(s => s ? s.trim() : undefined),
    description: z.string().max(500).nullish().optional().transform(s => s === undefined ? undefined : (s === null ? null : s.trim())),
    is_enabled: z.boolean().optional(),
    
    path: z.string().max(512).optional(),
    
    remote_ae_title: z.string().max(16).regex(AE_TITLE_PATTERN_STRICT).optional().transform(s => s ? s.trim() : undefined),
    remote_host: z.string().max(255).optional().transform(s => s ? s.trim() : undefined),
    remote_port: z.coerce.number().int().min(1).max(65535).optional(),
    local_ae_title: z.string().max(16).regex(AE_TITLE_PATTERN_STRICT).nullish().optional().transform(s => s === undefined ? undefined : (s === null ? null : s.trim())),
    tls_enabled: z.boolean().optional(),
    
    bucket: z.string().max(255).optional(),
    prefix: z.string().max(512).refine(s => s === undefined || s === null || s.trim() === '' || !s.startsWith('/'), {message: "Prefix should not start with '/'"}).nullish().optional(),
    
    gcp_project_id: z.string().max(255).optional(),
    gcp_location: z.string().max(100).optional(),
    gcp_dataset_id: z.string().max(100).optional(),
    gcp_dicom_store_id: z.string().max(100).optional(),
    
    base_url: z.string().max(512).refine(val => val === undefined || val === null || val.trim() === '' || URL_PATTERN.test(val), {message: "Must be a valid URL"}).optional(),
    auth_type: stowRsAuthTypeEnum.optional(),
    basic_auth_username_secret_name: z.string().max(512).regex(SECRET_NAME_PATTERN).nullish().optional(),
    basic_auth_password_secret_name: z.string().max(512).regex(SECRET_NAME_PATTERN).nullish().optional(),
    bearer_token_secret_name: z.string().max(512).regex(SECRET_NAME_PATTERN).nullish().optional(),
    api_key_secret_name: z.string().max(512).regex(SECRET_NAME_PATTERN).nullish().optional(),
    api_key_header_name_override: z.string().max(100).nullish().optional(),
    
    tls_ca_cert_secret_name: z.string().max(512).regex(SECRET_NAME_PATTERN).nullish().optional(), // Shared

}).partial().refine( 
    (data) => Object.keys(data).length > 0,
    { message: "At least one field must be provided for update." }
).superRefine((data, ctx) => {
    // For PATCH, cross-field validation is tricky as we don't know the full final state.
    // These validations are best effort if fields are present in the patch.
    // Backend should perform full validation against the updated object.
    if (data.tls_enabled === true && data.hasOwnProperty('tls_ca_cert_secret_name') && !data.tls_ca_cert_secret_name) {
         ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['tls_ca_cert_secret_name'], message: "If CStore TLS is enabled, CA Secret Name is required." });
    }
    if (data.auth_type) { // If auth_type is part of the PATCH
        const authType = data.auth_type;
        if (authType === 'basic' && (data.hasOwnProperty('basic_auth_username_secret_name') && !data.basic_auth_username_secret_name || data.hasOwnProperty('basic_auth_password_secret_name') && !data.basic_auth_password_secret_name )) {
            // This implies if you set auth_type to basic, you must provide both secrets if they are not already set.
            // This is hard to enforce perfectly here for PATCH.
        }
        // Add similar checks for bearer, apikey if specific fields are missing when auth_type is set
    }
});
export type StorageBackendConfigUpdateApiPayload = z.infer<typeof StorageBackendConfigUpdateApiPayloadSchema>;


// --- API Read Schema (Frontend's representation of what it gets from the API) ---
// Individual Read Schemas for each backend type
const FilesystemConfigReadSchema = baseApiSchema.extend({
    id: z.number().int(),
    backend_type: z.literal("filesystem"),
    path: z.string(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
});

const CStoreConfigReadSchema = baseApiSchema.extend({
    id: z.number().int(),
    backend_type: z.literal("cstore"),
    remote_ae_title: z.string(),
    remote_host: z.string(),
    remote_port: z.number().int(),
    local_ae_title: z.string().nullish(),
    tls_enabled: z.boolean(),
    tls_ca_cert_secret_name: z.string().regex(SECRET_NAME_PATTERN).nullish(),
    tls_client_cert_secret_name: z.string().regex(SECRET_NAME_PATTERN).nullish(),
    tls_client_key_secret_name: z.string().regex(SECRET_NAME_PATTERN).nullish(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
});

const GcsConfigReadSchema = baseApiSchema.extend({
    id: z.number().int(),
    backend_type: z.literal("gcs"),
    bucket: z.string(),
    prefix: z.string().nullish(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
});

const GoogleHealthcareConfigReadSchema = baseApiSchema.extend({
    id: z.number().int(),
    backend_type: z.literal("google_healthcare"),
    gcp_project_id: z.string(),
    gcp_location: z.string(),
    gcp_dataset_id: z.string(),
    gcp_dicom_store_id: z.string(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
});

const StowRsConfigReadSchema = baseApiSchema.extend({
    id: z.number().int(),
    backend_type: z.literal("stow_rs"),
    base_url: z.string().url(),
    auth_type: stowRsAuthTypeEnum, // Should receive a valid enum string
    basic_auth_username_secret_name: z.string().regex(SECRET_NAME_PATTERN).nullish(),
    basic_auth_password_secret_name: z.string().regex(SECRET_NAME_PATTERN).nullish(),
    bearer_token_secret_name: z.string().regex(SECRET_NAME_PATTERN).nullish(),
    api_key_secret_name: z.string().regex(SECRET_NAME_PATTERN).nullish(),
    api_key_header_name_override: z.string().nullish(),
    tls_ca_cert_secret_name: z.string().regex(SECRET_NAME_PATTERN).nullish(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
});

// Discriminated union for what the API GET endpoints return
export const StorageBackendConfigReadSchema = z.discriminatedUnion("backend_type", [
    FilesystemConfigReadSchema,
    CStoreConfigReadSchema,
    GcsConfigReadSchema,
    GoogleHealthcareConfigReadSchema,
    StowRsConfigReadSchema,
]);
export type StorageBackendConfigRead = z.infer<typeof StorageBackendConfigReadSchema>;

// Alias for clarity in the modal if needed, assuming Update uses the same structure as PATCH suggests
export type StorageBackendApiPayload = StorageBackendConfigUpdateApiPayload;

// Summary schema (used in Rule destinations, etc.)
export const StorageBackendConfigSummarySchema = z.object({
    id: z.number(),
    name: z.string(),
    backend_type: allowedBackendTypeEnum,
    is_enabled: z.boolean(),
});
export type StorageBackendConfigSummary = z.infer<typeof StorageBackendConfigSummarySchema>;