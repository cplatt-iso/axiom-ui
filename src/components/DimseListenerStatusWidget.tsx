// src/components/DimseListenerStatusWidget.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, ServerCrash, HelpCircle, CircleCheck, CircleX, Power } from 'lucide-react';
import { getDimseListenersStatus } from '@/services/api';
import { DimseListenerStatus, DimseListenersStatusResponse } from '@/schemas';
import { formatDistanceToNow } from 'date-fns';

export const DimseListenerStatusWidget: React.FC = () => {

    const getStatusAppearance = (status: string | undefined | null): { variant: 'default' | 'secondary' | 'destructive' | 'outline'; Icon: React.ElementType } => {
        switch (status?.toLowerCase()) {
            case 'running': return { variant: 'default', Icon: Wifi };
            case 'starting': return { variant: 'secondary', Icon: Power };
            case 'stopped': return { variant: 'outline', Icon: WifiOff };
            case 'error': return { variant: 'destructive', Icon: ServerCrash };
            default: return { variant: 'outline', Icon: HelpCircle };
        }
    };

    const getOverallStatus = (listenerData: DimseListenerStatus | null | undefined, isLoading: boolean, isError: boolean): { text: string; Icon: React.ElementType, colorClass: string } => {
        if (isLoading) return { text: 'Loading...', Icon: HelpCircle, colorClass: 'text-muted-foreground' };
        if (isError) return { text: 'Error Fetching', Icon: CircleX, colorClass: 'text-red-500' };
        if (!listenerData) return { text: 'No Data', Icon: CircleX, colorClass: 'text-orange-500' };

        const { status, last_heartbeat } = listenerData;
        const statusLower = status?.toLowerCase();
        const heartbeatDate = new Date(last_heartbeat);
        const now = new Date();
        const heartbeatAgeSeconds = (now.getTime() - heartbeatDate.getTime()) / 1000;
        const isStale = heartbeatAgeSeconds > 90;

        if (statusLower === 'running' && !isStale) return { text: 'Running', Icon: CircleCheck, colorClass: 'text-green-500' };
        if (statusLower === 'running' && isStale) return { text: 'Stale Heartbeat', Icon: WifiOff, colorClass: 'text-orange-500' };
        if (statusLower === 'stopped') return { text: 'Stopped', Icon: CircleX, colorClass: 'text-muted-foreground' };
        if (statusLower === 'error') return { text: 'Error State', Icon: ServerCrash, colorClass: 'text-red-500' };
        if (statusLower === 'starting') return { text: 'Starting', Icon: Power, colorClass: 'text-blue-500' };
        return { text: 'Unknown', Icon: HelpCircle, colorClass: 'text-muted-foreground' };
    };

    const { data: responseData, isLoading, isError, error } = useQuery<DimseListenersStatusResponse, Error>({
        queryKey: ['dimseListenersStatus'],
        queryFn: getDimseListenersStatus,
        refetchInterval: 15000,
    });

    // --- ADD CONSOLE LOGS ---
    console.log('[DimseListenerWidget] Raw Response Data:', responseData);
    // --- END CONSOLE LOGS ---

    const listenerData: DimseListenerStatus | null = responseData?.listeners?.[0] ?? null;

    // --- ADD CONSOLE LOGS ---
    console.log('[DimseListenerWidget] Extracted Listener Data:', listenerData);
    // --- END CONSOLE LOGS ---

    const { text: overallStatusText, Icon: OverallStatusIcon, colorClass: overallStatusColor } = getOverallStatus(listenerData, isLoading, isError);
    const { variant: badgeVariant, Icon: BadgeIcon } = getStatusAppearance(listenerData?.status);

    const formatRelativeTime = (dateString: string | undefined | null): string => {
         if (!dateString) return 'never';
         try { return formatDistanceToNow(new Date(dateString), { addSuffix: true }); }
         catch (e) { console.error("Error formatting date:", e); return 'invalid date'; }
    };

    return (
        <Card className="dark:bg-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-lg">
                    DIMSE Listener Status {listenerData?.listener_id ? `(${listenerData.listener_id})` : ''}
                </CardTitle>
                <OverallStatusIcon className={`h-4 w-4 ${overallStatusColor}`} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{overallStatusText}</div>
                 {isLoading && <p className="text-xs text-muted-foreground">Loading status...</p>}
                 {isError && !isLoading && <p className="text-xs text-red-500">Error fetching status: {error?.message}</p>}
                 {!isLoading && !isError && !listenerData && (
                     <p className="text-xs text-orange-500">No listener status found.</p>
                 )}
                {listenerData && (
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                       <div className="flex items-center justify-between"><span>AE Title:</span><span className="font-semibold">{listenerData.ae_title ?? 'N/A'}</span></div>
                       <div className="flex items-center justify-between"><span>Host:</span><span className="font-semibold">{listenerData.host ?? 'N/A'}</span></div>
                       <div className="flex items-center justify-between"><span>Port:</span><span className="font-semibold">{listenerData.port ?? 'N/A'}</span></div>
                       <div className="flex items-center justify-between">
                           <span>Reported Status:</span>
                           <Badge variant={badgeVariant} className="flex items-center gap-1"><BadgeIcon className="h-3 w-3" />{listenerData.status}</Badge>
                       </div>
                       <div className="flex items-center justify-between">
                           <span>Last Heartbeat:</span>
                           <span className="font-semibold">{formatRelativeTime(listenerData.last_heartbeat)}</span>
                       </div>
                       {listenerData.status_message && (
                            <div className="pt-1"><p className="text-xs text-red-600 break-words">Message: {listenerData.status_message}</p></div>
                       )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
