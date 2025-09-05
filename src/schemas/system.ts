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

export interface DiskUsageStats {
    filesystem_total_bytes: number; // Overall FS total
    filesystem_free_bytes: number; // Overall FS free
    directories: DirectoryUsageStats[]; // List of specific directory stats
}

export interface ServiceStatus {
    status: 'connected' | 'error' | 'disconnected';
    error?: string | null;
}

export interface ServicesStatus {
    database: ServiceStatus;
    redis: ServiceStatus;
}

export const SystemInfoSchema = z.object({
    // Project Info
    project_name: z.string(),
    project_version: z.string(),
    environment: z.string(),
    debug_mode: z.boolean(),
    log_level: z.string(),
    
    // API Config
    api_v1_str: z.string(),
    cors_origins: z.array(z.string()),
    access_token_expire_minutes: z.number(),
    algorithm: z.string(),
    
    // Authentication
    google_oauth_configured: z.boolean(),
    
    // Database
    postgres_server: z.string(),
    postgres_port: z.number(),
    postgres_user: z.string(),
    postgres_db: z.string(),
    database_connected: z.boolean(),
    
    // Processing Settings (runtime configurable)
    log_original_attributes: z.boolean(),
    delete_on_success: z.boolean(),
    delete_unmatched_files: z.boolean(),
    delete_on_no_destination: z.boolean(),
    move_to_error_on_partial_failure: z.boolean(),
    
    // Dustbin System
    use_dustbin_system: z.boolean(),
    dustbin_retention_days: z.number(),
    dustbin_verification_timeout_hours: z.number(),
    
    // File Paths
    dicom_storage_path: z.string(),
    dicom_error_path: z.string(),
    filesystem_storage_path: z.string(),
    dicom_retry_staging_path: z.string(),
    dicom_dustbin_path: z.string(),
    temp_dir: z.string().nullable(),
    
    // Batch Processing
    exam_batch_completion_timeout: z.number(),
    exam_batch_check_interval: z.number(),
    exam_batch_send_interval: z.number(),
    exam_batch_max_concurrent: z.number(),
    
    // Celery
    celery_broker_configured: z.boolean(),
    celery_result_backend_configured: z.boolean(),
    celery_worker_concurrency: z.number(),
    celery_prefetch_multiplier: z.number(),
    celery_task_max_retries: z.number(),
    celery_task_retry_delay: z.number(),
    
    // Cleanup
    stale_data_cleanup_age_days: z.number(),
    stale_retry_in_progress_age_hours: z.number(),
    cleanup_batch_size: z.number(),
    cleanup_stale_data_interval_hours: z.number(),
    
    // AI Configuration
    openai_configured: z.boolean(),
    openai_model_name_rule_gen: z.string().nullable(),
    vertex_ai_configured: z.boolean(),
    vertex_ai_project: z.string().optional(),
    vertex_ai_location: z.string().optional(),
    vertex_ai_model_name: z.string().optional(),
    ai_invocation_counter_enabled: z.boolean(),
    ai_vocab_cache_enabled: z.boolean(),
    ai_vocab_cache_ttl_seconds: z.number(),
    
    // Redis
    redis_configured: z.boolean(),
    redis_host: z.string(),
    redis_port: z.number(),
    redis_db: z.number(),
    
    // RabbitMQ
    rabbitmq_host: z.string(),
    rabbitmq_port: z.number(),
    rabbitmq_user: z.string(),
    rabbitmq_vhost: z.string(),
    
    // DICOM
    listener_host: z.string(),
    pydicom_implementation_uid: z.string(),
    implementation_version_name: z.string(),
    
    // DICOMweb Polling
    dicomweb_poller_default_fallback_days: z.number(),
    dicomweb_poller_overlap_minutes: z.number(),
    dicomweb_poller_qido_limit: z.number(),
    dicomweb_poller_max_sources: z.number(),
    
    // DIMSE
    dimse_qr_poller_max_sources: z.number(),
    dimse_acse_timeout: z.number(),
    dimse_dimse_timeout: z.number(),
    dimse_network_timeout: z.number(),
    
    // Other
    dcm4che_prefix: z.string(),
    rules_cache_enabled: z.boolean(),
    rules_cache_ttl_seconds: z.number(),
    known_input_sources: z.array(z.string()),
    
    // Elasticsearch / Logging
    elasticsearch_configured: z.boolean(),
    elasticsearch_host: z.string(),
    elasticsearch_port: z.number(),
    elasticsearch_tls_enabled: z.boolean(),
    elasticsearch_auth_enabled: z.boolean(),
    elasticsearch_cert_verification: z.boolean(),
    elasticsearch_ca_cert_path: z.string().nullable().optional(),
    elasticsearch_index_pattern: z.string(),
    elasticsearch_username: z.string().nullable().optional(),
    elasticsearch_password: z.string().nullable().optional(), // Usually masked in responses
    
    // Fluentd
    fluentd_configured: z.boolean(),
    fluentd_host: z.string(),
    fluentd_port: z.number(),
    fluentd_tag_prefix: z.string(),
    fluentd_buffer_size: z.string(), // Buffer size is a string like "10m", "256k", etc.
    
    // Services Status
    services_status: z.record(z.string(), z.object({
        status: z.string(),
        error: z.string().nullable(),
    })),
});
export type SystemInfo = z.infer<typeof SystemInfoSchema>;