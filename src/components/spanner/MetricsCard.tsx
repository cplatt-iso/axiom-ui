// src/components/spanner/MetricsCard.tsx
import React from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';

interface MetricsCardProps {
    title: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
    color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
    trend?: 'up' | 'down';
}

const MetricsCard: React.FC<MetricsCardProps> = ({
    title,
    value,
    icon: Icon,
    color,
    trend,
}) => {
    const colorClasses = {
        blue: 'text-blue-600 dark:text-blue-400',
        green: 'text-green-600 dark:text-green-400',
        yellow: 'text-yellow-600 dark:text-yellow-400',
        red: 'text-red-600 dark:text-red-400',
        purple: 'text-purple-600 dark:text-purple-400',
        gray: 'text-gray-600 dark:text-gray-400',
    };

    return (
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
                <div className="flex items-center">
                    <div className="flex-shrink-0">
                        <Icon className={`h-6 w-6 ${colorClasses[color]}`} />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                        <dl>
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                                {title}
                            </dt>
                            <dd className="flex items-baseline">
                                <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                                    {value}
                                </div>
                                {trend && (
                                    <div className="ml-2 flex items-baseline text-sm">
                                        {trend === 'up' ? (
                                            <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />
                                        )}
                                    </div>
                                )}
                            </dd>
                        </dl>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MetricsCard;
