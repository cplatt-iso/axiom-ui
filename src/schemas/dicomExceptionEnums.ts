// frontend/src/schemas/dicomExceptionEnums.ts (or wherever you keep your shared enums, genius)
import { z } from 'zod';

export const ProcessedStudySourceTypeEnum = z.enum([
  "DICOMWEB",
  "DIMSE_QR",
  "DIMSE_LISTENER",
  "STOW_RS",
  "GOOGLE_HEALTHCARE",
  "FILE_UPLOAD",
  "UNKNOWN"
]);
export type ProcessedStudySourceType = z.infer<typeof ProcessedStudySourceTypeEnum>;

export const ExceptionProcessingStageEnum = z.enum([
  "INGESTION",
  "RULE_EVALUATION",
  "TAG_MORPHING",
  "AI_STANDARDIZATION",
  "DESTINATION_SEND",
  "DATABASE_INTERACTION",
  "POST_PROCESSING",
  "UNKNOWN"
]);
export type ExceptionProcessingStage = z.infer<typeof ExceptionProcessingStageEnum>;

export const ExceptionStatusEnum = z.enum([
  "NEW",
  "RETRY_PENDING",
  "RETRY_IN_PROGRESS",
  "MANUAL_REVIEW_REQUIRED",
  "RESOLVED_BY_RETRY",
  "RESOLVED_MANUALLY",
  "FAILED_PERMANENTLY",
  "ARCHIVED"
]);
export type ExceptionStatus = z.infer<typeof ExceptionStatusEnum>;