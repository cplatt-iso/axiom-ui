// frontend/src/services/exceptionService.ts
import api from './api'; // Assuming 'api' is your configured axios instance or similar
import {
  DicomExceptionLogListResponse,
  DicomExceptionLogRead,
  DicomExceptionLogUpdate,
  dicomExceptionLogListResponseSchema,
  dicomExceptionLogReadSchema
} from '@/schemas/dicomExceptionSchema';
import { ExceptionStatus } from '@/schemas/dicomExceptionEnums';

// Define filter params type based on backend API
export interface ListExceptionsParams {
  skip?: number;
  limit?: number;
  searchTerm?: string;
  status?: ExceptionStatus[];
  processingStage?: string[];
  studyInstanceUid?: string;
  seriesInstanceUid?: string;
  sopInstanceUid?: string;
  patientId?: string;
  patientName?: string;
  accessionNumber?: string;
  modality?: string;
  originalSourceType?: string;
  originalSourceIdentifier?: string;
  targetDestinationId?: number;
  dateFrom?: string; // ISO string
  dateTo?: string;   // ISO string
  celeryTaskId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: any; // Add index signature
}

export const listExceptions = async (params: ListExceptionsParams): Promise<DicomExceptionLogListResponse> => {
  // MODIFIED: Call api (apiClient) directly, specifying the method in options
  const responseData = await api<DicomExceptionLogListResponse>('/exceptions/', { method: 'GET', params });
  return dicomExceptionLogListResponseSchema.parse(responseData); // Validate with Zod
};

export const getException = async (exceptionUuid: string): Promise<DicomExceptionLogRead> => {
  // MODIFIED: Call api (apiClient) directly, specifying the method in options
  const responseData = await api<DicomExceptionLogRead>(`/exceptions/${exceptionUuid}`, { method: 'GET' });
  return dicomExceptionLogReadSchema.parse(responseData);
};

export const updateException = async (
  exceptionUuid: string,
  data: DicomExceptionLogUpdate
): Promise<DicomExceptionLogRead> => {
  // MODIFIED: Call api (apiClient) directly, specifying the method and body in options
  const responseData = await api<DicomExceptionLogRead>(`/exceptions/${exceptionUuid}`, {
    method: 'PATCH',
    body: JSON.stringify(data) // Ensure body is stringified if your apiClient expects it
  });
  return dicomExceptionLogReadSchema.parse(responseData);
};

export default listExceptions; // Or export all if not using a central api/index.ts for these