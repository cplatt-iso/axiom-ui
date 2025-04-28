// src/components/DimseQrSourceStatusWidget.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
// --- ADDED: Import useAuth ---
import { useAuth } from '@/context/AuthContext';
// --- END ADDED ---
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, ServerCrash, HelpCircle, Clock, Power, Loader2, Search, Send } from 'lucide-react'; // Added Search, Send
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { getDimseQrSourcesStatus } from '@/services/api'; // API function
import { DimseQrSourceStatus, DimseQrSourcesStatusResponse } from '@/schemas'; // Schema types
import { formatDistanceToNowStrict } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Constants - Define appropriate thresholds if needed, e.g., for stale query
const QR_QUERY_STALE_THRESHOLD_SECONDS = 15 * 60; // 15 minutes for query staleness? Adjust as needed.

// Helper function: formatOptionalDate (same as other widgets)
const formatOptionalDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            console.warn(`Invalid date string passed to formatOptionalDate: ${dateString}`);
            return 'Invalid Date';
        }
        return formatDistanceToNowStrict(date, { addSuffix: true });
    } catch (e) {
        console.error(`Error formatting date string: ${dateString}`, e);
        return 'Invalid Date';
    }
};

// Helper function: getStatusIndicator for DIMSE Q/R Source
const getStatusIndicator = (source: DimseQrSourceStatus): {
    node: React.ReactNode,
    tooltip: string,
    variant: 'default' | 'secondary' | 'destructive' | 'outline',
    Icon: React.ElementType
} => {
    const now = new Date();
    const lastQueryRaw = source.last_successful_query;
    const lastErrorRaw = source.last_error_time;
    const lastQuery = lastQueryRaw ? new Date(lastQueryRaw) : null;
    const lastError = lastErrorRaw ? new Date(lastErrorRaw) : null;

    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
    let Icon: React.ElementType = HelpCircle; // Default to Unknown
    let text = 'Unknown';
    let tooltip = `Source: ${source.name} (${source.remote_ae_title}@${source.remote_host}:${source.remote_port})`;

    if (!source.is_enabled) {
        text = 'Disabled';
        Icon = Power; // Use Power Off icon? Or WifiOff? Let's use Power for disabled config.
        variant = 'secondary';
        tooltip = `Polling is disabled for ${source.name}.`;
    } else if (source.last_error_message && lastError && (!lastQuery || lastError > lastQuery)) {
        text = 'Error';
        Icon = ServerCrash; // Error icon
        variant = 'destructive';
        tooltip = `Error on last operation (${formatOptionalDate(source.last_error_time)}): ${source.last_error_message}`;
    } else if (lastQuery) {
        const secondsSinceQuery = (now.getTime() - lastQuery.getTime()) / 1000;
        if (secondsSinceQuery <= QR_QUERY_STALE_THRESHOLD_SECONDS) {
            text = 'OK';
            Icon = Wifi; // Use Wifi for OK/connected status
            variant = 'default';
            tooltip = `Last successful query: ${formatOptionalDate(source.last_successful_query)}. Last successful move: ${formatOptionalDate(source.last_successful_move)}.`;
        } else {
            text = 'Stale';
            Icon = Clock;
            variant = 'secondary';
            tooltip = `Last successful query was ${formatOptionalDate(source.last_successful_query)} (more than ${QR_QUERY_STALE_THRESHOLD_SECONDS / 60} mins ago). Last move: ${formatOptionalDate(source.last_successful_move)}.`;
        }
    } else {
        // Enabled, but never queried successfully, no recent error
        text = 'Pending';
        Icon = Clock;
        variant = 'outline';
        tooltip = `Polling is enabled but hasn't completed a query successfully yet. Last error (if any): ${formatOptionalDate(source.last_error_time)}.`;
    }

    const node = (
        <Badge variant={variant} className="flex items-center gap-1 text-xs font-medium">
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {text}
        </Badge>
    );

    return { node, tooltip, variant, Icon };
};


export const DimseQrSourceStatusWidget: React.FC = () => {
    // --- ADDED: Get auth status ---
    const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
    // --- END ADDED ---

    const { data: responseData, isLoading, isError, error, refetch, isFetching } = useQuery<DimseQrSourcesStatusResponse, Error>({
        queryKey: ['dimseQrSourcesStatus'], // Unique query key
        queryFn: getDimseQrSourcesStatus, // Use the correct API function
        refetchInterval: 30000, // Refresh interval
        staleTime: 15000,
        // --- ADDED: Enable query only when authenticated ---
        enabled: !isAuthLoading && isAuthenticated,
        // --- END ADDED ---
    });

    const sources = responseData?.sources ?? [];

    // --- Use auth loading state for initial display ---
    const combinedIsLoading = isAuthLoading || (isAuthenticated && isLoading);
    // --- END USE ---

    const renderContent = () => {
        // Use combined loading state
        if (combinedIsLoading) { return <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400"><Loader2 className="inline w-4 h-4 mr-2 animate-spin" />Loading DIMSE Q/R source statuses...</div>; }
        if (!isAuthenticated) { return <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">Please log in to view status.</div>; }
        if (isError) { return <div className="p-4 text-sm text-red-600 dark:text-red-400">Error loading statuses: {error?.message || 'Unknown error'}</div>; }
        if (sources.length === 0) { return <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">No DIMSE Q/R sources configured or reporting status.</div>; }

        return (
             <TooltipProvider delayDuration={150}>
                 <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Remote AE</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Last Query</TableHead>
                                <TableHead className="text-right">Last Move</TableHead>
                                <TableHead className="text-right">Last Error</TableHead>
                                {/* Metrics Headers */}
                                <TableHead className="text-right">Found</TableHead>
                                <TableHead className="text-right">Queued</TableHead>
                                <TableHead className="text-right">Processed</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sources.map((source) => {
                                const { node: statusNode, tooltip: statusTooltip } = getStatusIndicator(source);
                                return (
                                    <TableRow key={source.id}>
                                        <TableCell className="font-medium text-gray-900 dark:text-white">{source.name}</TableCell>
                                        <TableCell className="font-mono text-xs">{source.remote_ae_title}@{source.remote_host}:{source.remote_port}</TableCell>
                                        <TableCell>
                                            <Tooltip>
                                                <TooltipTrigger asChild>{statusNode}</TooltipTrigger>
                                                <TooltipContent><p>{statusTooltip}</p></TooltipContent>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell className="text-xs text-right" title={source.last_successful_query ? new Date(source.last_successful_query).toLocaleString() : 'Never'}>
                                            {formatOptionalDate(source.last_successful_query)}
                                        </TableCell>
                                        <TableCell className="text-xs text-right" title={source.last_successful_move ? new Date(source.last_successful_move).toLocaleString() : 'Never'}>
                                            {formatOptionalDate(source.last_successful_move)}
                                        </TableCell>
                                        <TableCell className="text-xs text-right text-red-600 dark:text-red-400" title={source.last_error_message || undefined}>
                                            {source.last_error_message ? formatOptionalDate(source.last_error_time) : 'N/A'}
                                        </TableCell>
                                        {/* Metrics Cells */}
                                        <TableCell className="text-xs text-right font-mono">{source.found_study_count ?? 0}</TableCell>
                                        <TableCell className="text-xs text-right font-mono">{source.move_queued_study_count ?? 0}</TableCell>
                                        <TableCell className="text-xs text-right font-mono">{source.processed_instance_count ?? 0}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                 </div>
             </TooltipProvider>
        );
    };

    return (
        <Card className="dark:bg-gray-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b dark:border-gray-700">
                 <CardTitle className="text-base font-semibold">
                    DIMSE Q/R Source Status
                 </CardTitle>
                 <Button
                     variant="ghost" size="sm"
                     onClick={() => refetch()}
                     disabled={isFetching || combinedIsLoading} // Use combined loading state
                     aria-label="Refresh DIMSE Q/R source status"
                     className="text-muted-foreground hover:text-foreground"
                 >
                      <ArrowPathIcon className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                 </Button>
            </CardHeader>
            <CardContent className="p-0">
                 {renderContent()}
            </CardContent>
        </Card>
    );
};

export default DimseQrSourceStatusWidget; // Default export
