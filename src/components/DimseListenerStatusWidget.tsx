// src/components/DimseListenerStatusWidget.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, ServerCrash, HelpCircle, CircleCheck, CircleX, Power, Loader2 } from 'lucide-react'; // Added Loader2
import { getDimseListenersStatus } from '@/services/api';
import { DimseListenerStatus, DimseListenersStatusResponse } from '@/schemas';
import { formatDistanceToNow } from 'date-fns';

// Constants for status calculation
const LISTENER_HEARTBEAT_STALE_THRESHOLD_SECONDS = 90; // Match backend check

export const DimseListenerStatusWidget: React.FC = () => {

    /**
     * Determines the Badge variant and Icon based on the reported status string.
     */
    const getStatusBadgeAppearance = (status: string | undefined | null): { variant: 'default' | 'secondary' | 'destructive' | 'outline'; Icon: React.ElementType } => {
        switch (status?.toLowerCase()) {
            case 'running': return { variant: 'default', Icon: Wifi };
            case 'starting': return { variant: 'secondary', Icon: Power };
            case 'stopped': return { variant: 'outline', Icon: WifiOff };
            case 'error': return { variant: 'destructive', Icon: ServerCrash };
            default: return { variant: 'outline', Icon: HelpCircle }; // Unknown or null/undefined
        }
    };

    /**
     * Calculates the overall status text, icon, and color based on loading state,
     * errors, reported status, and heartbeat freshness.
     */
    const getOverallStatus = (listenerData: DimseListenerStatus | null | undefined, isLoading: boolean, isError: boolean): { text: string; Icon: React.ElementType, colorClass: string } => {
        if (isLoading) return { text: 'Loading...', Icon: Loader2, colorClass: 'text-muted-foreground animate-spin' }; // Use spinner icon
        if (isError) return { text: 'Error Fetching', Icon: CircleX, colorClass: 'text-red-500' };
        if (!listenerData) return { text: 'No Data', Icon: HelpCircle, colorClass: 'text-orange-500' }; // Changed icon

        const { status, last_heartbeat } = listenerData;
        const statusLower = status?.toLowerCase();

        let heartbeatDate: Date | null = null;
        let heartbeatAgeSeconds: number | null = null;
        let isStale = false;

        // Safely parse the heartbeat date
        try {
            if (last_heartbeat) {
                heartbeatDate = new Date(last_heartbeat);
                const now = new Date();
                // Check if the parsed date is valid before calculating age
                if (!isNaN(heartbeatDate.getTime())) {
                    heartbeatAgeSeconds = (now.getTime() - heartbeatDate.getTime()) / 1000;
                    isStale = heartbeatAgeSeconds > LISTENER_HEARTBEAT_STALE_THRESHOLD_SECONDS;
                } else {
                    console.warn(`[DimseListenerWidget] Invalid heartbeat date format received: ${last_heartbeat}`);
                    isStale = true; // Treat invalid date as stale
                }
            } else {
                // If no heartbeat ever recorded, consider it stale/unknown
                isStale = true;
                 console.warn("[DimseListenerWidget] No heartbeat timestamp received.");
            }
        } catch (e) {
            console.error(`[DimseListenerWidget] Error processing heartbeat date: ${e}`);
            isStale = true; // Treat errors as stale
        }


        // Determine overall status based on reported status and staleness
        if (statusLower === 'running' && !isStale) return { text: 'Running', Icon: CircleCheck, colorClass: 'text-green-500' };
        if (statusLower === 'running' && isStale) return { text: 'Stale Heartbeat', Icon: WifiOff, colorClass: 'text-orange-500' };
        if (statusLower === 'stopped') return { text: 'Stopped', Icon: WifiOff, colorClass: 'text-muted-foreground' }; // Use WifiOff for stopped too
        if (statusLower === 'error') return { text: 'Error State', Icon: ServerCrash, colorClass: 'text-red-500' };
        if (statusLower === 'starting') return { text: 'Starting', Icon: Power, colorClass: 'text-blue-500' };

        // Default/fallback case
        return { text: 'Unknown', Icon: HelpCircle, colorClass: 'text-muted-foreground' };
    };

    // Fetch listener status data using react-query
    const { data: responseData, isLoading, isError, error } = useQuery<DimseListenersStatusResponse, Error>({
        queryKey: ['dimseListenersStatus'],
        queryFn: getDimseListenersStatus,
        refetchInterval: 15000, // Refetch every 15 seconds
        staleTime: 10000, // Consider data stale after 10 seconds
    });

    // Extract data for the first listener found (or null if none)
    const listenerData: DimseListenerStatus | null = responseData?.listeners?.[0] ?? null;

    // Calculate appearance based on fetched data
    const { text: overallStatusText, Icon: OverallStatusIcon, colorClass: overallStatusColor } = getOverallStatus(listenerData, isLoading, isError);
    const { variant: badgeVariant, Icon: BadgeIcon } = getStatusBadgeAppearance(listenerData?.status);

    // Helper function to format the relative time for the heartbeat
    const formatRelativeTime = (dateString: string | undefined | null): string => {
         if (!dateString) return 'never';
         try {
             const date = new Date(dateString);
             if (isNaN(date.getTime())) return 'invalid date'; // Check validity
             return formatDistanceToNow(date, { addSuffix: true });
         } catch (e) {
             console.error("[DimseListenerWidget] Error formatting date:", e);
             return 'invalid date';
         }
    };

    return (
        <Card className="dark:bg-gray-800 h-full"> {/* Added h-full for consistent height */}
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium"> {/* Adjusted size */}
                    DIMSE Listener
                </CardTitle>
                <OverallStatusIcon className={`h-5 w-5 ${overallStatusColor}`} /> {/* Slightly larger icon */}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold mb-1">{overallStatusText}</div>
                 {isLoading && (
                     <p className="text-xs text-muted-foreground flex items-center">
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Loading status...
                    </p>
                 )}
                 {isError && !isLoading && <p className="text-xs text-red-500">Error: {error?.message || 'Failed to fetch'}</p>}
                 {!isLoading && !isError && !listenerData && (
                     <p className="text-xs text-orange-500">No listener status found in DB.</p>
                 )}
                {listenerData && (
                    <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                       <div className="flex items-center justify-between">
                            <span>ID:</span>
                            <span className="font-semibold truncate max-w-[150px]" title={listenerData.listener_id}>{listenerData.listener_id}</span>
                       </div>
                       <div className="flex items-center justify-between">
                           <span>AE Title:</span>
                           <span className="font-semibold">{listenerData.ae_title ?? 'N/A'}</span>
                       </div>
                       <div className="flex items-center justify-between">
                           <span>Host:Port:</span>
                           <span className="font-semibold">{listenerData.host ?? 'N/A'}:{listenerData.port ?? 'N/A'}</span>
                       </div>
                       <div className="flex items-center justify-between">
                           <span>Reported Status:</span>
                           <Badge variant={badgeVariant} className="flex items-center gap-1">
                                <BadgeIcon className="h-3 w-3" />{listenerData.status || 'Unknown'}
                           </Badge>
                       </div>
                       <div className="flex items-center justify-between">
                           <span>Last Heartbeat:</span>
                           <span className="font-semibold">{formatRelativeTime(listenerData.last_heartbeat)}</span>
                       </div>
                       {listenerData.status_message && listenerData.status?.toLowerCase() !== 'running' && (
                            <div className="pt-1">
                                <p className="text-xs text-red-500/90 break-words" title={listenerData.status_message}>
                                    Message: {listenerData.status_message}
                                </p>
                            </div>
                       )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
