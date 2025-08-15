// src/pages/SpannerConfigurationsPage.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
    PlusIcon, 
    MagnifyingGlassIcon,
    FunnelIcon,
    Square3Stack3DIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';

import {
    getSpannerConfigs,
    deleteSpannerConfig,
    bulkEnableSpannerConfigs,
    testSpannerConfig,
    type SpannerConfigRead
} from '../services/api';
import SpannerConfigCard from '../components/spanner/SpannerConfigCard';
import CreateSpannerConfigModal from '../components/spanner/CreateSpannerConfigModal';
import EditSpannerConfigModal from '../components/spanner/EditSpannerConfigModal';
import SpannerSourceMappingsModal from '../components/spanner/SpannerSourceMappingsModal';
import DeleteConfirmationModal from '../components/spanner/DeleteConfirmationModal';
import BulkActionsToolbar from '../components/spanner/BulkActionsToolbar';

type SortField = 'name' | 'created_at' | 'last_query_at';
type SortDirection = 'asc' | 'desc';

interface FilterState {
    search: string;
    enabled: boolean | null;
    hasErrorsOnly: boolean;
    protocols: string[];
}

const SpannerConfigurationsPage: React.FC = () => {
    const queryClient = useQueryClient();
    
    // State
    const [sortField] = useState<SortField>('name');
    const [sortDirection] = useState<SortDirection>('asc');
    const [selectedConfigs, setSelectedConfigs] = useState<Set<number>>(new Set());
    const [filters, setFilters] = useState<FilterState>({
        search: '',
        enabled: null,
        hasErrorsOnly: false,
        protocols: []
    });

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingConfig, setEditingConfig] = useState<SpannerConfigRead | null>(null);
    const [mappingsConfig, setMappingsConfig] = useState<SpannerConfigRead | null>(null);
    const [deletingConfig, setDeletingConfig] = useState<SpannerConfigRead | null>(null);

    // Data fetching
    const { 
        data: configs = [], 
        isLoading, 
        error,
        refetch 
    } = useQuery({
        queryKey: ['spanner-configs'],
        queryFn: () => getSpannerConfigs(),
        refetchInterval: 30000, // Refresh every 30 seconds
        select: (data) => Array.isArray(data) ? data : [], // Ensure we always get an array
    });

    // Mutations
    const deleteConfigMutation = useMutation({
        mutationFn: deleteSpannerConfig,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['spanner-configs'] });
            toast.success('Configuration deleted successfully');
            setDeletingConfig(null);
        },
        onError: (error: unknown) => {
            const errorMessage = error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
                ? error.message
                : 'Unknown error';
            toast.error(`Failed to delete configuration: ${errorMessage}`);
        },
    });

    const bulkEnableMutation = useMutation({
        mutationFn: ({ ids, enabled }: { ids: number[]; enabled: boolean }) => 
            bulkEnableSpannerConfigs(ids, enabled),
        onSuccess: (_, { enabled }) => {
            queryClient.invalidateQueries({ queryKey: ['spanner-configs'] });
            toast.success(`Configurations ${enabled ? 'enabled' : 'disabled'} successfully`);
            setSelectedConfigs(new Set());
        },
        onError: (error: unknown) => {
            const errorMessage = error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
                ? error.message
                : 'Unknown error';
            toast.error(`Bulk operation failed: ${errorMessage}`);
        },
    });

    const testConfigMutation = useMutation({
        mutationFn: testSpannerConfig,
        onSuccess: (result) => {
            if (result.success) {
                toast.success('Configuration test passed');
            } else {
                toast.error(`Configuration test failed: ${result.message}`);
            }
        },
        onError: (error: unknown) => {
            const errorMessage = error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
                ? error.message
                : 'Unknown error';
            toast.error(`Test failed: ${errorMessage}`);
        },
    });

    // Filter and sort configs
    const filteredAndSortedConfigs = React.useMemo(() => {
        const filtered = configs.filter(config => {
            // Search filter
            if (filters.search && !config.name.toLowerCase().includes(filters.search.toLowerCase()) &&
                !config.description?.toLowerCase().includes(filters.search.toLowerCase())) {
                return false;
            }

            // Enabled filter
            if (filters.enabled !== null && config.is_enabled !== filters.enabled) {
                return false;
            }

            // Errors filter
            if (filters.hasErrorsOnly) {
                // Note: Backend doesn't provide query statistics, so we skip error filtering
                // The filter UI remains for future implementation when metrics are available
            }

            // Protocol filters
            if (filters.protocols.length > 0) {
                const supportedProtocols: string[] = [];
                // Check DIMSE protocols
                if (config.supports_cfind || config.supports_cget || config.supports_cmove) {
                    supportedProtocols.push('dimse');
                }
                // Check DICOMweb protocols
                if (config.supports_qido || config.supports_wado) {
                    supportedProtocols.push('dicomweb');
                }
                
                if (!filters.protocols.some(p => supportedProtocols.includes(p))) {
                    return false;
                }
            }

            return true;
        });

        // Sort
        filtered.sort((a, b) => {
            const aValue = a[sortField as keyof SpannerConfigRead];
            const bValue = b[sortField as keyof SpannerConfigRead];

            // Handle null/undefined values
            const valA = aValue == null ? '' : aValue;
            const valB = bValue == null ? '' : bValue;

            const strA = String(valA).toLowerCase();
            const strB = String(valB).toLowerCase();

            let comparison = 0;
            if (strA < strB) comparison = -1;
            if (strA > strB) comparison = 1;

            return sortDirection === 'desc' ? -comparison : comparison;
        });

        return filtered;
    }, [configs, filters, sortField, sortDirection]);

    // Handlers
    // const handleSort = (field: SortField) => {
    //     if (sortField === field) {
    //         setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    //     } else {
    //         setSortField(field);
    //         setSortDirection('asc');
    //     }
    // };

    const handleSelectConfig = (configId: number, selected: boolean) => {
        const newSelected = new Set(selectedConfigs);
        if (selected) {
            newSelected.add(configId);
        } else {
            newSelected.delete(configId);
        }
        setSelectedConfigs(newSelected);
    };

    // const handleSelectAll = (selected: boolean) => {
    //     if (selected) {
    //         setSelectedConfigs(new Set(filteredAndSortedConfigs.map(c => c.id)));
    //     } else {
    //         setSelectedConfigs(new Set());
    //     }
    // };

    const handleBulkEnable = (enabled: boolean) => {
        bulkEnableMutation.mutate({ ids: Array.from(selectedConfigs), enabled });
    };

    const handleTestConfig = (config: SpannerConfigRead) => {
        testConfigMutation.mutate(config.id);
    };

    const handleEditConfig = (config: SpannerConfigRead) => {
        setEditingConfig(config);
    };

    const handleManageMappings = (config: SpannerConfigRead) => {
        setMappingsConfig(config);
    };

    const handleDeleteConfig = (config: SpannerConfigRead) => {
        setDeletingConfig(config);
    };

    // Auto-refresh on focus
    useEffect(() => {
        const handleFocus = () => refetch();
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [refetch]);

    if (error) {
        return (
            <div className="text-center py-12">
                <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    Failed to load configurations
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {error instanceof Error ? error.message : 'An unknown error occurred'}
                </p>
                <div className="mt-6">
                    <button
                        type="button"
                        onClick={() => refetch()}
                        className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Spanner Configurations
                    </h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Manage enterprise DICOM query spanning configurations
                    </p>
                </div>
                <div className="mt-4 sm:mt-0">
                    <button
                        type="button"
                        onClick={() => setIsCreateModalOpen(true)}
                        className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    >
                        <PlusIcon className="-ml-0.5 mr-1.5 h-4 w-4" />
                        New Configuration
                    </button>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <div className="relative">
                        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search configurations..."
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            className="block w-full rounded-md border-0 py-2 pl-10 pr-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        />
                    </div>
                </div>
                
                <div className="flex items-center space-x-2">
                    <Menu as="div" className="relative inline-block text-left">
                        <Menu.Button className="inline-flex items-center rounded-md bg-white dark:bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
                            <FunnelIcon className="-ml-0.5 mr-1.5 h-4 w-4" />
                            Filters
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
                            <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                <div className="p-4 space-y-4">
                                    {/* Status Filter */}
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                                        <select
                                            value={filters.enabled === null ? 'all' : filters.enabled.toString()}
                                            onChange={(e) => setFilters(prev => ({ 
                                                ...prev, 
                                                enabled: e.target.value === 'all' ? null : e.target.value === 'true' 
                                            }))}
                                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                        >
                                            <option value="all">All</option>
                                            <option value="true">Enabled</option>
                                            <option value="false">Disabled</option>
                                        </select>
                                    </div>
                                    
                                    {/* Error Filter */}
                                    <div>
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={filters.hasErrorsOnly}
                                                onChange={(e) => setFilters(prev => ({ 
                                                    ...prev, 
                                                    hasErrorsOnly: e.target.checked 
                                                }))}
                                                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                            />
                                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                                Has errors only
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </Menu.Items>
                        </Transition>
                    </Menu>
                </div>
            </div>

            {/* Bulk Actions */}
            {selectedConfigs.size > 0 && (
                <BulkActionsToolbar
                    selectedCount={selectedConfigs.size}
                    onEnableAll={() => handleBulkEnable(true)}
                    onDisableAll={() => handleBulkEnable(false)}
                    onClearSelection={() => setSelectedConfigs(new Set())}
                    isLoading={bulkEnableMutation.isPending}
                />
            )}

            {/* Configurations Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="animate-pulse">
                            <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-64"></div>
                        </div>
                    ))}
                </div>
            ) : filteredAndSortedConfigs.length === 0 ? (
                <div className="text-center py-12">
                    <Square3Stack3DIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                        No configurations found
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {configs.length === 0 
                            ? 'Get started by creating your first spanner configuration.'
                            : 'Try adjusting your search or filter criteria.'
                        }
                    </p>
                    {configs.length === 0 && (
                        <div className="mt-6">
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(true)}
                                className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                            >
                                <PlusIcon className="-ml-0.5 mr-1.5 h-4 w-4" />
                                Create Configuration
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAndSortedConfigs.map((config) => (
                        <SpannerConfigCard
                            key={config.id}
                            config={config}
                            isSelected={selectedConfigs.has(config.id)}
                            onSelect={(selected: boolean) => handleSelectConfig(config.id, selected)}
                            onEdit={() => handleEditConfig(config)}
                            onDelete={() => handleDeleteConfig(config)}
                            onTest={() => handleTestConfig(config)}
                            onManageMappings={() => handleManageMappings(config)}
                            isTestLoading={testConfigMutation.isPending}
                        />
                    ))}
                </div>
            )}

            {/* Modals */}
            <CreateSpannerConfigModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => {
                    setIsCreateModalOpen(false);
                    queryClient.invalidateQueries({ queryKey: ['spanner-configs'] });
                }}
            />

            {editingConfig && (
                <EditSpannerConfigModal
                    isOpen={true}
                    config={editingConfig}
                    onClose={() => setEditingConfig(null)}
                    onSuccess={() => {
                        setEditingConfig(null);
                        queryClient.invalidateQueries({ queryKey: ['spanner-configs'] });
                    }}
                />
            )}

            {mappingsConfig && (
                <SpannerSourceMappingsModal
                    isOpen={true}
                    config={mappingsConfig}
                    onClose={() => setMappingsConfig(null)}
                />
            )}

            {deletingConfig && (
                <DeleteConfirmationModal
                    isOpen={true}
                    title="Delete Configuration"
                    message={
                        <div>
                            <p>Are you sure you want to delete the configuration <strong>{deletingConfig.name}</strong>?</p>
                            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                                This will also delete all associated source mappings and cannot be undone.
                            </p>
                        </div>
                    }
                    confirmLabel="Delete"
                    onConfirm={() => deleteConfigMutation.mutate(deletingConfig.id)}
                    onCancel={() => setDeletingConfig(null)}
                    isLoading={deleteConfigMutation.isPending}
                />
            )}
        </div>
    );
};

export default SpannerConfigurationsPage;
