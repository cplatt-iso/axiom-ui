import { z } from 'zod';

export interface DirectoryUsageStats {
    path: string;
    content_bytes: number; // Size of files *within* this directory (-1 if error)
}

export interface DiskUsageStats {
    filesystem_total_bytes: number; // Overall FS total
    filesystem_free_bytes: number; // Overall FS free
    directories: DirectoryUsageStats[]; // List of specific directory stats
}

export const SystemInfoSchema = z.object({
    axiom_version: z.string(),
    python_version: z.string(),
    os_platform: z.string(),
    pydicom_version: z.string(),
    pynetdicom_version: z.string(),
    celery_version: z.string(),
    sqlalchemy_version: z.string(),
    fastapi_version: z.string(),
    instance_name: z.string().optional().nullable(),
    start_time: z.string().datetime(),
    current_log_level: z.string(),
    available_log_levels: z.array(z.string()),
    project_name: z.string(),
    project_version: z.string(),
    environment: z.string(),
    debug_mode: z.boolean(),
    dicom_storage_path: z.string(),
    dicom_error_path: z.string(),
    filesystem_storage_path: z.string(),
    temp_dir: z.string().nullable(),
    log_original_attributes: z.boolean(),
    delete_on_success: z.boolean(),
    delete_unmatched_files: z.boolean(),
    delete_on_no_destination: z.boolean(),
    move_to_error_on_partial_failure: z.boolean(),
    openai_configured: z.boolean(),
});
export type SystemInfo = z.infer<typeof SystemInfoSchema>;