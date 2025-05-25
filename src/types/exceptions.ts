// frontend/src/types/exceptions.ts (or wherever you want to shove these)
import { DicomExceptionLogRead } from '@/schemas/dicomExceptionSchema'; // Your Zod schema

export interface SopLevelExceptionItem extends DicomExceptionLogRead {
  itemType: 'sop'; // This is a new field to help identify the type of item
  // No new fields needed, it's just the log itself at this level
  // We might add a 'type: "sop"' or similar if it helps distinguish in generic components later
}

export interface SeriesLevelExceptionItem {
  id: string; // Composite key: studyUID + seriesUID
  itemType: 'series'; // This is a new field to help identify the type of item
  studyInstanceUid: string;
  seriesInstanceUid: string;
  modality?: string | null; // Pick one, or display 'Multiple'
  sopInstanceCount: number;
  statusSummary: string; // e.g., "2 NEW, 1 FAILED"
  subRows?: SopLevelExceptionItem[]; // The actual exception logs
}

export interface StudyLevelExceptionItem {
  id: string; // studyUID
  itemType: 'study'; // This is a new field to help identify the type of item
  studyInstanceUid: string;
  patientName?: string | null; // Pick one
  patientId?: string | null;   // Pick one
  accessionNumber?: string | null; // Pick one
  seriesCount: number;
  totalSopInstanceCount: number;
  statusSummary: string;
  earliestFailure?: Date;
  latestFailure?: Date;
  subRows?: SeriesLevelExceptionItem[];
}

// This will be the type for the data array passed to the main table
export type HierarchicalExceptionData = StudyLevelExceptionItem[];