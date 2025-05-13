// src/schemas/dimseQrSourceSchema.ts
import { z } from 'zod';
import json5 from 'json5'; // Import json5

const AE_TITLE_PATTERN = /^[ A-Za-z0-9._-]{1,16}$/;

export const DimseQueryRetrieveSourceReadSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable().optional(),
    remote_ae_title: z.string(),
    remote_host: z.string(),
    remote_port: z.number().int(),
    local_ae_title: z.string(),
    polling_interval_seconds: z.number().int().positive(),
    is_enabled: z.boolean(),
    is_active: z.boolean(),
    query_level: z.string(), 
    query_filters: z.record(z.any()).nullable().optional(),
    move_destination_ae_title: z.string().nullable().optional(),
    tls_enabled: z.boolean().default(false),
    tls_ca_cert_secret_name: z.string().optional().nullable(),
    tls_client_cert_secret_name: z.string().optional().nullable(),
    tls_client_key_secret_name: z.string().optional().nullable(),
    last_successful_query: z.string().datetime().optional().nullable(),
    last_successful_move: z.string().datetime().optional().nullable(),
    last_error_time: z.string().datetime().optional().nullable(),
    last_error_message: z.string().nullable().optional(),
    found_study_count: z.number().int().nonnegative().default(0),
    move_queued_study_count: z.number().int().nonnegative().default(0),
    processed_instance_count: z.number().int().nonnegative().default(0),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
});
export type DimseQueryRetrieveSourceRead = z.infer<typeof DimseQueryRetrieveSourceReadSchema>;

export const DimseQueryRetrieveSourceCreatePayloadSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional().nullable(),
    remote_ae_title: z.string().min(1).max(16),
    remote_host: z.string().min(1),
    remote_port: z.number().int().gt(0).lt(65536),
    local_ae_title: z.string().min(1).max(16).optional().default("AXIOM_QR_SCU"),
    polling_interval_seconds: z.number().int().positive().optional().default(300),
    is_enabled: z.boolean().optional().default(true),
    query_level: z.enum(["STUDY", "SERIES", "PATIENT"]).optional().default("STUDY"),
    query_filters: z.record(z.any()).optional().nullable(),
    move_destination_ae_title: z.string().min(1).max(16).optional().nullable(),
});
export type DimseQueryRetrieveSourceCreatePayload = z.infer<typeof DimseQueryRetrieveSourceCreatePayloadSchema>;

export const DimseQueryRetrieveSourceUpdatePayloadSchema = DimseQueryRetrieveSourceCreatePayloadSchema.partial().refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided for update."
);
export type DimseQueryRetrieveSourceUpdatePayload = z.infer<typeof DimseQueryRetrieveSourceUpdatePayloadSchema>;


// --- Status Schemas (from old schemas.ts) ---
export const DimseQrSourceStatusSchema = z.object({
    id: z.number(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    name: z.string(),
    is_enabled: z.boolean(),
    remote_ae_title: z.string(),
    remote_host: z.string(),
    remote_port: z.number().int(),
    last_successful_query: z.string().datetime().optional().nullable(),
    last_successful_move: z.string().datetime().optional().nullable(),
    last_error_time: z.string().datetime().optional().nullable(),
    last_error_message: z.string().optional().nullable(),
    found_study_count: z.number().int().default(0),
    move_queued_study_count: z.number().int().default(0),
    processed_instance_count: z.number().int().default(0),
});
export type DimseQrSourceStatus = z.infer<typeof DimseQrSourceStatusSchema>;

export const DimseQrSourcesStatusResponseSchema = z.object({
    sources: z.array(DimseQrSourceStatusSchema).default([]),
});
export type DimseQrSourcesStatusResponse = z.infer<typeof DimseQrSourcesStatusResponseSchema>;

export const dimseQrSourceFormSchema = z.object({
    name: z.string().min(1, "Source name is required"),
    description: z.string().optional().nullable(),
    remote_ae_title: z.string()
        .min(1, "Remote AE Title required")
        .max(16, "AE Title cannot exceed 16 characters")
        .regex(AE_TITLE_PATTERN, "Invalid AE Title format")
        .refine(s => s ? s.trim() === s : true, "AE Title cannot have leading/trailing spaces"),
    remote_host: z.string().min(1, "Remote host required"),
    remote_port: z.coerce.number().int().min(1).max(65535),
    local_ae_title: z.string()
        .min(1)
        .max(16, "AE Title cannot exceed 16 characters")
        .regex(AE_TITLE_PATTERN, "Invalid AE Title format")
        .refine(s => s ? s.trim() === s : true, "AE Title cannot have leading/trailing spaces")
        .default("AXIOM_QR_SCU"),
    polling_interval_seconds: z.coerce.number().int().positive("Interval must be positive"),
    is_enabled: z.boolean(),
    is_active: z.boolean(),
    query_level: z.enum(["STUDY", "SERIES", "PATIENT"]),
    query_filters: z.string().optional().nullable(), // Keep as string input from textarea
    move_destination_ae_title: z.string()
        .max(16, "AE Title cannot exceed 16 characters")
        .regex(AE_TITLE_PATTERN, "Invalid AE Title format")
        .refine(s => s ? s.trim() === s : true, "AE Title cannot have leading/trailing spaces")
        .optional().nullable(),
    tls_enabled: z.boolean(),
    tls_ca_cert_secret_name: z.string().optional().nullable(),
    tls_client_cert_secret_name: z.string().optional().nullable(),
    tls_client_key_secret_name: z.string().optional().nullable(),

}).superRefine((data, ctx) => {
    // TLS validation (unchanged)
    if (data.tls_enabled) {
        if (!data.tls_ca_cert_secret_name || data.tls_ca_cert_secret_name.trim() === '') {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["tls_ca_cert_secret_name"], message: "CA certificate secret name is required when TLS is enabled (to verify remote server).", });
        }
    }
    const hasClientCert = !!data.tls_client_cert_secret_name && data.tls_client_cert_secret_name.trim() !== '';
    const hasClientKey = !!data.tls_client_key_secret_name && data.tls_client_key_secret_name.trim() !== '';
    if (hasClientCert !== hasClientKey) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["tls_client_cert_secret_name"], message: "Both client certificate and private key secret names must be provided for mTLS, or neither.", });
         ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["tls_client_key_secret_name"], message: "Both client certificate and private key secret names must be provided for mTLS, or neither.", });
    } else if (hasClientCert && !data.tls_enabled) {
         ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["tls_client_cert_secret_name"], message: "Client certificate should only be provided if TLS is enabled.", });
         ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["tls_client_key_secret_name"], message: "Client key should only be provided if TLS is enabled.", });
    }

    // --- Corrected JSON validation using json5 ---
    try {
        if (data.query_filters && data.query_filters.trim()) {
            // Use json5.parse for validation to allow unquoted keys etc.
            const parsed = json5.parse(data.query_filters);
            if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
                 throw new Error("Query filters must be a valid JSON object.");
            }
            // Optional: Add further checks on parsed keys/values if needed
        }
    } catch (e) {
         ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["query_filters"], // Add error to the specific form field
            message: `Invalid JSON format: ${e instanceof Error ? e.message : String(e)}`,
        });
    }
    // --- End corrected JSON validation ---
});

export type DimseQrSourceFormData = z.infer<typeof dimseQrSourceFormSchema>;
