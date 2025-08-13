// src/components/spanner/EditSpannerConfigModal.tsx
import React, { useState, useEffect } from 'react';
import { SpannerConfigRead, updateSpannerConfig } from '../../services/api';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { PencilIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { SpannerConfigUpdate } from '../../schemas/spannerSchema';

interface EditSpannerConfigModalProps {
    isOpen: boolean;
    config: SpannerConfigRead;
    onClose: () => void;
    onSuccess: () => void;
}

const EditSpannerConfigModal: React.FC<EditSpannerConfigModalProps> = ({
    isOpen,
    config,
    onClose,
    onSuccess,
}) => {
    const [formData, setFormData] = useState<SpannerConfigUpdate>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFormData({
                name: config.name,
                description: config.description || '',
                is_enabled: config.is_enabled,
                supports_cfind: config.supports_cfind,
                supports_cget: config.supports_cget,
                supports_cmove: config.supports_cmove,
                supports_qido: config.supports_qido,
                supports_wado: config.supports_wado,
                query_timeout_seconds: config.query_timeout_seconds,
                retrieval_timeout_seconds: config.retrieval_timeout_seconds,
                failure_strategy: config.failure_strategy,
                minimum_success_threshold: config.minimum_success_threshold,
                deduplication_strategy: config.deduplication_strategy,
                cmove_strategy: config.cmove_strategy,
                max_concurrent_sources: config.max_concurrent_sources,
            });
        }
    }, [isOpen, config]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            await updateSpannerConfig(config.id, formData);
            toast.success('Spanner configuration updated successfully');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Failed to update spanner config:', error);
            toast.error(error?.detail || 'Failed to update spanner configuration');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleInputChange = (field: keyof SpannerConfigUpdate, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

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
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title
                                    as="h3"
                                    className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4"
                                >
                                    <div className="flex items-center">
                                        <PencilIcon className="h-6 w-6 text-blue-500 mr-2" />
                                        Edit Spanner Configuration
                                    </div>
                                </Dialog.Title>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Basic Configuration */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Name *
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.name || ''}
                                                onChange={(e) => handleInputChange('name', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                            />
                                        </div>

                                        <div>
                                            <label className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.is_enabled || false}
                                                    onChange={(e) => handleInputChange('is_enabled', e.target.checked)}
                                                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                                />
                                                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Enabled</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Description
                                        </label>
                                        <textarea
                                            value={formData.description || ''}
                                            onChange={(e) => handleInputChange('description', e.target.value)}
                                            rows={2}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>

                                    {/* Protocol Support */}
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Protocol Support</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            <label className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.supports_cfind || false}
                                                    onChange={(e) => handleInputChange('supports_cfind', e.target.checked)}
                                                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                                />
                                                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">C-FIND</span>
                                            </label>
                                            <label className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.supports_cget || false}
                                                    onChange={(e) => handleInputChange('supports_cget', e.target.checked)}
                                                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                                />
                                                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">C-GET</span>
                                            </label>
                                            <label className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.supports_cmove || false}
                                                    onChange={(e) => handleInputChange('supports_cmove', e.target.checked)}
                                                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                                />
                                                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">C-MOVE</span>
                                            </label>
                                            <label className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.supports_qido || false}
                                                    onChange={(e) => handleInputChange('supports_qido', e.target.checked)}
                                                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                                />
                                                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">QIDO-RS</span>
                                            </label>
                                            <label className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.supports_wado || false}
                                                    onChange={(e) => handleInputChange('supports_wado', e.target.checked)}
                                                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                                />
                                                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">WADO-RS</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Timeout Configuration */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Query Timeout (seconds)
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="3600"
                                                value={formData.query_timeout_seconds || 300}
                                                onChange={(e) => handleInputChange('query_timeout_seconds', parseInt(e.target.value))}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Retrieval Timeout (seconds)
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="3600"
                                                value={formData.retrieval_timeout_seconds || 300}
                                                onChange={(e) => handleInputChange('retrieval_timeout_seconds', parseInt(e.target.value))}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                            />
                                        </div>
                                    </div>

                                    {/* Strategy Configuration */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Failure Strategy
                                            </label>
                                            <select
                                                value={formData.failure_strategy || 'BEST_EFFORT'}
                                                onChange={(e) => handleInputChange('failure_strategy', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                            >
                                                <option value="FAIL_FAST">Fail Fast</option>
                                                <option value="BEST_EFFORT">Best Effort</option>
                                                <option value="MINIMUM_THRESHOLD">Minimum Threshold</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Deduplication Strategy
                                            </label>
                                            <select
                                                value={formData.deduplication_strategy || 'FIRST_WINS'}
                                                onChange={(e) => handleInputChange('deduplication_strategy', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                            >
                                                <option value="FIRST_WINS">First Wins</option>
                                                <option value="MOST_COMPLETE">Most Complete</option>
                                                <option value="MERGE_ALL">Merge All</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                C-MOVE Strategy
                                            </label>
                                            <select
                                                value={formData.cmove_strategy || 'PROXY'}
                                                onChange={(e) => handleInputChange('cmove_strategy', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                            >
                                                <option value="PROXY">Proxy</option>
                                                <option value="DIRECT">Direct</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Max Concurrent Sources
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="100"
                                                value={formData.max_concurrent_sources || 5}
                                                onChange={(e) => handleInputChange('max_concurrent_sources', parseInt(e.target.value))}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                            />
                                        </div>
                                    </div>

                                    {formData.failure_strategy === 'MINIMUM_THRESHOLD' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Minimum Success Threshold
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={formData.minimum_success_threshold || 1}
                                                onChange={(e) => handleInputChange('minimum_success_threshold', parseInt(e.target.value))}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                            />
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default EditSpannerConfigModal;
