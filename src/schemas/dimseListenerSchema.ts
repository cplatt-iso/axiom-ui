// src/schemas/dimseListenerSchema.ts
import { z } from 'zod';

const AE_TITLE_PATTERN = /^[ A-Za-z0-9._-]{1,16}$/;

export const dimseListenerFormSchema = z.object({
    name: z.string().min(1, "Listener name is required"),
    description: z.string().optional().nullable(),
    ae_title: z.string()
        .min(1, "AE Title is required")
        .max(16, "AE Title cannot exceed 16 characters")
        .regex(AE_TITLE_PATTERN, "Invalid AE Title format (A-Z, a-z, 0-9, ., _, - allowed, no leading/trailing spaces)")
        .refine(s => s ? s.trim() === s : true, "AE Title cannot have leading/trailing spaces"), // Allow empty string during validation, handle trim later? Or keep min(1)
    port: z.coerce.number().int().positive().min(1).max(65535, "Port must be between 1 and 65535"),
    is_enabled: z.boolean(),
    instance_id: z.string()
        .regex(/^[a-zA-Z0-9_.-]+$/, 'Instance ID can only contain letters, numbers, underscores, periods, and hyphens.')
        .max(255, "Instance ID too long")
        .optional()
        .nullable()
        .refine(val => val === null || val === undefined || (typeof val === 'string' && val.trim() === val), {
            message: "Instance ID cannot have leading/trailing spaces",
        }),

    // --- TLS Fields Added ---
    tls_enabled: z.boolean().default(false),
    // Add optional() because they might not be present in the form state if tls_enabled is false
    tls_cert_secret_name: z.string().optional().nullable(),
    tls_key_secret_name: z.string().optional().nullable(),
    tls_ca_cert_secret_name: z.string().optional().nullable(),
    // --- End TLS Fields ---

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
