// src/components/DicomWebPollerWidget.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDicomWebPollersStatus } from '../services/api';
import { DicomWebSourceStatus } from '../schemas';
import { ClockIcon, CheckCircleIcon, XCircleIcon, PauseCircleIcon, QuestionMarkCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'; // Added Pause, QuestionMark, ArrowPath
import { formatDistanceToNowStrict } from 'date-fns';

// Helper to format dates nicely or show 'N/A'
const formatOptionalDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        const relative = formatDistanceToNowStrict(date, { addSuffix: true });
        // Optionally add absolute time: const absolute = date.toLocaleString(); return `${relative} (${absolute})`;
        return relative;
    } catch (e) {
        console.error(`Error formatting date string: ${dateString}`, e);
        return 'Invalid Date';
    }
};

// Helper to determine status color/icon and tooltip text
const getStatusIndicator = (poller: DicomWebSourceStatus): { node: React.ReactNode, tooltip: string } => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const lastSuccess = poller.last_successful_run ? new Date(poller.last_successful_run) : null;
    const lastError = poller.last_error_run ? new Date(poller.last_error_run) : null;
    const lastProcessed = poller.last_processed_timestamp ? new Date(poller.last_processed_timestamp) : null;

    let statusClass = 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    let Icon = QuestionMarkCircleIcon;
    let text = 'Unknown';
    let tooltip = `Source: ${poller.source_name}`;

    if (!poller.is_enabled) {
        statusClass = 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-400';
        Icon = PauseCircleIcon;
        text = 'Disabled';
        tooltip = `Polling is disabled for ${poller.source_name}. Last success: ${formatOptionalDate(poller.last_successful_run)}.`;
    } else if (poller.last_error_message && lastError && (!lastSuccess || lastError > lastSuccess)) {
        statusClass = 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
        Icon = XCircleIcon;
        text = 'Error';
        tooltip = `Error on last run (${formatOptionalDate(poller.last_error_run)}): ${poller.last_error_message}`;
    } else if (lastSuccess && lastSuccess > fiveMinutesAgo) {
         statusClass = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
         Icon = CheckCircleIcon;
         text = 'OK';
         tooltip = `Last successful run: ${formatOptionalDate(poller.last_successful_run)}. Last processed item timestamp: ${formatOptionalDate(poller.last_processed_timestamp)}.`;
    } else if (lastSuccess) { // Success, but > 5 mins ago
         statusClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
         Icon = ClockIcon;
         text = 'Stale';
         tooltip = `Last successful run was ${formatOptionalDate(poller.last_successful_run)}. Last processed item timestamp: ${formatOptionalDate(poller.last_processed_timestamp)}.`;
    } else { // Enabled, but never run successfully or errored?
         statusClass = 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
         Icon = ClockIcon; // Use clock for pending/initial state
         text = 'Pending';
         tooltip = `Polling is enabled but hasn't completed a run successfully yet.`;
    }

    const node = (
        <span className={`flex items-center text-xs font-medium mr-2 px-2 py-0.5 rounded ${statusClass}`}>
            <Icon className="w-3.5 h-3.5 mr-1" aria-hidden="true"/> {text}
        </span>
    );

    return { node, tooltip };
};


const DicomWebPollerWidget: React.FC = () => {
    const { data, isLoading, error, refetch, isFetching } = useQuery({ // Add isFetching
        queryKey: ['dicomWebPollerStatus'],
        queryFn: getDicomWebPollersStatus,
        refetchInterval: 30000, // Refetch every 30 seconds
        refetchIntervalInBackground: true,
        staleTime: 15000,
    });

    const renderContent = () => {
        // Show skeleton or loading only on initial fetch
        if (isLoading) {
            return <p className="text-sm text-gray-500 dark:text-gray-400 p-4">Loading poller status...</p>;
        }

        if (error) {
             return <p className="text-sm text-red-600 dark:text-red-400 p-4">Error loading status: {(error as Error).message || 'Unknown error'}</p>;
        }

        if (!data || !data.pollers || data.pollers.length === 0) {
            return <p className="text-sm text-gray-500 dark:text-gray-400 p-4">No DICOMweb pollers configured or status available.</p>;
        }

        return (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Last Success</th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Last Processed</th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Last Error</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                        {data.pollers.map((poller) => {
                             const { node: statusNode, tooltip: statusTooltip } = getStatusIndicator(poller);
                             return (
                                <tr key={poller.source_name} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{poller.source_name}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400" title={statusTooltip}>{statusNode}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatOptionalDate(poller.last_successful_run)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatOptionalDate(poller.last_processed_timestamp)}</td>
                                     <td className="px-3 py-2 whitespace-nowrap text-sm text-red-600 dark:text-red-400" title={poller.last_error_message || ''}>{formatOptionalDate(poller.last_error_run)}</td>
                                </tr>
                             );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
         <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg">
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                 <h3 className="text-base leading-6 font-medium text-gray-900 dark:text-white">DICOMweb Poller Status</h3>
                 <button
                     onClick={() => refetch()}
                     disabled={isFetching || isLoading} // Disable during initial load or refetch
                     className="p-1 text-gray-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                     aria-label="Refresh poller status"
                 >
                      <ArrowPathIcon className={`h-5 w-5 ${isFetching ? 'animate-spin' : ''}`} />
                 </button>
            </div>
            {renderContent()}
         </div>
    );
};

export default DicomWebPollerWidget;
