// src/components/system-config/SysInfoDisplay.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
    InfoIcon, 
    ServerIcon, 
    DatabaseIcon, 
    CpuIcon, 
    FolderIcon,
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon,
    AlertTriangleIcon,
    BrainIcon,
    NetworkIcon
} from 'lucide-react';
import { getSystemInfo, type SystemInfo } from '@/services/api';

const StatusBadge: React.FC<{ status: string; error?: string | null }> = ({ status, error }) => {
    const getStatusConfig = () => {
        switch (status) {
            case 'connected':
                return { 
                    variant: 'default' as const, 
                    icon: CheckCircleIcon, 
                    className: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400' 
                };
            case 'error':
                return { 
                    variant: 'destructive' as const, 
                    icon: XCircleIcon, 
                    className: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400' 
                };
            default:
                return { 
                    variant: 'secondary' as const, 
                    icon: AlertTriangleIcon, 
                    className: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400' 
                };
        }
    };

    const config = getStatusConfig();
    const Icon = config.icon;

    return (
        <Badge variant={config.variant} className={`${config.className} flex items-center gap-1`} title={error || status}>
            <Icon className="h-3 w-3" />
            {status}
        </Badge>
    );
};

const SysInfoDisplay: React.FC = () => {
    const { data: systemInfo, isLoading, error } = useQuery<SystemInfo, Error>({
        queryKey: ['system-info'],
        queryFn: getSystemInfo,
        refetchInterval: 30000, // Refresh every 30 seconds
    });

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertTriangleIcon className="h-4 w-4" />
                <AlertDescription>
                    Failed to load system information: {error.message}
                </AlertDescription>
            </Alert>
        );
    }

    if (isLoading || !systemInfo) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header with Project Info */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <InfoIcon className="h-6 w-6 text-blue-600" />
                            <div>
                                <CardTitle className="text-xl">{systemInfo.project_name}</CardTitle>
                                <CardDescription>
                                    Version {systemInfo.project_version} • {systemInfo.environment} environment
                                </CardDescription>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            {systemInfo.debug_mode && (
                                <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                                    Debug Mode
                                </Badge>
                            )}
                            <Badge variant="secondary">
                                {systemInfo.log_level}
                            </Badge>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Service Status Overview */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <ServerIcon className="mr-2 h-5 w-5" />
                        Service Status
                    </CardTitle>
                    <CardDescription>
                        Current status of critical system services
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {Object.entries(systemInfo.services_status).map(([service, status]) => (
                            <div key={service} className="flex items-center justify-between p-3 border rounded-lg">
                                <span className="font-medium capitalize">{service}</span>
                                <StatusBadge status={status.status} error={status.error} />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                
                {/* Database Configuration */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center text-base">
                            <DatabaseIcon className="mr-2 h-4 w-4" />
                            Database
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Server:</span>
                                <span className="font-mono">{systemInfo.postgres_server}:{systemInfo.postgres_port}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Database:</span>
                                <span className="font-mono">{systemInfo.postgres_db}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">User:</span>
                                <span className="font-mono">{systemInfo.postgres_user}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Status:</span>
                                <StatusBadge status={systemInfo.database_connected ? 'connected' : 'error'} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* AI Services */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center text-base">
                            <BrainIcon className="mr-2 h-4 w-4" />
                            AI Services
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">OpenAI</span>
                                <StatusBadge status={systemInfo.openai_configured ? 'connected' : 'error'} />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Vertex AI</span>
                                <StatusBadge status={systemInfo.vertex_ai_configured ? 'connected' : 'error'} />
                            </div>
                            {systemInfo.vertex_ai_configured && (
                                <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs space-y-1">
                                    <div>Project: {systemInfo.vertex_ai_project}</div>
                                    <div>Model: {systemInfo.vertex_ai_model_name}</div>
                                    <div>Region: {systemInfo.vertex_ai_location}</div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Celery Workers */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center text-base">
                            <CpuIcon className="mr-2 h-4 w-4" />
                            Task Processing
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Worker Concurrency:</span>
                                <span className="font-mono">{systemInfo.celery_worker_concurrency}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Prefetch Multiplier:</span>
                                <span className="font-mono">{systemInfo.celery_prefetch_multiplier}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Max Retries:</span>
                                <span className="font-mono">{systemInfo.celery_task_max_retries}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Retry Delay:</span>
                                <span className="font-mono">{systemInfo.celery_task_retry_delay}s</span>
                            </div>
                        </div>
                        <div className="pt-2 border-t">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">Broker Status:</span>
                                <StatusBadge status={systemInfo.celery_broker_configured ? 'connected' : 'error'} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* DICOM Paths */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center text-base">
                            <FolderIcon className="mr-2 h-4 w-4" />
                            DICOM Storage Paths
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="space-y-2 text-xs">
                            <div>
                                <div className="text-gray-600 dark:text-gray-400 mb-1">Incoming:</div>
                                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded block break-all">
                                    {systemInfo.dicom_storage_path}
                                </code>
                            </div>
                            <div>
                                <div className="text-gray-600 dark:text-gray-400 mb-1">Processed:</div>
                                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded block break-all">
                                    {systemInfo.filesystem_storage_path}
                                </code>
                            </div>
                            <div>
                                <div className="text-gray-600 dark:text-gray-400 mb-1">Errors:</div>
                                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded block break-all">
                                    {systemInfo.dicom_error_path}
                                </code>
                            </div>
                            {systemInfo.use_dustbin_system && (
                                <div>
                                    <div className="text-gray-600 dark:text-gray-400 mb-1">Dustbin:</div>
                                    <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded block break-all">
                                        {systemInfo.dicom_dustbin_path}
                                    </code>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Batch Processing */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center text-base">
                            <ClockIcon className="mr-2 h-4 w-4" />
                            Batch Processing
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Completion Timeout:</span>
                                <span className="font-mono">{systemInfo.exam_batch_completion_timeout}h</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Check Interval:</span>
                                <span className="font-mono">{systemInfo.exam_batch_check_interval}min</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Send Interval:</span>
                                <span className="font-mono">{systemInfo.exam_batch_send_interval}min</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Max Concurrent:</span>
                                <span className="font-mono">{systemInfo.exam_batch_max_concurrent}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Network Services */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center text-base">
                            <NetworkIcon className="mr-2 h-4 w-4" />
                            Network Services
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="space-y-2 text-sm">
                            <div>
                                <div className="text-gray-600 dark:text-gray-400 mb-1">Redis Cache:</div>
                                <div className="flex justify-between items-center">
                                    <span className="font-mono">{systemInfo.redis_host}:{systemInfo.redis_port}</span>
                                    <StatusBadge status={systemInfo.redis_configured ? 'connected' : 'error'} />
                                </div>
                            </div>
                            <div>
                                <div className="text-gray-600 dark:text-gray-400 mb-1">RabbitMQ:</div>
                                <div className="flex justify-between items-center">
                                    <span className="font-mono">{systemInfo.rabbitmq_host}:{systemInfo.rabbitmq_port}</span>
                                    <StatusBadge status={systemInfo.celery_broker_configured ? 'connected' : 'error'} />
                                </div>
                            </div>
                            <div>
                                <div className="text-gray-600 dark:text-gray-400 mb-1">OAuth:</div>
                                <StatusBadge status={systemInfo.google_oauth_configured ? 'connected' : 'error'} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
};

export default SysInfoDisplay;
