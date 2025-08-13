// src/components/spanner/ServiceControlPanel.tsx
import React from 'react';
import { PlayIcon, StopIcon } from '@heroicons/react/24/outline';

interface ServiceControlPanelProps {
    onStartAll: () => void;
    onStopAll: () => void;
    isStarting?: boolean;
    isStopping?: boolean;
    runningCount: number;
    totalCount: number;
}

const ServiceControlPanel: React.FC<ServiceControlPanelProps> = ({
    onStartAll,
    onStopAll,
    isStarting = false,
    isStopping = false,
    runningCount,
    totalCount,
}) => {
    return (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        Service Control
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {runningCount} of {totalCount} services running
                    </p>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={onStartAll}
                        disabled={isStarting || runningCount === totalCount}
                        className="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 disabled:opacity-50"
                    >
                        <PlayIcon className="-ml-0.5 mr-1.5 h-4 w-4" />
                        {isStarting ? 'Starting...' : 'Start All'}
                    </button>
                    <button
                        onClick={onStopAll}
                        disabled={isStopping || runningCount === 0}
                        className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-50"
                    >
                        <StopIcon className="-ml-0.5 mr-1.5 h-4 w-4" />
                        {isStopping ? 'Stopping...' : 'Stop All'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ServiceControlPanel;
