// src/components/DicomWebPollerWidget.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDicomWebPollersStatus } from '../services/api';
import { DicomWebSourceStatus } from '../schemas';
import { ClockIcon, CheckCircleIcon, XCircleIcon, PauseCircleIcon, QuestionMarkCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNowStrict } from 'date-fns';
// --- Import Card components ---
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// --- End Import ---


// Helper formatOptionalDate remains the same
const formatOptionalDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return formatDistanceToNowStrict(date, { addSuffix: true });
    } catch (e) {
        console.error(`Error formatting date string: ${dateString}`, e);
        return 'Invalid Date';
    }
};

// Helper getStatusIndicator remains the same
const getStatusIndicator = (poller: DicomWebSourceStatus): { node: React.ReactNode, tooltip: string } => {
    // ... (logic as before) ...
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const lastSuccessRaw = poller.last_successful_run;
    const lastErrorRaw = poller.last_error_run;
    const lastSuccess = lastSuccessRaw ? new Date(lastSuccessRaw) : null;
    const lastError = lastErrorRaw ? new Date(lastErrorRaw) : null;
    console.log(`getStatusIndicator for ${poller.source_name}:`, { /* ... logs ... */ });
    let statusClass = 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    let Icon = QuestionMarkCircleIcon;
    let text = 'Unknown';
    let tooltip = `Source: ${poller.source_name}`;
    if (!poller.is_enabled) { text = 'Disabled'; Icon = PauseCircleIcon; statusClass='bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-400'; }
    else if (poller.last_error_message && lastError && (!lastSuccess || lastError > lastSuccess)) { text = 'Error'; Icon = XCircleIcon; statusClass='bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'; tooltip=`Error on last run (${formatOptionalDate(poller.last_error_run)}): ${poller.last_error_message}`; }
    else if (lastSuccess && lastSuccess > fiveMinutesAgo) { text = 'OK'; Icon = CheckCircleIcon; statusClass='bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'; tooltip=`Last successful run: ${formatOptionalDate(poller.last_successful_run)}. Last processed: ${formatOptionalDate(poller.last_processed_timestamp)}.`; }
    else if (lastSuccess) { text = 'Stale'; Icon = ClockIcon; statusClass='bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'; tooltip=`Last successful run was ${formatOptionalDate(poller.last_successful_run)}. Last processed: ${formatOptionalDate(poller.last_processed_timestamp)}.`; }
    else { text = 'Pending'; Icon = ClockIcon; statusClass='bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'; tooltip=`Polling is enabled but hasn't completed a run successfully yet.`; }
    const node = ( <span className={`flex items-center text-xs font-medium mr-2 px-2 py-0.5 rounded ${statusClass}`}> <Icon className="w-3.5 h-3.5 mr-1" aria-hidden="true"/> {text} </span> );
    return { node, tooltip };
};


const DicomWebPollerWidget: React.FC = () => {
    const { data, isLoading, error, refetch, isFetching } = useQuery({
        queryKey: ['dicomWebPollerStatus'],
        queryFn: getDicomWebPollersStatus,
        refetchInterval: 30000,
        refetchIntervalInBackground: true,
        staleTime: 15000,
    });

    const renderContent = () => {
        if (isLoading) { return <p className="text-sm text-gray-500 dark:text-gray-400">Loading poller status...</p>; }
        if (error) { return <p className="text-sm text-red-600 dark:text-red-400">Error loading status: {(error as Error).message || 'Unknown error'}</p>; }
        if (!data || !data.pollers || data.pollers.length === 0) { return <p className="text-sm text-gray-500 dark:text-gray-400">No DICOMweb pollers configured or status available.</p>; }

        // Return the table directly, CardContent will add padding
        return (
            <div className="overflow-x-auto">
                <table className="min-w-full"> {/* Removed redundant dividers, Card adds border */}
                    <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase"> {/* Simplified thead style */}
                        <tr>
                            <th scope="col" className="px-3 py-2 text-left font-medium tracking-wider">Name</th>
                            <th scope="col" className="px-3 py-2 text-left font-medium tracking-wider">Status</th>
                            <th scope="col" className="px-3 py-2 text-left font-medium tracking-wider">Last Success</th>
                            <th scope="col" className="px-3 py-2 text-left font-medium tracking-wider">Last Processed</th>
                            <th scope="col" className="px-3 py-2 text-left font-medium tracking-wider">Last Error</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700"> {/* Keep divider for rows */}
                        {data.pollers.map((poller) => {
                             const { node: statusNode, tooltip: statusTooltip } = getStatusIndicator(poller);
                             return (
                                <tr key={poller.source_name} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50"> {/* Adjusted hover */}
                                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{poller.source_name}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm" title={statusTooltip}>{statusNode}</td> {/* Removed text color here */}
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{formatOptionalDate(poller.last_successful_run)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{formatOptionalDate(poller.last_processed_timestamp)}</td>
                                     <td className="px-3 py-2 whitespace-nowrap text-sm text-red-600 dark:text-red-400" title={poller.last_error_message || ''}>{formatOptionalDate(poller.last_error_run)}</td>
                                </tr>
                             );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    // --- Use Card components for structure ---
    return (
         <Card className="dark:bg-gray-800"> {/* Replace div with Card */}
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"> {/* Use CardHeader */}
                 <CardTitle className="text-sm font-medium text-lg"> {/* Use CardTitle */}
                    DICOMweb Poller Status
                 </CardTitle>
                 <button
                     onClick={() => refetch()}
                     disabled={isFetching || isLoading}
                     className="p-1 text-gray-400 rounded-full hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50" // Adjusted hover style slightly
                     aria-label="Refresh poller status"
                 >
                      <ArrowPathIcon className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> {/* Adjusted size */}
                 </button>
            </CardHeader>
            <CardContent className="p-0"> {/* Use CardContent, remove default padding if table has its own */}
                 {renderContent()}
            </CardContent>
         </Card>
    );
    // --- End Use Card components ---
};

export default DicomWebPollerWidget;
