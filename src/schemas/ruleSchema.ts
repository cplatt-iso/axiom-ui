// src/schemas/ruleSchema.ts
import { z } from 'zod';
import json5 from 'json5'; // Use json5 for lenient parsing

// --- Enums (Mirroring Backend) ---
export const MatchOperationSchema = z.enum([
    "eq", "ne", "gt", "lt", "ge", "le", "contains",
    "startswith", "endswith", "exists", "not_exists",
    "regex", "in", "not_in", "ip_eq", "ip_startswith", "ip_in_subnet"
]);
export type MatchOperation = z.infer<typeof MatchOperationSchema>;

export const ModifyActionSchema = z.enum([ // <-- Add CROSSWALK here
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

// --- Individual Criterion/Modification Schemas for the Form ---

// Base required for discriminated union
const tagModificationBaseSchema = z.object({
    action: ModifyActionSchema,
});

// Specific Modification Schemas (define fields relevant to the form input)
export const TagSetModificationSchema = tagModificationBaseSchema.extend({
    action: z.literal(ModifyActionSchema.enum.set),
    tag: z.string().min(1, "Target Tag is required."),
    value: z.any().refine(val => val !== undefined && val !== null && val !== '', { message: "Value is required for 'set'." }), // Allow any type for input, specific coercion maybe later
    vr: z.string().length(2, "VR must be 2 letters.").regex(/^[A-Z]{2}$/, "VR must be 2 uppercase letters.").nullable().optional(),
});

export const TagDeleteModificationSchema = tagModificationBaseSchema.extend({
    action: z.literal(ModifyActionSchema.enum.delete),
    tag: z.string().min(1, "Target Tag is required."),
});

export const TagPrependModificationSchema = tagModificationBaseSchema.extend({
    action: z.literal(ModifyActionSchema.enum.prepend),
    tag: z.string().min(1, "Target Tag is required."),
    value: z.string().min(1, "Value to prepend is required."),
});

export const TagSuffixModificationSchema = tagModificationBaseSchema.extend({
    action: z.literal(ModifyActionSchema.enum.suffix),
    tag: z.string().min(1, "Target Tag is required."),
    value: z.string().min(1, "Value to suffix is required."),
});

export const TagRegexReplaceModificationSchema = tagModificationBaseSchema.extend({
    action: z.literal(ModifyActionSchema.enum.regex_replace),
    tag: z.string().min(1, "Target Tag is required."),
    pattern: z.string().min(1, "Regex pattern is required."),
    replacement: z.string().refine(val => val !== null && val !== undefined, { message: "Replacement string is required (can be empty string)." }), // Allow empty string
});

export const TagCopyModificationSchema = tagModificationBaseSchema.extend({
    action: z.literal(ModifyActionSchema.enum.copy),
    source_tag: z.string().min(1, "Source Tag is required."),
    destination_tag: z.string().min(1, "Destination Tag is required."),
    destination_vr: z.string().length(2, "VR must be 2 letters.").regex(/^[A-Z]{2}$/, "VR must be 2 uppercase letters.").nullable().optional(),
});

export const TagMoveModificationSchema = tagModificationBaseSchema.extend({
    action: z.literal(ModifyActionSchema.enum.move),
    source_tag: z.string().min(1, "Source Tag is required."),
    destination_tag: z.string().min(1, "Destination Tag is required."),
    destination_vr: z.string().length(2, "VR must be 2 letters.").regex(/^[A-Z]{2}$/, "VR must be 2 uppercase letters.").nullable().optional(),
});

export const TagCrosswalkModificationSchema = tagModificationBaseSchema.extend({
    action: z.literal(ModifyActionSchema.enum.crosswalk),
    crosswalk_map_id: z.number({ required_error: "Crosswalk Map ID is required.", invalid_type_error: "Crosswalk Map ID must be a number."}).int().positive("Crosswalk Map ID must be a positive number."),
});

// --- Union of all possible modification structures ---
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


// --- Match Criteria Schemas (remain the same for now) ---
export const matchCriterionSchema = z.object({
    // Using refine for tag as it might need more complex logic than regex alone if keywords allowed
    tag: z.string().min(1, "Tag is required."),
        // .refine(tag => /* Add tag format/keyword validation logic here if needed */, "Invalid DICOM Tag format or keyword"),
    op: MatchOperationSchema,
    value: z.any().optional(), // Allow any type, refine based on op
}).refine(data => {
    // Use the imported helper for value requirement check
    const isValueNeeded = !['exists', 'not_exists'].includes(data.op);
    return isValueNeeded ? (data.value !== undefined && data.value !== null && data.value !== '') : true;
}, {
    message: "Value is required for this operator.",
    path: ["value"], // Assign error to the value field
    // Only run this refinement if the operator requires a value
    // This logic might need adjustment depending on how RHF handles initial undefined values
    // It might be better to handle this conditional validation in the component or main form schema
}).refine(data => {
    // Use the imported helper for list check
    const needsList = ['in', 'not_in'].includes(data.op);
    if (!needsList) return true;
    if (typeof data.value !== 'string') return false; // Input should be string
    // Basic check: Allow comma-separated, non-empty values
    return data.value.split(',').every(s => s.trim().length > 0);
}, {
    message: "Value must be a comma-separated list for 'in'/'not_in' operators.",
    path: ["value"],
});
export type MatchCriterionFormData = z.infer<typeof matchCriterionSchema>;


export const associationMatchCriterionSchema = z.object({
    parameter: associationParameterSchema,
    op: MatchOperationSchema, // Use the same enum for now
    value: z.any().refine(val => val !== undefined && val !== null && val !== '', { message: "Value is required for association criteria." }), // Required
}).refine(data => {
    // Use the imported helper for list check
    const needsList = ['in', 'not_in'].includes(data.op);
    if (!needsList) return true;
    if (typeof data.value !== 'string') return false; // Input should be string
    return data.value.split(',').every(s => s.trim().length > 0);
}, {
    message: "Value must be a comma-separated list for 'in'/'not_in' operators.",
    path: ["value"],
});
// Add refine for IP operators if needed
export type AssociationMatchCriterionFormData = z.infer<typeof associationMatchCriterionSchema>;


// --- Rule Form Schema ---
export const RuleFormDataSchema = z.object({
    name: z.string().min(1, "Rule name is required.").max(100),
    description: z.string().nullable().optional(),
    priority: z.number().int().default(0),
    is_active: z.boolean().default(true),
    match_criteria: z.array(matchCriterionSchema).min(1, "At least one match criterion is required."), // Require at least one criterion
    association_criteria: z.array(associationMatchCriterionSchema).nullable().optional(),
    tag_modifications: z.array(TagModificationFormDataSchema).default([]), // Use the union schema
    applicable_sources: z.array(z.string()).nullable().optional(),
    destination_ids: z.array(z.number().int().positive()).min(1, "At least one destination is required."), // Require at least one destination
});

// Final TypeScript type for the form data
export type RuleFormData = z.infer<typeof RuleFormDataSchema>;
