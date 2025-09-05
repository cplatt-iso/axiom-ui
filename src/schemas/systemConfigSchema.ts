// src/schemas/systemConfigSchema.ts
import { z } from 'zod';

export const SystemConfigReadSchema = z.object({
    key: z.string(),
    category: z.string(),
    value: z.any(),
    type: z.enum(['boolean', 'integer', 'string']),
    description: z.string(),
    default: z.any(),
    min_value: z.number().optional(),
    max_value: z.number().optional(),
    is_modified: z.boolean(),
});

export type SystemConfigRead = z.infer<typeof SystemConfigReadSchema>;

export const SystemConfigUpdatePayloadSchema = z.object({
    value: z.any(),
});

export type SystemConfigUpdatePayload = z.infer<typeof SystemConfigUpdatePayloadSchema>;

export const SystemConfigBulkUpdatePayloadSchema = z.object({
    settings: z.record(z.string(), z.any()),
    ignore_errors: z.boolean().optional().default(false),
});

export type SystemConfigBulkUpdatePayload = z.infer<typeof SystemConfigBulkUpdatePayloadSchema>;

export const SystemConfigReloadResponseSchema = z.object({
    status: z.string(),
    message: z.string(),
});

export type SystemConfigReloadResponse = z.infer<typeof SystemConfigReloadResponseSchema>;
