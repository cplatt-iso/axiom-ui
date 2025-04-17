// src/components/StatusWidget.tsx
import React from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/solid'; // Using Solid for emphasis
import { ComponentStatus } from '../services/api'; // Import the type

interface StatusWidgetProps {
    title: string;
    statusData: ComponentStatus | undefined; // Allow undefined during loading
    isLoading?: boolean;
}

const StatusWidget: React.FC<StatusWidgetProps> = ({ title, statusData, isLoading = false }) => {
    const getStatusInfo = (): { Icon: React.ElementType; color: string; text: string } => {
        if (isLoading || !statusData) {
            return { Icon: QuestionMarkCircleIcon, color: 'text-gray-400 dark:text-gray-500 animate-pulse', text: 'Loading...' };
        }
        switch (statusData.status.toLowerCase()) {
            case 'ok':
            case 'listening': // Treat listening as ok
                return { Icon: CheckCircleIcon, color: 'text-green-500 dark:text-green-400', text: 'OK' };
            case 'degraded':
                return { Icon: ExclamationTriangleIcon, color: 'text-yellow-500 dark:text-yellow-400', text: 'Degraded' };
            case 'down':
            case 'error':
                return { Icon: XCircleIcon, color: 'text-red-500 dark:text-red-400', text: 'Error' };
            case 'unknown':
            default:
                return { Icon: QuestionMarkCircleIcon, color: 'text-gray-400 dark:text-gray-500', text: 'Unknown' };
        }
    };

    const { Icon, color, text } = getStatusInfo();

    return (
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex flex-col justify-between">
            <div>
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">{title}</h3>
                <div className="flex items-center space-x-2">
                    <Icon className={`h-6 w-6 ${color}`} />
                    <span className={`text-lg font-semibold ${color}`}>{text}</span>
                </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 truncate" title={statusData?.details ?? 'No details available'}>
                {statusData?.details ?? (isLoading ? '' : 'No details available')}
            </p>
        </div>
    );
};

export default StatusWidget;
