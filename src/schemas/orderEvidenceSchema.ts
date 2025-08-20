// frontend/src/schemas/orderEvidenceSchema.ts

import { z } from "zod";

// Schema for a single order evidence record
export const orderEvidenceSchema = z.object({
  id: z.number(),
  sop_instance_uid: z.string(),
  study_instance_uid: z.string(), 
  series_instance_uid: z.string(),
  accession_number: z.string(),
  match_rule: z.string(),
  applied_rule_names: z.string(),
  applied_rule_ids: z.string(),
  destination_results: z.string(), // JSON string of destination status
  processing_successful: z.boolean(),
  source_identifier: z.string(),
  imaging_order_id: z.number(),
  processed_at: z.string().datetime(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Schema for the API response
export const orderEvidenceApiResponseSchema = z.array(orderEvidenceSchema);

export type OrderEvidence = z.infer<typeof orderEvidenceSchema>;
export type OrderEvidenceApiResponse = z.infer<typeof orderEvidenceApiResponseSchema>;

// Helper type for parsed destination results
export interface DestinationResult {
  [destinationName: string]: {
    status: string;
    batch_id?: number;
    error?: string;
  };
}
