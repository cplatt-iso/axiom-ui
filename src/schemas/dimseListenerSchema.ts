// src/schemas/dimseListenerSchema.ts
import { z } from 'zod';
// REMOVED: import { AE_TITLE_PATTERN } from '@/utils/validationPatterns'; // Import shared pattern if created

// --- DEFINED REGEX INLINE ---
const AE_TITLE_PATTERN = /^[ A-Za-z0-9._-]{1,16}$/;
// --- END DEFINED REGEX INLINE ---

export const dimseListenerFormSchema = z.object({
    name: z.string().min(1, "Listener name is required"),
    description: z.string().optional().nullable(),
    ae_title: z.string()
        .min(1, "AE Title is required")
        .max(16, "AE Title cannot exceed 16 characters")
        .regex(AE_TITLE_PATTERN, "Invalid AE Title format (A-Z, a-z, 0-9, ., _, - allowed, no leading/trailing spaces)")
        .refine(s => s.trim() === s, "AE Title cannot have leading/trailing spaces"),
    port: z.coerce.number().int().positive().min(1).max(65535, "Port must be between 1 and 65535"),
    is_enabled: z.boolean(),
    // Allow null or a string that fits the pattern
    instance_id: z.string()
        .regex(/^[a-zA-Z0-9_.-]+$/, 'Instance ID can only contain letters, numbers, underscores, periods, and hyphens.')
        .max(255, "Instance ID too long")
        .optional()
        .nullable()
        .refine(val => val === null || (typeof val === 'string' && val.trim() === val), {
            message: "Instance ID cannot have leading/trailing spaces",
        }),
});

export type DimseListenerFormData = z.infer<typeof dimseListenerFormSchema>;
