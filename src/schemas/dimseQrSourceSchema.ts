// src/schemas/dimseQrSourceSchema.ts
import { z } from 'zod';
import json5 from 'json5'; // Import json5

const AE_TITLE_PATTERN = /^[ A-Za-z0-9._-]{1,16}$/;

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

    tls_enabled: z.boolean().default(false),
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
