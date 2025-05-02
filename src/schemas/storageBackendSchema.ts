// src/schemas/storageBackendSchema.ts
import { z } from 'zod';
import json5 from 'json5'; // Use json5 for more lenient parsing
// Assuming AllowedBackendType might be defined in your central schemas index
// If not, define the enum/literal array directly here.
// Example: export type AllowedBackendType = "filesystem" | "cstore" | "gcs" | "google_healthcare" | "stow_rs";
// Make sure this import path is correct for your project structure
import { AllowedBackendType } from '@/schemas/index';

// --- Define FULL flattened schemas for each API payload type ---
// These represent the structure the API expects. Each includes the discriminator.

const FilesystemPayloadSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional().nullable(),
    backend_type: z.literal("filesystem"), // Discriminator
    is_enabled: z.boolean(),
    // Filesystem specific
    path: z.string().min(1, "Filesystem config requires a non-empty 'path' string."),
});

// CStore Schema WITHOUT Refinements for the union definition itself
const CStorePayloadSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional().nullable(),
    backend_type: z.literal("cstore"), // Discriminator
    is_enabled: z.boolean(),
    // CStore specific fields
    remote_ae_title: z.string().min(1, "Req: 'remote_ae_title'.").max(16, "AE Title max 16 chars"),
    remote_host: z.string().min(1, "Req: 'remote_host'."),
    remote_port: z.number().int().min(1, "Port > 0").max(65535, "Port <= 65535"),
    local_ae_title: z.string().max(16, "AE Title max 16 chars").optional().nullable(),
    tls_enabled: z.boolean().optional().default(false),
    tls_ca_cert_secret_name: z.string().min(1, "Cannot be empty if provided.").optional().nullable(),
    tls_client_cert_secret_name: z.string().min(1, "Cannot be empty if provided.").optional().nullable(),
    tls_client_key_secret_name: z.string().min(1, "Cannot be empty if provided.").optional().nullable(),
});

const GcsPayloadSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional().nullable(),
    backend_type: z.literal("gcs"), // Discriminator
    is_enabled: z.boolean(),
    // GCS specific
    bucket: z.string().min(1, "GCS config requires 'bucket'."),
    prefix: z.string().optional().nullable(),
});

const GoogleHealthcarePayloadSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional().nullable(),
    backend_type: z.literal("google_healthcare"), // Discriminator
    is_enabled: z.boolean(),
    // Google Healthcare specific
    gcp_project_id: z.string().min(1, "Req: 'gcp_project_id'."),
    gcp_location: z.string().min(1, "Req: 'gcp_location'."),
    gcp_dataset_id: z.string().min(1, "Req: 'gcp_dataset_id'."),
    gcp_dicom_store_id: z.string().min(1, "Req: 'gcp_dicom_store_id'."),
});

const StowRsPayloadSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional().nullable(),
    backend_type: z.literal("stow_rs"), // Discriminator
    is_enabled: z.boolean(),
    // STOW-RS specific
    base_url: z.string().min(1, "Req: 'base_url'.").url("Must be a valid URL."),
});

// --- API Payload Schema (Discriminated Union) ---
// Uses the fully defined schemas directly.
export const storageBackendApiPayloadSchema = z.discriminatedUnion("backend_type", [
    FilesystemPayloadSchema,
    CStorePayloadSchema, // Use the one WITHOUT .refine() here for the union
    GcsPayloadSchema,
    GoogleHealthcarePayloadSchema,
    StowRsPayloadSchema,
]);

// TypeScript type for the flattened API payload
export type StorageBackendApiPayload = z.infer<typeof storageBackendApiPayloadSchema>;


// --- FORM Schema ---
// Defines the structure for react-hook-form, using 'config_string' for the JSON textarea.

// Schemas for validating the *content* of the config_string JSON based on type.
// These CAN have refinements as they are used inside superRefine.
const filesystemConfigContentSchema = FilesystemPayloadSchema.omit({ backend_type: true, name: true, description: true, is_enabled: true });

// Define the CStore CONTENT schema WITH refinements
const cstoreConfigContentSchema = z.object({
    remote_ae_title: z.string().min(1, "Req: 'remote_ae_title'.").max(16),
    remote_host: z.string().min(1, "Req: 'remote_host'."),
    remote_port: z.number().int().min(1).max(65535),
    local_ae_title: z.string().max(16).optional().nullable(),
    tls_enabled: z.boolean().optional().default(false),
    tls_ca_cert_secret_name: z.string().min(1, "Cannot be empty.").optional().nullable(),
    tls_client_cert_secret_name: z.string().min(1, "Cannot be empty.").optional().nullable(),
    tls_client_key_secret_name: z.string().min(1, "Cannot be empty.").optional().nullable(),
}).refine(data => !(data.tls_enabled && (!data.tls_ca_cert_secret_name || data.tls_ca_cert_secret_name.trim() === '')), {
    message: "`tls_ca_cert_secret_name` is required when TLS is enabled.", path: ["tls_ca_cert_secret_name"],
}).refine(data => (!!data.tls_client_cert_secret_name) === (!!data.tls_client_key_secret_name), {
    message: "Provide both client cert/key secret names for mTLS, or neither.", path: ["tls_client_cert_secret_name"],
});

const gcsConfigContentSchema = GcsPayloadSchema.omit({ backend_type: true, name: true, description: true, is_enabled: true });
const googleHealthcareConfigContentSchema = GoogleHealthcarePayloadSchema.omit({ backend_type: true, name: true, description: true, is_enabled: true });
const stowRsConfigContentSchema = StowRsPayloadSchema.omit({ backend_type: true, name: true, description: true, is_enabled: true });


// The Zod schema for the form itself
export const storageBackendFormSchema = z.object({
    name: z.string().min(1), description: z.string().optional().nullable(),
    backend_type: z.enum([ "filesystem", "cstore", "gcs", "google_healthcare", "stow_rs" ]),
    is_enabled: z.boolean(), config_string: z.string()
}).superRefine((data, ctx) => {
    let parsedConfig: Record<string, any> = {};
    try {
        // --- INLINE the parsing logic ---
        const jsonString = data.config_string;
        if (jsonString === null || jsonString === undefined || jsonString.trim() === '') {
            parsedConfig = {}; // Treat empty as empty object
        } else {
            const parsed = json5.parse(jsonString);
            if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                parsedConfig = parsed;
            } else {
                throw new Error("Input must resolve to a valid JSON object.");
            }
        }
        // --- END INLINE PARSING ---
    } catch (e) {
        // Add parsing error to the config_string field's issues
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["config_string"],
            message: `Invalid JSON object format: ${e instanceof Error ? e.message : String(e)}`, // Ensure message is included
        });
        return z.NEVER; // Stop validation if JSON itself is invalid
    }

    // --- Validation logic using content schemas remains the same ---
    let validationResult: z.SafeParseReturnType<any, any>;
    if (data.backend_type === "filesystem") {
        validationResult = filesystemConfigContentSchema.safeParse(parsedConfig);
    } else if (data.backend_type === "cstore") {
        validationResult = cstoreConfigContentSchema.safeParse(parsedConfig);
    } else if (data.backend_type === "gcs") {
        validationResult = gcsConfigContentSchema.safeParse(parsedConfig);
    } else if (data.backend_type === "google_healthcare") {
        validationResult = googleHealthcareConfigContentSchema.safeParse(parsedConfig);
    } else if (data.backend_type === "stow_rs") {
        validationResult = stowRsConfigContentSchema.safeParse(parsedConfig);
    } else { return; } // Should not happen

    // Add issues if content validation fails
    if (!validationResult.success) {
        validationResult.error.issues.forEach(issue => {
            const fieldPath = issue.path.join('.');
            const newMessage = `JSON content error for field '${fieldPath}': ${issue.message}`;
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: newMessage, path: ["config_string"] });
        });
    }
});
// TypeScript type inferred from the Zod FORM schema
export type StorageBackendFormData = z.infer<typeof storageBackendFormSchema>;
