// src/schemas/ruleSchema.ts
import { z } from 'zod';
import { StorageBackendConfigSummarySchema } from './storageBackendSchema'; // Assuming summary schema is defined here

// --- Enums (Mirroring Backend) ---
export const MatchOperationSchema = z.enum([
    "eq", "ne", "gt", "lt", "ge", "le", "contains",
    "startswith", "endswith", "exists", "not_exists",
    "regex", "in", "not_in", "ip_eq", "ip_startswith", "ip_in_subnet"
]);
export type MatchOperation = z.infer<typeof MatchOperationSchema>;

export const ModifyActionSchema = z.enum([
    "set", 
    "delete", 
    "prepend", 
    "suffix", 
    "regex_replace", 
    "copy", 
    "move", 
    "crosswalk",
]);
export type ModifyAction = z.infer<typeof ModifyActionSchema>;

export const associationParameterSchema = z.enum([
    'SOURCE_IP', 'CALLING_AE_TITLE', 'CALLED_AE_TITLE'
]);
export type AssociationParameter = z.infer<typeof associationParameterSchema>;

// --- ADDED: Schedule Summary Schema ---
export const ScheduleSummarySchema = z.object({
    id: z.number().int().positive(),
    name: z.string(),
    is_enabled: z.boolean(),
});
export type ScheduleSummary = z.infer<typeof ScheduleSummarySchema>;
// --- END ADDED ---

// --- Helper for DICOM Tag Validation (Keyword or GGGG,EEEE) ---
// Accepts Keyword or GGGG,EEEE, normalizes GGGG,EEEE, returns uppercase.
export const dicomTagStringSchema = z.string()
    .min(1, "Tag cannot be empty.")
    .refine(tag => {
        const upperTag = tag.trim().toUpperCase();
        if (/^([0-9A-F]{4})\s*,\s*([0-9A-F]{4})$/.test(upperTag)) {
            return true;
        }
        if (/^[A-Z][A-Z0-9]*$/.test(upperTag)) {
            return true;
        }
        return false;
    }, {
        message: "Tag must be a valid DICOM keyword (e.g., PatientName) or in GGGG,EEEE format (e.g., 0010,0020)."
    })
    .transform(tag => { 
        const upperTag = tag.trim().toUpperCase();
        const geMatch = upperTag.match(/^([0-9A-F]{4})\s*,\s*([0-9A-F]{4})$/);
        if (geMatch) {
            return `${geMatch[1]},${geMatch[2]}`; // Normalize GGGG,EEEE
        }
        return upperTag; // Return keyword as is (uppercase)
    });

// --- Individual Criterion/Modification Schemas for the Form ---

// Base for tag modifications, just holds the action discriminator
const tagModificationBaseSchema = z.object({
    action: ModifyActionSchema,
});

// Specific schemas for each modification action type
export const TagSetModificationSchema = tagModificationBaseSchema.extend({
    action: z.literal(ModifyActionSchema.enum.set),
    tag: dicomTagStringSchema,
    value: z.any().refine(val => val !== undefined && val !== null && val !== '', { message: "Value is required for 'set'." }),
    vr: z.string().length(2, "VR must be 2 letters.").regex(/^[A-Z]{2}$/, "VR must be 2 uppercase letters.").nullable().optional(),
});

export const TagDeleteModificationSchema = tagModificationBaseSchema.extend({
    action: z.literal(ModifyActionSchema.enum.delete),
    tag: dicomTagStringSchema,
});

export const TagPrependModificationSchema = tagModificationBaseSchema.extend({
    action: z.literal(ModifyActionSchema.enum.prepend),
    tag: dicomTagStringSchema,
    value: z.string().min(1, "Value to prepend is required."),
});

export const TagSuffixModificationSchema = tagModificationBaseSchema.extend({
    action: z.literal(ModifyActionSchema.enum.suffix),
    tag: dicomTagStringSchema,
    value: z.string().min(1, "Value to suffix is required."),
});

export const TagRegexReplaceModificationSchema = tagModificationBaseSchema.extend({
    action: z.literal(ModifyActionSchema.enum.regex_replace),
    tag: dicomTagStringSchema,
    pattern: z.string().min(1, "Regex pattern is required."),
    replacement: z.string().refine(val => val !== null && val !== undefined, { message: "Replacement string is required (can be empty string)." }),
});

export const TagCopyModificationSchema = tagModificationBaseSchema.extend({
    action: z.literal(ModifyActionSchema.enum.copy),
    source_tag: dicomTagStringSchema,
    destination_tag: dicomTagStringSchema,
    destination_vr: z.string().length(2, "VR must be 2 letters.").regex(/^[A-Z]{2}$/, "VR must be 2 uppercase letters.").nullable().optional(),
});

export const TagMoveModificationSchema = tagModificationBaseSchema.extend({
    action: z.literal(ModifyActionSchema.enum.move),
    source_tag: dicomTagStringSchema,
    destination_tag: dicomTagStringSchema,
    destination_vr: z.string().length(2, "VR must be 2 letters.").regex(/^[A-Z]{2}$/, "VR must be 2 uppercase letters.").nullable().optional(),
});

export const TagCrosswalkModificationSchema = tagModificationBaseSchema.extend({
    action: z.literal(ModifyActionSchema.enum.crosswalk),
    // Must be provided eventually, but allow 0 as the initial "not selected" state from createDefaultModification
    crosswalk_map_id: z.number({ required_error: "Crosswalk Map ID is required.", invalid_type_error: "Crosswalk Map ID must be a number."})
                     .int()
                     .refine(id => id > 0, "Crosswalk Map ID must be selected and positive."),
});

// Discriminated union for handling tag modifications in the form/payloads
export const TagModificationFormDataSchema = z.discriminatedUnion("action", [
    TagSetModificationSchema,
    TagDeleteModificationSchema,
    TagPrependModificationSchema,
    TagSuffixModificationSchema,
    TagRegexReplaceModificationSchema,
    TagCopyModificationSchema,
    TagMoveModificationSchema,
    TagCrosswalkModificationSchema,
]);
export type TagModificationFormData = z.infer<typeof TagModificationFormDataSchema>;

// Schema for a single match criterion (e.g., PatientName eq 'Doe')
export const matchCriterionSchema = z.object({
    tag: dicomTagStringSchema, // Tag to match
    op: MatchOperationSchema, // Comparison operator
    value: z.any().optional(), // Value to compare against
}).refine(data => { // Value is required for most operators
    const isValueNeeded = !['exists', 'not_exists'].includes(data.op);
    return isValueNeeded ? (data.value !== undefined && data.value !== null && data.value !== '') : true;
}, {
    message: "Value is required for this operator.",
    path: ["value"], 
}).refine(data => { // Value should look like a list for 'in'/'not_in'
    const needsList = ['in', 'not_in'].includes(data.op);
    if (!needsList) return true;
    if (typeof data.value !== 'string') return false; 
    // Basic check: non-empty string. Backend does actual split/parse.
    return data.value.trim().length > 0;
}, {
    message: "Value must be a comma-separated list for 'in'/'not_in' operators.",
    path: ["value"],
});
export type MatchCriterionFormData = z.infer<typeof matchCriterionSchema>;

// Schema for a single association criterion (e.g., CallingAETitle eq 'PACS')
export const associationMatchCriterionSchema = z.object({
    parameter: associationParameterSchema, // Parameter like CALLING_AE_TITLE
    op: MatchOperationSchema, // Comparison operator
    value: z.any().refine(val => val !== undefined && val !== null && val !== '', { message: "Value is required for association criteria." }), // Value to compare
}).refine(data => { // Value should look like a list for 'in'/'not_in'
    const needsList = ['in', 'not_in'].includes(data.op);
    if (!needsList) return true;
    if (typeof data.value !== 'string') return false;
    return data.value.trim().length > 0;
}, {
    message: "Value must be a comma-separated list for 'in'/'not_in' operators.",
    path: ["value"],
});
export type AssociationMatchCriterionFormData = z.infer<typeof associationMatchCriterionSchema>;


// --- Base Schema for Rule Fields Managed by the Form ---
// This represents the data structure directly corresponding to user inputs
// It does NOT include ruleset_id, as that's not edited on the form.
export const RuleFormFieldsSchema = z.object({
    name: z.string().min(1, "Rule name is required.").max(100),
    description: z.string().nullable().optional(),
    priority: z.number().int().default(100), // Changed default to 100 as seen in modal state
    is_active: z.boolean().default(true),
    match_criteria: z.array(matchCriterionSchema)
                     .min(1, "At least one match criterion is required."),
    association_criteria: z.array(associationMatchCriterionSchema)
                           .nullable()
                           .optional(), // Allow null or empty array
    tag_modifications: z.array(TagModificationFormDataSchema)
                        .default([]), // Allow empty array
    ai_standardization_tags: z.array(dicomTagStringSchema)
                              .nullable()
                              .optional() // Allow null or empty array
                              .transform(tags => tags ? [...new Set(tags)] : tags), // Ensure uniqueness
    applicable_sources: z.array(z.string().min(1, "Source cannot be empty"))
                           .nullable()
                           .optional() // Allow null or empty array
                           .transform(sources => sources ? [...new Set(sources.map(s => s.trim()).filter(s => s.length > 0))] : sources), // Ensure uniqueness/non-empty
    destination_ids: z.array(z.number().int().positive("Destination ID must be a positive number."))
                      .min(1, "At least one destination is required."),
    schedule_id: z.number().int().positive("Schedule ID must be a positive number.").nullish(), // Allow null or undefined
});
// Use this as the type for the form's data state if needed
export const RuleFormDataSchema = RuleFormFieldsSchema; // Alias for clarity if used for form state
export type RuleFormData = z.infer<typeof RuleFormDataSchema>;


// --- Schema for CREATING a Rule (Payload for API) ---
// Extends the form fields and adds the required ruleset_id
export const RuleCreateSchema = RuleFormFieldsSchema.extend({
    ruleset_id: z.number().int().positive("Ruleset ID is required."),
});
export type RuleCreate = z.infer<typeof RuleCreateSchema>; // Use this type for create payload


// --- Schema for UPDATING a Rule (Payload for API) ---
// Makes form fields optional, does NOT include ruleset_id
export const RuleUpdateSchema = RuleFormFieldsSchema.partial().refine(
    (data) => Object.keys(data).length > 0, // Ensure at least one field is being updated
    "At least one field must be provided for rule update."
);
export type RuleUpdate = z.infer<typeof RuleUpdateSchema>; // Use this type for update payload


// --- Schema for READING Rule data from the API ---
// This often includes read-only fields like id, timestamps, and resolved relationships
export const RuleSchema = z.object({
    id: z.number().int(),
    ruleset_id: z.number().int(),
    name: z.string(),
    description: z.string().nullable().optional(),
    is_active: z.boolean(),
    priority: z.number().int(),
    // Match criteria and modifications might be structured slightly differently by backend sometimes
    // Using z.any() for flexibility, but could be refined if backend structure is stable/known
    match_criteria: z.record(z.any()),
    tag_modifications: z.array(z.record(z.any())), // Ideally, use TagModificationFormDataSchema if backend matches
    association_criteria: z.array(z.record(z.any())).nullable().optional(),
    applicable_sources: z.array(z.string()).nullable().optional(),
    ai_standardization_tags: z.array(z.string()).nullable().optional(), // Assuming backend returns simple strings
    destinations: z.array(StorageBackendConfigSummarySchema), // Use summary schema for destinations
    schedule_id: z.number().int().positive().nullish(), // Include schedule_id if returned by backend
    schedule: ScheduleSummarySchema.nullish(), // MODIFIED: Added schedule object
    created_at: z.string().datetime(),
    updated_at: z.string().datetime().optional().nullable(),
});
export type Rule = z.infer<typeof RuleSchema>;


// --- Schema for READING Ruleset data from the API ---
// Includes an array of Rule objects
export const RulesetSchema = z.object({
    id: z.number().int(),
    name: z.string(),
    description: z.string().optional().nullable(),
    is_active: z.boolean(),
    priority: z.number().int(),
    execution_mode: z.enum(["FIRST_MATCH", "ALL_MATCHES"]),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime().optional().nullable(),
    rules: z.array(RuleSchema), // Array of full Rule objects read from API
});
export type Ruleset = z.infer<typeof RulesetSchema>;

// --- Schemas for CREATING/UPDATING Rulesets ---
// Based on Ruleset read schema, but without rules array, id, timestamps etc.
export const RulesetFormDataSchema = z.object({
    name: z.string().min(1, "Ruleset name is required").max(100),
    description: z.string().optional().nullable(),
    is_active: z.boolean().default(true),
    priority: z.number().int().default(0), // Default priority
    execution_mode: z.enum(["FIRST_MATCH", "ALL_MATCHES"]).default("FIRST_MATCH"),
});
export type RulesetFormData = z.infer<typeof RulesetFormDataSchema>;

export const RulesetCreateSchema = RulesetFormDataSchema; // Create payload matches form data
export type RulesetCreate = z.infer<typeof RulesetCreateSchema>;

export const RulesetUpdateSchema = RulesetFormDataSchema.partial().refine(
    obj => Object.values(obj).some(v => v !== undefined), // Ensure at least one field
    { message: "At least one field must be provided for ruleset update." }
);

export type TagModificationUnion =
  | z.infer<typeof TagSetModificationSchema>
  | z.infer<typeof TagDeleteModificationSchema>
  | z.infer<typeof TagPrependModificationSchema>
  | z.infer<typeof TagSuffixModificationSchema>
  | z.infer<typeof TagRegexReplaceModificationSchema>
  | z.infer<typeof TagCopyModificationSchema>
  | z.infer<typeof TagMoveModificationSchema>
  | z.infer<typeof TagCrosswalkModificationSchema>;

export type RulesetUpdate = z.infer<typeof RulesetUpdateSchema>;