// src/schemas/crosswalkDataSourceSchema.ts
import { z } from 'zod';
import json5 from 'json5'; // Use json5 for more lenient parsing

// Define allowed DB types consistent with the backend enum
const dbTypeSchema = z.enum(["POSTGRES", "MYSQL", "MSSQL"]); // Add others later if needed

// Base schema for form data structure (connection_details is string here)
export const crosswalkDataSourceFormSchema = z.object({
    name: z.string().min(1, "Name is required").max(100),
    description: z.string().nullable().optional(),
    db_type: dbTypeSchema,
    connection_details: z.string().min(1, "Connection Details JSON is required."), // String input
    target_table: z.string().min(1, "Target Table/View name is required."),
    sync_interval_seconds: z.number().int().min(60, "Sync interval must be at least 60 seconds.").default(3600),
    is_enabled: z.boolean().default(true),
})
.refine(data => { // Custom validation for connection_details JSON content
    try {
        const parsed = json5.parse(data.connection_details); // Use json5
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            return false; // Must be a plain object
        }
        // Check required keys
        const requiredKeys = ['host', 'port', 'user', 'password_secret', 'dbname'];
        return requiredKeys.every(key => key in parsed && parsed[key] !== null && parsed[key] !== '');
    } catch (e) {
        return false; // Invalid JSON5
    }
}, {
    message: "Connection Details must be a valid JSON object containing non-empty 'host', 'port', 'user', 'password_secret', and 'dbname'.",
    path: ["connection_details"], // Associate error with the correct field
})
.transform(data => { // Transform the string to a dictionary AFTER validation
    try {
        // We already validated it's valid JSON object string in the refine step
        const parsedConfig = json5.parse(data.connection_details);
        // Ensure port is number in the final object
        if (typeof parsedConfig.port === 'string') {
           parsedConfig.port = parseInt(parsedConfig.port, 10);
           // Add further check if parseInt results in NaN if needed
        }
        return {
            ...data,
            connection_details: parsedConfig, // Replace string with parsed object
        };
    } catch (e) {
        // Should not happen if refine passed, but handle defensively
        console.error("Error during Zod transform (should not happen):", e);
        // Re-throw or return original data? Re-throwing might be better.
        throw new Error("Failed to process connection details JSON after validation.");
    }
});


// TypeScript type derived from the Zod schema (AFTER transform)
export type CrosswalkDataSourceFormData = z.infer<typeof crosswalkDataSourceFormSchema>;
