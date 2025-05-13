// frontend/src/schemas/apiKeySchema.ts
import { z } from 'zod';

export const ApiKeySchema = z.object({
    id: z.number(),
    name: z.string(),
    prefix: z.string(),
    is_active: z.boolean(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    last_used_at: z.string().datetime().optional().nullable(),
    user_id: z.number(),
});
export type ApiKey = z.infer<typeof ApiKeySchema>;

export const ApiKeyCreateSchema = z.object({
    name: z.string().min(1, "API Key name is required"),
    expires_in_days: z.number().int().positive().optional().nullable(), // Or however you handle expiration
});
export type ApiKeyCreate = z.infer<typeof ApiKeyCreateSchema>;
// Note: The backend ApiKeyCreate schema is just:
// class ApiKeyCreate(BaseModel):
//    name: str
//    expires_delta_days: Optional[int] = None
// So, the above ApiKeyCreateSchema matches.

export const ApiKeyCreateResponseSchema = ApiKeySchema.extend({
    full_key: z.string(),
});
export type ApiKeyCreateResponse = z.infer<typeof ApiKeyCreateResponseSchema>;

// ApiKeyUpdate is not explicitly in your api.ts, but good to have
export const ApiKeyUpdateSchema = z.object({
    name: z.string().min(1).optional(),
    is_active: z.boolean().optional(),
});
export type ApiKeyUpdate = z.infer<typeof ApiKeyUpdateSchema>;