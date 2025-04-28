// src/schemas/data_browser.ts

// Define allowed query parameters explicitly
export type AllowedQueryParam =
    | "PatientName"
    | "PatientID"
    | "AccessionNumber"
    | "StudyDate"
    | "StudyTime"
    | "ModalitiesInStudy"
    | "ReferringPhysicianName"
    | "StudyDescription"
    | "PatientBirthDate";
    // Add other relevant C-FIND/QIDO keys as needed

export interface DataBrowserQueryParam {
    field: AllowedQueryParam;
    value: string; // Keep as string, validation/formatting happens on backend/UI input
}

export interface DataBrowserQueryRequest {
    source_id: number;
    query_parameters: DataBrowserQueryParam[];
    // Optional pagination if added later
    // limit?: number;
    // offset?: number;
}

// --- Query Response Schema ---

export interface StudyResultItem {
    PatientName?: string | null;
    PatientID?: string | null;
    StudyInstanceUID: string;
    StudyDate?: string | null; // YYYYMMDD
    StudyTime?: string | null; // HHMMSS
    AccessionNumber?: string | null;
    ModalitiesInStudy?: string[] | null;
    ReferringPhysicianName?: string | null;
    PatientBirthDate?: string | null; // YYYYMMDD
    StudyDescription?: string | null;
    NumberOfStudyRelatedSeries?: number | null;
    NumberOfStudyRelatedInstances?: number | null;
    // Source info added by the backend service
    source_id: number;
    source_name: string;
    source_type: string; // 'dicomweb' or 'dimse-qr'
}

export interface DataBrowserQueryResponse {
    query_status: "success" | "error" | "partial";
    message?: string | null;
    source_id: number;
    source_name: string;
    source_type: string;
    results: StudyResultItem[];
}
