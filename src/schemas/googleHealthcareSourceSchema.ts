// frontend/src/schemas/googleHealthcareSourceSchema.ts
import { z } from 'zod';
import json5 from 'json5'; // For parsing query_filters if entered as string in form

// --- Base Schema (mirrors backend GoogleHealthcareSourceBase) ---
// Defines the core structure and types expected by the API (Create/Update/Read inherit from this)
// For API schemas, polling_interval_seconds should be a number (with a backend default)
export const GoogleHealthcareSourceBaseSchema = z.object({
    name: z.string().min(1, "Name is required.").max(255),
    description: z.string().max(512).nullable().optional(),
    gcp_project_id: z.string().min(1, "GCP Project ID is required."),
    gcp_location: z.string().min(1, "GCP Location is required."),
    gcp_dataset_id: z.string().min(1, "GCP Dataset ID is required."),
    gcp_dicom_store_id: z.string().min(1, "GCP DICOM Store ID is required."),
    polling_interval_seconds: z.number().int().positive("Polling interval must be a positive integer.").default(300),
    query_filters: z.record(z.any()).nullable().optional(), // API expects object | null
    is_enabled: z.boolean().default(true),
    is_active: z.boolean().default(true),
});

// --- Create Schema (for API POST payload) ---
// All fields from BaseSchema are expected, with their defaults applying if not sent.
export const GoogleHealthcareSourceCreateSchema = GoogleHealthcareSourceBaseSchema.extend({});
export type GoogleHealthcareSourceCreate = z.infer<typeof GoogleHealthcareSourceCreateSchema>;

// --- Update Schema (for API PUT payload) ---
// All fields are optional.
export const GoogleHealthcareSourceUpdateSchema = GoogleHealthcareSourceBaseSchema.partial()
.refine(
    (data) => Object.keys(data).length > 0, // Ensure at least one field for update
    "At least one field must be provided for update."
)
.refine(data => { // Frontend check for is_active/is_enabled if both provided in update
    // This refine checks if the update *itself* creates an invalid state
    if (data.is_active === true && data.is_enabled === false) {
        return false;
    }
    // Note: Backend CRUD handles validation against existing DB state if only one is provided
    return true;
}, {
    message: "Source cannot be active if it is not enabled. Please enable the source or deactivate it.",
    path: ['is_active'], // Or a more general path
});
export type GoogleHealthcareSourceUpdate = z.infer<typeof GoogleHealthcareSourceUpdateSchema>;


// --- Read Schema (for API GET response) ---
// This represents the data as it comes from the backend after creation/update
export const GoogleHealthcareSourceReadSchema = GoogleHealthcareSourceBaseSchema.extend({
    id: z.number().int(),
    created_at: z.string().datetime().optional(), // Assuming backend includes timestamps
    updated_at: z.string().datetime().optional(),
});
export type GoogleHealthcareSourceRead = z.infer<typeof GoogleHealthcareSourceReadSchema>;


// --- Form Data Schema (for react-hook-form validation) ---
// This schema defines the shape *after* validation/coercion/defaults,
// matching the type passed to onSubmit.
// polling_interval_seconds is optional here because the form field might be empty,
// and we handle defaulting in useForm's defaultValues and onSubmit.
export const GoogleHealthcareSourceFormDataSchema = z.object({
    name: z.string().min(1, "Name is required.").max(255),
    description: z.string()
        .max(512, "Description cannot exceed 512 characters.")
        .nullable()
        .optional()
        .transform(val => (val === "" ? null : val)), // Treat empty string as null
    gcp_project_id: z.string().min(1, "GCP Project ID is required."),
    gcp_location: z.string().min(1, "GCP Location is required."),
    gcp_dataset_id: z.string().min(1, "GCP Dataset ID is required."),
    gcp_dicom_store_id: z.string().min(1, "GCP DICOM Store ID is required."),
    
    // polling_interval_seconds is optional in the form data.
    // Defaulting to 300 will be handled by useForm's defaultValues and in onSubmit for API.
    polling_interval_seconds: z.coerce.number({ invalid_type_error: "Polling interval must be a number." })
          .int("Polling interval must be an integer.")
          .positive("Polling interval must be a positive integer.")
          .optional(), // Made optional for form state; default handled in form/onSubmit

    query_filters: z.string()
        .refine((val) => {
            if (val === null || val === undefined || !val.trim()) return true; // Allow empty or null
            try { json5.parse(val); return true; } catch { return false; }
        }, { message: "Query Filters must be a valid JSON(5) object string or empty." })
        .nullable()
        .optional()
        .transform(val => (val === "" ? null : val)), // Treat empty string as null
    is_enabled: z.boolean().default(true),
    is_active: z.boolean().default(true),
}).refine(data => {
    // This refine applies to the validated form data.
    if (data.is_active && !data.is_enabled) {
        return false;
    }
    return true;
}, {
    message: "Source cannot be active if it is not enabled. Please enable the source or deactivate the poller.",
    path: ['is_active'], // Or use a general error message
});

// Type definition inferred from the FormDataSchema
export type GoogleHealthcareSourceFormData = z.infer<typeof GoogleHealthcareSourceFormDataSchema>;