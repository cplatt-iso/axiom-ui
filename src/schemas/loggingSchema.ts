// src/schemas/loggingSchema.ts
import { z } from 'zod';

// Log entry structure
export const LogEntrySchema = z.object({
    timestamp: z.string(),
    level: z.string(),
    message: z.string(),
    service: z.string(),
    container_name: z.string(),
    source: z.string().nullable(),
    extra_fields: z.record(z.string(), z.any()).optional(),
});

export type LogEntry = z.infer<typeof LogEntrySchema>;

// Log response structure
export const LogResponseSchema = z.object({
    entries: z.array(LogEntrySchema),
    total: z.number(),
    took_ms: z.number().nullable(),
    query_params: z.record(z.string(), z.any()),
    error: z.string().nullable(),
});

export type LogResponse = z.infer<typeof LogResponseSchema>;

// Log query request structure
export const LogQueryRequestSchema = z.object({
    start_time: z.string().nullable().optional(),
    end_time: z.string().nullable().optional(),
    level: z.string().nullable().optional(),
    service: z.string().nullable().optional(),
    container_name: z.string().nullable().optional(),
    search_text: z.string().nullable().optional(),
    limit: z.number().min(1).max(1000).default(100),
    offset: z.number().min(0).default(0),
});

export type LogQueryRequest = z.infer<typeof LogQueryRequestSchema>;

// Log services response
export const LogServicesResponseSchema = z.object({
    services: z.array(z.string()),
    containers: z.array(z.string()),
    levels: z.array(z.string()),
});

export type LogServicesResponse = z.infer<typeof LogServicesResponseSchema>;

// Query parameters for GET requests
export interface LogQueryParams {
    start_time?: string;
    end_time?: string;
    level?: string;
    service?: string;
    container_name?: string;
    search_text?: string;
    limit?: number;
    offset?: number;
}

// Parameters for recent logs
export interface RecentLogsParams {
    minutes?: number;
    level?: string;
    service?: string;
    limit?: number;
}

// === LOGGING CONFIGURATION SCHEMAS ===

// Elasticsearch Configuration Schema
export const ElasticsearchConfigSchema = z.object({
    host: z.string().min(1, 'Host is required'),
    port: z.number().int().min(1).max(65535).default(9200),
    scheme: z.enum(['http', 'https']).default('https'),
    username: z.string().nullable().optional(),
    password: z.string().nullable().optional(),
    verify_certs: z.boolean().default(true),
    ca_cert_path: z.string().nullable().optional(),
    index_pattern: z.string().default('axiom-flow-*'),
    timeout_seconds: z.number().int().min(1).max(300).default(10),
    max_retries: z.number().int().min(0).max(10).default(3),
});

export type ElasticsearchConfig = z.infer<typeof ElasticsearchConfigSchema>;

// Fluentd Configuration Schema  
export const FluentdConfigSchema = z.object({
    host: z.string().default('127.0.0.1'),
    port: z.number().int().min(1).max(65535).default(24224),
    tag_prefix: z.string().default('axiom'),
    retry_wait: z.number().int().min(1).default(1),
    max_retries: z.number().int().min(1).default(60),
    buffer_size: z.string().default('10m'),
});

export type FluentdConfig = z.infer<typeof FluentdConfigSchema>;

// Complete Logging Configuration
export const LoggingConfigSchema = z.object({
    elasticsearch: ElasticsearchConfigSchema,
    fluentd: FluentdConfigSchema.nullable().optional(),
});

export type LoggingConfig = z.infer<typeof LoggingConfigSchema>;

// Response schemas
export const LoggingConfigResponseSchema = z.object({
    status: z.string(),
    message: z.string(), 
    config_applied: z.boolean().default(false),
    restart_required: z.boolean().default(false),
    errors: z.array(z.any()),
});

export type LoggingConfigResponse = z.infer<typeof LoggingConfigResponseSchema>;

export const ConnectionTestResultSchema = z.object({
    status: z.string(),
    message: z.string(),
    response_time_ms: z.number().nullable().optional(),
    details: z.record(z.any()).nullable().optional(),
});

export type ConnectionTestResult = z.infer<typeof ConnectionTestResultSchema>;
