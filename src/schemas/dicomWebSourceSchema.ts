// src/schemas/dicomWebSourceSchema.ts
import { z } from 'zod';
import json5 from 'json5'; // <-- IMPORT json5 HERE

// REMOVED standard safeJsonParse helper, as we'll parse within superRefine
export const AuthTypeSchema = z.enum(["none", "basic", "bearer", "apikey"]);
export type AuthType = z.infer<typeof AuthTypeSchema>;

// --- Config Schemas (from old schemas.ts) ---
export const DicomWebSourceConfigReadSchema = z.object({
    id: z.number(),
    name: z.string(),
    source_name: z.string(), // This was in the original schemas.ts, seems important
    description: z.string().nullable().optional(), // Corrected from .optional().nullable() for consistency
    base_url: z.string().url(),
    qido_prefix: z.string(),
    wado_prefix: z.string(),
    polling_interval_seconds: z.number().int().positive(),
    is_enabled: z.boolean(),
    is_active: z.boolean().default(false),
    auth_type: AuthTypeSchema, // Use the defined AuthTypeSchema
    auth_config: z.record(z.any()).nullable().optional(), // Corrected from .optional().nullable()
    search_filters: z.record(z.any()).nullable().optional(),
    last_processed_timestamp: z.string().datetime().nullable().optional(),
    last_successful_run: z.string().datetime().nullable().optional(),
    last_error_run: z.string().datetime().nullable().optional(),
    last_error_message: z.string().nullable().optional(),
    found_instance_count: z.number().int().nonnegative().default(0),
    queued_instance_count: z.number().int().nonnegative().default(0),
    processed_instance_count: z.number().int().nonnegative().default(0),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
});
export type DicomWebSourceConfigRead = z.infer<typeof DicomWebSourceConfigReadSchema>;

export const DicomWebSourceConfigCreatePayloadSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional().nullable(),
    base_url: z.string().url(),
    qido_prefix: z.string().optional().default("qido-rs"),
    wado_prefix: z.string().optional().default("wado-rs"),
    polling_interval_seconds: z.number().int().positive().optional().default(300),
    is_enabled: z.boolean().optional().default(true),
    auth_type: AuthTypeSchema.optional().default("none"),
    auth_config: z.record(z.any()).optional().nullable(),
    search_filters: z.record(z.any()).optional().nullable(),
});
export type DicomWebSourceConfigCreatePayload = z.infer<typeof DicomWebSourceConfigCreatePayloadSchema>;

// Making sure update payload allows optional fields correctly
export const DicomWebSourceConfigUpdatePayloadSchema = DicomWebSourceConfigCreatePayloadSchema.partial().refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided for update."
);
export type DicomWebSourceConfigUpdatePayload = z.infer<typeof DicomWebSourceConfigUpdatePayloadSchema>;


// --- Status Schemas (from old schemas.ts) ---
export const DicomWebSourceStatusSchema = z.object({
    id: z.number(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    source_name: z.string(),
    is_enabled: z.boolean(),
    last_processed_timestamp: z.string().datetime().optional().nullable(),
    last_successful_run: z.string().datetime().optional().nullable(),
    last_error_run: z.string().datetime().optional().nullable(),
    last_error_message: z.string().optional().nullable(),
    found_instance_count: z.number().int().default(0),
    queued_instance_count: z.number().int().default(0),
    processed_instance_count: z.number().int().default(0),
});
export type DicomWebSourceStatus = z.infer<typeof DicomWebSourceStatusSchema>;

export const DicomWebPollersStatusResponseSchema = z.object({
    pollers: z.array(DicomWebSourceStatusSchema).default([]),
});
export type DicomWebPollersStatusResponse = z.infer<typeof DicomWebPollersStatusResponseSchema>;

export const dicomWebSourceFormSchema = z.object({
    name: z.string().min(1, "Source name is required"),
    description: z.string().optional().nullable(),
    base_url: z.string().url("Must be a valid URL (e.g., http://server.com/dicom-web)"),
    qido_prefix: z.string().min(1,"qido-rs"),
    wado_prefix: z.string().min(1,"wado-rs"),
    polling_interval_seconds: z.coerce.number().int().positive("Interval must be a positive number"),
    is_enabled: z.boolean(),
    is_active: z.boolean(),
    auth_type: AuthTypeSchema,
    // Schema accepts string, object, or null
    auth_config: z.union([z.string(), z.object({}).passthrough(), z.null()]).optional(),
    search_filters: z.union([z.string(), z.object({}).passthrough(), z.null()]).optional(),

}).superRefine((data, ctx) => {
    // SuperRefine for cross-field validation (auth_type vs auth_config)
    let parsedAuthConfig: Record<string, unknown> | null = null;

    // --- USE JSON5 FOR PARSING IN VALIDATION ---
    if (typeof data.auth_config === 'string' && data.auth_config.trim()) {
        try {
            // Use json5.parse here for consistency with onSubmit
            parsedAuthConfig = json5.parse(data.auth_config);
            if (typeof parsedAuthConfig !== 'object' || parsedAuthConfig === null || Array.isArray(parsedAuthConfig)) {
                 parsedAuthConfig = null;
                 throw new Error("Input must be a valid JSON object string.");
            }
        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : 'Invalid JSON format';
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["auth_config"],
                // Make error message slightly more generic
                message: `Invalid JSON/JSON5 format: ${errorMessage}`
            });
            return;
        }
    } else if (typeof data.auth_config === 'object' && data.auth_config !== null) {
        // If it's already an object, use it directly
        parsedAuthConfig = data.auth_config as Record<string, unknown>;
    }
    // --- END JSON5 USAGE ---

    // Auth type specific checks remain the same, using 'parsedAuthConfig'
    if (data.auth_type === 'basic') {
        if (!parsedAuthConfig || !parsedAuthConfig.username || !parsedAuthConfig.password) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["auth_config"], message: "For Basic auth, JSON must contain 'username' and 'password'" });
        }
    } else if (data.auth_type === 'bearer') {
        // ... (bearer check)
        if (!parsedAuthConfig || !parsedAuthConfig.token) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["auth_config"], message: "For Bearer auth, JSON must contain 'token'" });
        }
    } else if (data.auth_type === 'apikey') {
        // ... (apikey check)
         if (!parsedAuthConfig || !parsedAuthConfig.header_name || !parsedAuthConfig.key) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["auth_config"], message: "For API Key auth, JSON must contain 'header_name' and 'key'" });
        }
    } else if (data.auth_type === 'none') {
        // ... (none check)
        if (parsedAuthConfig && Object.keys(parsedAuthConfig).length > 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["auth_config"], message: "Auth Config must be empty or null when Auth Type is None" });
        }
    }
});

export type DicomWebSourceFormData = z.infer<typeof dicomWebSourceFormSchema>;
