// src/components/ScraperStatusWidget.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
// --- MODIFIED: Updated icons for three-column status display ---
import { AlertTriangle, CheckCircle, Link as LinkIcon, HelpCircle, Power, Clock, XCircle } from 'lucide-react';
// --- END MODIFIED ---
import { formatDistanceToNow } from 'date-fns';
import { formatNumber } from '@/utils/formatters';

// UI Components
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

// API/Schema/Type Imports
import { getDicomWebPollersStatus, getDimseQrSourcesStatus, getGoogleHealthcareSourcesStatus } from '@/services/api';
import { UnifiedScraperStatus } from '@/types/scrapers';
import { getScraperTypeStyle, ScraperType } from '@/utils/styleHelpers';
import { LogViewerModal } from '@/components/logs';

// Helper to format connection details
const formatConnectionDetails = (scraper: UnifiedScraperStatus): string => {
    if (scraper.scraperType === 'dicomweb') {
        return scraper.base_url ?? 'N/A';
    } else if (scraper.scraperType === 'dimse-qr') {
        const ae = scraper.remote_ae_title ?? '?AE?';
        const host = scraper.remote_host ?? '?HOST?';
        const port = scraper.remote_port ?? '?PORT?';
        return `${ae}@${host}:${port}`;
    } else if (scraper.scraperType === 'google-healthcare') {
        const project = scraper.gcp_project_id ?? '?PROJECT?';
        const location = scraper.gcp_location ?? '?LOCATION?';
        const dataset = scraper.gcp_dataset_id ?? '?DATASET?';
        const store = scraper.gcp_dicom_store_id ?? '?STORE?';
        return `${project}/${location}/${dataset}/${store}`;
    }
    return 'N/A';
};

// Helper for Counter Tooltips
const getCounterTooltip = (scraperType: ScraperType, counterType: 'found' | 'queued' | 'processed'): string => {
    switch(counterType) {
        case 'found':
            if (scraperType === 'dimse-qr') return 'Studies found via C-FIND';
            if (scraperType === 'google-healthcare') return 'Instances found via Healthcare API';
            return 'Instances found via QIDO-RS';
        case 'queued':
            if (scraperType === 'dimse-qr') return 'Studies queued for C-MOVE';
            if (scraperType === 'google-healthcare') return 'Instances queued for processing';
            return 'Instances queued for metadata processing';
        case 'processed':
            return 'Instances successfully processed after retrieval/queueing';
        default:
            return '';
    }
};

// Helper for Health Check Status
const getHealthCheckStatus = (scraper: UnifiedScraperStatus): { text: string; Icon: React.ElementType; variant: 'default' | 'destructive' | 'secondary' | 'outline'; tooltip: string } => {
    const healthStatus = scraper.health_status?.toLowerCase();
    const lastHealthCheck = scraper.last_health_check ? formatDistanceToNow(new Date(scraper.last_health_check), { addSuffix: true }) : 'never';
    
    if (healthStatus === 'ok') {
        return { 
            text: 'Healthy', 
            Icon: CheckCircle, 
            variant: 'default', 
            tooltip: `Health check passed ${lastHealthCheck}` 
        };
    }
    if (healthStatus === 'down' || healthStatus === 'error') {
        const healthError = scraper.last_health_error || 'Connection failed';
        return { 
            text: healthStatus === 'error' ? 'Error' : 'Down', 
            Icon: AlertTriangle, 
            variant: 'destructive', 
            tooltip: `Health check failed ${lastHealthCheck}: ${healthError}` 
        };
    }
    return { 
        text: 'Unknown', 
        Icon: HelpCircle, 
        variant: 'secondary', 
        tooltip: `Health status unknown. Last check: ${lastHealthCheck}` 
    };
};

// Helper for Polling Status
const getPollingStatus = (scraper: UnifiedScraperStatus): { text: string; Icon: React.ElementType; variant: 'default' | 'destructive' | 'secondary' | 'outline'; tooltip: string } => {
    if (!scraper.is_enabled) {
        return { 
            text: 'Disabled', 
            Icon: Power, 
            variant: 'outline', 
            tooltip: 'Source is disabled and not polling' 
        };
    }
    
    // Check if there's recent activity (successful run or error within last hour)
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    let hasRecentActivity = false;
    let recentActivityTime = '';
    
    if (scraper.last_successful_run) {
        const successDate = new Date(scraper.last_successful_run);
        if (successDate > oneHourAgo) {
            hasRecentActivity = true;
            recentActivityTime = formatDistanceToNow(successDate, { addSuffix: true });
        }
    }
    
    if (scraper.last_error_time) {
        const errorDate = new Date(scraper.last_error_time);
        if (errorDate > oneHourAgo) {
            const errorTime = formatDistanceToNow(errorDate, { addSuffix: true });
            return { 
                text: 'Error', 
                Icon: AlertTriangle, 
                variant: 'destructive', 
                tooltip: `Polling failed ${errorTime}: ${scraper.last_error_message || 'Unknown error'}` 
            };
        }
    }
    
    if (hasRecentActivity) {
        return { 
            text: 'Active', 
            Icon: CheckCircle, 
            variant: 'default', 
            tooltip: `Actively polling. Last successful poll ${recentActivityTime}` 
        };
    }
    
    return { 
        text: 'Inactive', 
        Icon: Clock, 
        variant: 'secondary', 
        tooltip: 'Enabled but no recent polling activity detected' 
    };
};

// Helper for Active Status
const getActiveStatus = (scraper: UnifiedScraperStatus): { text: string; Icon: React.ElementType; variant: 'default' | 'destructive' | 'secondary' | 'outline'; tooltip: string } => {
    if (scraper.is_active) {
        return { 
            text: 'Active', 
            Icon: CheckCircle, 
            variant: 'default', 
            tooltip: 'Source is currently active and available' 
        };
    } else {
        return { 
            text: 'Inactive', 
            Icon: XCircle, 
            variant: 'outline', 
            tooltip: 'Source is currently inactive' 
        };
    }
};


const ScraperStatusWidget: React.FC = () => {

    const { data: scrapers, isLoading, error } = useQuery({
        queryKey: ['unified-scraper-status'],
        queryFn: async () => {
            const [dicomWebResult, dimseQrResult, googleHealthcareResult] = await Promise.all([
                getDicomWebPollersStatus(),
                getDimseQrSourcesStatus(),
                getGoogleHealthcareSourcesStatus()
            ]);

            // Transform DICOMweb sources
            const unifiedDicomWeb: UnifiedScraperStatus[] = (dicomWebResult?.pollers || []).flatMap((s: unknown) => {
                // Type guard for DicomWebSourceStatus
                const isValidSource = s && typeof s === 'object' && 
                    'id' in s && 'source_name' in s && 'is_enabled' in s;
                if (!isValidSource) return [];
                
                const source = s as { 
                    id: number; 
                    source_name?: string; 
                    name?: string; 
                    is_enabled: boolean;
                    last_successful_run?: string;
                    last_error_run?: string;
                    last_error_message?: string;
                    found_instance_count?: number;
                    queued_instance_count?: number;
                    processed_instance_count?: number;
                    base_url?: string;
                    health_status?: string;
                    last_health_check?: string;
                    last_health_error?: string;
                };
                
                return [{
                    id: source.id,
                    name: source.source_name || source.name || '',
                    scraperType: 'dicomweb' as const,
                    is_enabled: source.is_enabled,
                    is_active: true, // Assume active if in status response
                    last_successful_run: source.last_successful_run,
                    last_error_time: source.last_error_run,
                    last_error_message: source.last_error_message,
                    description: null,
                    base_url: source.base_url || 'N/A',
                    health_status: (source.health_status as 'UNKNOWN' | 'OK' | 'DOWN' | 'ERROR') || undefined,
                    last_health_check: source.last_health_check,
                    last_health_error: source.last_health_error,
                    count_found: source.found_instance_count ?? 0,
                    count_queued: source.queued_instance_count ?? 0,
                    count_processed: source.processed_instance_count ?? 0,
                }];
            });

            // Transform DIMSE Q/R sources
            const unifiedDimseQr: UnifiedScraperStatus[] = (dimseQrResult?.sources || []).flatMap((s: unknown) => {
                // Type guard for DIMSE Q/R source
                const isValidSource = s && typeof s === 'object' && 
                    'id' in s && 'name' in s && 'is_enabled' in s;
                if (!isValidSource) return [];
                
                const source = s as { 
                    id: number; 
                    name: string; 
                    is_enabled: boolean;
                    last_successful_query?: string;
                    last_successful_move?: string;
                    last_error_time?: string;
                    last_error_message?: string;
                    remote_ae_title?: string;
                    remote_host?: string;
                    remote_port?: number;
                    health_status?: string;
                    last_health_check?: string;
                    last_health_error?: string;
                    found_study_count?: number;
                    queued_study_count?: number;
                    processed_study_count?: number;
                };
                
                return [{
                    id: source.id,
                    name: source.name,
                    scraperType: 'dimse-qr' as const,
                    is_enabled: source.is_enabled,
                    is_active: true, // Assume active if in status response
                    last_successful_run: source.last_successful_query ?? source.last_successful_move,
                    last_error_time: source.last_error_time,
                    last_error_message: source.last_error_message,
                    description: null,
                    remote_ae_title: source.remote_ae_title,
                    remote_host: source.remote_host,
                    remote_port: source.remote_port,
                    health_status: (source.health_status as 'UNKNOWN' | 'OK' | 'DOWN' | 'ERROR') || undefined,
                    last_health_check: source.last_health_check,
                    last_health_error: source.last_health_error,
                    count_found: source.found_study_count ?? 0,
                    count_queued: source.queued_study_count ?? 0,
                    count_processed: source.processed_study_count ?? 0,
                }];
            });

            // Transform Google Healthcare sources
            const unifiedGoogleHealthcare: UnifiedScraperStatus[] = (googleHealthcareResult?.sources || []).flatMap((s: unknown) => {
                // Type guard for Google Healthcare source
                const isValidSource = s && typeof s === 'object' && 
                    'id' in s && 'name' in s && 'is_enabled' in s;
                if (!isValidSource) return [];
                
                const source = s as { 
                    id: number; 
                    name: string; 
                    is_enabled: boolean;
                    last_successful_run?: string;
                    last_error_time?: string;
                    last_error_message?: string;
                    gcp_project_id?: string;
                    gcp_location?: string;
                    gcp_dataset_id?: string;
                    gcp_dicom_store_id?: string;
                    health_status?: string;
                    last_health_check?: string;
                    last_health_error?: string;
                    found_instance_count?: number;
                    queued_instance_count?: number;
                    processed_instance_count?: number;
                };
                
                return [{
                    id: source.id,
                    name: source.name,
                    scraperType: 'google-healthcare' as const,
                    is_enabled: source.is_enabled,
                    is_active: true, // Assume active if in status response
                    last_successful_run: source.last_successful_run,
                    last_error_time: source.last_error_time,
                    last_error_message: source.last_error_message,
                    description: null,
                    gcp_project_id: source.gcp_project_id,
                    gcp_location: source.gcp_location,
                    gcp_dataset_id: source.gcp_dataset_id,
                    gcp_dicom_store_id: source.gcp_dicom_store_id,
                    health_status: (source.health_status as 'UNKNOWN' | 'OK' | 'DOWN' | 'ERROR') || undefined,
                    last_health_check: source.last_health_check,
                    last_health_error: source.last_health_error,
                    count_found: source.found_instance_count ?? 0,
                    count_queued: source.queued_instance_count ?? 0,
                    count_processed: source.processed_instance_count ?? 0,
                }];
            });

            return [...unifiedDicomWeb, ...unifiedDimseQr, ...unifiedGoogleHealthcare];
        },
        refetchInterval: 45000, // Slower refresh due to slow backend
        staleTime: 20000, // Consider fresh for 20 seconds
        refetchIntervalInBackground: false,
    });

    return (
        <Card className="col-span-1 md:col-span-2 dark:bg-gray-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div>
                    <CardTitle>Data Source Status</CardTitle>
                    <CardDescription>Overview of DICOMweb, DIMSE Q/R, and Google Healthcare data sources with health checks.</CardDescription>
                </div>
                <LogViewerModal
                    service="scraper"
                    buttonText="View Logs"
                    buttonSize="sm"
                    buttonVariant="ghost"
                />
            </CardHeader>
            <CardContent>
                {isLoading && (
                     <div className="space-y-2">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-5/6" />
                    </div>
                )}
                 {error && (
                     <div className="text-red-600 dark:text-red-400 flex items-center space-x-2">
                        <AlertTriangle className="h-5 w-5" />
                        <span>Error loading data source statuses: {error?.message ?? 'Unknown error'}</span>
                    </div>
                 )}
                 {!isLoading && !error && scrapers && (
                     <TooltipProvider delayDuration={100}>
                        <Table className="table-fixed w-full">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px] px-2 text-center">Type</TableHead>
                                    <TableHead className="w-[25%]">Name</TableHead>
                                    <TableHead className="w-[30%]">Connection Info</TableHead>
                                    <TableHead className="w-[60px] text-center">Found</TableHead>
                                    <TableHead className="w-[60px] text-center">Queued</TableHead>
                                    <TableHead className="w-[60px] text-center">Proc</TableHead>
                                    <TableHead className="w-[80px] text-center">Health Check</TableHead>
                                    <TableHead className="w-[80px] text-center">Polling</TableHead>
                                    <TableHead className="w-[80px] text-center">Active</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {scrapers.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center text-muted-foreground">
                                            No data sources configured.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {scrapers.map((scraper: UnifiedScraperStatus) => {
                                     const style = getScraperTypeStyle(scraper.scraperType);
                                     const connectionDetails = formatConnectionDetails(scraper);
                                     const healthCheckStatus = getHealthCheckStatus(scraper);
                                     const pollingStatus = getPollingStatus(scraper);
                                     const activeStatus = getActiveStatus(scraper);
                                     return (
                                        <TableRow key={`${scraper.scraperType}-${scraper.id}`}>
                                            <TableCell className="px-2 text-center">
                                                 <Tooltip>
                                                     <TooltipTrigger asChild>
                                                         <div className="inline-block">
                                                            <style.Icon className={`h-5 w-5 ${style.textClass} `} />
                                                         </div>
                                                     </TooltipTrigger>
                                                     <TooltipContent>
                                                         <p>{scraper.scraperType.toUpperCase()}</p>
                                                     </TooltipContent>
                                                 </Tooltip>
                                            </TableCell>
                                            <TableCell className="font-medium truncate">
                                                <Tooltip>
                                                    <TooltipTrigger className="cursor-default">{scraper.name}</TooltipTrigger>
                                                    <TooltipContent>{scraper.name}</TooltipContent>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground truncate">
                                                <Tooltip>
                                                    <TooltipTrigger className="flex items-center space-x-1 cursor-default w-full">
                                                         <LinkIcon className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                                                         <span className="truncate">{connectionDetails}</span>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="bottom" align="start">
                                                        <p className="max-w-md break-words">{connectionDetails}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell className="text-center text-sm">
                                                 <Tooltip>
                                                     <TooltipTrigger className="cursor-default">{formatNumber(scraper.count_found ?? 0)}</TooltipTrigger>
                                                     <TooltipContent><p>{getCounterTooltip(scraper.scraperType, 'found')}</p></TooltipContent>
                                                 </Tooltip>
                                            </TableCell>
                                             <TableCell className="text-center text-sm">
                                                 <Tooltip>
                                                     <TooltipTrigger className="cursor-default">{formatNumber(scraper.count_queued ?? 0)}</TooltipTrigger>
                                                     <TooltipContent><p>{getCounterTooltip(scraper.scraperType, 'queued')}</p></TooltipContent>
                                                 </Tooltip>
                                             </TableCell>
                                             <TableCell className="text-center text-sm">
                                                 <Tooltip>
                                                     <TooltipTrigger className="cursor-default">{formatNumber(scraper.count_processed ?? 0)}</TooltipTrigger>
                                                     <TooltipContent><p>{getCounterTooltip(scraper.scraperType, 'processed')}</p></TooltipContent>
                                                 </Tooltip>
                                             </TableCell>
                                            {/* Health Check Status Column */}
                                            <TableCell className="text-center">
                                                 <Tooltip>
                                                     <TooltipTrigger asChild>
                                                         <Badge variant={healthCheckStatus.variant} className="cursor-default">
                                                             <healthCheckStatus.Icon className="mr-1 h-3 w-3" />
                                                             {healthCheckStatus.text}
                                                         </Badge>
                                                     </TooltipTrigger>
                                                     <TooltipContent side="left">
                                                         <p className="max-w-xs break-words">{healthCheckStatus.tooltip}</p>
                                                     </TooltipContent>
                                                 </Tooltip>
                                            </TableCell>
                                            {/* Polling Status Column */}
                                            <TableCell className="text-center">
                                                 <Tooltip>
                                                     <TooltipTrigger asChild>
                                                         <Badge variant={pollingStatus.variant} className="cursor-default">
                                                             <pollingStatus.Icon className="mr-1 h-3 w-3" />
                                                             {pollingStatus.text}
                                                         </Badge>
                                                     </TooltipTrigger>
                                                     <TooltipContent side="left">
                                                         <p className="max-w-xs break-words">{pollingStatus.tooltip}</p>
                                                     </TooltipContent>
                                                 </Tooltip>
                                            </TableCell>
                                            {/* Active Status Column */}
                                            <TableCell className="text-center">
                                                 <Tooltip>
                                                     <TooltipTrigger asChild>
                                                         <Badge variant={activeStatus.variant} className="cursor-default">
                                                             <activeStatus.Icon className="mr-1 h-3 w-3" />
                                                             {activeStatus.text}
                                                         </Badge>
                                                     </TooltipTrigger>
                                                     <TooltipContent side="left">
                                                         <p className="max-w-xs break-words">{activeStatus.tooltip}</p>
                                                     </TooltipContent>
                                                 </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                     );
                                })}
                            </TableBody>
                        </Table>
                    </TooltipProvider>
                 )}
            </CardContent>
        </Card>
    );
};

export default ScraperStatusWidget;