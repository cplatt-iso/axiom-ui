// src/schemas/googleHealthcareSourceSchema.ts
import { z } from 'zod';
import json5 from 'json5'; // Keep for parsing query_filters string input

// Base schema for form data
export const googleHealthcareSourceFormSchema = z.object({
    name: z.string().min(1, "Source name is required"),
    description: z.string().optional().nullable(),
    gcp_project_id: z.string().min(1, "GCP Project ID is required."),
    gcp_location: z.string().min(1, "GCP Location is required."),
    gcp_dataset_id: z.string().min(1, "Healthcare Dataset ID is required."),
    gcp_dicom_store_id: z.string().min(1, "DICOM Store ID is required."),
    polling_interval_seconds: z.coerce.number().int().positive("Interval must be positive"),
    query_filters: z.string().optional().nullable(), // String input from textarea
    is_enabled: z.boolean(),
    is_active: z.boolean(),
}).superRefine((data, ctx) => {
    // Refine query_filters to ensure it's valid JSON object if not empty/null
    if (data.query_filters && data.query_filters.trim()) {
        try {
            const parsed = json5.parse(data.query_filters);
            if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
                 throw new Error("Query filters must be a valid JSON object.");
            }
        } catch (e) {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["query_filters"],
                message: `Invalid JSON object format: ${e instanceof Error ? e.message : String(e)}`,
            });
        }
    }

    // Validate is_active only makes sense if is_enabled
    if (data.is_active && !data.is_enabled) {
         ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["is_active"],
            message: "Cannot be active if not enabled.",
        });
    }
});

// Type derived from the schema
export type GoogleHealthcareSourceFormData = z.infer<typeof googleHealthcareSourceFormSchema>;
