// src/pages/DashboardPage.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
// --- Import getDashboardStatus and SystemStatusReport ---
import { getDashboardStatus, SystemStatusReport } from '../services/api'; // Changed import name
// --- End Change ---
import StatusWidget from '../components/StatusWidget'; // Assuming this component exists and is correct

const DashboardPage: React.FC = () => {
    // State uses the detailed SystemStatusReport type
    const [statusReport, setStatusReport] = useState<SystemStatusReport | null>(null);
    const [isLoading, setIsLoading] = useState(true); // For initial load indicator
    const [error, setError] = useState<string | null>(null);
    const isInitialLoad = useRef(true); // Track if it's the very first load

    // Stable fetch function using getDashboardStatus
    const fetchDashboardData = useCallback(async () => {
        // Don't set isLoading=true on subsequent refreshes, only on initial load
        try {
            // --- Call getDashboardStatus ---
            const statusData = await getDashboardStatus(); // Call the correct function
            // --- End Change ---

            setStatusReport(statusData); // Update state with new data
            setError(null); // Clear any previous error on success
        } catch (err: any) {
            console.error("Failed to fetch dashboard status:", err);
            setError(err.message || "Failed to load dashboard data.");
            setStatusReport(null); // Clear status data on error to avoid showing stale info
        } finally {
            // Only set isLoading to false after the *initial* fetch completes
            if (isInitialLoad.current) {
                setIsLoading(false);
                isInitialLoad.current = false;
            }
        }
    }, []); // Empty dependency array ensures this function reference is stable

    // Initial Fetch - Runs only ONCE on component mount
    useEffect(() => {
        console.log("Running initial dashboard fetch effect...");
        setIsLoading(true); // Set loading true only for initial fetch
        isInitialLoad.current = true; // Reset initial load flag
        fetchDashboardData();
        // This effect depends only on the stable fetchDashboardData function reference
    }, [fetchDashboardData]);

    // Auto-refresh interval - Setup runs only ONCE on component mount
    useEffect(() => {
        console.log("Setting up dashboard refresh interval...");
        const intervalId = setInterval(() => {
            console.log("Interval: Refreshing dashboard data...");
            // Fetch data directly for refreshes, without setting isLoading
            fetchDashboardData();
        }, 30000); // Refresh every 30 seconds (adjust as needed)

        // Cleanup function: Clear interval when the component unmounts
        return () => {
            console.log("Clearing dashboard refresh interval.");
            clearInterval(intervalId);
        };
        // This effect also depends only on the stable fetchDashboardData function reference
    }, [fetchDashboardData]);


    // --- Determine Content to Render based on state ---
    let content;
    if (isLoading) {
        // Show spinner or message only during the initial load
        content = (
             <div className="text-center text-gray-500 dark:text-gray-400 py-10">
                Loading dashboard status...
            </div>
        );
    } else if (error) {
        // Show a prominent error message if fetching failed after initial load attempt
        content = (
             <div className="mb-4 rounded-md bg-red-50 p-4 dark:bg-red-900 border border-red-200 dark:border-red-800">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    Error loading dashboard: {error}
                </p>
                <p className="mt-1 text-xs text-red-700 dark:text-red-300">
                    The system status could not be retrieved. Please check API service health. Auto-refreshing...
                </p>
            </div>
        );
    } else if (statusReport && statusReport.components) {
        // Success: Render the status widgets using data from statusReport.components
        // Ensure the keys ('database', 'message_broker', etc.) match what the backend sends
        content = (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                 {/* Pass the specific component status object to each widget */}
                 <StatusWidget
                    title="Database (PostgreSQL)"
                    statusData={statusReport.components.database}
                 />
                 <StatusWidget
                    title="Message Broker" // More generic title if backend checks RabbitMQ/Redis
                    statusData={statusReport.components.message_broker}
                 />
                 <StatusWidget
                    title="API Service"
                    statusData={statusReport.components.api_service}
                 />
                 <StatusWidget
                    title="DICOM Listener"
                    statusData={statusReport.components.dicom_listener}
                 />
                 <StatusWidget
                    title="Processing Workers" // More generic title
                    statusData={statusReport.components.celery_workers}
                 />
                 {/* Add more StatusWidget instances if the backend reports more components */}
             </div>
        );
    } else {
         // Fallback case: No data loaded, not loading, and not an error (might happen briefly or if API returns empty)
         content = (
             <div className="text-center text-gray-500 dark:text-gray-400 py-10">
                No dashboard data available. Status may be initializing or unavailable.
            </div>
        );
    }

    // --- Render the Page ---
    return (
        <div className="container mx-auto px-4 py-8">
            {/* Page Title */}
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-6">
                System Dashboard
            </h1>

            {/* Render the determined content (loading indicator, error message, or widgets) */}
            {content}

        </div>
    );
};

export default DashboardPage;
