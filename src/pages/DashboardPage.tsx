// src/pages/DashboardPage.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getSystemStatus, SystemStatusReport } from '../services/api';
import StatusWidget from '../components/StatusWidget';

const DashboardPage: React.FC = () => {
    const [statusReport, setStatusReport] = useState<SystemStatusReport | null>(null);
    const [isLoading, setIsLoading] = useState(true); // For initial load indicator
    const [error, setError] = useState<string | null>(null);
    const isInitialLoad = useRef(true);

    // Stable fetch function
    const fetchDashboardData = useCallback(async () => {
        try {
            const statusData = await getSystemStatus();
            setStatusReport(statusData);
            setError(null); // Clear error on success
        } catch (err: any) {
            console.error("Failed to fetch dashboard status:", err);
            setError(err.message || "Failed to load dashboard data.");
            // --- Clear status data on error to prevent showing stale info ---
            setStatusReport(null);
        } finally {
            if (isInitialLoad.current) {
                setIsLoading(false);
                isInitialLoad.current = false;
            }
        }
    }, []); // Empty dependency array

    // Initial Fetch - Runs only ONCE on mount
    useEffect(() => {
        console.log("Running initial dashboard fetch effect...");
        setIsLoading(true);
        isInitialLoad.current = true;
        fetchDashboardData();
    }, [fetchDashboardData]); // Depend on stable fetch function

    // Auto-refresh interval - Runs setup only ONCE on mount
    useEffect(() => {
        console.log("Setting up dashboard refresh interval...");
        const intervalId = setInterval(() => {
            console.log("Interval: Refreshing dashboard data...");
            fetchDashboardData(); // Fetch without setting loading true
        }, 30000);

        return () => {
            console.log("Clearing dashboard refresh interval.");
            clearInterval(intervalId);
        };
    }, [fetchDashboardData]); // Depend on stable fetch function


    // --- Determine Content to Render ---
    let content;
    if (isLoading) {
        // Initial loading state
        content = (
             <div className="text-center text-gray-500 dark:text-gray-400 py-10">
                Loading dashboard status...
            </div>
        );
    } else if (error) {
        // Error state - only show the error message
        content = (
             <div className="mb-4 rounded-md bg-red-50 p-4 dark:bg-red-900">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    Error loading dashboard: {error}
                </p>
                <p className="mt-1 text-xs text-red-700 dark:text-red-300">
                    The system status could not be retrieved. Please check API service health. Refreshing automatically...
                </p>
            </div>
        );
    } else if (statusReport) {
        // Success state - show the widgets
        content = (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                 <StatusWidget
                    title="Database (PostgreSQL)"
                    statusData={statusReport.database}
                    // isLoading={false} // No longer needed explicitly here
                 />
                 <StatusWidget
                    title="Message Broker (RabbitMQ)"
                    statusData={statusReport.message_broker}
                 />
                <StatusWidget
                    title="API Service"
                    statusData={statusReport.api_service}
                />
                 <StatusWidget
                    title="DICOM Listener"
                    statusData={statusReport.dicom_listener}
                 />
                  <StatusWidget
                    title="Processing Workers (Celery)"
                    statusData={statusReport.celery_workers}
                 />
            </div>
        );
    } else {
         // Fallback case - should ideally be covered by loading or error
         content = (
             <div className="text-center text-gray-500 dark:text-gray-400 py-10">
                No dashboard data available.
            </div>
        );
    }


    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-6">
                Dashboard
            </h1>

            {/* Render the determined content */}
            {content}

        </div>
    );
};

export default DashboardPage;
