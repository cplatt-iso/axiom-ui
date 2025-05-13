// frontend/src/schemas/userSchema.ts
import { z } from 'zod';

export const RoleSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().optional().nullable(),
});
export type Role = z.infer<typeof RoleSchema>;

export const UserSchema = z.object({
    id: z.number(),
    email: z.string().email(),
    google_id: z.string().optional().nullable(),
    full_name: z.string().optional().nullable(),
    picture: z.string().url().optional().nullable(),
    is_active: z.boolean(),
    is_superuser: z.boolean(),
    roles: z.array(RoleSchema), // Array of Role objects for reading
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
});
export type User = z.infer<typeof UserSchema>;

export const UserWithRolesSchema = UserSchema;
export type UserWithRoles = User;

// Payload for updating user (name, active status, superuser status, roles by ID)
export const UserUpdateSchema = z.object({
    full_name: z.string().min(1).optional().nullable(), // Assuming full_name can be updated
    is_active: z.boolean().optional(),
    is_superuser: z.boolean().optional(),
    roles: z.array(z.number().int().positive("Role ID must be a positive integer.")) // Array of role IDs
        .optional()
        .nullable(), // Allow explicitly setting to null to remove all roles, or undefined to not change
}).refine(obj => Object.values(obj).some(v => v !== undefined), {
    message: "At least one field must be provided for update."
});
export type UserUpdate = z.infer<typeof UserUpdateSchema>;

// If you have a specific schema for creating users (e.g. admin creating a user manually)
// export const UserCreateSchema = z.object({ ... });
// export type UserCreate = z.infer<typeof UserCreateSchema>;