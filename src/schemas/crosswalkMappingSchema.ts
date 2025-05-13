// src/schemas/crosswalkMappingSchema.ts
import { z } from 'zod';
import json5 from 'json5';
import { dbTypeSchema } from './crosswalkDataSourceSchema';

// --- Helper Schemas (already good) ---
const mappingItemSchema = z.object({
    column_name: z.string().min(1, "Column Name cannot be empty."),
    dicom_tag: z.string().min(1, "DICOM Tag cannot be empty.")
});
export type MappingItem = z.infer<typeof mappingItemSchema>; // Export if needed elsewhere

const replacementMappingItemSchema = z.object({
    source_column: z.string().min(1, "Source Column cannot be empty."),
    dicom_tag: z.string().min(1, "DICOM Tag cannot be empty."),
    dicom_vr: z.string().length(2).regex(/^[A-Z]{2}$/, "VR must be 2 uppercase letters.").optional().nullable(),
});
export type ReplacementMappingItem = z.infer<typeof replacementMappingItemSchema>; // Export if needed

const CrosswalkDataSourceInfoForMapSchema = z.object({
    id: z.number().int(),
    name: z.string(),
    db_type: dbTypeSchema, // Use the imported DbType enum schema
});
export type CrosswalkDataSourceInfoForMap = z.infer<typeof CrosswalkDataSourceInfoForMapSchema>;

// --- Schemas for Data Sent TO and Received FROM the API ---

// Base for Payloads (JSON fields are arrays/objects here)
const crosswalkMapPayloadBaseSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().nullable().optional(),
    data_source_id: z.number().int().positive(),
    is_enabled: z.boolean().default(true),
    match_columns: z.array(mappingItemSchema).min(1),
    cache_key_columns: z.array(z.string().min(1)).min(1),
    replacement_mapping: z.array(replacementMappingItemSchema).min(1),
    cache_ttl_seconds: z.number().int().min(0).nullable().optional(),
    on_cache_miss: z.enum(["fail", "query_db", "log_only"]).default("fail"),
});

// Schema for creating (payload for API)
export const CrosswalkMapCreatePayloadSchema = crosswalkMapPayloadBaseSchema;
export type CrosswalkMapCreatePayload = z.infer<typeof CrosswalkMapCreatePayloadSchema>;

// Schema for updating (payload for API, all fields optional)
export const CrosswalkMapUpdatePayloadSchema = crosswalkMapPayloadBaseSchema.partial().refine(
    (data) => Object.keys(data).length > 0,
    { message: "At least one field must be provided for update." }
);
export type CrosswalkMapUpdatePayload = z.infer<typeof CrosswalkMapUpdatePayloadSchema>;

// Schema for reading data from API
export const CrosswalkMapReadSchema = crosswalkMapPayloadBaseSchema.extend({
    id: z.number().int(),
    data_source: CrosswalkDataSourceInfoForMapSchema, // Uses the corrected schema
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
});
export type CrosswalkMapRead = z.infer<typeof CrosswalkMapReadSchema>;


// --- Main Form Schema (as you had it, but for form data state) ---
// This schema takes JSON strings and transforms them into objects/arrays.
// The output of this transform should match the CreatePayload/UpdatePayload structure.
export const crosswalkMapFormSchema = z.object({
    name: z.string().min(1, "Name is required").max(100),
    description: z.string().nullable().optional(),
    data_source_id: z.number({ required_error: "Data Source is required."}).int().positive("Data Source must be selected."),
    is_enabled: z.boolean().default(true),
    match_columns: z.string().min(1, "Match Columns JSON is required."),       // String for form
    cache_key_columns: z.string().min(1, "Cache Key Columns JSON is required."), // String for form
    replacement_mapping: z.string().min(1, "Replacement Mapping JSON is required."), // String for form
    cache_ttl_seconds: z.number().int().min(0, "Cache TTL cannot be negative.").nullable().optional(),
    on_cache_miss: z.enum(["fail", "query_db", "log_only"]).default("fail"),
})
.refine(data => {
    try {
        const parsed = json5.parse(data.match_columns);
        return Array.isArray(parsed) && parsed.length > 0 && parsed.every(item => mappingItemSchema.safeParse(item).success);
    } catch (e) { return false; }
}, {
    message: "Match Columns must be a valid JSON array of objects, each with non-empty 'column_name' and 'dicom_tag'.",
    path: ["match_columns"],
})
.refine(data => {
    try {
        const parsed = json5.parse(data.cache_key_columns);
        return Array.isArray(parsed) && parsed.length > 0 && parsed.every(item => typeof item === 'string' && item.length > 0);
    } catch (e) { return false; }
}, {
    message: "Cache Key Columns must be a valid JSON array of non-empty strings.",
    path: ["cache_key_columns"],
})
.refine(data => {
    try {
        const parsed = json5.parse(data.replacement_mapping);
        return Array.isArray(parsed) && parsed.length > 0 && parsed.every(item => replacementMappingItemSchema.safeParse(item).success);
    } catch (e) { return false; }
}, {
    message: "Replacement Mapping must be a valid JSON array of objects, each with non-empty 'source_column', 'dicom_tag', and optional 'dicom_vr'.",
    path: ["replacement_mapping"],
})
.transform(data => { // This transform now makes the output suitable for API payloads
    return {
        name: data.name,
        description: data.description,
        data_source_id: data.data_source_id,
        is_enabled: data.is_enabled,
        match_columns: json5.parse(data.match_columns), // Object/Array form
        cache_key_columns: json5.parse(data.cache_key_columns), // Object/Array form
        replacement_mapping: json5.parse(data.replacement_mapping), // Object/Array form
        cache_ttl_seconds: data.cache_ttl_seconds,
        on_cache_miss: data.on_cache_miss,
    };
});

export type CrosswalkMapFormData = z.infer<typeof crosswalkMapFormSchema>;
// If you need a type for the raw form data (with JSON strings) before transform:
export type CrosswalkMapRawFormData = z.input<typeof crosswalkMapFormSchema>;