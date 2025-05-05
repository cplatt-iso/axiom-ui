// frontend/src/schemas/data_browser.ts
import { z } from 'zod'; // Use Zod

// Define QueryLevel enum using Zod if preferred, or keep TS enum
export enum QueryLevel {
    STUDY = "STUDY",
    SERIES = "SERIES",
    INSTANCE = "INSTANCE"
}

// --- CORRECTED Zod Enum ---
// Ensure this matches the backend Literal exactly, including hyphens
export const AllowedQuerySourceType = z.enum([
    "dicomweb",
    "dimse-qr", // Use hyphen
    "google_healthcare"
]);
export type AllowedQuerySourceType = z.infer<typeof AllowedQuerySourceType>;
// --- END CORRECTION ---

// Define allowed query keys/tags if needed for validation or UI hints
export const AllowedQueryParamKeys = z.enum([
    "PatientName", "PatientID", "AccessionNumber", "StudyDate", "StudyTime",
    "ModalitiesInStudy", "ReferringPhysicianName", "StudyDescription", "PatientBirthDate",
    // Add specific tags if useful
    "00100010", "00100020", "00080050", "00080020", "00080030",
    "00080061", "00080090", "00081030", "00100030",
]);
export type AllowedQueryParamKeys = z.infer<typeof AllowedQueryParamKeys>;


export interface DataBrowserQueryParam {
    field: AllowedQueryParamKeys | string;
    value: string;
}

// Request uses the Zod enum now for validation within the page component
export interface DataBrowserQueryRequest {
    source_id: number;
    source_type: AllowedQuerySourceType; // Use Zod enum type
    query_parameters: DataBrowserQueryParam[];
    query_level?: QueryLevel;
}

// Result items can also use the literal type for consistency
export interface StudyResultItem {
    PatientName?: string | null;
    PatientID?: string | null;
    StudyInstanceUID: string;
    StudyDate?: string | null;
    StudyTime?: string | null;
    AccessionNumber?: string | null;
    ModalitiesInStudy?: string[] | null;
    ReferringPhysicianName?: string | null;
    PatientBirthDate?: string | null;
    StudyDescription?: string | null;
    NumberOfStudyRelatedSeries?: number | null;
    NumberOfStudyRelatedInstances?: number | null;
    source_id: number;
    source_name: string;
    // Use the Zod enum type here too + Error types
    source_type: AllowedQuerySourceType | 'Unknown' | 'Error';
    [key: string]: any;
}

// Response uses the literal type
export interface DataBrowserQueryResponse {
    query_status: "success" | "error" | "partial";
    message?: string | null;
    source_id: number;
    source_name: string;
    source_type: AllowedQuerySourceType | 'Unknown' | 'Error'; // Use Zod enum type
    results: StudyResultItem[];
}
