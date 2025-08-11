// src/schemas/facilitySchema.ts
import { z } from 'zod';

export const FacilityCreateSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255, 'Name must be 255 characters or less'),
    description: z.string().optional(),
    address_line_1: z.string().max(255, 'Address line 1 must be 255 characters or less').optional(),
    address_line_2: z.string().max(255, 'Address line 2 must be 255 characters or less').optional(),
    city: z.string().max(100, 'City must be 100 characters or less').optional(),
    state: z.string().max(100, 'State must be 100 characters or less').optional(),
    postal_code: z.string().max(20, 'Postal code must be 20 characters or less').optional(),
    country: z.string().max(100, 'Country must be 100 characters or less').optional(),
    phone: z.string().max(50, 'Phone must be 50 characters or less').optional(),
    email: z.string().email('Invalid email format').max(255, 'Email must be 255 characters or less').optional(),
    is_active: z.boolean().default(true),
    facility_id: z.string().max(50, 'Facility ID must be 50 characters or less').optional(),
});

export const FacilityUpdateSchema = FacilityCreateSchema.partial();

export const FacilityReadSchema = FacilityCreateSchema.extend({
    id: z.number(),
    created_at: z.string(),
    updated_at: z.string(),
});

export type FacilityCreate = z.infer<typeof FacilityCreateSchema>;
export type FacilityUpdate = z.infer<typeof FacilityUpdateSchema>;
export type FacilityRead = z.infer<typeof FacilityReadSchema>;
