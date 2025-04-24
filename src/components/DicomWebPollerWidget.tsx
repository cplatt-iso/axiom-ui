// src/components/DicomWebPollerWidget.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDicomWebPollersStatus } from '../services/api';
import { DicomWebSourceStatus } from '../schemas';
// --- Corrected Imports ---
import { ClockIcon, CheckCircleIcon, XCircleIcon, PauseCircleIcon, QuestionMarkCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react'; // <-- Import Loader2 from lucide-react
// --- End Corrected Imports ---
import { formatDistanceToNowStrict } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button'; // Import Button

// Constants
const POLLER_STATUS_STALE_THRESHOLD_SECONDS = 5 * 60; // 5 minutes

// Helper formatOptionalDate (No changes needed)
const formatOptionalDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        // Ensure the date parsed correctly before formatting
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


// Refined status indicator helper
const getStatusIndicator = (poller: DicomWebSourceStatus): {
    node: React.ReactNode,
    tooltip: string,
    variant: 'default' | 'secondary' | 'destructive' | 'outline', // For Badge variant
    Icon: React.ElementType
} => {
    const now = new Date();
    const lastSuccessRaw = poller.last_successful_run;
    const lastErrorRaw = poller.last_error_run;
    const lastSuccess = lastSuccessRaw ? new Date(lastSuccessRaw) : null;
    const lastError = lastErrorRaw ? new Date(lastErrorRaw) : null;

    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
    let Icon: React.ElementType = QuestionMarkCircleIcon;
    let text = 'Unknown';
    let tooltip = `Source: ${poller.source_name}`;

    console.debug(`[PollerWidget] Checking status for ${poller.source_name}: enabled=${poller.is_enabled}, lastSuccess=${lastSuccess?.toISOString()}, lastError=${lastError?.toISOString()}`);

    if (!poller.is_enabled) {
        text = 'Disabled';
        Icon = PauseCircleIcon;
        variant = 'secondary'; // Greyish badge for disabled
        tooltip = `Polling is disabled for ${poller.source_name}.`;
        console.debug(`[PollerWidget] Status for ${poller.source_name}: Disabled`);
    } else if (poller.last_error_message && lastError && (!lastSuccess || lastError > lastSuccess)) {
        text = 'Error';
        Icon = XCircleIcon;
        variant = 'destructive';
        tooltip = `Error on last run (${formatOptionalDate(poller.last_error_run)}): ${poller.last_error_message}`;
        console.debug(`[PollerWidget] Status for ${poller.source_name}: Error`);
    } else if (lastSuccess) {
        const secondsSinceSuccess = (now.getTime() - lastSuccess.getTime()) / 1000;
        if (secondsSinceSuccess <= POLLER_STATUS_STALE_THRESHOLD_SECONDS) {
            text = 'OK';
            Icon = CheckCircleIcon;
            variant = 'default'; // Green badge for OK
            tooltip = `Last successful run: ${formatOptionalDate(poller.last_successful_run)}. Last processed item timestamp: ${formatOptionalDate(poller.last_processed_timestamp)}.`;
            console.debug(`[PollerWidget] Status for ${poller.source_name}: OK (Success within ${POLLER_STATUS_STALE_THRESHOLD_SECONDS}s)`);
        } else {
            text = 'Stale';
            Icon = ClockIcon;
            variant = 'secondary'; // Use secondary variant for stale (often greyish/yellowish)
            tooltip = `Last successful run was ${formatOptionalDate(poller.last_successful_run)} (more than ${POLLER_STATUS_STALE_THRESHOLD_SECONDS / 60} mins ago). Last processed: ${formatOptionalDate(poller.last_processed_timestamp)}.`;
             console.debug(`[PollerWidget] Status for ${poller.source_name}: Stale (Success > ${POLLER_STATUS_STALE_THRESHOLD_SECONDS}s ago)`);
        }
    } else {
        // Enabled, never had a successful run, no error reported after last attempt (or no attempt yet)
        text = 'Pending';
        Icon = ClockIcon; // Use Clock for pending initial run
        variant = 'outline'; // Use outline variant for pending
        tooltip = `Polling is enabled but hasn't completed a run successfully yet. Last error (if any): ${formatOptionalDate(poller.last_error_run)}.`;
        console.debug(`[PollerWidget] Status for ${poller.source_name}: Pending`);
    }

    // Use Badge component for consistent styling
    const node = (
        <Badge variant={variant} className="flex items-center gap-1 text-xs font-medium">
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {text}
        </Badge>
    );

    return { node, tooltip, variant, Icon };
};


const DicomWebPollerWidget: React.FC = () => {
    const { data: responseData, isLoading, isError, error, refetch, isFetching } = useQuery({
        queryKey: ['dicomWebPollerStatus'],
        queryFn: getDicomWebPollersStatus,
        refetchInterval: 30000, // Keep 30s refresh
        refetchIntervalInBackground: true,
        staleTime: 15000, // Keep 15s stale time
    });

    const pollers = responseData?.pollers ?? [];

    const renderContent = () => {
        if (isLoading) { return <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400"><Loader2 className="inline w-4 h-4 mr-2 animate-spin" />Loading poller status...</div>; }
        if (isError) { return <div className="p-4 text-sm text-red-600 dark:text-red-400">Error loading status: {(error as Error).message || 'Unknown error'}</div>; }
        if (pollers.length === 0) { return <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">No DICOMweb pollers configured.</div>; }

        return (
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th scope="col" className="px-4 py-2 text-left font-medium tracking-wider">Name</th>
                            <th scope="col" className="px-4 py-2 text-left font-medium tracking-wider">Status</th>
                            <th scope="col" className="px-4 py-2 text-left font-medium tracking-wider">Last Success</th>
                            <th scope="col" className="px-4 py-2 text-left font-medium tracking-wider">Last Processed</th>
                            <th scope="col" className="px-4 py-2 text-left font-medium tracking-wider">Last Error</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {pollers.map((poller) => {
                            const { node: statusNode, tooltip: statusTooltip } = getStatusIndicator(poller);
                            return (
                                <tr key={poller.source_name} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-4 py-2 whitespace-nowrap font-medium text-gray-900 dark:text-white">{poller.source_name}</td>
                                    <td className="px-4 py-2 whitespace-nowrap" title={statusTooltip}>{statusNode}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-gray-600 dark:text-gray-400">{formatOptionalDate(poller.last_successful_run)}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-gray-600 dark:text-gray-400">{formatOptionalDate(poller.last_processed_timestamp)}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-red-600 dark:text-red-400" title={poller.last_error_message || undefined}> {/* Changed empty string to undefined for title */}
                                        {poller.last_error_message ? formatOptionalDate(poller.last_error_run) : 'N/A'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
         <Card className="dark:bg-gray-800 shadow-sm"> {/* Added shadow */}
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b dark:border-gray-700">
                 <CardTitle className="text-base font-semibold"> {/* Adjusted size/weight */}
                    DICOMweb Poller Status
                 </CardTitle>
                 <Button
                     variant="ghost" // Use ghost variant for icon button
                     size="sm" // Use small size
                     onClick={() => refetch()}
                     disabled={isFetching || isLoading}
                     aria-label="Refresh poller status"
                     className="text-muted-foreground hover:text-foreground" // Subtle colors
                 >
                      <ArrowPathIcon className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                 </Button>
            </CardHeader>
            <CardContent className="p-0"> {/* Remove padding as table has its own */}
                 {renderContent()}
            </CardContent>
         </Card>
    );
};

export default DicomWebPollerWidget;
