// src/components/spanner/ServiceStatusCard.tsx
import React from 'react';
import { SpannerServiceStatus } from '../../services/api';

interface ServiceStatusCardProps {
    service: SpannerServiceStatus;
    onRestart: () => void;
    onViewLogs: () => void;
    isRestarting?: boolean;
}

const ServiceStatusCard: React.FC<ServiceStatusCardProps> = ({
    service,
    onRestart,
    onViewLogs,
    isRestarting = false,
}) => {
    // TODO: Implement full service status card
    return (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {service.service_name}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Status: {service.status}
                    </p>
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={onViewLogs}
                        className="text-sm text-indigo-600 hover:text-indigo-500"
                    >
                        View Logs
                    </button>
                    <button
                        onClick={onRestart}
                        disabled={isRestarting}
                        className="text-sm text-gray-600 hover:text-gray-500 disabled:opacity-50"
                    >
                        {isRestarting ? 'Restarting...' : 'Restart'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ServiceStatusCard;
