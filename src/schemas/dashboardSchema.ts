 // frontend/src/schemas/dashboardSchema.ts
 import { z } from 'zod';
 // Import specific status types if SystemStatusReport directly embeds them,
 // otherwise, it just has a generic component structure.
 // For now, assuming 'components' is a record of ComponentStatusSchema

 export const ComponentStatusSchema = z.object({
     status: z.string(), // e.g., "OPERATIONAL", "DEGRADED", "DOWN"
     details: z.string().nullable().optional(),
 });
 export type ComponentStatus = z.infer<typeof ComponentStatusSchema>;

 export const SystemStatusReportSchema = z.object({
     status: z.string(), // Overall system status
     components: z.record(ComponentStatusSchema), // e.g., { "database": ComponentStatus, "celery": ComponentStatus }
 });
 export type SystemStatusReport = z.infer<typeof SystemStatusReportSchema>;