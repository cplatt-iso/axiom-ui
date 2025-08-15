// src/schemas/crosswalkDataSourceSchema.ts
import { z } from 'zod';
import json5 from 'json5'; // Use json5 for more lenient parsing

export const CrosswalkSyncStatusEnumSchema = z.enum([
    "IDLE",       // Replace these with actual values from your backend enum
    "PENDING",
    "RUNNING",
    "SUCCESS",
    "FAILED",
    "UNKNOWN"     // Ensure these match your app.db.models.crosswalk.CrosswalkSyncStatus
]);
export type CrosswalkSyncStatus = z.infer<typeof CrosswalkSyncStatusEnumSchema>;

// Define allowed DB types consistent with the backend enum
export const dbTypeSchema = z.enum(["POSTGRES", "MYSQL", "MSSQL"]); // Add others later if needed
export type DbType = z.infer<typeof dbTypeSchema>; // Export the type

// Schema for the connection_details object (as it is stored/transmitted)
const connectionDetailsObjectSchema = z.object({
    host: z.string(),
    port: z.number().int(),
    user: z.string(),
    password_secret: z.string(), // This would be the secret ID/name
    dbname: z.string(),
    // Add any other fields your backend expects for connection_details
    // e.g., sslmode, options, etc.
}).passthrough(); // Use passthrough if backend might have other optional fields not strictly defined here

// --- Schema for Data Sent TO and Received FROM the API ---

// Base for Create/Update payloads (connection_details is an object here)
const crosswalkDataSourcePayloadBaseSchema = z.object({
    name: z.string().min(1, "Name is required").max(100),
    description: z.string().nullable().optional(),
    db_type: dbTypeSchema,
    connection_details: connectionDetailsObjectSchema, // Object form
    target_table: z.string().min(1, "Target Table/View name is required."),
    sync_interval_seconds: z.number().int().min(60).default(3600),
    is_enabled: z.boolean().default(true),
});

// Schema for creating (payload sent to API)
export const CrosswalkDataSourceCreatePayloadSchema = crosswalkDataSourcePayloadBaseSchema;
export type CrosswalkDataSourceCreatePayload = z.infer<typeof CrosswalkDataSourceCreatePayloadSchema>;

// Schema for updating (payload sent to API, all fields optional)
export const CrosswalkDataSourceUpdatePayloadSchema = crosswalkDataSourcePayloadBaseSchema.partial().refine(
    (data) => Object.keys(data).length > 0, // Ensure at least one field is being updated
    { message: "At least one field must be provided for update." }
);
export type CrosswalkDataSourceUpdatePayload = z.infer<typeof CrosswalkDataSourceUpdatePayloadSchema>;

// Schema for reading data from API
export const CrosswalkDataSourceReadSchema = crosswalkDataSourcePayloadBaseSchema.extend({
    id: z.number().int(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    last_sync_status: CrosswalkSyncStatusEnumSchema.nullable().optional(), // USE THE ENUM HERE
    last_sync_time: z.string().datetime().nullable().optional(),
    last_sync_error: z.string().nullable().optional(),
    sync_task_id: z.string().nullable().optional(), // This was in your frontend schema
    last_sync_row_count: z.number().int().nullable().optional(), // Add this from backend read schema
});
export type CrosswalkDataSourceRead = z.infer<typeof CrosswalkDataSourceReadSchema>;


// --- Schema for Form Data (as you had it, but using the object schema for connection_details in transform) ---
export const crosswalkDataSourceFormSchema = z.object({
    name: z.string().min(1, "Name is required").max(100),
    description: z.string().nullable().optional(),
    db_type: dbTypeSchema,
    connection_details: z.string().min(1, "Connection Details JSON is required."), // String input for form
    target_table: z.string().min(1, "Target Table/View name is required."),
    sync_interval_seconds: z.number().int().min(60, "Sync interval must be at least 60 seconds.").default(3600),
    is_enabled: z.boolean().default(true),
})
.refine(data => {
    try {
        const parsed = json5.parse(data.connection_details);
        // Validate against the object schema
        return connectionDetailsObjectSchema.safeParse(parsed).success;
    } catch {
        return false;
    }
}, {
    message: "Connection Details must be a valid JSON object with required fields (host, port, user, password_secret, dbname).",
    path: ["connection_details"],
})
.transform(data => {
    // Transform the string to a dictionary AFTER validation for the form's internal state if needed,
    // or this transform might be more suited for preparing the payload for submission.
    // For React Hook Form, you often want the form to manage its native types (string for textarea).
    // The payload for the API will use the object version.
    // This transform prepares data that matches CrosswalkDataSourceCreatePayload or UpdatePayload
    const parsedConfig = json5.parse(data.connection_details);
    return {
        name: data.name,
        description: data.description,
        db_type: data.db_type,
        connection_details: parsedConfig, // Use parsed object
        target_table: data.target_table,
        sync_interval_seconds: data.sync_interval_seconds,
        is_enabled: data.is_enabled,
    };
});

// TypeScript type derived from the Zod schema (AFTER transform, this now aligns with payload)
export type CrosswalkDataSourceFormData = z.infer<typeof crosswalkDataSourceFormSchema>;
// If you need a separate type for the raw form data before transform:
export type CrosswalkDataSourceRawFormData = z.input<typeof crosswalkDataSourceFormSchema>;