// src/schemas/dicomWebSourceSchema.ts
import { z } from 'zod';
import { AuthTypeSchema } from '@/schemas'; // Import shared AuthType from main schema file

// Helper function to safely parse JSON strings
const safeJsonParse = (jsonString: string | null | undefined): Record<string, any> | null => {
    if (!jsonString || !jsonString.trim()) return null;
    try {
        const parsed = JSON.parse(jsonString);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            return parsed;
        }
        throw new Error("Input must be a valid JSON object.");
    } catch (e) {
        throw new Error("Invalid JSON format.");
    }
};

export const dicomWebSourceFormSchema = z.object({
    name: z.string().min(1, "Source name is required"),
    description: z.string().optional().nullable(),
    base_url: z.string().url("Must be a valid URL (e.g., http://server.com/dicom-web)"),
    qido_prefix: z.string().optional().default("qido-rs"),
    wado_prefix: z.string().optional().default("wado-rs"),
    polling_interval_seconds: z.coerce.number().int().positive("Interval must be a positive number"),
    is_enabled: z.boolean(),
    auth_type: AuthTypeSchema,
    // Validate auth_config based on auth_type. Allow null or valid JSON string.
    auth_config: z.string().nullable().optional().refine((val) => {
        if (val === null || val === undefined || val.trim() === '') {
            return true; // Allow null or empty string (will be treated as null later)
        }
        try {
            const parsed = JSON.parse(val);
            return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed);
        } catch (e) {
            return false; // Invalid JSON
        }
    }, { message: "Auth Config must be a valid JSON object string or empty" }),
    // Validate search_filters. Allow null or valid JSON string.
    search_filters: z.string().nullable().optional().refine((val) => {
        if (val === null || val === undefined || val.trim() === '') {
            return true; // Allow null or empty string (will be treated as null later)
        }
        try {
            const parsed = JSON.parse(val);
            return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed);
        } catch (e) {
            return false; // Invalid JSON
        }
    }, { message: "Search Filters must be a valid JSON object string or empty" }),

}).superRefine((data, ctx) => {
    // SuperRefine for cross-field validation (auth_type vs auth_config)
    let parsedAuthConfig: Record<string, any> | null = null;
    if (data.auth_config) {
        try {
            parsedAuthConfig = safeJsonParse(data.auth_config);
        } catch (e: any) {
            // Error already added by individual field refine, but double-check
             if (!ctx.common.issues.some(iss => iss.path.includes('auth_config'))) {
                 ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["auth_config"], message: e.message || "Invalid JSON format" });
             }
             // Prevent further checks if parsing failed
             return;
        }
    }

    if (data.auth_type === 'basic') {
        if (!parsedAuthConfig || !parsedAuthConfig.username || !parsedAuthConfig.password) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["auth_config"], message: "For Basic auth, JSON must contain 'username' and 'password'" });
        }
    } else if (data.auth_type === 'bearer') {
        if (!parsedAuthConfig || !parsedAuthConfig.token) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["auth_config"], message: "For Bearer auth, JSON must contain 'token'" });
        }
    } else if (data.auth_type === 'apikey') {
        if (!parsedAuthConfig || !parsedAuthConfig.header_name || !parsedAuthConfig.key) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["auth_config"], message: "For API Key auth, JSON must contain 'header_name' and 'key'" });
        }
    } else if (data.auth_type === 'none') {
        if (parsedAuthConfig && Object.keys(parsedAuthConfig).length > 0) {
             // Allow explicitly empty object '{}' maybe? For now, require null/empty string.
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["auth_config"], message: "Auth Config must be empty or null when Auth Type is None" });
        }
    }
});

export type DicomWebSourceFormData = z.infer<typeof dicomWebSourceFormSchema>;
