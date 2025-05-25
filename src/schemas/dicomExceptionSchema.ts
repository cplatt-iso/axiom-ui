// frontend/src/schemas/dicomExceptionSchema.ts (or a similar name, I don't care, just be consistent for once)
import { z } from 'zod';
import {
  ProcessedStudySourceTypeEnum,
  ExceptionProcessingStageEnum,
  ExceptionStatusEnum
} from './dicomExceptionEnums'; // Adjust path if you put it somewhere else, dummy

// Helper for nullable datetime strings transforming to Date or null
const NullableDateTimeString = z.string().datetime({ offset: true }).nullish().transform(val => val ? new Date(val) : null);
const DateTimeString = z.string().datetime({ offset: true }).transform(val => new Date(val));

export const dicomExceptionLogReadSchema = z.object({
  // Core fields from DicomExceptionLogCore
  study_instance_uid: z.string().max(128).nullish(),
  series_instance_uid: z.string().max(128).nullish(),
  sop_instance_uid: z.string().max(128).nullish(),
  patient_name: z.string().max(255).nullish(),
  patient_id: z.string().max(128).nullish(),
  accession_number: z.string().max(64).nullish(),
  modality: z.string().max(16).nullish(),
  processing_stage: ExceptionProcessingStageEnum,
  error_message: z.string(),
  error_details: z.string().nullish(),
  failed_filepath: z.string().max(1024).nullish(),
  original_source_type: ProcessedStudySourceTypeEnum.nullish(),
  original_source_identifier: z.string().max(255).nullish(),
  calling_ae_title: z.string().max(16).nullish(),
  target_destination_id: z.number().int().nullish(),
  target_destination_name: z.string().max(100).nullish(),
  status: ExceptionStatusEnum,
  retry_count: z.number().int().nonnegative(),
  next_retry_attempt_at: NullableDateTimeString,
  last_retry_attempt_at: NullableDateTimeString,
  resolved_at: NullableDateTimeString,
  resolved_by_user_id: z.number().int().nullish(),
  resolution_notes: z.string().nullish(),
  celery_task_id: z.string().max(255).nullish(),

  // Fields added in DicomExceptionLogRead (system-generated)
  id: z.number().int(),
  exception_uuid: z.string().uuid(),
  failure_timestamp: DateTimeString, // This is server_default=func.now(), so should always exist
  created_at: DateTimeString,        // Inherited from Base, non-nullable
  updated_at: DateTimeString         // Inherited from Base, non-nullable
});

export type DicomExceptionLogRead = z.infer<typeof dicomExceptionLogReadSchema>;

// And here's the schema for the list response, you cretin.
// It's simple, so if you mess this up, there's no hope for you.
export const dicomExceptionLogListResponseSchema = z.object({
  total: z.number().int(),
  items: z.array(dicomExceptionLogReadSchema)
});

export type DicomExceptionLogListResponse = z.infer<typeof dicomExceptionLogListResponseSchema>;

// While we're at it, because I know you'll need it and are too slow to ask:
// Schema for PATCH /api/v1/exceptions/{exception_uuid}
// Based on DicomExceptionLogUpdate from the backend
export const dicomExceptionLogUpdateSchema = z.object({
  status: ExceptionStatusEnum.nullish(),
  retry_count: z.number().int().nonnegative().nullish(), // ge=0 means non-negative
  next_retry_attempt_at: z.string().datetime({ offset: true }).nullish(), // Keep as string for sending, or transform to Date if form uses Date objects
  resolved_at: z.string().datetime({ offset: true }).nullish(),
  // resolved_by_user_id is typically set by the backend based on the current_user.
  // If you want to allow admins to set it manually, add:
  // resolved_by_user_id: z.number().int().nullish(),
  resolution_notes: z.string().nullish(),
}).partial(); // .partial() makes all fields optional, which is good for PATCH

export type DicomExceptionLogUpdate = z.infer<typeof dicomExceptionLogUpdateSchema>;