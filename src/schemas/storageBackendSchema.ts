// src/schemas/storageBackendSchema.ts
import { z } from 'zod';

export const allowedBackendTypeEnum = z.enum([
    "filesystem",
    "cstore",
    "gcs",
    "google_healthcare",
    "stow_rs"
]);
export type AllowedBackendType = z.infer<typeof allowedBackendTypeEnum>;

const AE_TITLE_PATTERN = /^[ A-Za-z0-9._-]{1,16}$/;

const cstoreRefinementIssues = [
    {
        condition: (data: any) => !!data.tls_enabled && !(data.tls_ca_cert_secret_name && typeof data.tls_ca_cert_secret_name === 'string' && data.tls_ca_cert_secret_name.trim().length > 0),
        message: "CA Certificate Secret Name is required when TLS is enabled (to verify remote server).",
        path: ["tls_ca_cert_secret_name"]
    },
    {
        condition: (data: any) => {
            const hasClientCert = data.tls_client_cert_secret_name && typeof data.tls_client_cert_secret_name === 'string' && data.tls_client_cert_secret_name.trim().length > 0;
            const hasClientKey = data.tls_client_key_secret_name && typeof data.tls_client_key_secret_name === 'string' && data.tls_client_key_secret_name.trim().length > 0;
            return hasClientCert !== hasClientKey;
        },
        message: "Provide both Client Certificate and Client Key Secret Names for mTLS, or neither.",
        path: ["tls_client_cert_secret_name"]
    },
    {
        condition: (data: any) => {
            const hasClientCert = data.tls_client_cert_secret_name && typeof data.tls_client_cert_secret_name === 'string' && data.tls_client_cert_secret_name.trim().length > 0;
            const hasClientKey = data.tls_client_key_secret_name && typeof data.tls_client_key_secret_name === 'string' && data.tls_client_key_secret_name.trim().length > 0;
            return (hasClientCert || hasClientKey) && !data.tls_enabled;
        },
        message: "Client certificate/key should only be provided if TLS is enabled.",
        path: ["tls_client_cert_secret_name"]
    }
];


export const storageBackendFormSchema = z.object({
    name: z.string().min(1, "Name is required"),
    backend_type: allowedBackendTypeEnum,
    is_enabled: z.boolean().default(true),
    description: z.string().optional().nullable(),
    path: z.string().optional().nullable(),
    remote_ae_title: z.string().max(16, "AE Title max 16 chars").regex(AE_TITLE_PATTERN, "Invalid AE Title format").refine(s => s === null || s === undefined || s.trim() === s , "AE Title cannot have leading/trailing spaces").optional().nullable(),
    remote_host: z.string().optional().nullable(),
    remote_port: z.coerce.number().int().min(1).max(65535).optional().nullable(),
    local_ae_title: z.string().max(16, "AE Title max 16 chars").regex(AE_TITLE_PATTERN, "Invalid AE Title format").refine(s => s === null || s === undefined || s.trim() === s , "AE Title cannot have leading/trailing spaces").optional().nullable(),
    tls_enabled: z.boolean().default(false).optional(),
    tls_ca_cert_secret_name: z.string().optional().nullable(),
    tls_client_cert_secret_name: z.string().optional().nullable(),
    tls_client_key_secret_name: z.string().optional().nullable(),
    bucket: z.string().optional().nullable(),
    prefix: z.string().refine(s => s === null || s === undefined || !s.startsWith('/'), "Prefix should not start with '/'").optional().nullable(),
    gcp_project_id: z.string().optional().nullable(),
    gcp_location: z.string().optional().nullable(),
    gcp_dataset_id: z.string().optional().nullable(),
    gcp_dicom_store_id: z.string().optional().nullable(),
    base_url: z.string().url("Must be a valid URL if provided").optional().nullable(),
}).superRefine((data, ctx) => {
     switch (data.backend_type) {
        case 'filesystem':
            if (!data.path || data.path.trim() === '') {
                ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['path'], message: 'Path is required for filesystem backend.' });
            }
            break;
        case 'cstore':
             if (!data.remote_ae_title || data.remote_ae_title.trim() === '') ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['remote_ae_title'], message: 'Remote AE Title is required for C-STORE backend.' });
             if (!data.remote_host || data.remote_host.trim() === '') ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['remote_host'], message: 'Remote Host is required for C-STORE backend.' });
             if (data.remote_port === null || data.remote_port === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['remote_port'], message: 'Remote Port is required for C-STORE backend.' });

             for (const issue of cstoreRefinementIssues) {
                 if (issue.condition(data)) {
                     ctx.addIssue({ code: z.ZodIssueCode.custom, message: issue.message, path: issue.path as [string, ...string[]] });
                 }
             }
             break;
        case 'gcs':
             if (!data.bucket || data.bucket.trim() === '') ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['bucket'], message: 'GCS Bucket name is required.' });
             break;
        case 'google_healthcare':
             if (!data.gcp_project_id || data.gcp_project_id.trim() === '') ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['gcp_project_id'], message: 'GCP Project ID is required.' });
             if (!data.gcp_location || data.gcp_location.trim() === '') ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['gcp_location'], message: 'GCP Location is required.' });
             if (!data.gcp_dataset_id || data.gcp_dataset_id.trim() === '') ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['gcp_dataset_id'], message: 'Healthcare Dataset ID is required.' });
             if (!data.gcp_dicom_store_id || data.gcp_dicom_store_id.trim() === '') ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['gcp_dicom_store_id'], message: 'DICOM Store ID is required.' });
             break;
        case 'stow_rs':
             if (!data.base_url || data.base_url.trim() === '') ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['base_url'], message: 'Base URL is required for STOW-RS backend.' });
             break;
    }
});

export type StorageBackendFormData = z.infer<typeof storageBackendFormSchema>;

const BaseApiFields = {
    name: z.string().min(1),
    description: z.string().nullable(),
    is_enabled: z.boolean(),
};

export const storageBackendApiPayloadSchema = z.discriminatedUnion("backend_type", [
    z.object({
        ...BaseApiFields,
        backend_type: z.literal("filesystem"),
        path: z.string().min(1),
    }),
    z.object({
        ...BaseApiFields,
        backend_type: z.literal("cstore"),
        remote_ae_title: z.string().min(1).max(16).regex(AE_TITLE_PATTERN),
        remote_host: z.string().min(1),
        remote_port: z.number().int().min(1).max(65535),
        local_ae_title: z.string().max(16).regex(AE_TITLE_PATTERN).nullable(),
        tls_enabled: z.boolean(),
        tls_ca_cert_secret_name: z.string().min(1).nullable(),
        tls_client_cert_secret_name: z.string().min(1).nullable(),
        tls_client_key_secret_name: z.string().min(1).nullable(),
    }),
    z.object({
        ...BaseApiFields,
        backend_type: z.literal("gcs"),
        bucket: z.string().min(1),
        prefix: z.string().refine(s => !s.startsWith('/'), "Prefix should not start with '/'").nullable(),
    }),
    z.object({
        ...BaseApiFields,
        backend_type: z.literal("google_healthcare"),
        gcp_project_id: z.string().min(1),
        gcp_location: z.string().min(1),
        gcp_dataset_id: z.string().min(1),
        gcp_dicom_store_id: z.string().min(1),
    }),
    z.object({
        ...BaseApiFields,
        backend_type: z.literal("stow_rs"),
        base_url: z.string().min(1).url(),
    }),
]);

export type StorageBackendApiPayload = z.infer<typeof storageBackendApiPayloadSchema>;
