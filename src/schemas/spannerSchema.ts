// src/schemas/spannerSchema.ts
import { z } from 'zod';

// Enum schemas
export const FailureStrategyEnum = z.enum(['FAIL_FAST', 'BEST_EFFORT', 'MINIMUM_THRESHOLD']);
export const DeduplicationStrategyEnum = z.enum(['FIRST_WINS', 'MOST_COMPLETE', 'MERGE_ALL']);
export const SpannerProtocolEnum = z.enum(['dimse', 'dicomweb']);
export const SourceTypeEnum = z.enum(['dimse_qr', 'dicomweb', 'google_healthcare']);

// Base schemas
export const SpannerConfigBaseSchema = z.object({
    name: z.string().min(1, "Spanner name is required"),
    description: z.string().optional(),
    is_enabled: z.boolean().default(true),
    
    // DIMSE Protocol Support (granular)
    supports_cfind: z.boolean().default(true),
    supports_cget: z.boolean().default(false),
    supports_cmove: z.boolean().default(true),
    
    // DICOMweb Protocol Support
    supports_qido: z.boolean().default(true),
    supports_wado: z.boolean().default(true),
    
    // Query Configuration
    query_timeout_seconds: z.number().int().min(1).max(3600).default(300),
    retrieval_timeout_seconds: z.number().int().min(1).max(3600).default(300),
    failure_strategy: FailureStrategyEnum.default('BEST_EFFORT'),
    minimum_success_threshold: z.number().int().min(1).optional().nullable(),
    
    // Deduplication and Strategy
    deduplication_strategy: DeduplicationStrategyEnum.default('FIRST_WINS'),
    cmove_strategy: z.enum(['PROXY', 'DIRECT']).default('PROXY'),
    max_concurrent_sources: z.number().int().min(1).max(100).default(5),
});

// Create schema
export const SpannerConfigCreateSchema = SpannerConfigBaseSchema;
export type SpannerConfigCreate = z.infer<typeof SpannerConfigCreateSchema>;

// Update schema (all fields optional)
export const SpannerConfigUpdateSchema = SpannerConfigBaseSchema.partial();
export type SpannerConfigUpdate = z.infer<typeof SpannerConfigUpdateSchema>;

// Read schema (includes metadata)
export const SpannerConfigReadSchema = SpannerConfigBaseSchema.extend({
    id: z.number(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    
    // Runtime metrics from backend
    total_queries_processed: z.number().int().default(0),
    total_retrievals_processed: z.number().int().default(0),
    last_activity: z.string().datetime().nullable(),
    source_mappings_count: z.number().int().default(0),
});
export type SpannerConfigRead = z.infer<typeof SpannerConfigReadSchema>;

// Source mapping schemas
export const SpannerSourceMappingBaseSchema = z.object({
    source_type: SourceTypeEnum,
    source_id: z.number().int(),
    priority: z.number().int().min(0).max(100).default(50),
    is_enabled: z.boolean().default(true),
    weight: z.number().min(0).max(1).default(1.0),
    
    // Query filtering (JSON string that represents query conditions)
    query_filter: z.string().optional().nullable(),
    
    // Timeout overrides
    timeout_override_seconds: z.number().int().min(1).max(3600).optional().nullable(),
    
    // Advanced settings
    enable_failover: z.boolean().default(true),
    max_retries: z.number().int().min(0).max(10).default(2),
    retry_delay_seconds: z.number().int().min(1).max(60).default(5),
});

// Create schema
export const SpannerSourceMappingCreateSchema = SpannerSourceMappingBaseSchema.extend({
    spanner_config_id: z.number().int(),
});
export type SpannerSourceMappingCreate = z.infer<typeof SpannerSourceMappingCreateSchema>;

// Update schema (all fields optional except IDs)
export const SpannerSourceMappingUpdateSchema = SpannerSourceMappingBaseSchema.partial();
export type SpannerSourceMappingUpdate = z.infer<typeof SpannerSourceMappingUpdateSchema>;

// Read schema (includes metadata and source details)
export const SpannerSourceMappingReadSchema = SpannerSourceMappingBaseSchema.extend({
    id: z.number(),
    spanner_config_id: z.number(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    
    // Source details (populated by backend)
    source_name: z.string().optional(),
    source_description: z.string().optional(),
    source_status: z.enum(['active', 'inactive', 'error', 'unknown']).optional(),
    
    // Runtime metrics
    total_queries: z.number().int().default(0),
    successful_queries: z.number().int().default(0),
    failed_queries: z.number().int().default(0),
    average_response_time_ms: z.number().default(0),
    last_query_at: z.string().datetime().optional().nullable(),
    success_rate: z.number().min(0).max(1).default(0),
});
export type SpannerSourceMappingRead = z.infer<typeof SpannerSourceMappingReadSchema>;

// Service status schemas
export const SpannerServiceStatusSchema = z.object({
    service_id: z.string(),
    service_name: z.string(),
    status: z.enum(['running', 'stopped', 'starting', 'stopping', 'error']),
    port: z.number().int().optional(),
    pid: z.number().int().optional(),
    uptime_seconds: z.number().optional(),
    memory_usage_mb: z.number().optional(),
    cpu_usage_percent: z.number().optional(),
    
    // Health metrics
    queries_processed: z.number().int().default(0),
    queries_per_minute: z.number().default(0),
    error_rate: z.number().min(0).max(1).default(0),
    last_health_check: z.string().datetime().optional(),
    
    // Configuration
    spanner_config_id: z.number().optional(),
    spanner_config_name: z.string().optional(),
});
export type SpannerServiceStatus = z.infer<typeof SpannerServiceStatusSchema>;

export const SpannerServicesStatusResponseSchema = z.object({
    services: z.array(SpannerServiceStatusSchema),
    total_services: z.number().int(),
    running_services: z.number().int(),
    stopped_services: z.number().int(),
    error_services: z.number().int(),
    system_load_average: z.number().optional(),
    total_memory_usage_mb: z.number().optional(),
    available_memory_mb: z.number().optional(),
});
export type SpannerServicesStatusResponse = z.infer<typeof SpannerServicesStatusResponseSchema>;

// Available source schemas (for dropdowns)
export const AvailableSourceSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().optional(),
    type: SourceTypeEnum,
    status: z.enum(['active', 'inactive', 'error']).optional(),
    created_at: z.string().datetime().optional(),
    
    // Type-specific metadata
    metadata: z.record(z.any()).optional(),
});
export type AvailableSource = z.infer<typeof AvailableSourceSchema>;

// Query performance metrics
export const SpannerMetricsSchema = z.object({
    spanner_config_id: z.number(),
    spanner_config_name: z.string(),
    
    // Performance metrics
    total_queries: z.number().int(),
    successful_queries: z.number().int(),
    failed_queries: z.number().int(),
    average_response_time_ms: z.number(),
    median_response_time_ms: z.number(),
    p95_response_time_ms: z.number(),
    
    // Deduplication metrics
    total_results_before_dedup: z.number().int(),
    total_results_after_dedup: z.number().int(),
    deduplication_rate: z.number().min(0).max(1),
    
    // Source performance
    source_metrics: z.array(z.object({
        source_id: z.number(),
        source_name: z.string(),
        source_type: SourceTypeEnum,
        queries: z.number().int(),
        successes: z.number().int(),
        failures: z.number().int(),
        avg_response_time_ms: z.number(),
        success_rate: z.number().min(0).max(1),
    })),
    
    // Time range
    from_date: z.string().datetime(),
    to_date: z.string().datetime(),
});
export type SpannerMetrics = z.infer<typeof SpannerMetricsSchema>;

// Service control schemas
export const ServiceControlRequestSchema = z.object({
    action: z.enum(['start', 'stop', 'restart']),
    service_id: z.string().optional(), // If not provided, applies to all services
});
export type ServiceControlRequest = z.infer<typeof ServiceControlRequestSchema>;

export const ServiceControlResponseSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    affected_services: z.array(z.string()),
    errors: z.array(z.object({
        service_id: z.string(),
        error: z.string(),
    })).optional(),
});
export type ServiceControlResponse = z.infer<typeof ServiceControlResponseSchema>;

// Form validation schemas
export const SpannerConfigFormSchema = SpannerConfigCreateSchema.refine(
    (data) => {
        // At least one querying protocol must be supported
        const hasDimseSupport = data.supports_cfind || data.supports_cget || data.supports_cmove;
        const hasDicomWebSupport = data.supports_qido || data.supports_wado;
        return hasDimseSupport || hasDicomWebSupport;
    },
    {
        message: "At least one querying protocol (DIMSE or DICOMweb) must be supported",
        path: ["supports_cfind"], // Path where error will be attached
    }
);

export const SourceMappingFormSchema = SpannerSourceMappingCreateSchema.refine(
    (data) => {
        // Validate query filter JSON if provided
        if (data.query_filter && data.query_filter.trim()) {
            try {
                JSON.parse(data.query_filter);
                return true;
            } catch {
                return false;
            }
        }
        return true;
    },
    {
        message: "Query filter must be valid JSON",
        path: ["query_filter"],
    }
);

// Export type aliases for backward compatibility
export type {
    FailureStrategyEnum as FailureStrategy,
    SpannerProtocolEnum as SpannerProtocol,
    SourceTypeEnum as SourceType,
};

// Export the enum values for use in components
export const FAILURE_STRATEGIES = ['FAIL_FAST', 'BEST_EFFORT', 'MINIMUM_THRESHOLD'] as const;
export const SPANNER_PROTOCOLS = ['dimse', 'dicomweb', 'google_healthcare'] as const;
export const SOURCE_TYPES = ['dimse_qr', 'dicomweb', 'google_healthcare'] as const;
