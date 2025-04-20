// src/pages/DashboardPage.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
// Import the correct function and type for dashboard status
import { getDashboardStatus, SystemStatusReport } from '../services/api';
// Import your existing StatusWidget
import StatusWidget from '../components/StatusWidget';
// --- Import the NEW poller widget ---
import DicomWebPollerWidget from '../components/DicomWebPollerWidget';
// --- End Import ---

const DashboardPage: React.FC = () => {
    // --- Keep your existing state ---
    const [statusReport, setStatusReport] = useState<SystemStatusReport | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const isInitialLoad = useRef(true);
    // --- End Keep existing state ---

    // --- Keep your existing data fetching logic ---
    const fetchDashboardData = useCallback(async () => {
        try {
            const statusData = await getDashboardStatus();
            setStatusReport(statusData);
            setError(null);
        } catch (err: any) {
            console.error("Failed to fetch dashboard status:", err);
            setError(err.message || "Failed to load dashboard data.");
            setStatusReport(null);
        } finally {
            if (isInitialLoad.current) {
                setIsLoading(false);
                isInitialLoad.current = false;
            }
        }
    }, []);

    useEffect(() => {
        setIsLoading(true);
        isInitialLoad.current = true;
        fetchDashboardData();
    }, [fetchDashboardData]);

    useEffect(() => {
        const intervalId = setInterval(() => {
            fetchDashboardData();
        }, 30000);
        return () => clearInterval(intervalId);
    }, [fetchDashboardData]);
    // --- End Keep existing data fetching logic ---


    // --- Render the Page ---
    return (
        <div className="container mx-auto px-4 py-8 space-y-6"> {/* Add space between sections */}
            {/* Page Title */}
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                System Dashboard
            </h1>

            {/* --- Section for Component Status Widgets (Your Existing Logic) --- */}
            <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg">
                 <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-base leading-6 font-medium text-gray-900 dark:text-white">
                           Component Status
                      </h3>
                 </div>
                 <div className="p-4">
                    {isLoading && (
                         <div className="text-center text-gray-500 dark:text-gray-400 py-10">Loading component status...</div>
                    )}
                    {error && !isLoading && ( // Show error only if not loading initially
                         <div className="mb-4 rounded-md bg-red-50 p-4 dark:bg-red-900 border border-red-200 dark:border-red-800">
                            <p className="text-sm font-medium text-red-800 dark:text-red-200">Error loading component status: {error}</p>
                            <p className="mt-1 text-xs text-red-700 dark:text-red-300">Auto-refreshing...</p>
                        </div>
                    )}
                    {!isLoading && !error && statusReport && statusReport.components && (
                        // Your existing grid layout for StatusWidgets
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                             <StatusWidget title="Database (PostgreSQL)" statusData={statusReport.components.database} />
                             <StatusWidget title="Message Broker" statusData={statusReport.components.message_broker} />
                             <StatusWidget title="API Service" statusData={statusReport.components.api_service} />
                             <StatusWidget title="DICOM Listener" statusData={statusReport.components.dicom_listener} />
                             <StatusWidget title="Processing Workers" statusData={statusReport.components.celery_workers} />
                         </div>
                    )}
                     {!isLoading && !error && (!statusReport || !statusReport.components) && (
                         <div className="text-center text-gray-500 dark:text-gray-400 py-10">Component status data unavailable.</div>
                     )}
                 </div>
            </div>
            {/* --- End Section for Component Status Widgets --- */}


            {/* --- Section for NEW DICOMweb Poller Status Widget --- */}
            <div> {/* Wrap in a div for spacing */}
                <DicomWebPollerWidget /> {/* <-- ADDED the new widget HERE */}
            </div>
            {/* --- End Section for DICOMweb Poller Status Widget --- */}

             {/* Add other dashboard sections/components here if needed */}

        </div>
    );
};

export default DashboardPage;
