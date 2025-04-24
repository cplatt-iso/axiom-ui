// src/components/DimseListenerStatusWidget.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
// --- Import Lucide icons used for status ---
import { Wifi, WifiOff, ServerCrash, HelpCircle, Clock, Power, Loader2 } from 'lucide-react';
// --- Import ArrowPathIcon from Heroicons ---
import { ArrowPathIcon } from '@heroicons/react/24/outline'; // Correct import library
// --- End Icon Imports ---
import { getDimseListenersStatus } from '@/services/api';
import { DimseListenerStatus, DimseListenersStatusResponse } from '@/schemas';
import { formatDistanceToNowStrict } from 'date-fns';


// Constants
const LISTENER_HEARTBEAT_STALE_THRESHOLD_SECONDS = 90;

// Helper function: getListenerDisplayStatus (No changes needed here, already uses Lucide icons)
const getListenerDisplayStatus = (listener: DimseListenerStatus): { text: string; Icon: React.ElementType; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
    const statusLower = listener.status?.toLowerCase();
    const lastHeartbeat = listener.last_heartbeat;
    let heartbeatDate: Date | null = null;
    let isStale = true;

    // --- Robust Date Parsing and Stale Check ---
    if (lastHeartbeat) {
        try {
            heartbeatDate = new Date(lastHeartbeat);
            if (!isNaN(heartbeatDate.getTime())) { // Check if date is valid
                const now = new Date();
                const secondsSinceHeartbeat = (now.getTime() - heartbeatDate.getTime()) / 1000;
                isStale = secondsSinceHeartbeat > LISTENER_HEARTBEAT_STALE_THRESHOLD_SECONDS;
            } else {
                console.warn(`[DimseListenerWidget] Invalid heartbeat date format for ${listener.listener_id}: ${lastHeartbeat}`);
                isStale = true; // Treat invalid date as stale
            }
        } catch (e) {
            console.error(`[DimseListenerWidget] Error parsing heartbeat date for ${listener.listener_id}: ${e}`);
            isStale = true; // Treat error as stale
        }
    } else {
        console.warn(`[DimseListenerWidget] No heartbeat timestamp received for ${listener.listener_id}.`);
        isStale = true; // Treat missing date as stale
    }
    // --- End Robust Check ---


    if (statusLower === 'running') { return isStale ? { text: 'Stale', Icon: Clock, variant: 'secondary' } : { text: 'Running', Icon: Wifi, variant: 'default' }; }
    if (statusLower === 'stopped') { return { text: 'Stopped', Icon: WifiOff, variant: 'outline' }; }
    if (statusLower === 'error') { return { text: 'Error', Icon: ServerCrash, variant: 'destructive' }; }
    if (statusLower === 'starting') { return { text: 'Starting', Icon: Power, variant: 'outline' }; }
    return { text: 'Unknown', Icon: HelpCircle, variant: 'outline' };
};

// Helper function: formatRelativeTime
const formatRelativeTime = (dateString: string | undefined | null): string => {
    if (!dateString) return 'Never';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            console.warn(`Invalid date string passed to formatRelativeTime: ${dateString}`);
            return 'Invalid Date';
        }
        return formatDistanceToNowStrict(date, { addSuffix: true });
    } catch (e) {
        console.error(`Error formatting date string: ${dateString}`, e);
        return 'Error'; // Return 'Error' for consistency
    }
};


export const DimseListenerStatusWidget: React.FC = () => {
    // Fetch ALL listener statuses
    const { data: responseData, isLoading, isError, error, refetch, isFetching } = useQuery<DimseListenersStatusResponse, Error>({
        queryKey: ['dimseListenersStatus'],
        queryFn: getDimseListenersStatus,
        refetchInterval: 15000,
        staleTime: 10000,
    });

    const listeners = responseData?.listeners ?? [];

    const renderContent = () => {
        if (isLoading) { return <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400"><Loader2 className="inline w-4 h-4 mr-2 animate-spin" />Loading listener statuses...</div>; }
        if (isError) { return <div className="p-4 text-sm text-red-600 dark:text-red-400">Error loading statuses: {error?.message || 'Unknown error'}</div>; }
        if (listeners.length === 0) { return <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">No active listener status found in database. Ensure listeners are configured and running.</div>; }

        return (
             <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Listener ID</TableHead>
                            <TableHead>AE Title</TableHead>
                            <TableHead>Port</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Last Heartbeat</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {listeners.map((listener) => {
                            const displayStatus = getListenerDisplayStatus(listener);
                            const tooltip = listener.status_message && listener.status?.toLowerCase() !== 'running' ? listener.status_message : `Status: ${displayStatus.text}. Last heartbeat: ${formatRelativeTime(listener.last_heartbeat)}. AE: ${listener.ae_title}, Port: ${listener.port}`;
                            return (
                                <TableRow key={listener.listener_id}>
                                    <TableCell className="font-mono text-xs" title={listener.listener_id}>{listener.listener_id}</TableCell>
                                    <TableCell className="font-mono text-xs">{listener.ae_title ?? 'N/A'}</TableCell>
                                    <TableCell className="text-xs text-center">{listener.port ?? 'N/A'}</TableCell>
                                    <TableCell title={tooltip}>
                                        <Badge variant={displayStatus.variant} className="flex items-center gap-1 w-fit">
                                            <displayStatus.Icon className="h-3.5 w-3.5" aria-hidden="true" />
                                            {displayStatus.text}
                                        </Badge>
                                    </TableCell>
                                    {/* --- MODIFIED CELL --- */}
                                    <TableCell className="text-xs text-right" /* Removed text-muted-foreground */
                                               title={listener.last_heartbeat ? new Date(listener.last_heartbeat).toLocaleString() : 'Never'}>
                                        {formatRelativeTime(listener.last_heartbeat)}
                                    </TableCell>
                                    {/* --- END MODIFICATION --- */}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
             </div>
        );
    };

    return (
        <Card className="dark:bg-gray-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b dark:border-gray-700">
                 <CardTitle className="text-base font-semibold">
                    DIMSE Listener Status
                 </CardTitle>
                 <Button
                     variant="ghost" size="sm"
                     onClick={() => refetch()}
                     disabled={isFetching || isLoading}
                     aria-label="Refresh listener status"
                     className="text-muted-foreground hover:text-foreground"
                 >
                      {/* Use the correctly imported ArrowPathIcon */}
                      <ArrowPathIcon className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                 </Button>
            </CardHeader>
            <CardContent className="p-0">
                 {renderContent()}
            </CardContent>
        </Card>
    );
};

// Ensure the component is exported correctly (default or named)
export default DimseListenerStatusWidget; // Using default export based on Dashboard import
