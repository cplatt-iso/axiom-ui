// src/schemas/dicomWebSourceSchema.ts
import { z } from 'zod';
import { AuthTypeSchema } from '@/schemas';
import json5 from 'json5'; // <-- IMPORT json5 HERE

// REMOVED standard safeJsonParse helper, as we'll parse within superRefine

export const dicomWebSourceFormSchema = z.object({
    name: z.string().min(1, "Source name is required"),
    description: z.string().optional().nullable(),
    base_url: z.string().url("Must be a valid URL (e.g., http://server.com/dicom-web)"),
    qido_prefix: z.string().optional().default("qido-rs"),
    wado_prefix: z.string().optional().default("wado-rs"),
    polling_interval_seconds: z.coerce.number().int().positive("Interval must be a positive number"),
    is_enabled: z.boolean(),
    is_active: z.boolean(),
    auth_type: AuthTypeSchema,
    // Schema accepts string, object, or null
    auth_config: z.union([z.string(), z.object({}).passthrough(), z.null()]).optional(),
    search_filters: z.union([z.string(), z.object({}).passthrough(), z.null()]).optional(),

}).superRefine((data, ctx) => {
    // SuperRefine for cross-field validation (auth_type vs auth_config)
    let parsedAuthConfig: Record<string, any> | null = null;

    // --- USE JSON5 FOR PARSING IN VALIDATION ---
    if (typeof data.auth_config === 'string' && data.auth_config.trim()) {
        try {
            // Use json5.parse here for consistency with onSubmit
            parsedAuthConfig = json5.parse(data.auth_config);
            if (typeof parsedAuthConfig !== 'object' || parsedAuthConfig === null || Array.isArray(parsedAuthConfig)) {
                 parsedAuthConfig = null;
                 throw new Error("Input must be a valid JSON object string.");
            }
        } catch (e: any) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["auth_config"],
                // Make error message slightly more generic
                message: `Invalid JSON/JSON5 format: ${e.message}`
            });
            return;
        }
    } else if (typeof data.auth_config === 'object' && data.auth_config !== null) {
        // If it's already an object, use it directly
        parsedAuthConfig = data.auth_config as Record<string, any>;
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
