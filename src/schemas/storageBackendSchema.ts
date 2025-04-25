// src/schemas/storageBackendSchema.ts
import { z } from 'zod';
import json5 from 'json5'; // Use json5 for more lenient parsing
import { AllowedBackendType } from '@/schemas'; // Import shared Literal type

// Helper function to safely parse JSON strings (allowing comments, trailing commas etc.)
const safeJsonParse = (jsonString: string | null | undefined): Record<string, any> | null => {
    // Allow empty string input for the config textarea, treat as empty object {}
    if (jsonString === null || jsonString === undefined || jsonString.trim() === '') {
        return {}; // Return empty object for empty/null string
    }
    try {
        const parsed = json5.parse(jsonString); // Use json5.parse
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            return parsed; // Return the parsed object
        }
        // If parsing resulted in something other than an object (e.g., number, string, array)
        throw new Error("Input must resolve to a valid JSON object.");
    } catch (e) {
        // Catch parsing errors or the error thrown above
        throw new Error(`Invalid JSON object format: ${e instanceof Error ? e.message : String(e)}`);
    }
};

// Define the Zod schema for the form data
export const storageBackendFormSchema = z.object({
    name: z.string().min(1, "Backend name is required"),
    description: z.string().optional().nullable(),
    // Ensure backend_type uses the imported Literal type for validation
    backend_type: z.enum([
        "filesystem",
        "cstore",
        "gcs",
        "google_healthcare",
        "stow_rs"
    ]), // Use z.enum with values from AllowedBackendType
    // Use transform to parse the JSON string input from the textarea
    config: z.string() // Expect a string from the textarea initially
        .transform((val, ctx) => {
            try {
                return safeJsonParse(val); // Attempt parsing
            } catch (e) {
                // If parsing fails, add an issue to the context
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: (e as Error).message, // Use the error message from safeJsonParse
                });
                // Zod requires returning z.NEVER on transform failure
                return z.NEVER;
            }
        })
        // Add refine after transform to ensure the *result* is an object (or null, adjusted safeJsonParse)
        .refine(val => typeof val === 'object' && val !== null, {
             message: "Config must be a valid JSON object.",
         }),
    is_enabled: z.boolean(),

}).superRefine((data, ctx) => {
    // Cross-field validation: Check config keys based on backend_type
    // This runs *after* the initial field validations and transforms
    const config = data.config; // config is now Record<string, any> | null
    const b_type = data.backend_type;

    if (config === null || typeof config !== 'object') {
        // This case should theoretically be caught by the refine on config,
        // but include a check just in case.
        // Don't add another issue if refine already failed.
         if (!ctx.common.issues.some(iss => iss.path.includes('config'))) {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["config"],
                message: "Config is invalid or missing.",
            });
         }
        return; // Stop validation if config isn't usable
    }


    if (b_type === "filesystem") {
        if (typeof config.path !== 'string' || !config.path.trim()) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["config"], message: "Filesystem config requires a non-empty 'path' string." });
        }
    } else if (b_type === "cstore") {
        if (typeof config.ae_title !== 'string' || !config.ae_title.trim()) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["config"], message: "CStore config requires a non-empty 'ae_title' string." });
        }
        if (typeof config.host !== 'string' || !config.host.trim()) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["config"], message: "CStore config requires a non-empty 'host' string." });
        }
        if (typeof config.port !== 'number' || !Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["config"], message: "CStore config requires a valid 'port' number (1-65535)." });
        }
    } else if (b_type === "gcs") {
         if (typeof config.bucket_name !== 'string' || !config.bucket_name.trim()) {
             ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["config"], message: "GCS config requires a non-empty 'bucket_name' string." });
         }
    } else if (b_type === "google_healthcare") {
         if (typeof config.project_id !== 'string' || !config.project_id.trim()) { ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["config"], message: "Google Healthcare config requires 'project_id'." }); }
         if (typeof config.location !== 'string' || !config.location.trim()) { ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["config"], message: "Google Healthcare config requires 'location'." }); }
         if (typeof config.dataset_id !== 'string' || !config.dataset_id.trim()) { ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["config"], message: "Google Healthcare config requires 'dataset_id'." }); }
         if (typeof config.dicom_store_id !== 'string' || !config.dicom_store_id.trim()) { ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["config"], message: "Google Healthcare config requires 'dicom_store_id'." }); }
    } else if (b_type === "stow_rs") {
         const hasStowUrl = typeof config.stow_url === 'string' && config.stow_url.trim();
         const hasBaseUrl = typeof config.base_url === 'string' && config.base_url.trim();
         if (!hasStowUrl && !hasBaseUrl) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["config"], message: "STOW-RS config requires either 'stow_url' or 'base_url'." });
         }
         // Optional: Add validation for auth_type/auth_config consistency if needed
         // const auth_type = config.auth_type;
         // const auth_config = config.auth_config;
         // if (auth_type === 'basic' && (!auth_config || !auth_config.username || !auth_config.password)) { ... }
    }
});

// Define the TypeScript type inferred from the Zod schema
export type StorageBackendFormData = z.infer<typeof storageBackendFormSchema>;
