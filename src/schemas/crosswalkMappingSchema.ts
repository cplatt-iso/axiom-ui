// src/schemas/crosswalkMappingSchema.ts
import { z } from 'zod';
import json5 from 'json5';

// --- Helper Schemas ---

// Schema for individual items in match_columns and replacement_mapping
const mappingItemSchema = z.object({
    column_name: z.string().min(1, "Column Name cannot be empty."), // Source DB column
    dicom_tag: z.string().min(1, "DICOM Tag cannot be empty.") // Target/Source DICOM tag
    // Add regex validation for dicom_tag if needed
});

const replacementMappingItemSchema = z.object({
    source_column: z.string().min(1, "Source Column cannot be empty."),
    dicom_tag: z.string().min(1, "DICOM Tag cannot be empty."),
    dicom_vr: z.string().length(2).regex(/^[A-Z]{2}$/, "VR must be 2 uppercase letters.").optional().nullable(), // Optional VR
});


// --- Main Form Schema ---

export const crosswalkMapFormSchema = z.object({
    name: z.string().min(1, "Name is required").max(100),
    description: z.string().nullable().optional(),
    data_source_id: z.number({ required_error: "Data Source is required."}).int().positive("Data Source must be selected."),
    is_enabled: z.boolean().default(true),
    // --- JSON fields as strings for Textarea input ---
    match_columns: z.string().min(1, "Match Columns JSON is required."),
    cache_key_columns: z.string().min(1, "Cache Key Columns JSON is required."),
    replacement_mapping: z.string().min(1, "Replacement Mapping JSON is required."),
    // --- End JSON strings ---
    cache_ttl_seconds: z.number().int().min(0, "Cache TTL cannot be negative.").nullable().optional(), // Allow 0? Or min 1?
    on_cache_miss: z.enum(["fail", "query_db", "log_only"]).default("fail"),
})
.refine(data => { // Validate match_columns JSON structure
    try {
        const parsed = json5.parse(data.match_columns);
        return Array.isArray(parsed) && parsed.length > 0 && parsed.every(item => mappingItemSchema.safeParse(item).success);
    } catch (e) { return false; }
}, {
    message: "Match Columns must be a valid JSON array of objects, each with non-empty 'column_name' and 'dicom_tag' strings.",
    path: ["match_columns"],
})
.refine(data => { // Validate cache_key_columns JSON structure
    try {
        const parsed = json5.parse(data.cache_key_columns);
        return Array.isArray(parsed) && parsed.length > 0 && parsed.every(item => typeof item === 'string' && item.length > 0);
    } catch (e) { return false; }
}, {
    message: "Cache Key Columns must be a valid JSON array of non-empty strings.",
    path: ["cache_key_columns"],
})
.refine(data => { // Validate replacement_mapping JSON structure
    try {
        const parsed = json5.parse(data.replacement_mapping);
        return Array.isArray(parsed) && parsed.length > 0 && parsed.every(item => replacementMappingItemSchema.safeParse(item).success);
    } catch (e) { return false; }
}, {
    message: "Replacement Mapping must be a valid JSON array of objects, each with non-empty 'source_column', 'dicom_tag', and optional valid 'dicom_vr'.",
    path: ["replacement_mapping"],
})
.transform(data => { // Transform valid JSON strings to objects/arrays for API payload
    try {
        return {
            ...data,
            // Use json5.parse which is more lenient (e.g., trailing commas)
            match_columns: json5.parse(data.match_columns),
            cache_key_columns: json5.parse(data.cache_key_columns),
            replacement_mapping: json5.parse(data.replacement_mapping),
        };
    } catch (e) {
        // This path shouldn't be reached if refine passes, but handle defensively
        console.error("Error during Zod transform for Crosswalk Map (should not happen):", e);
        throw new Error("Failed to process JSON fields after validation.");
    }
});

// TypeScript type derived from the Zod schema (AFTER transform)
export type CrosswalkMapFormData = z.infer<typeof crosswalkMapFormSchema>;
