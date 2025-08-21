// frontend/src/schemas/data_browser.ts
import { z } from 'zod';

export enum QueryLevel {
    STUDY = "STUDY",
    SERIES = "SERIES",
    INSTANCE = "INSTANCE"
}

export const AllowedQuerySourceType = z.enum([
    "dicomweb",
    "dimse-qr",
    "google_healthcare"
]);
export type AllowedQuerySourceType = z.infer<typeof AllowedQuerySourceType>;

export const AllowedQueryParamKeys = z.enum([
    "PatientName", "PatientID", "AccessionNumber", "StudyDate", "StudyTime",
    "ModalitiesInStudy", "ReferringPhysicianName", "StudyDescription", "PatientBirthDate",
    "00100010", "00100020", "00080050", "00080020", "00080030",
    "00080061", "00080090", "00081030", "00100030",
    "InstitutionName", "00080080" // Added Institution Name Keyword and Tag
]);
export type AllowedQueryParamKeys = z.infer<typeof AllowedQueryParamKeys>;


export interface DataBrowserQueryParam {
    field: AllowedQueryParamKeys | string;
    value: string;
}

export interface DataBrowserQueryRequest {
    source_id: number;
    source_type: AllowedQuerySourceType;
    query_parameters: DataBrowserQueryParam[];
    query_level?: QueryLevel;
}

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
    InstitutionName?: string | null; // Added InstitutionName field
    source_id: number;
    source_name: string;
    source_type: AllowedQuerySourceType | 'Unknown' | 'Error';
    [key: string]: unknown;
}

export interface SeriesResultItem {
    StudyInstanceUID: string;
    SeriesInstanceUID: string;
    SeriesDate?: string | null;
    SeriesTime?: string | null;
    Modality?: string | null;
    SeriesDescription?: string | null;
    SeriesNumber?: number | null;
    NumberOfSeriesRelatedInstances?: number | null;
    BodyPartExamined?: string | null;
    source_id: number;
    source_name: string;
    source_type: AllowedQuerySourceType | 'Unknown' | 'Error';
    [key: string]: unknown;
}

export interface InstanceResultItem {
    StudyInstanceUID: string;
    SeriesInstanceUID: string;
    SOPInstanceUID: string;
    SOPClassUID?: string | null;
    InstanceNumber?: number | null;
    ContentDate?: string | null;
    ContentTime?: string | null;
    source_id: number;
    source_name: string;
    source_type: AllowedQuerySourceType | 'Unknown' | 'Error';
    [key: string]: unknown;
}

export interface DataBrowserQueryResponse {
    query_status: "success" | "error" | "partial";
    message?: string | null;
    source_id: number;
    source_name: string;
    source_type: AllowedQuerySourceType | 'Unknown' | 'Error';
    results: StudyResultItem[];
}
