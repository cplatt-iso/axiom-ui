// src/pages/SpannerAnalyticsPage.tsx
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
    ChartBarIcon, 
    ClockIcon, 
    ServerIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { subDays, startOfDay, endOfDay } from 'date-fns';

import { 
    getSpannerMetrics, 
    getSpannerConfigs
} from '../services/api';
import MetricsChart from '../components/spanner/MetricsChart';
import PerformanceTable from '../components/spanner/PerformanceTable';
import MetricsCard from '../components/spanner/MetricsCard';
import DateRangePicker from '../components/spanner/DateRangePicker';

interface DateRange {
    from: Date;
    to: Date;
}

interface SourceMetric {
    source_id: number;
    source_name: string;
    queries: number;
    successes: number;
    failures: number;
    avg_response_time_ms: number;
}

interface ProcessedSourceMetric extends SourceMetric {
    totalResponseTime: number;
    success_rate?: number;
}

const SpannerAnalyticsPage: React.FC = () => {
    // State
    const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
    const [dateRange, setDateRange] = useState<DateRange>({
        from: startOfDay(subDays(new Date(), 7)), // Last 7 days
        to: endOfDay(new Date()),
    });

    // Data fetching
    const { 
        data: configsResponse = [], 
        isLoading: isLoadingConfigs,
        error: configsError 
    } = useQuery({
        queryKey: ['spanner-configs'],
        queryFn: () => getSpannerConfigs(),
    });

    // Ensure configs is always an array and log for debugging
    const configs = React.useMemo(() => {
        if (configsResponse && !Array.isArray(configsResponse)) {
            console.warn('getSpannerConfigs returned non-array data:', configsResponse);
            return [];
        }
        return Array.isArray(configsResponse) ? configsResponse : [];
    }, [configsResponse]);

    const {
        data: metricsData = [],
        isLoading: isLoadingMetrics,
        error: metricsError
    } = useQuery({
        queryKey: [
            'spanner-metrics', 
            selectedConfigId, 
            dateRange.from.toISOString(), 
            dateRange.to.toISOString()
        ],
        queryFn: () => getSpannerMetrics(
            selectedConfigId || undefined,
            dateRange.from.toISOString(),
            dateRange.to.toISOString()
        ),
        enabled: configs.length > 0,
    });

    // Computed metrics
    const aggregatedMetrics = useMemo(() => {
        if (!metricsData || metricsData.length === 0) {
            return {
                totalQueries: 0,
                successfulQueries: 0,
                failedQueries: 0,
                averageResponseTime: 0,
                medianResponseTime: 0,
                p95ResponseTime: 0,
                successRate: 0,
                totalResultsBeforeDedup: 0,
                totalResultsAfterDedup: 0,
                deduplicationRate: 0,
                topPerformingSources: [],
                worstPerformingSources: [],
            };
        }

        const totals = metricsData.reduce((acc, metric) => ({
            totalQueries: acc.totalQueries + metric.total_queries,
            successfulQueries: acc.successfulQueries + metric.successful_queries,
            failedQueries: acc.failedQueries + metric.failed_queries,
            totalResultsBeforeDedup: acc.totalResultsBeforeDedup + metric.total_results_before_dedup,
            totalResultsAfterDedup: acc.totalResultsAfterDedup + metric.total_results_after_dedup,
            responseTimes: [...acc.responseTimes, metric.average_response_time_ms],
            medianTimes: [...acc.medianTimes, metric.median_response_time_ms],
            p95Times: [...acc.p95Times, metric.p95_response_time_ms],
        }), {
            totalQueries: 0,
            successfulQueries: 0,
            failedQueries: 0,
            totalResultsBeforeDedup: 0,
            totalResultsAfterDedup: 0,
            responseTimes: [] as number[],
            medianTimes: [] as number[],
            p95Times: [] as number[],
        });

        const allSources = metricsData.flatMap(metric => metric.source_metrics);
        const sourcePerformance = allSources.reduce((acc, source) => {
            const key = `${source.source_id}-${source.source_name}`;
            if (!acc[key]) {
                acc[key] = {
                    ...source,
                    queries: 0,
                    successes: 0,
                    failures: 0,
                    totalResponseTime: 0,
                };
            }
            acc[key].queries += source.queries;
            acc[key].successes += source.successes;
            acc[key].failures += source.failures;
            acc[key].totalResponseTime += source.avg_response_time_ms * source.queries;
            return acc;
        }, {} as Record<string, ProcessedSourceMetric>);

        const sourceMetrics = Object.values(sourcePerformance).map((source: ProcessedSourceMetric) => ({
            ...source,
            avg_response_time_ms: source.queries > 0 ? source.totalResponseTime / source.queries : 0,
            success_rate: source.queries > 0 ? source.successes / source.queries : 0,
        }));

        const topPerformingSources = sourceMetrics
            .sort((a, b) => b.success_rate - a.success_rate)
            .slice(0, 5);

        const worstPerformingSources = sourceMetrics
            .filter(s => s.queries > 10) // Only consider sources with meaningful query count
            .sort((a, b) => a.success_rate - b.success_rate)
            .slice(0, 5);

        return {
            totalQueries: totals.totalQueries,
            successfulQueries: totals.successfulQueries,
            failedQueries: totals.failedQueries,
            averageResponseTime: totals.responseTimes.length > 0 
                ? totals.responseTimes.reduce((a, b) => a + b, 0) / totals.responseTimes.length 
                : 0,
            medianResponseTime: totals.medianTimes.length > 0
                ? totals.medianTimes.reduce((a, b) => a + b, 0) / totals.medianTimes.length
                : 0,
            p95ResponseTime: totals.p95Times.length > 0
                ? Math.max(...totals.p95Times)
                : 0,
            successRate: totals.totalQueries > 0 ? totals.successfulQueries / totals.totalQueries : 0,
            totalResultsBeforeDedup: totals.totalResultsBeforeDedup,
            totalResultsAfterDedup: totals.totalResultsAfterDedup,
            deduplicationRate: totals.totalResultsBeforeDedup > 0 
                ? (totals.totalResultsBeforeDedup - totals.totalResultsAfterDedup) / totals.totalResultsBeforeDedup 
                : 0,
            topPerformingSources,
            worstPerformingSources,
        };
    }, [metricsData]);

    const handleDateRangeChange = (range: DateRange) => {
        setDateRange(range);
    };

    const formatNumber = (num: number) => {
        if (num >= 1000000) {
            return `${(num / 1000000).toFixed(1)}M`;
        }
        if (num >= 1000) {
            return `${(num / 1000).toFixed(1)}K`;
        }
        return num.toString();
    };

    const formatTime = (ms: number) => {
        if (ms >= 1000) {
            return `${(ms / 1000).toFixed(2)}s`;
        }
        return `${ms.toFixed(0)}ms`;
    };

    const formatPercentage = (rate: number) => {
        return `${(rate * 100).toFixed(1)}%`;
    };

    // Error handling
    if (configsError) {
        return (
            <div className="text-center py-12">
                <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    Failed to load spanner configurations
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {configsError instanceof Error ? configsError.message : 'An unknown error occurred'}
                </p>
            </div>
        );
    }

    if (metricsError) {
        return (
            <div className="text-center py-12">
                <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    Failed to load analytics data
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {metricsError instanceof Error ? metricsError.message : 'An unknown error occurred'}
                </p>
            </div>
        );
    }

    // Loading state
    if (isLoadingConfigs) {
        return (
            <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    Loading configurations...
                </h3>
            </div>
        );
    }

    // No configurations state
    if (!isLoadingConfigs && configs.length === 0) {
        return (
            <div className="text-center py-12">
                <ServerIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    No Spanner Configurations Found
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Create a spanner configuration first to view analytics data.
                </p>
                <div className="mt-6">
                    <a
                        href="/admin/query-spanning/configurations"
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        <ServerIcon className="-ml-1 mr-2 h-5 w-5" />
                        Create Configuration
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Spanner Analytics
                    </h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Performance metrics and system health monitoring
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Configuration Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Spanner Configuration
                        </label>
                        <select
                            value={selectedConfigId || 'all'}
                            onChange={(e) => setSelectedConfigId(e.target.value === 'all' ? null : Number(e.target.value))}
                            className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        >
                            <option value="all">All Configurations</option>
                            {configs.map((config) => (
                                <option key={config.id} value={config.id}>
                                    {config.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Date Range Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Date Range
                        </label>
                        <DateRangePicker
                            value={dateRange}
                            onChange={handleDateRangeChange}
                        />
                    </div>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricsCard
                    title="Total Queries"
                    value={formatNumber(aggregatedMetrics.totalQueries)}
                    icon={ChartBarIcon}
                    color="blue"
                />
                <MetricsCard
                    title="Success Rate"
                    value={formatPercentage(aggregatedMetrics.successRate)}
                    icon={CheckCircleIcon}
                    color={aggregatedMetrics.successRate >= 0.95 ? "green" : aggregatedMetrics.successRate >= 0.8 ? "yellow" : "red"}
                    trend={aggregatedMetrics.successRate >= 0.95 ? "up" : "down"}
                />
                <MetricsCard
                    title="Avg Response Time"
                    value={formatTime(aggregatedMetrics.averageResponseTime)}
                    icon={ClockIcon}
                    color={aggregatedMetrics.averageResponseTime <= 1000 ? "green" : aggregatedMetrics.averageResponseTime <= 3000 ? "yellow" : "red"}
                />
                <MetricsCard
                    title="Deduplication Rate"
                    value={formatPercentage(aggregatedMetrics.deduplicationRate)}
                    icon={ServerIcon}
                    color="purple"
                    trend="up"
                />
            </div>

            {/* Performance Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MetricsChart
                    title="Query Volume Over Time"
                    data={metricsData}
                    dataKey="total_queries"
                    color="#3B82F6"
                    isLoading={isLoadingMetrics}
                />
                <MetricsChart
                    title="Response Time Trends"
                    data={metricsData}
                    dataKey="average_response_time_ms"
                    color="#EF4444"
                    isLoading={isLoadingMetrics}
                    formatValue={formatTime}
                />
            </div>

            {/* Detailed Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Response Time Breakdown */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Response Time Breakdown
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Average</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {formatTime(aggregatedMetrics.averageResponseTime)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Median</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {formatTime(aggregatedMetrics.medianResponseTime)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">95th Percentile</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {formatTime(aggregatedMetrics.p95ResponseTime)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Query Results */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Query Results
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Successful</span>
                            <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                {formatNumber(aggregatedMetrics.successfulQueries)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Failed</span>
                            <span className="text-sm font-medium text-red-600 dark:text-red-400">
                                {formatNumber(aggregatedMetrics.failedQueries)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Success Rate</span>
                            <span className={`text-sm font-medium ${
                                aggregatedMetrics.successRate >= 0.95 
                                    ? 'text-green-600 dark:text-green-400'
                                    : aggregatedMetrics.successRate >= 0.8
                                    ? 'text-yellow-600 dark:text-yellow-400'
                                    : 'text-red-600 dark:text-red-400'
                            }`}>
                                {formatPercentage(aggregatedMetrics.successRate)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Deduplication Stats */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Deduplication
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Before</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {formatNumber(aggregatedMetrics.totalResultsBeforeDedup)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">After</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {formatNumber(aggregatedMetrics.totalResultsAfterDedup)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Efficiency</span>
                            <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                                {formatPercentage(aggregatedMetrics.deduplicationRate)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Source Performance Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PerformanceTable
                    title="Top Performing Sources"
                    sources={aggregatedMetrics.topPerformingSources}
                    type="top"
                />
                <PerformanceTable
                    title="Sources Needing Attention"
                    sources={aggregatedMetrics.worstPerformingSources}
                    type="worst"
                />
            </div>
        </div>
    );
};

export default SpannerAnalyticsPage;
