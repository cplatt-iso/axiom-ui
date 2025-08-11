// src/schemas/modalitySchema.ts
import { z } from 'zod';

export const ModalityCreateSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255, 'Name must be 255 characters or less'),
    description: z.string().optional(),
    ae_title: z.string().min(1, 'AE Title is required').max(16, 'AE Title must be 16 characters or less'),
    ip_address: z.string().min(1, 'IP Address is required'),
    port: z.number().min(1, 'Port must be between 1 and 65535').max(65535, 'Port must be between 1 and 65535').default(104),
    modality_type: z.string().min(1, 'Modality type is required').max(16, 'Modality type must be 16 characters or less'),
    is_active: z.boolean().default(true),
    is_dmwl_enabled: z.boolean().default(true),
    bypass_ip_validation: z.boolean().default(false),
    facility_id: z.number().min(1, 'Facility is required'),
    manufacturer: z.string().max(255, 'Manufacturer must be 255 characters or less').optional(),
    model: z.string().max(255, 'Model must be 255 characters or less').optional(),
    software_version: z.string().max(100, 'Software version must be 100 characters or less').optional(),
    station_name: z.string().max(16, 'Station name must be 16 characters or less').optional(),
    department: z.string().max(100, 'Department must be 100 characters or less').optional(),
    location: z.string().max(255, 'Location must be 255 characters or less').optional(),
});

export const ModalityUpdateSchema = ModalityCreateSchema.partial().extend({
    facility_id: z.number().optional(), // Allow facility_id to be optional in updates
});

export const ModalityReadSchema = ModalityCreateSchema.extend({
    id: z.number(),
    created_at: z.string(),
    updated_at: z.string(),
});

export const ModalityWithFacilitySchema = ModalityReadSchema.extend({
    facility: z.object({
        id: z.number(),
        name: z.string(),
    }).optional(),
});

export type ModalityCreate = z.infer<typeof ModalityCreateSchema>;
export type ModalityUpdate = z.infer<typeof ModalityUpdateSchema>;
export type ModalityRead = z.infer<typeof ModalityReadSchema>;
export type ModalityWithFacility = z.infer<typeof ModalityWithFacilitySchema>;
