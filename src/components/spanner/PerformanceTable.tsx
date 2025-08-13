import React from 'react';

interface PerformanceTableProps {
    title?: string;
    sources?: any[];
    type?: 'top' | 'worst';
}

const PerformanceTable: React.FC<PerformanceTableProps> = ({ title = "Performance Table" }) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{title}</h3>
            <p className="text-gray-500 dark:text-gray-400">
                Performance table placeholder - coming soon...
            </p>
        </div>
    );
};

export default PerformanceTable;
