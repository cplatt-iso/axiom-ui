// frontend/src/schemas/orderSchema.ts

import { z } from "zod";

// Let's mirror the backend enum so we know what the hell we're dealing with.
export const OrderStatusEnum = z.enum([
  "SCHEDULED",
  "IN_PROGRESS",
  "CANCELED",
  "COMPLETED",
  "DISCONTINUED",
  "UNKNOWN",
]);
export type OrderStatus = z.infer<typeof OrderStatusEnum>;

// This defines a single row in our beautiful, upcoming table.
// It matches the 'ImagingOrderRead' schema from the backend.
export const orderSchema = z.object({
  id: z.number(),
  patient_name: z.string().nullable().optional(),
  patient_id: z.string(),
  patient_dob: z.string().nullable().optional(), // Dates come as ISO strings
  patient_sex: z.string().nullable().optional(),
  accession_number: z.string(),
  placer_order_number: z.string().nullable().optional(),
  filler_order_number: z.string().nullable().optional(),
  requested_procedure_description: z.string().nullable().optional(),
  requested_procedure_code: z.string().nullable().optional(),
  modality: z.string(),
  scheduled_station_ae_title: z.string().nullable().optional(),
  scheduled_station_name: z.string().nullable().optional(),
  scheduled_procedure_step_start_datetime: z
    .string()
    .datetime()
    .nullable()
    .optional(),
  requesting_physician: z.string().nullable().optional(),
  referring_physician: z.string().nullable().optional(),
  order_status: OrderStatusEnum,
  study_instance_uid: z.string().nullable().optional(),
  source: z.string(),
  raw_hl7_message: z.string().nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  order_received_at: z.string().datetime(),
});

// This is the shape of the entire API response from our glorious new endpoint.
export const ordersApiResponseSchema = z.object({
  items: z.array(orderSchema),
  total: z.number(),
});

export type ImagingOrder = z.infer<typeof orderSchema>;
export type OrdersApiResponse = z.infer<typeof ordersApiResponseSchema>;