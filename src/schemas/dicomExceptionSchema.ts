// frontend/src/schemas/dicomExceptionSchema.ts
import { z } from 'zod';
import {
  ProcessedStudySourceTypeEnum,
  ExceptionProcessingStageEnum,
  ExceptionStatusEnum
} from './dicomExceptionEnums';

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
  id: z.number().int(), // This is the original integer ID
  exception_uuid: z.string().uuid(),
  failure_timestamp: DateTimeString,
  created_at: DateTimeString,
  updated_at: DateTimeString
});

export type DicomExceptionLogRead = z.infer<typeof dicomExceptionLogReadSchema>;

export const dicomExceptionLogListResponseSchema = z.object({
  total: z.number().int(),
  items: z.array(dicomExceptionLogReadSchema)
});

export type DicomExceptionLogListResponse = z.infer<typeof dicomExceptionLogListResponseSchema>;

export const dicomExceptionLogUpdateSchema = z.object({
  status: ExceptionStatusEnum.nullish(),
  retry_count: z.number().int().nonnegative().nullish(),
  next_retry_attempt_at: z.string().datetime({ offset: true }).nullish(),
  resolved_at: z.string().datetime({ offset: true }).nullish(),
  resolution_notes: z.string().nullish(),
}).partial();

export type DicomExceptionLogUpdate = z.infer<typeof dicomExceptionLogUpdateSchema>;


// --- NEW ZOD SCHEMAS FOR BULK ACTIONS ---

export const BulkActionScopeSchema = z.object({
  study_instance_uid: z.string().max(128).nullish(),
  series_instance_uid: z.string().max(128).nullish(),
  exception_uuids: z.array(z.string().uuid()).nullish(), // Assuming UUIDs are strings on frontend
}).refine(
    (data) => data.study_instance_uid || data.series_instance_uid || (data.exception_uuids && data.exception_uuids.length > 0),
    { message: "At least one scope (study_instance_uid, series_instance_uid, or exception_uuids) must be provided." }
);
export type BulkActionScope = z.infer<typeof BulkActionScopeSchema>;


export const BulkActionSetStatusPayloadSchema = z.object({
  new_status: ExceptionStatusEnum, // Use the Zod enum directly
  resolution_notes: z.string().nullish(),
  clear_next_retry_attempt_at: z.boolean().default(false).nullish(),
});
export type BulkActionSetStatusPayload = z.infer<typeof BulkActionSetStatusPayloadSchema>;


export const BulkActionRequeueRetryablePayloadSchema = z.object({
  // Currently no specific fields, but define for structure and future extension
  // example_filter_flag: z.boolean().nullish(), 
}).strict(); // Use .strict() if it should ONLY contain defined fields (or be empty)
export type BulkActionRequeueRetryablePayload = z.infer<typeof BulkActionRequeueRetryablePayloadSchema>;


// Using discriminated union for the request payload based on action_type
export const DicomExceptionBulkActionRequestSchema = z.discriminatedUnion("action_type", [
  z.object({
    action_type: z.literal("SET_STATUS"),
    scope: BulkActionScopeSchema,
    payload: BulkActionSetStatusPayloadSchema,
  }),
  z.object({
    action_type: z.literal("REQUEUE_RETRYABLE"),
    scope: BulkActionScopeSchema,
    // Payload can be optional or a specific (possibly empty) schema for REQUEUE_RETRYABLE
    payload: BulkActionRequeueRetryablePayloadSchema.nullish(), 
  }),
  // Add other action types here if needed in the future, e.g.:
  // z.object({
  //   action_type: z.literal("DELETE_LOGS"),
  //   scope: BulkActionScopeSchema,
  //   // No payload needed for delete, or an empty one
  //   payload: z.object({}).strict().nullish(), 
  // }),
]);
export type DicomExceptionBulkActionRequest = z.infer<typeof DicomExceptionBulkActionRequestSchema>;


export const bulkActionResponseSchema = z.object({
  action_type: z.string(),
  processed_count: z.number().int(),
  successful_count: z.number().int(),
  failed_count: z.number().int(),
  message: z.string(),
  details: z.array(z.string()).nullish(),
});
export type BulkActionResponse = z.infer<typeof bulkActionResponseSchema>;

// --- END NEW ZOD SCHEMAS ---