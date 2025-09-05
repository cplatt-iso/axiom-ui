// src/pages/DashboardPage.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDashboardStatus, SystemStatusReport, ComponentStatus } from '../services/api'; // Added ComponentStatus type
import StatusWidget from '../components/StatusWidget';
import DimseListenerStatusWidget from '../components/DimseListenerStatusWidget';
import ScraperStatusWidget from '@/components/ScraperStatusWidget';
import DiskUsageWidget from '../components/DiskUsageWidget';
import RecentErrorsWidget from '../components/RecentErrorsWidget';

const DashboardPage: React.FC = () => {
    // Use React Query for dashboard status with optimized caching
    const { 
        data: statusReport, 
        isLoading: isLoadingStatus, 
        error: statusError 
    } = useQuery({
        queryKey: ['dashboard-status'],
        queryFn: getDashboardStatus,
        refetchInterval: 30000, // Refresh every 30 seconds
        staleTime: 15000, // Consider fresh for 15 seconds
        refetchIntervalInBackground: false, // Don't refetch when tab is not active
    });


    // Helper function to safely get component status or a default loading/error state
    const getComponentStatus = (componentName: keyof SystemStatusReport['components']): ComponentStatus => {
         if (isLoadingStatus) return { status: 'loading', details: 'Loading...' };
         if (statusError) return { status: 'error', details: 'Fetch Error' };
         if (!statusReport || !statusReport.components || !statusReport.components[componentName]) return { status: 'unknown', details: 'No data' };
         return statusReport.components[componentName] as ComponentStatus;
    };

    return (
        <div className="container mx-auto px-4 py-8 space-y-8">
            {/* Page Title */}
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                System Dashboard
            </h1>

            {/* Error display */}
            {statusError && (
                <div className="rounded-md bg-red-50 p-4 dark:bg-red-900 border border-red-200 dark:border-red-800">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">Error loading component status: {statusError.message}</p>
                    <p className="mt-1 text-xs text-red-700 dark:text-red-300">Auto-refreshing...</p>
                </div>
            )}

            {/* Core Component Status Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                <StatusWidget title="Database" statusData={getComponentStatus('database')} isLoading={isLoadingStatus} />
                <StatusWidget title="Message Broker" statusData={getComponentStatus('message_broker')} isLoading={isLoadingStatus} />
                <StatusWidget title="API Service" statusData={getComponentStatus('api_service')} isLoading={isLoadingStatus} />
                <StatusWidget title="Processing Workers" statusData={getComponentStatus('celery_workers')} isLoading={isLoadingStatus} />
                <DiskUsageWidget />
            </div>

            {/* Recent Issues Widget */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <RecentErrorsWidget />
                </div>
                {/* Placeholder for additional dashboard widgets */}
                <div className="lg:col-span-2">
                    {/* Future: Service performance metrics, processing queue status, etc. */}
                </div>
            </div>

            {/* Service Status Widgets */}
            <div className="space-y-6">
                <DimseListenerStatusWidget />
                <ScraperStatusWidget />
            </div>
        </div>
    );
};

export default DashboardPage;
