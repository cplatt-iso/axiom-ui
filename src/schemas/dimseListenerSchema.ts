// src/schemas/dimseListenerSchema.ts
import { z } from 'zod';

const AE_TITLE_PATTERN = /^[ A-Za-z0-9._-]{1,16}$/;

export const DimseListenerConfigReadSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable().optional(),
    ae_title: z.string(),
    port: z.number().int(),
    is_enabled: z.boolean(),
    instance_id: z.string().nullable().optional(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    listener_type: z.string().default('pynetdicom'),
    tls_enabled: z.boolean().default(false),
    tls_cert_secret_name: z.string().optional().nullable(),
    tls_key_secret_name: z.string().optional().nullable(),
    tls_ca_cert_secret_name: z.string().optional().nullable(),
});

export type DimseListenerConfigRead = z.infer<typeof DimseListenerConfigReadSchema>;

export const DimseListenerConfigCreatePayloadSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional().nullable(),
    ae_title: z.string().min(1).max(16),
    port: z.number().int().gt(0).lt(65536),
    is_enabled: z.boolean().optional().default(true),
    instance_id: z.string().optional().nullable(),
    listener_type: z.enum(['pynetdicom', 'dcm4che']).default('pynetdicom'),
    tls_enabled: z.boolean().default(false),
    tls_cert_secret_name: z.string().optional().nullable(),
    tls_key_secret_name: z.string().optional().nullable(),
    tls_ca_cert_secret_name: z.string().optional().nullable(),
});
export type DimseListenerConfigCreatePayload = z.infer<typeof DimseListenerConfigCreatePayloadSchema>;

export const DimseListenerConfigUpdatePayloadSchema = DimseListenerConfigCreatePayloadSchema.deepPartial().refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided for update."
);
export type DimseListenerConfigUpdatePayload = z.infer<typeof DimseListenerConfigUpdatePayloadSchema>;


// --- Status Schemas (from old schemas.ts) ---
export const DimseListenerStatusSchema = z.object({
    id: z.number(),
    listener_id: z.string(), // This is likely the 'instance_id' or a unique ID for the running process
    status: z.string(),
    status_message: z.string().optional().nullable(),
    host: z.string().optional().nullable(),
    port: z.number().int().optional().nullable(),
    ae_title: z.string().optional().nullable(),
    last_heartbeat: z.string().datetime(),
    created_at: z.string().datetime(),
    received_instance_count: z.number().int().default(0),
    processed_instance_count: z.number().int().default(0),
});
export type DimseListenerStatus = z.infer<typeof DimseListenerStatusSchema>;

export const DimseListenersStatusResponseSchema = z.object({
    listeners: z.array(DimseListenerStatusSchema).default([]),
});
export type DimseListenersStatusResponse = z.infer<typeof DimseListenersStatusResponseSchema>;

export const dimseListenerFormSchema = z.object({
    name: z.string().min(1, "Listener name is required"),
    description: z.string().optional().nullable(),
    ae_title: z.string()
        .min(1, "AE Title is required")
        .max(16, "AE Title cannot exceed 16 characters")
        .regex(AE_TITLE_PATTERN, "Invalid AE Title format (A-Z, a-z, 0-9, ., _, - allowed, no leading/trailing spaces)")
        .refine(s => s ? s.trim() === s : true, "AE Title cannot have leading/trailing spaces"), // Allow empty string during validation, handle trim later? Or keep min(1)
    port: z.number().int().positive().min(1).max(65535, "Port must be between 1 and 65535"),
    is_enabled: z.boolean(),
    instance_id: z.string()
        .regex(/^[a-zA-Z0-9_.-]+$/, 'Instance ID can only contain letters, numbers, underscores, periods, and hyphens.')
        .max(255, "Instance ID too long")
        .optional()
        .nullable()
        .refine(val => val === null || val === undefined || (typeof val === 'string' && val.trim() === val), {
            message: "Instance ID cannot have leading/trailing spaces",
        }),
    tls_enabled: z.boolean(),
    tls_cert_secret_name: z.string().optional().nullable(),
    tls_key_secret_name: z.string().optional().nullable(),
    tls_ca_cert_secret_name: z.string().optional().nullable(),
}).superRefine((data, ctx) => { // Use superRefine for cross-field validation
    // If TLS is enabled, cert and key secrets are required
    if (data.tls_enabled) {
        if (!data.tls_cert_secret_name || data.tls_cert_secret_name.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["tls_cert_secret_name"], // Target the specific field
                message: "Server certificate secret name is required when TLS is enabled.",
            });
        }
        if (!data.tls_key_secret_name || data.tls_key_secret_name.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["tls_key_secret_name"], // Target the specific field
                message: "Server private key secret name is required when TLS is enabled.",
            });
        }
    }
    // Note: We don't enforce tls_ca_cert_secret_name if tls_enabled is true,
    // because it's only needed for optional mTLS verification on the server side.
});

// Update the form data type to include new fields
export type DimseListenerFormData = z.infer<typeof dimseListenerFormSchema>;