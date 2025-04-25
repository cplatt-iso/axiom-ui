// src/schemas/dimseQrSourceSchema.ts
import { z } from 'zod';
// REMOVED: import { AE_TITLE_PATTERN } from '@/utils/validationPatterns'; // Assuming this exists now, or define inline
import json5 from 'json5'; // Use json5 for more lenient parsing

// --- DEFINED REGEX INLINE ---
const AE_TITLE_PATTERN = /^[ A-Za-z0-9._-]{1,16}$/;
// --- END DEFINED REGEX INLINE ---

// Helper function to safely parse JSON strings (allowing comments, trailing commas etc.)
const safeJsonParse = (jsonString: string | null | undefined): Record<string, any> | null => {
    if (!jsonString || !jsonString.trim()) return null;
    try {
        const parsed = json5.parse(jsonString); // Use json5.parse
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            return parsed;
        }
        throw new Error("Input must be a valid JSON object.");
    } catch (e) {
        throw new Error(`Invalid JSON format: ${e instanceof Error ? e.message : String(e)}`);
    }
};

// Define AE Title validation function (using inline pattern)
const validateAeTitle = (v: string | null | undefined): string | null | undefined => {
    if (v === null || v === undefined) return null;
    const v_stripped = v.trim();
    if (!v_stripped) return null; // Allow empty string to be nullable later if needed
    if (!AE_TITLE_PATTERN.test(v_stripped)) {
        throw new Error('AE Title contains invalid characters or is too long (max 16).');
    }
    if (v !== v_stripped) {
        throw new Error('AE Title cannot have leading or trailing whitespace.');
    }
    return v_stripped; // Return stripped valid value
};


export const dimseQrSourceFormSchema = z.object({
    name: z.string().min(1, "Source name is required"),
    description: z.string().optional().nullable(),
    remote_ae_title: z.string()
        .min(1, "Remote AE Title is required")
        .max(16, "AE Title cannot exceed 16 chars")
        .refine(val => AE_TITLE_PATTERN.test(val.trim()) && val.trim() === val, {
            message: "Invalid Remote AE Title format or has leading/trailing spaces",
        }),
    remote_host: z.string().min(1, "Remote host is required")
        .refine(val => !/\s/.test(val), "Remote host cannot contain spaces"),
    remote_port: z.coerce.number().int().positive("Port must be positive").min(1).max(65535, "Port must be between 1-65535"),
    local_ae_title: z.string()
        .min(1, "Local AE Title is required")
        .max(16, "AE Title cannot exceed 16 chars")
        .refine(val => AE_TITLE_PATTERN.test(val.trim()) && val.trim() === val, {
            message: "Invalid Local AE Title format or has leading/trailing spaces",
        }).default("AXIOM_QR_SCU"),
    polling_interval_seconds: z.coerce.number().int().positive("Interval must be positive"),
    is_enabled: z.boolean(),
    query_level: z.enum(["STUDY", "SERIES", "PATIENT"]),
    query_filters: z.string().nullable().optional()
        .transform((val, ctx) => {
            try {
                return safeJsonParse(val);
            } catch (e) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: (e as Error).message });
                return z.NEVER;
            }
        })
        .refine(val => val === null || typeof val === 'object', {
            message: "Query Filters must be a valid JSON object or empty",
        }),
    move_destination_ae_title: z.string().max(16).optional().nullable()
        .refine(val => val === null || val === undefined || (AE_TITLE_PATTERN.test(val.trim()) && val.trim() === val), {
            message: "Invalid Move Destination AE Title format or has leading/trailing spaces",
        }),

});

export type DimseQrSourceFormData = z.infer<typeof dimseQrSourceFormSchema>;

// Removed the helper function call from refine, using inline pattern directly
