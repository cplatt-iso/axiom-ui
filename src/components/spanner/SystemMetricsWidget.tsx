// src/components/spanner/SystemMetricsWidget.tsx
import React from 'react';
import { CpuChipIcon, CircleStackIcon } from '@heroicons/react/24/outline';

interface SystemMetricsWidgetProps {
    systemLoadAverage?: number;
    totalMemoryUsageMb?: number;
    availableMemoryMb?: number;
}

const SystemMetricsWidget: React.FC<SystemMetricsWidgetProps> = ({
    systemLoadAverage,
    totalMemoryUsageMb,
    availableMemoryMb,
}) => {
    const formatMemory = (mb?: number) => {
        if (mb === undefined) return 'N/A';
        if (mb >= 1024) {
            return `${(mb / 1024).toFixed(1)} GB`;
        }
        return `${mb.toFixed(0)} MB`;
    };

    return (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                System Metrics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center">
                    <CpuChipIcon className="h-8 w-8 text-blue-500 mr-3" />
                    <div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                            {systemLoadAverage?.toFixed(2) || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            System Load
                        </div>
                    </div>
                </div>
                <div className="flex items-center">
                    <CircleStackIcon className="h-8 w-8 text-green-500 mr-3" />
                    <div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                            {formatMemory(totalMemoryUsageMb)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            Memory Used
                        </div>
                    </div>
                </div>
                <div className="flex items-center">
                    <CircleStackIcon className="h-8 w-8 text-orange-500 mr-3" />
                    <div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                            {formatMemory(availableMemoryMb)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            Memory Available
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SystemMetricsWidget;
