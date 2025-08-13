import React from 'react';

interface MetricsChartProps {
    title?: string;
    data?: any[];
    dataKey?: string;
    color?: string;
    isLoading?: boolean;
    formatValue?: (value: number) => string;
}

const MetricsChart: React.FC<MetricsChartProps> = ({ title = "Metrics Chart" }) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{title}</h3>
            <p className="text-gray-500 dark:text-gray-400">
                Chart placeholder - coming soon...
            </p>
        </div>
    );
};

export default MetricsChart;
