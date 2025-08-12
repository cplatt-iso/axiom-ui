// src/types/scrapers.ts

import { ScraperType } from '@/utils/styleHelpers';

export interface UnifiedScraperStatus {
    id: number;
    name: string;
    scraperType: ScraperType;
    is_enabled: boolean;
    is_active: boolean;
    last_successful_run?: string | null;
    last_error_time?: string | null;
    last_error_message?: string | null;
    description?: string | null;

    // Connection Details
    base_url?: string | null;
    remote_ae_title?: string | null;
    remote_host?: string | null;
    remote_port?: number | null;
    gcp_project_id?: string | null;
    gcp_dataset_id?: string | null;
    gcp_dicom_store_id?: string | null;
    gcp_location?: string | null;

    // Health Status (NEW)
    health_status?: 'UNKNOWN' | 'OK' | 'DOWN' | 'ERROR';
    last_health_check?: string | null;
    last_health_error?: string | null;

    // --- ADDED COUNTERS ---
    count_found?: number | null;        // Found Studies (DIMSE) or Instances (DICOMweb)
    count_queued?: number | null;       // Queued for Move (DIMSE) or Processing (DICOMweb)
    count_processed?: number | null;    // Processed Instances (both)
    // --- END ADDED COUNTERS ---
}
