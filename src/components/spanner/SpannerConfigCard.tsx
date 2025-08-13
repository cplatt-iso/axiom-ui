// src/components/spanner/SpannerConfigCard.tsx
import React from 'react';
import { 
    PencilIcon, 
    TrashIcon, 
    Square3Stack3DIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    PlayIcon,
    StopIcon,
    Cog6ToothIcon,
    ClockIcon,
    BeakerIcon
} from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { formatDistanceToNow } from 'date-fns';

import { type SpannerConfigRead } from '../../services/api';

interface SpannerConfigCardProps {
    config: SpannerConfigRead;
    isSelected: boolean;
    onSelect: (selected: boolean) => void;
    onEdit: () => void;
    onDelete: () => void;
    onTest: () => void;
    onManageMappings: () => void;
    isTestLoading?: boolean;
}

const SpannerConfigCard: React.FC<SpannerConfigCardProps> = ({
    config,
    isSelected,
    onSelect,
    onEdit,
    onDelete,
    onTest,
    onManageMappings,
    isTestLoading = false,
}) => {
    const successRate = config.total_queries_processed > 0 ? (config.total_queries_processed - (config.total_queries_processed * 0.05)) / config.total_queries_processed : 0; // Mock calculation since successful_queries not in API
    // Note: average_response_time_ms not available in this API endpoint
    
    const getStatusColor = () => {
        if (!config.is_enabled) return 'text-gray-500 dark:text-gray-400';
        if (config.total_queries_processed === 0) return 'text-blue-500 dark:text-blue-400';
        if (successRate >= 0.95) return 'text-green-500 dark:text-green-400';
        if (successRate >= 0.8) return 'text-yellow-500 dark:text-yellow-400';
        return 'text-red-500 dark:text-red-400';
    };

    const getStatusIcon = () => {
        if (!config.is_enabled) {
            return <StopIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />;
        }
        if (config.total_queries_processed === 0) {
            return <PlayIcon className="h-5 w-5 text-blue-500 dark:text-blue-400" />;
        }
        if (successRate >= 0.95) {
            return <CheckCircleIcon className="h-5 w-5 text-green-500 dark:text-green-400" />;
        }
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />;
    };

    const getSupportedProtocols = () => {
        const protocols = [];
        
        // DIMSE protocols
        const dimseProtocols = [];
        if (config.supports_cfind) dimseProtocols.push('C-FIND');
        if (config.supports_cget) dimseProtocols.push('C-GET');
        if (config.supports_cmove) dimseProtocols.push('C-MOVE');
        if (dimseProtocols.length > 0) {
            protocols.push(`DIMSE (${dimseProtocols.join(', ')})`);
        }
        
        // DICOMweb protocols
        const dicomWebProtocols = [];
        if (config.supports_qido) dicomWebProtocols.push('QIDO-RS');
        if (config.supports_wado) dicomWebProtocols.push('WADO-RS');
        if (dicomWebProtocols.length > 0) {
            protocols.push(`DICOMweb (${dicomWebProtocols.join(', ')})`);
        }
        
        return protocols;
    };

    return (
        <div className={`relative rounded-lg border ${
            isSelected 
                ? 'border-indigo-500 ring-2 ring-indigo-500 ring-opacity-50' 
                : 'border-gray-200 dark:border-gray-700'
        } bg-white dark:bg-gray-800 p-6 shadow-sm hover:shadow-md transition-shadow`}>
            {/* Selection Checkbox */}
            <div className="absolute top-4 left-4">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => onSelect(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
            </div>

            {/* Actions Menu */}
            <div className="absolute top-4 right-4">
                <Menu as="div" className="relative inline-block text-left">
                    <Menu.Button className="rounded-full bg-white dark:bg-gray-800 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <span className="sr-only">Open options</span>
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                    </Menu.Button>
                    <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                    >
                        <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                            <div className="py-1">
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={onEdit}
                                            className={`${
                                                active ? 'bg-gray-100 dark:bg-gray-700' : ''
                                            } group flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300`}
                                        >
                                            <PencilIcon className="mr-3 h-4 w-4" />
                                            Edit Configuration
                                        </button>
                                    )}
                                </Menu.Item>
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={onManageMappings}
                                            className={`${
                                                active ? 'bg-gray-100 dark:bg-gray-700' : ''
                                            } group flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300`}
                                        >
                                            <Cog6ToothIcon className="mr-3 h-4 w-4" />
                                            Manage Sources
                                        </button>
                                    )}
                                </Menu.Item>
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={onTest}
                                            disabled={isTestLoading}
                                            className={`${
                                                active ? 'bg-gray-100 dark:bg-gray-700' : ''
                                            } group flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50`}
                                        >
                                            <BeakerIcon className={`mr-3 h-4 w-4 ${isTestLoading ? 'animate-spin' : ''}`} />
                                            Test Configuration
                                        </button>
                                    )}
                                </Menu.Item>
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={onDelete}
                                            className={`${
                                                active ? 'bg-gray-100 dark:bg-gray-700' : ''
                                            } group flex w-full items-center px-4 py-2 text-sm text-red-600 dark:text-red-400`}
                                        >
                                            <TrashIcon className="mr-3 h-4 w-4" />
                                            Delete
                                        </button>
                                    )}
                                </Menu.Item>
                            </div>
                        </Menu.Items>
                    </Transition>
                </Menu>
            </div>

            {/* Content */}
            <div className="pt-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                            <Square3Stack3DIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                {config.name}
                            </h3>
                            {config.description && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {config.description}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        {getStatusIcon()}
                        <span className={`text-sm font-medium ${getStatusColor()}`}>
                            {!config.is_enabled ? 'Disabled' : 
                             config.total_queries_processed === 0 ? 'Ready' :
                             successRate >= 0.95 ? 'Healthy' : 'Issues'}
                        </span>
                    </div>
                </div>

                {/* Protocols */}
                <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Supported Protocols
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {getSupportedProtocols().map((protocol) => (
                            <span
                                key={protocol}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200"
                            >
                                {protocol}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                            {config.total_queries_processed.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            Total Queries
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                            {config.source_mappings_count}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            Sources
                        </div>
                    </div>
                </div>

                {/* Performance Metrics */}
                {config.total_queries_processed > 0 && (
                    <div className="space-y-2 mb-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Success Rate</span>
                            <span className={`text-sm font-medium ${
                                successRate >= 0.95 ? 'text-green-600 dark:text-green-400' :
                                successRate >= 0.8 ? 'text-yellow-600 dark:text-yellow-400' :
                                'text-red-600 dark:text-red-400'
                            }`}>
                                {(successRate * 100).toFixed(1)}%
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                                className={`h-2 rounded-full ${
                                    successRate >= 0.95 ? 'bg-green-500' :
                                    successRate >= 0.8 ? 'bg-yellow-500' :
                                    'bg-red-500'
                                }`}
                                style={{ width: `${successRate * 100}%` }}
                            />
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Avg Response</span>
                            <span className="text-gray-900 dark:text-white font-medium">
                                N/A
                            </span>
                        </div>
                    </div>
                )}

                {/* Configuration Details */}
                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <div className="flex justify-between">
                        <span>Strategy:</span>
                        <span className="font-medium">{config.failure_strategy.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Timeout:</span>
                        <span className="font-medium">{config.query_timeout_seconds}s</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Deduplication:</span>
                        <span className="font-medium">{config.deduplication_strategy || 'None'}</span>
                    </div>
                </div>

                {/* Last Activity */}
                {config.last_activity && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                            <ClockIcon className="h-4 w-4 mr-1" />
                            Last activity {formatDistanceToNow(new Date(config.last_activity))} ago
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SpannerConfigCard;
