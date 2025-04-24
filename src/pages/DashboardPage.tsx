// src/pages/DashboardPage.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
// Import the function and type for dashboard status
import { getDashboardStatus, SystemStatusReport, ComponentStatus } from '../services/api'; // Added ComponentStatus type
// Import the generic StatusWidget
import StatusWidget from '../components/StatusWidget';
// Import Specific Widgets
import DicomWebPollerWidget from '../components/DicomWebPollerWidget'; // Use default import
import DimseListenerStatusWidget from '../components/DimseListenerStatusWidget'; // Use default import

const DashboardPage: React.FC = () => {
    // State for the generic status report from /dashboard/status
    const [statusReport, setStatusReport] = useState<SystemStatusReport | null>(null);
    const [isLoadingStatus, setIsLoadingStatus] = useState(true);
    const [errorStatus, setErrorStatus] = useState<string | null>(null);
    const isInitialLoadStatus = useRef(true);

    // Data fetching logic for the generic status report
    const fetchDashboardStatus = useCallback(async () => {
        if (isInitialLoadStatus.current) {
            setIsLoadingStatus(true);
        }
        // Don't clear error here, let subsequent fetches try to recover
        try {
            const statusData = await getDashboardStatus();
            setStatusReport(statusData);
            setErrorStatus(null); // Clear error on success
        } catch (err: any) {
            console.error("Failed to fetch dashboard component status:", err);
            setErrorStatus(err.message || "Failed to load dashboard component status.");
            // Don't clear statusReport on error, keep showing last known status if available
            // setStatusReport(null);
        } finally {
            if (isInitialLoadStatus.current) {
                setIsLoadingStatus(false);
                isInitialLoadStatus.current = false;
            }
        }
    }, []);

    // Effect for initial fetch and interval refresh of generic status
    useEffect(() => {
        isInitialLoadStatus.current = true;
        fetchDashboardStatus(); // Fetch initial data

        const intervalId = setInterval(() => {
            fetchDashboardStatus();
        }, 30000); // Refresh every 30 seconds

        return () => clearInterval(intervalId); // Clear interval on unmount
    }, [fetchDashboardStatus]);


    // Helper function to safely get component status or a default loading/error state
    const getComponentStatus = (componentName: keyof SystemStatusReport['components']): ComponentStatus => {
         if (isLoadingStatus) return { status: 'loading', details: 'Loading...' };
         if (errorStatus) return { status: 'error', details: 'Fetch Error' };
         if (!statusReport?.components?.[componentName]) return { status: 'unknown', details: 'No data' };
         return statusReport.components[componentName] as ComponentStatus;
    };

    return (
        <div className="container mx-auto px-4 py-8 space-y-8">
            {/* Page Title */}
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                System Dashboard
            </h1>

            {/* Section for Generic Component Status Widgets */}
            <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg">
                 <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                           Core Component Status
                      </h3>
                 </div>
                 <div className="p-4">
                    {errorStatus && ( // Display fetch error prominently if it occurs
                         <div className="mb-4 rounded-md bg-red-50 p-4 dark:bg-red-900 border border-red-200 dark:border-red-800">
                            <p className="text-sm font-medium text-red-800 dark:text-red-200">Error loading component status: {errorStatus}</p>
                            <p className="mt-1 text-xs text-red-700 dark:text-red-300">Auto-refreshing...</p>
                        </div>
                    )}
                    {/* Render widgets using the helper function */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                         <StatusWidget title="Database" statusData={getComponentStatus('database')} isLoading={isLoadingStatus} />
                         <StatusWidget title="Message Broker" statusData={getComponentStatus('message_broker')} isLoading={isLoadingStatus} />
                         <StatusWidget title="API Service" statusData={getComponentStatus('api_service')} isLoading={isLoadingStatus} />
                         {/* Note: We removed the generic 'dicom_listener' widget from here */}
                         {/* It's now handled by the detailed DimseListenerStatusWidget below */}
                         <StatusWidget title="Processing Workers" statusData={getComponentStatus('celery_workers')} isLoading={isLoadingStatus} />
                     </div>
                 </div>
            </div>

            {/* Section for Specific Service Status Widgets */}
            <div>
                 {/* No separate title needed if widgets have good titles */}
                <div className="space-y-6">
                    {/* Render the new list-based DIMSE Listener Widget */}
                    <DimseListenerStatusWidget />
                    {/* Render the DICOMweb Poller Widget */}
                    <DicomWebPollerWidget />
                    {/* Add other detailed widgets here later */}
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
