// src/schemas/ruleSchema.ts
import { z } from 'zod';
// No need for json5 here unless you're parsing JSON strings from user input directly,
// which doesn't seem to be the case for ai_standardization_tags.

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

// --- Helper for DICOM Tag Validation (Keyword or GGGG,EEEE) ---
const dicomTagStringSchema = z.string()
    .min(1, "Tag cannot be empty.")
    .refine(tag => {
        const upperTag = tag.trim().toUpperCase();
        // Check for GGGG,EEEE format (allowing optional spaces around comma)
        if (/^([0-9A-F]{4})\s*,\s*([0-9A-F]{4})$/.test(upperTag)) {
            return true;
        }
        // Check for DICOM Keyword format (alphanumeric, starting with a letter)
        // Pydicom keywords are typically CamelCase, but allow more general alphanumeric
        // for flexibility, as backend validator is the ultimate source of truth.
        if (/^[A-Z][A-Z0-9]*$/.test(upperTag)) { // More restrictive: starts with letter, then alphanumeric
            // A simpler /^[A-Z0-9]+$/ might also work if backend is forgiving.
            // We won't validate against a full DICOM dictionary here, too complex for frontend.
            return true;
        }
        return false;
    }, {
        message: "Tag must be a valid DICOM keyword (e.g., PatientName) or in GGGG,EEEE format (e.g., 0010,0020)."
    })
    .transform(tag => { // Normalize to uppercase and consistent GGGG,EEEE format
        const upperTag = tag.trim().toUpperCase();
        const geMatch = upperTag.match(/^([0-9A-F]{4})\s*,\s*([0-9A-F]{4})$/);
        if (geMatch) {
            return `${geMatch[1]},${geMatch[2]}`; // Normalize GGGG,EEEE
        }
        return upperTag; // Return keyword as is (uppercase)
    });

// --- Individual Criterion/Modification Schemas for the Form ---

const tagModificationBaseSchema = z.object({
    action: ModifyActionSchema,
});

export const TagSetModificationSchema = tagModificationBaseSchema.extend({
    action: z.literal(ModifyActionSchema.enum.set),
    tag: dicomTagStringSchema, // Use the new helper
    value: z.any().refine(val => val !== undefined && val !== null && val !== '', { message: "Value is required for 'set'." }),
    vr: z.string().length(2, "VR must be 2 letters.").regex(/^[A-Z]{2}$/, "VR must be 2 uppercase letters.").nullable().optional(),
});

export const TagDeleteModificationSchema = tagModificationBaseSchema.extend({
    action: z.literal(ModifyActionSchema.enum.delete),
    tag: dicomTagStringSchema, // Use the new helper
});

export const TagPrependModificationSchema = tagModificationBaseSchema.extend({
    action: z.literal(ModifyActionSchema.enum.prepend),
    tag: dicomTagStringSchema, // Use the new helper
    value: z.string().min(1, "Value to prepend is required."),
});

export const TagSuffixModificationSchema = tagModificationBaseSchema.extend({
    action: z.literal(ModifyActionSchema.enum.suffix),
    tag: dicomTagStringSchema, // Use the new helper
    value: z.string().min(1, "Value to suffix is required."),
});

export const TagRegexReplaceModificationSchema = tagModificationBaseSchema.extend({
    action: z.literal(ModifyActionSchema.enum.regex_replace),
    tag: dicomTagStringSchema, // Use the new helper
    pattern: z.string().min(1, "Regex pattern is required."),
    replacement: z.string().refine(val => val !== null && val !== undefined, { message: "Replacement string is required (can be empty string)." }),
});

export const TagCopyModificationSchema = tagModificationBaseSchema.extend({
    action: z.literal(ModifyActionSchema.enum.copy),
    source_tag: dicomTagStringSchema, // Use the new helper
    destination_tag: dicomTagStringSchema, // Use the new helper
    destination_vr: z.string().length(2, "VR must be 2 letters.").regex(/^[A-Z]{2}$/, "VR must be 2 uppercase letters.").nullable().optional(),
});

export const TagMoveModificationSchema = tagModificationBaseSchema.extend({
    action: z.literal(ModifyActionSchema.enum.move),
    source_tag: dicomTagStringSchema, // Use the new helper
    destination_tag: dicomTagStringSchema, // Use the new helper
    destination_vr: z.string().length(2, "VR must be 2 letters.").regex(/^[A-Z]{2}$/, "VR must be 2 uppercase letters.").nullable().optional(),
});

export const TagCrosswalkModificationSchema = tagModificationBaseSchema.extend({
    action: z.literal(ModifyActionSchema.enum.crosswalk),
    crosswalk_map_id: z.number({ required_error: "Crosswalk Map ID is required.", invalid_type_error: "Crosswalk Map ID must be a number."}).int().positive("Crosswalk Map ID must be a positive number."),
});

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

export const matchCriterionSchema = z.object({
    tag: dicomTagStringSchema, // Use the new helper
    op: MatchOperationSchema,
    value: z.any().optional(), 
}).refine(data => {
    const isValueNeeded = !['exists', 'not_exists'].includes(data.op);
    return isValueNeeded ? (data.value !== undefined && data.value !== null && data.value !== '') : true;
}, {
    message: "Value is required for this operator.",
    path: ["value"], 
}).refine(data => {
    const needsList = ['in', 'not_in'].includes(data.op);
    if (!needsList) return true;
    if (typeof data.value !== 'string') return false; 
    return data.value.split(',').every(s => s.trim().length > 0);
}, {
    message: "Value must be a comma-separated list for 'in'/'not_in' operators.",
    path: ["value"],
});
export type MatchCriterionFormData = z.infer<typeof matchCriterionSchema>;

export const associationMatchCriterionSchema = z.object({
    parameter: associationParameterSchema,
    op: MatchOperationSchema, 
    value: z.any().refine(val => val !== undefined && val !== null && val !== '', { message: "Value is required for association criteria." }),
}).refine(data => {
    const needsList = ['in', 'not_in'].includes(data.op);
    if (!needsList) return true;
    if (typeof data.value !== 'string') return false; 
    return data.value.split(',').every(s => s.trim().length > 0);
}, {
    message: "Value must be a comma-separated list for 'in'/'not_in' operators.",
    path: ["value"],
});
export type AssociationMatchCriterionFormData = z.infer<typeof associationMatchCriterionSchema>;


// --- Rule Form Schema ---
export const RuleFormDataSchema = z.object({
    name: z.string().min(1, "Rule name is required.").max(100),
    description: z.string().nullable().optional(),
    priority: z.number().int().default(0),
    is_active: z.boolean().default(true),
    match_criteria: z.array(matchCriterionSchema).min(1, "At least one match criterion is required."),
    association_criteria: z.array(associationMatchCriterionSchema).nullable().optional(),
    tag_modifications: z.array(TagModificationFormDataSchema).default([]), 
    
    // --- ADDED: AI Standardization Tags ---
    ai_standardization_tags: z.array(dicomTagStringSchema) // Use the helper for each item
        .nullable()
        .optional()
        .transform(tags => { // Ensure uniqueness
            if (!tags) return tags; // Keep null or undefined as is
            const uniqueTags = [...new Set(tags)];
            // Optionally, log if duplicates were removed, though Zod transforms are silent
            // if (uniqueTags.length !== tags.length) {
            //     console.warn("Duplicate tags removed from ai_standardization_tags");
            // }
            return uniqueTags;
        }),
    // --- END ADDED ---

    applicable_sources: z.array(z.string().min(1, "Source cannot be empty")) // Ensure non-empty strings in array
        .nullable()
        .optional()
        .transform(sources => { // Ensure uniqueness for sources too
            if (!sources) return sources;
            return [...new Set(sources.map(s => s.trim()).filter(s => s.length > 0))];
        }),
    destination_ids: z.array(z.number().int().positive()).min(1, "At least one destination is required."),
    schedule_id: z.number().int().positive().nullish(),
});

// Final TypeScript type for the form data
export type RuleFormData = z.infer<typeof RuleFormDataSchema>;
