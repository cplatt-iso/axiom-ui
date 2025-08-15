// src/components/spanner/SpannerSourceMappingsModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
    SpannerConfigRead, 
    SpannerSourceMappingRead,
    getSpannerSourceMappings,
    getAllAvailableSources,
    createSpannerSourceMapping,
    updateSpannerSourceMapping,
    deleteSpannerSourceMapping,
    AvailableSource
} from '../../services/api';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { 
    Cog6ToothIcon, 
    PlusIcon, 
    PencilIcon, 
    TrashIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { SpannerSourceMappingCreate, SpannerSourceMappingUpdate } from '../../schemas/spannerSchema';

interface SpannerSourceMappingsModalProps {
    isOpen: boolean;
    config: SpannerConfigRead;
    onClose: () => void;
}

interface SourceMappingFormData {
    source_type: 'dimse_qr' | 'dicomweb' | 'google_healthcare';
    source_id: number;
    priority: number;
    is_enabled: boolean;
    weight: number;
    query_filter?: string;
    timeout_override_seconds?: number;
    enable_failover: boolean;
    max_retries: number;
    retry_delay_seconds: number;
}

const SpannerSourceMappingsModal: React.FC<SpannerSourceMappingsModalProps> = ({
    isOpen,
    config,
    onClose,
}) => {
    const [sourceMappings, setSourceMappings] = useState<SpannerSourceMappingRead[]>([]);
    const [availableSources, setAvailableSources] = useState<AvailableSource[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingMapping, setEditingMapping] = useState<SpannerSourceMappingRead | null>(null);
    const [formData, setFormData] = useState<SourceMappingFormData>({
        source_type: 'dimse_qr',
        source_id: 0,
        priority: 50,
        is_enabled: true,
        weight: 1.0,
        enable_failover: true,
        max_retries: 2,
        retry_delay_seconds: 5,
    });

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [mappings, sources] = await Promise.all([
                getSpannerSourceMappings(config.id),
                getAllAvailableSources()
            ]);
            // Ensure we always set arrays, even if the API returns something unexpected
            setSourceMappings(Array.isArray(mappings) ? mappings : []);
            setAvailableSources(Array.isArray(sources) ? sources : []);
        } catch (error: unknown) {
            console.error('Failed to fetch data:', error);
            toast.error('Failed to load source mappings');
            // Reset to empty arrays on error
            setSourceMappings([]);
            setAvailableSources([]);
        } finally {
            setIsLoading(false);
        }
    }, [config.id]);

    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen, config.id, fetchData]);

    const resetForm = () => {
        setFormData({
            source_type: 'dimse_qr',
            source_id: 0,
            priority: 50,
            is_enabled: true,
            weight: 1.0,
            enable_failover: true,
            max_retries: 2,
            retry_delay_seconds: 5,
        });
        setEditingMapping(null);
        setShowAddForm(false);
    };

    const handleAddMapping = () => {
        resetForm();
        setShowAddForm(true);
    };

    const handleEditMapping = (mapping: SpannerSourceMappingRead) => {
        setFormData({
            source_type: mapping.source_type,
            source_id: mapping.source_id,
            priority: mapping.priority,
            is_enabled: mapping.is_enabled,
            weight: mapping.weight,
            query_filter: mapping.query_filter || '',
            timeout_override_seconds: mapping.timeout_override_seconds || undefined,
            enable_failover: mapping.enable_failover,
            max_retries: mapping.max_retries,
            retry_delay_seconds: mapping.retry_delay_seconds,
        });
        setEditingMapping(mapping);
        setShowAddForm(true);
    };

    const handleSubmitMapping = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validate source selection
        if (formData.source_id === 0) {
            toast.error('Please select a source');
            return;
        }
        
        try {
            if (editingMapping) {
                // Update existing mapping
                const updateData: SpannerSourceMappingUpdate = {
                    priority: formData.priority,
                    is_enabled: formData.is_enabled,
                    weight: formData.weight,
                    query_filter: formData.query_filter || null,
                    timeout_override_seconds: formData.timeout_override_seconds || null,
                    enable_failover: formData.enable_failover,
                    max_retries: formData.max_retries,
                    retry_delay_seconds: formData.retry_delay_seconds,
                };
                await updateSpannerSourceMapping(config.id, editingMapping.id, updateData);
                toast.success('Source mapping updated successfully');
            } else {
                // Create new mapping
                const createData: Omit<SpannerSourceMappingCreate, 'spanner_config_id'> = {
                    source_type: formData.source_type,
                    source_id: formData.source_id,
                    priority: formData.priority,
                    is_enabled: formData.is_enabled,
                    weight: formData.weight,
                    query_filter: formData.query_filter || undefined,
                    timeout_override_seconds: formData.timeout_override_seconds || undefined,
                    enable_failover: formData.enable_failover,
                    max_retries: formData.max_retries,
                    retry_delay_seconds: formData.retry_delay_seconds,
                };
                console.log('🚀 About to create spanner source mapping with data:', createData);
                await createSpannerSourceMapping(config.id, createData);
                toast.success('Source mapping created successfully');
            }
            
            resetForm();
            fetchData(); // Refresh the list
        } catch (error: unknown) {
            console.error('Failed to save mapping:', error);
            const errorMessage = error && typeof error === 'object' && 'detail' in error && typeof error.detail === 'string'
                ? error.detail
                : 'Failed to save source mapping';
            toast.error(errorMessage);
        }
    };

    const handleDeleteMapping = async (mapping: SpannerSourceMappingRead) => {
        if (!confirm(`Are you sure you want to delete the mapping for "${mapping.source_name}"?`)) {
            return;
        }

        try {
            await deleteSpannerSourceMapping(config.id, mapping.id);
            toast.success('Source mapping deleted successfully');
            fetchData(); // Refresh the list
        } catch (error: unknown) {
            console.error('Failed to delete mapping:', error);
            const errorMessage = error && typeof error === 'object' && 'detail' in error && typeof error.detail === 'string'
                ? error.detail
                : 'Failed to delete source mapping';
            toast.error(errorMessage);
        }
    };

    const filteredSources = availableSources.filter(source => source.type === formData.source_type);

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-10" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-25" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title
                                    as="h3"
                                    className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <Cog6ToothIcon className="h-6 w-6 text-blue-500 mr-2" />
                                            Manage Sources for {config.name}
                                        </div>
                                        <button
                                            onClick={handleAddMapping}
                                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        >
                                            <PlusIcon className="h-4 w-4 mr-1" />
                                            Add Source
                                        </button>
                                    </div>
                                </Dialog.Title>

                                <div className="space-y-6">
                                    {/* Source Mappings List */}
                                    {isLoading ? (
                                        <div className="text-center py-8">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                            <p className="text-gray-500 dark:text-gray-400 mt-2">Loading source mappings...</p>
                                        </div>
                                    ) : !Array.isArray(sourceMappings) || sourceMappings.length === 0 ? (
                                        <div className="text-center py-8">
                                            <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                            <p className="text-gray-500 dark:text-gray-400">No source mappings configured</p>
                                            <p className="text-sm text-gray-400 dark:text-gray-500">Add sources to enable query spanning</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                                <thead className="bg-gray-50 dark:bg-gray-700">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                            Source
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                            Type
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                            Priority
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                            Weight
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                            Status
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                            Actions
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                    {Array.isArray(sourceMappings) && sourceMappings.map((mapping) => (
                                                        <tr key={mapping.id || Math.random()}>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                                {mapping.source_name || `Source ${mapping.source_id || 'Unknown'}`}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                                    {mapping.source_type ? mapping.source_type.replace('_', ' ').toUpperCase() : 'UNKNOWN'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                                {mapping.priority ?? 'N/A'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                                {mapping.weight ?? 'N/A'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                                    mapping.is_enabled
                                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                                                }`}>
                                                                    {mapping.is_enabled ? 'Enabled' : 'Disabled'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                                <div className="flex space-x-2">
                                                                    <button
                                                                        onClick={() => handleEditMapping(mapping)}
                                                                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                                                    >
                                                                        <PencilIcon className="h-4 w-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteMapping(mapping)}
                                                                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                                                    >
                                                                        <TrashIcon className="h-4 w-4" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {/* Add/Edit Form */}
                                    {showAddForm && (
                                        <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
                                            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                                {editingMapping ? 'Edit Source Mapping' : 'Add Source Mapping'}
                                            </h4>
                                            <form onSubmit={handleSubmitMapping} className="space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            Source Type
                                                        </label>
                                                        <select
                                                            value={formData.source_type}
                                                            onChange={(e) => setFormData(prev => ({ 
                                                                ...prev, 
                                                                source_type: e.target.value as 'dimse_qr' | 'dicomweb' | 'google_healthcare',
                                                                source_id: 0 // Reset source_id when type changes
                                                            }))}
                                                            disabled={!!editingMapping}
                                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                                                        >
                                                            <option value="dimse_qr">DIMSE Q/R</option>
                                                            <option value="dicomweb">DICOMweb</option>
                                                            <option value="google_healthcare">Google Healthcare</option>
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            Source
                                                        </label>
                                                        <select
                                                            value={formData.source_id}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, source_id: parseInt(e.target.value) }))}
                                                            disabled={!!editingMapping}
                                                            required
                                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                                                        >
                                                            <option value={0}>Select a source...</option>
                                                            {filteredSources.map((source) => (
                                                                <option key={source.id} value={source.id}>
                                                                    {source.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            Priority (0-100)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            value={formData.priority}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            Weight (0.0-1.0)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="1"
                                                            step="0.1"
                                                            value={formData.weight}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, weight: parseFloat(e.target.value) }))}
                                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            Timeout Override (seconds)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max="3600"
                                                            value={formData.timeout_override_seconds || ''}
                                                            onChange={(e) => setFormData(prev => ({ 
                                                                ...prev, 
                                                                timeout_override_seconds: e.target.value ? parseInt(e.target.value) : undefined 
                                                            }))}
                                                            placeholder="Use default"
                                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                        Query Filter (JSON)
                                                    </label>
                                                    <textarea
                                                        value={formData.query_filter || ''}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, query_filter: e.target.value }))}
                                                        placeholder='{"StudyDate": "20230101-", "Modality": "CT"}'
                                                        rows={2}
                                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    <label className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.is_enabled}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, is_enabled: e.target.checked }))}
                                                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                                        />
                                                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Enabled</span>
                                                    </label>

                                                    <label className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.enable_failover}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, enable_failover: e.target.checked }))}
                                                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                                        />
                                                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Failover</span>
                                                    </label>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            Max Retries
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="10"
                                                            value={formData.max_retries}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, max_retries: parseInt(e.target.value) }))}
                                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            Retry Delay (s)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max="60"
                                                            value={formData.retry_delay_seconds}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, retry_delay_seconds: parseInt(e.target.value) }))}
                                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex justify-end space-x-3 pt-4">
                                                    <button
                                                        type="button"
                                                        onClick={resetForm}
                                                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                    >
                                                        {editingMapping ? 'Update Mapping' : 'Add Mapping'}
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    )}

                                    {/* Close Button */}
                                    <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-600">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default SpannerSourceMappingsModal;
