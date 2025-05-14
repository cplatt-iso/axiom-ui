// frontend/src/schemas/aiPromptConfigSchema.ts
import { z } from 'zod';

// Helper for DICOM Tag Keyword validation (similar to ruleSchema but perhaps simpler as it's just a keyword)
// For AIPromptConfig, the backend model stores 'dicom_tag_keyword', which should be a keyword.
// The validator in schemas/ai_prompt_config.py (backend) allows GGGG,EEEE but recommends keyword.
// Frontend should probably encourage/enforce keyword for simplicity in this specific config.
const dicomTagKeywordSchema = z.string()
    .min(1, "DICOM Tag Keyword cannot be empty.")
    .regex(/^[a-zA-Z][a-zA-Z0-9]*$/, "Must be a valid DICOM keyword (e.g., PatientName, StudyDescription). Starts with a letter, alphanumeric.")
    .transform(val => val.trim()); // Keep trim, it's harmless. No complex replace needed.
// Schema for Model Parameters (flexible JSON object)
// For the form, we might want to represent this as a string that gets parsed.
// For reading, it's an object.
const modelParametersSchema = z.record(z.any()) // Allows any valid JSON object structure
    .nullable().optional();

// For form input, users will likely type JSON as a string.
export const modelParametersStringSchema = z.string()
    .refine((val) => {
        if (!val.trim()) return true; // Allow empty string for optional
        try {
            JSON.parse(val); // Or use json5 for more forgiving parsing if desired
            return true;
        } catch (e) {
            return false;
        }
    }, { message: "Invalid JSON format for model parameters." })
    .transform((val) => {
        if (!val.trim()) return null; // Convert empty string to null for backend
        try {
            return JSON.parse(val); // Or json5.parse(val)
        } catch (e) {
            // This should ideally not be reached if refine worked, but as a fallback
            return {}; // Or throw error / return null
        }
    })
    .nullable().optional();


// Base schema - common fields for Create and Read
export const AiPromptConfigBaseSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters.").max(255),
    description: z.string().nullable().optional(),
    dicom_tag_keyword: dicomTagKeywordSchema,
    is_enabled: z.boolean(),
    prompt_template: z.string().min(10, "Prompt template is required.").refine(
        (val) => val.includes("{value}"),
        "Prompt template must include the '{value}' placeholder."
    ),
    model_identifier: z.string().min(1, "Model identifier is required.").default("gemini-1.5-flash-001"),
    // For reading data from API:
    model_parameters: modelParametersSchema,
});

// Schema for creating a new AI Prompt Configuration (for form data)
export const AiPromptConfigCreateFormDataSchema = AiPromptConfigBaseSchema.extend({
    // For form, use the string version of model_parameters that will be transformed
    model_parameters: modelParametersStringSchema,
});
export type AiPromptConfigCreateFormData = z.infer<typeof AiPromptConfigCreateFormDataSchema>;

// Schema for the actual payload to send to the backend (after transform)
export const AiPromptConfigCreatePayloadSchema = AiPromptConfigBaseSchema.extend({
    model_parameters: modelParametersSchema, // Expects the object form
});
export type AiPromptConfigCreatePayload = z.infer<typeof AiPromptConfigCreatePayloadSchema>;


// Schema for updating an AI Prompt Configuration (all fields optional for form)
export const AiPromptConfigUpdateFormDataSchema = AiPromptConfigBaseSchema.extend({
    name: AiPromptConfigBaseSchema.shape.name.optional(),
    description: AiPromptConfigBaseSchema.shape.description.optional(),
    is_enabled: AiPromptConfigBaseSchema.shape.is_enabled.optional(), // <<< ENSURE THIS IS OPTIONAL
    dicom_tag_keyword: AiPromptConfigBaseSchema.shape.dicom_tag_keyword.optional(),
    prompt_template: AiPromptConfigBaseSchema.shape.prompt_template.optional(),
    model_identifier: AiPromptConfigBaseSchema.shape.model_identifier.optional(),
    model_parameters: modelParametersStringSchema,
}).refine(obj => Object.values(obj).some(v => v !== undefined && v !== null), {
    message: "At least one field must be provided for update."
});
export type AiPromptConfigUpdateFormData = z.infer<typeof AiPromptConfigUpdateFormDataSchema>;

// Schema for the actual update payload to send to the backend
export const AiPromptConfigUpdatePayloadSchema = AiPromptConfigBaseSchema.extend({
    name: AiPromptConfigBaseSchema.shape.name.optional(),
    description: AiPromptConfigBaseSchema.shape.description.optional(),
    dicom_tag_keyword: AiPromptConfigBaseSchema.shape.dicom_tag_keyword.optional(),
    prompt_template: AiPromptConfigBaseSchema.shape.prompt_template.optional(),
    model_identifier: AiPromptConfigBaseSchema.shape.model_identifier.optional(),
    model_parameters: modelParametersSchema.optional(), // object form, also optional itself
}).refine(obj => Object.values(obj).some(v => v !== undefined), {
    message: "At least one field must be provided for update."
});
export type AiPromptConfigUpdatePayload = z.infer<typeof AiPromptConfigUpdatePayloadSchema>;


// Schema for reading AI Prompt Configuration data from the API
export const AiPromptConfigReadSchema = AiPromptConfigBaseSchema.extend({
    id: z.number().int(),
    model_parameters: modelParametersSchema, // Expects object from backend
    created_at: z.string().datetime(), // Or z.date() if you transform it
    updated_at: z.string().datetime(), // Or z.date()
});
export type AiPromptConfigRead = z.infer<typeof AiPromptConfigReadSchema>;

// Optional: A summary schema for list views if needed
export const AiPromptConfigSummarySchema = z.object({
    id: z.number().int(),
    name: z.string(),
    dicom_tag_keyword: z.string(),
    model_identifier: z.string(),
    is_enabled: z.boolean(),
});
export type AiPromptConfigSummary = z.infer<typeof AiPromptConfigSummarySchema>;