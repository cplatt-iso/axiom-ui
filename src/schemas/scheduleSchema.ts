// frontend/src/schemas/scheduleSchema.ts
import { z } from 'zod';

// --- Helper Constants for TimeRange ---
// Matches HH:MM format (e.g., "08:00", "17:30")
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Allowed day strings, using const assertion for stricter enum typing
// --- MODIFIED: Exported ALLOWED_DAYS_FRONTEND ---
export const ALLOWED_DAYS_FRONTEND = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
// --- END MODIFIED ---

// --- Schema for a Single Time Range (Mirroring Backend Structure) ---
export const TimeRangeSchema = z.object({
    days: z.array(z.enum(ALLOWED_DAYS_FRONTEND))
           .min(1, "At least one day is required for a time range.")
           .refine(days => new Set(days).size === days.length, { // Ensure unique days
               message: "Days in a time range must be unique."
           })
           .transform(days => [...new Set(days)].sort((a, b) => { // Sort for consistent order
               return ALLOWED_DAYS_FRONTEND.indexOf(a) - ALLOWED_DAYS_FRONTEND.indexOf(b);
           })),
    start_time: z.string().regex(TIME_REGEX, "Start time must be in HH:MM format (e.g., 08:00)."),
    end_time: z.string().regex(TIME_REGEX, "End time must be in HH:MM format (e.g., 17:30)."),
});

export type TimeRange = z.infer<typeof TimeRangeSchema>;


// --- Base Schedule Schema ---
// This contains fields common to Create, Update (partially), and Read.
const ScheduleBaseZodSchema = z.object({
    name: z.string().min(1, "Schedule name is required.").max(100, "Schedule name cannot exceed 100 characters."),
    description: z.string().max(500, "Description cannot exceed 500 characters.").nullable().optional(),
    is_enabled: z.boolean().default(true),
    // Based on backend `ScheduleBase`, `time_ranges` is required.
    time_ranges: z.array(TimeRangeSchema)
                  .min(1, "At least one time range is required for the schedule.")
                  .max(10, "A maximum of 10 time ranges are allowed per schedule."), // Arbitrary limit, adjust if needed
});

// --- Schema for Form Data (used by React Hook Form) ---
// This is what the form will handle directly.
export const ScheduleFormDataSchema = ScheduleBaseZodSchema;
export type ScheduleFormData = z.infer<typeof ScheduleFormDataSchema>;

// --- Schema for Creating a New Schedule (Payload for API) ---
// Matches the backend's `ScheduleCreate` which inherits from `ScheduleBase`.
export const ScheduleCreateSchema = ScheduleBaseZodSchema;
export type ScheduleCreate = z.infer<typeof ScheduleCreateSchema>;

// --- Schema for Updating an Existing Schedule (Payload for API) ---
// Matches the backend's `ScheduleUpdate`. All fields are optional.
// If `time_ranges` is provided, it replaces the existing list.
export const ScheduleUpdateSchema = ScheduleBaseZodSchema.pick({
    name: true,
    description: true,
    is_enabled: true,
    time_ranges: true, // Allow updating time_ranges
})
.partial() // Makes all picked fields optional
.refine(
    (data) => Object.keys(data).length > 0, // Ensure at least one field is being updated
    { message: "At least one field must be provided for update." }
);
export type ScheduleUpdate = z.infer<typeof ScheduleUpdateSchema>;

// --- Schema for Reading Schedule data from the API ---
// Extends the base with read-only fields like id and timestamps.
// --- MODIFIED: Renamed ScheduleReadSchema to ScheduleSchema and ScheduleRead to Schedule ---
export const ScheduleSchema = ScheduleBaseZodSchema.extend({
    id: z.number().int(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
});
export type Schedule = z.infer<typeof ScheduleSchema>;
// --- END MODIFIED ---

// Example of how you might provide default values for the form
export const getDefaultScheduleFormData = (): ScheduleFormData => ({
    name: "",
    description: null,
    is_enabled: true,
    time_ranges: [
        {
            days: ["Mon", "Tue", "Wed", "Thu", "Fri"], // Sensible default
            start_time: "09:00",
            end_time: "17:00",
        },
    ],
});

export const getDefaultTimeRange = (): TimeRange => ({
    days: [], // This will be an empty array of DayOfWeek type
    start_time: "00:00",
    end_time: "00:00",
});