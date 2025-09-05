// src/components/RecentErrorsWidget.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
    AlertCircleIcon, 
    AlertTriangleIcon,
    ZapIcon
} from 'lucide-react';
import { LogViewerModal } from '@/components/logs';
import { getRecentLogs } from '@/services/api';
import { LogResponse } from '@/schemas/loggingSchema';
import { format } from 'date-fns';

const RecentErrorsWidget: React.FC = () => {
    const { data: recentErrors, isLoading } = useQuery<LogResponse>({
        queryKey: ['recent-errors'],
        queryFn: () => getRecentLogs({
            minutes: 60, // Last hour
            level: 'ERROR',
            limit: 500, // API maximum
        }),
        refetchInterval: 30000, // Refresh every 30 seconds
    });

    const { data: recentCritical } = useQuery<LogResponse>({
        queryKey: ['recent-critical'],
        queryFn: () => getRecentLogs({
            minutes: 60,
            level: 'CRITICAL', 
            limit: 500, // API maximum
        }),
        refetchInterval: 30000,
    });

    const criticalCount = recentCritical?.entries.length || 0;
    const errorCount = recentErrors?.entries.length || 0;
    const totalIssues = criticalCount + errorCount;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium flex items-center">
                    <AlertCircleIcon className="mr-2 h-4 w-4 text-red-500" />
                    Recent Issues
                </CardTitle>
                <div className="flex items-center gap-2">
                    {totalIssues > 0 && (
                        <Badge variant="destructive" className="text-xs">
                            {totalIssues} issues
                        </Badge>
                    )}
                    <LogViewerModal
                        level="ERROR"
                        buttonText="View All"
                        buttonVariant="outline"
                    />
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-2">
                        <div className="animate-pulse bg-gray-200 h-4 rounded"></div>
                        <div className="animate-pulse bg-gray-200 h-4 rounded w-3/4"></div>
                        <div className="animate-pulse bg-gray-200 h-4 rounded w-1/2"></div>
                    </div>
                ) : totalIssues === 0 ? (
                    <p className="text-sm text-green-600 dark:text-green-400 flex items-center">
                        <span className="mr-1">✓</span>
                        No critical issues in the last hour
                    </p>
                ) : (
                    <div className="space-y-3">
                        {/* Critical Issues */}
                        {criticalCount > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <ZapIcon className="h-3 w-3 text-red-600" />
                                    <span className="text-sm font-medium text-red-600">
                                        {criticalCount} Critical
                                    </span>
                                </div>
                                <div className="ml-5 space-y-1">
                                    {recentCritical?.entries.slice(0, 2).map((log, idx) => (
                                        <div key={idx} className="text-xs text-gray-600 dark:text-gray-400">
                                            <span className="font-mono mr-2">
                                                {format(new Date(log.timestamp), 'HH:mm')}
                                            </span>
                                            <span className="font-medium mr-2">{log.service}:</span>
                                            <span className="truncate block max-w-xs">
                                                {log.message.substring(0, 80)}
                                                {log.message.length > 80 && '...'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Error Issues */}
                        {errorCount > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertTriangleIcon className="h-3 w-3 text-orange-500" />
                                    <span className="text-sm font-medium text-orange-600">
                                        {errorCount} Errors
                                    </span>
                                </div>
                                <div className="ml-5 space-y-1">
                                    {recentErrors?.entries.slice(0, 2).map((log, idx) => (
                                        <div key={idx} className="text-xs text-gray-600 dark:text-gray-400">
                                            <span className="font-mono mr-2">
                                                {format(new Date(log.timestamp), 'HH:mm')}
                                            </span>
                                            <span className="font-medium mr-2">{log.service}:</span>
                                            <span className="truncate block max-w-xs">
                                                {log.message.substring(0, 80)}
                                                {log.message.length > 80 && '...'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="pt-2 border-t">
                            <LogViewerModal
                                level="ERROR"
                                buttonText="Investigate Issues"
                                buttonVariant="ghost"
                            />
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default RecentErrorsWidget;
