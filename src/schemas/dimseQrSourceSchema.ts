// src/schemas/dimseQrSourceSchema.ts
// --- SIMPLIFIED FOR DEBUGGING ---
import { z } from 'zod';

// Keep AE pattern if used below, otherwise remove temporarily too
const AE_TITLE_PATTERN = /^[ A-Za-z0-9._-]{1,16}$/;

export const dimseQrSourceFormSchema = z.object({
    // Keep basic types, remove complex refines/transforms
    name: z.string().min(1, "Source name is required"),
    description: z.string().optional().nullable(),
    remote_ae_title: z.string().min(1, "Remote AE Title required").max(16), // Simplified
    remote_host: z.string().min(1, "Remote host required"),              // Simplified
    remote_port: z.coerce.number().int().min(1).max(65535),             // Simplified
    local_ae_title: z.string().min(1).max(16).default("AXIOM_QR_SCU"),    // Simplified
    polling_interval_seconds: z.coerce.number().int().positive("Interval must be positive"),
    is_enabled: z.boolean(),
    is_active: z.boolean(), // *** THE FIELD WE CARE ABOUT ***
    query_level: z.enum(["STUDY", "SERIES", "PATIENT"]),
    // Temporarily accept ANY string/null/object for filters, bypass transform/refine
    query_filters: z.any().optional().nullable(),
    move_destination_ae_title: z.string().max(16).optional().nullable(), // Simplified
});

// This type is now based on the simplified schema
export type DimseQrSourceFormData = z.infer<typeof dimseQrSourceFormSchema>;
