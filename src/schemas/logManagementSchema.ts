// src/schemas/logManagementSchema.ts
import { z } from 'zod';

// ===============================
// RETENTION POLICIES SCHEMAS
// ===============================

// Retention Tier Enum
export const RetentionTierSchema = z.enum(['critical', 'operational', 'debug']);
export type RetentionTier = z.infer<typeof RetentionTierSchema>;

// Log Retention Policy Create Schema
export const LogRetentionPolicyCreateSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().nullable().optional(),
    service_pattern: z.string().min(1).max(200),
    log_level_filter: z.string().max(20).nullable().optional(),
    tier: RetentionTierSchema,
    hot_days: z.number().int().min(1).max(365),
    warm_days: z.number().int().min(1).max(1095),
    cold_days: z.number().int().min(1).max(2555),
    delete_days: z.number().int().min(1).max(3650),
    max_index_size_gb: z.number().int().min(1).max(10000),
    max_index_age_days: z.number().int().min(1).max(3650),
    storage_class_hot: z.string().max(50),
    storage_class_warm: z.string().max(50),
    storage_class_cold: z.string().max(50),
    is_active: z.boolean().default(true),
});

export type LogRetentionPolicyCreate = z.infer<typeof LogRetentionPolicyCreateSchema>;

// Log Retention Policy Response Schema
export const LogRetentionPolicyResponseSchema = LogRetentionPolicyCreateSchema.extend({
    id: z.number().int(),
    created_at: z.string(),
    updated_at: z.string(),
});

export type LogRetentionPolicyResponse = z.infer<typeof LogRetentionPolicyResponseSchema>;

// Log Retention Policy Update Schema
export const LogRetentionPolicyUpdateSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().nullable().optional(),
    service_pattern: z.string().min(1).max(200).optional(),
    log_level_filter: z.string().max(20).nullable().optional(),
    tier: RetentionTierSchema.optional(),
    hot_days: z.number().int().min(1).max(365).optional(),
    warm_days: z.number().int().min(1).max(1095).optional(),
    cold_days: z.number().int().min(1).max(2555).optional(),
    delete_days: z.number().int().min(1).max(3650).optional(),
    max_index_size_gb: z.number().int().min(1).max(10000).optional(),
    max_index_age_days: z.number().int().min(1).max(3650).optional(),
    storage_class_hot: z.string().max(50).optional(),
    storage_class_warm: z.string().max(50).optional(),
    storage_class_cold: z.string().max(50).optional(),
    is_active: z.boolean().optional(),
});

export type LogRetentionPolicyUpdate = z.infer<typeof LogRetentionPolicyUpdateSchema>;

// ===============================
// ARCHIVAL RULES SCHEMAS
// ===============================

// Log Archival Rule Create Schema
export const LogArchivalRuleCreateSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().nullable().optional(),
    service_pattern: z.string().min(1).max(200),
    age_threshold_days: z.number().int().min(1).max(3650),
    storage_backend: z.string().max(20),
    storage_bucket: z.string().min(1).max(200),
    storage_path_prefix: z.string().max(500),
    compression: z.string().max(10),
    format_type: z.string().max(10),
    retention_days: z.number().int().min(1).max(10950),
    delete_after_archive: z.boolean().default(true),
    is_active: z.boolean().default(true),
    cron_schedule: z.string().min(1).max(100),
});

export type LogArchivalRuleCreate = z.infer<typeof LogArchivalRuleCreateSchema>;

// Log Archival Rule Response Schema
export const LogArchivalRuleResponseSchema = LogArchivalRuleCreateSchema.extend({
    id: z.number().int(),
    last_run: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string(),
});

export type LogArchivalRuleResponse = z.infer<typeof LogArchivalRuleResponseSchema>;

// Log Archival Rule Update Schema
export const LogArchivalRuleUpdateSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().nullable().optional(),
    service_pattern: z.string().min(1).max(200).optional(),
    age_threshold_days: z.number().int().min(1).max(3650).optional(),
    storage_backend: z.string().max(20).optional(),
    storage_bucket: z.string().min(1).max(200).optional(),
    storage_path_prefix: z.string().max(500).optional(),
    compression: z.string().max(10).optional(),
    format_type: z.string().max(10).optional(),
    retention_days: z.number().int().min(1).max(10950).optional(),
    delete_after_archive: z.boolean().optional(),
    is_active: z.boolean().optional(),
    cron_schedule: z.string().min(1).max(100).optional(),
});

export type LogArchivalRuleUpdate = z.infer<typeof LogArchivalRuleUpdateSchema>;

// ===============================
// ELASTICSEARCH MANAGEMENT SCHEMAS
// ===============================

// Elasticsearch ILM Policy
export const ElasticsearchPolicySchema = z.object({
    name: z.string(),
    version: z.number(),
    modified_date: z.string().nullable().optional(),
    policy: z.record(z.any()),
});

export type ElasticsearchPolicy = z.infer<typeof ElasticsearchPolicySchema>;

// Elasticsearch Index
export const ElasticsearchIndexSchema = z.object({
    index: z.string(),
    health: z.string(),
    status: z.string(),
    uuid: z.string(),
    pri: z.number(),
    rep: z.number(),
    docs_count: z.number(),
    docs_deleted: z.number(),
    store_size: z.string(),
    pri_store_size: z.string(),
});

export type ElasticsearchIndex = z.infer<typeof ElasticsearchIndexSchema>;

// ===============================
// STATISTICS AND HEALTH SCHEMAS
// ===============================

// Log Statistics Schema
export const LogStatisticsSchema = z.object({
    total_indices: z.number().int(),
    total_size_bytes: z.number().int(),
    total_documents: z.number().int(),
    active_policies: z.number().int(),
    oldest_log_date: z.string().nullable().optional(),
    newest_log_date: z.string().nullable().optional(),
    daily_ingestion_rate: z.number().optional(),
    weekly_ingestion_rate: z.number().optional(),
    retention_savings: z.object({
        hot_tier_savings_gb: z.number(),
        warm_tier_savings_gb: z.number(),
        cold_tier_savings_gb: z.number(),
        deleted_data_gb: z.number(),
    }).optional(),
    index_breakdown: z.array(z.object({
        index_pattern: z.string(),
        count: z.number(),
        size_bytes: z.number(),
        oldest_date: z.string().nullable().optional(),
        newest_date: z.string().nullable().optional(),
    })).optional(),
});

export type LogStatistics = z.infer<typeof LogStatisticsSchema>;

// Health Check Schema
export const LogManagementHealthSchema = z.object({
    status: z.enum(['healthy', 'degraded', 'unhealthy']),
    elasticsearch_connection: z.boolean(),
    policies_sync_status: z.enum(['synced', 'out_of_sync', 'error']),
    last_sync_time: z.string().nullable().optional(),
    active_policies_count: z.number().int(),
    active_archival_rules_count: z.number().int(),
    issues: z.array(z.string()).optional(),
});

export type LogManagementHealth = z.infer<typeof LogManagementHealthSchema>;

// ===============================
// API OPERATION RESPONSE SCHEMAS
// ===============================

// Sync Policies Response
export const SyncPoliciesResponseSchema = z.object({
    status: z.enum(['success', 'partial', 'failed']),
    message: z.string(),
    synced_policies: z.array(z.string()),
    failed_policies: z.array(z.object({
        policy_name: z.string(),
        error: z.string(),
    })),
    total_policies: z.number().int(),
    successful_policies: z.number().int(),
    failed_policies_count: z.number().int(),
});

export type SyncPoliciesResponse = z.infer<typeof SyncPoliciesResponseSchema>;

// Apply Templates Response
export const ApplyTemplatesResponseSchema = z.object({
    status: z.enum(['success', 'partial', 'failed']),
    message: z.string(),
    applied_templates: z.array(z.string()),
    failed_templates: z.array(z.object({
        template_name: z.string(),
        error: z.string(),
    })),
    total_templates: z.number().int(),
    successful_templates: z.number().int(),
});

export type ApplyTemplatesResponse = z.infer<typeof ApplyTemplatesResponseSchema>;

// ===============================
// QUERY PARAMETER SCHEMAS
// ===============================

// List Retention Policies Query
export const ListRetentionPoliciesQuerySchema = z.object({
    skip: z.number().int().min(0).default(0),
    limit: z.number().int().min(1).max(500).default(100),
    active_only: z.boolean().default(false),
});

export type ListRetentionPoliciesQuery = z.infer<typeof ListRetentionPoliciesQuerySchema>;

// List Archival Rules Query
export const ListArchivalRulesQuerySchema = z.object({
    skip: z.number().int().min(0).default(0),
    limit: z.number().int().min(1).max(500).default(100),
    active_only: z.boolean().default(false),
});

export type ListArchivalRulesQuery = z.infer<typeof ListArchivalRulesQuerySchema>;
