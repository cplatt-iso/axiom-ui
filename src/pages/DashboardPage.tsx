// src/pages/DashboardPage.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
// Import the function and type for dashboard status
import { getDashboardStatus, SystemStatusReport } from '../services/api';
// Import the generic StatusWidget
import StatusWidget from '../components/StatusWidget';
// --- Import Specific Widgets ---
// Use default import for DicomWebPollerWidget (assuming default export)
import DicomWebPollerWidget from '../components/DicomWebPollerWidget';
// Use named import for DimseListenerStatusWidget (assuming named export)
import { DimseListenerStatusWidget } from '../components/DimseListenerStatusWidget';
// --- End Import Specific Widgets ---

const DashboardPage: React.FC = () => {
    // --- Keep existing state for the generic status report ---
    const [statusReport, setStatusReport] = useState<SystemStatusReport | null>(null);
    const [isLoadingStatus, setIsLoadingStatus] = useState(true); // Renamed for clarity
    const [errorStatus, setErrorStatus] = useState<string | null>(null); // Renamed for clarity
    const isInitialLoadStatus = useRef(true); // Renamed for clarity
    // --- End existing state ---

    // --- Keep existing data fetching logic for the generic status report ---
    const fetchDashboardStatus = useCallback(async () => { // Renamed for clarity
        // Set loading state only if it's the initial load for this specific section
        if (isInitialLoadStatus.current) {
            setIsLoadingStatus(true);
        }
        try {
            const statusData = await getDashboardStatus();
            setStatusReport(statusData);
            setErrorStatus(null);
        } catch (err: any) {
            console.error("Failed to fetch dashboard component status:", err);
            setErrorStatus(err.message || "Failed to load dashboard component status.");
            setStatusReport(null);
        } finally {
            if (isInitialLoadStatus.current) {
                setIsLoadingStatus(false);
                isInitialLoadStatus.current = false;
            }
        }
    }, []);

    useEffect(() => {
        isInitialLoadStatus.current = true; // Reset on mount
        fetchDashboardStatus(); // Fetch initial data
    }, [fetchDashboardStatus]);

    useEffect(() => {
        // Set up interval for refreshing generic status report
        const intervalId = setInterval(() => {
            fetchDashboardStatus();
        }, 30000); // Refresh every 30 seconds
        return () => clearInterval(intervalId); // Clear interval on unmount
    }, [fetchDashboardStatus]);
    // --- End existing data fetching logic ---


    // --- Render the Page ---
    return (
        <div className="container mx-auto px-4 py-8 space-y-8"> {/* Increased spacing */}
            {/* Page Title */}
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                System Dashboard
            </h1>

            {/* --- Section for Generic Component Status Widgets --- */}
            <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg">
                 <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white"> {/* Slightly larger heading */}
                           Overall Component Status
                      </h3>
                 </div>
                 <div className="p-4">
                    {isLoadingStatus && (
                         <div className="text-center text-gray-500 dark:text-gray-400 py-10">Loading component status...</div>
                    )}
                    {errorStatus && !isLoadingStatus && (
                         <div className="mb-4 rounded-md bg-red-50 p-4 dark:bg-red-900 border border-red-200 dark:border-red-800">
                            <p className="text-sm font-medium text-red-800 dark:text-red-200">Error loading component status: {errorStatus}</p>
                            <p className="mt-1 text-xs text-red-700 dark:text-red-300">Auto-refreshing...</p>
                        </div>
                    )}
                    {!isLoadingStatus && !errorStatus && statusReport && statusReport.components && (
                        // Existing grid layout for StatusWidgets
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                             {/* Render only if component data exists */}
                             {statusReport.components.database && <StatusWidget title="Database" statusData={statusReport.components.database} />}
                             {statusReport.components.message_broker && <StatusWidget title="Message Broker" statusData={statusReport.components.message_broker} />}
                             {statusReport.components.api_service && <StatusWidget title="API Service" statusData={statusReport.components.api_service} />}
                             {/* Note: You might still want to show this generic listener status, or hide it now */}
                             {statusReport.components.celery_workers && <StatusWidget title="Processing Workers" statusData={statusReport.components.celery_workers} />}
                         </div>
                    )}
                     {!isLoadingStatus && !errorStatus && (!statusReport || !statusReport.components) && (
                         <div className="text-center text-gray-500 dark:text-gray-400 py-10">Component status data unavailable.</div>
                     )}
                 </div>
            </div>
            {/* --- End Section for Generic Component Status Widgets --- */}


            {/* --- Section for Specific Service Status Widgets --- */}
            <div> {/* Added a wrapper div for potential section styling */}
                 <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4"> {/* Section Title */}
                      Detailed Service Status
                 </h3>
                <div className="space-y-6">
                    <DimseListenerStatusWidget /> {/* <-- Correct place */}
                    <DicomWebPollerWidget /> {/* <-- Correct place */}
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
