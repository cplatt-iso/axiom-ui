import React, { useState } from 'react';
import type { SpannerConfigCreate } from '../../schemas/spannerSchema';
import { createSpannerConfig } from '../../services/api';

interface CreateSpannerConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CreateSpannerConfigModal: React.FC<CreateSpannerConfigModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<SpannerConfigCreate>({
        name: '',
        description: '',
        is_enabled: true,
        supports_cfind: true,
        supports_cget: false,
        supports_cmove: true,
        supports_qido: true,
        supports_wado: true,
        query_timeout_seconds: 300,
        retrieval_timeout_seconds: 300,
        failure_strategy: 'BEST_EFFORT',
        minimum_success_threshold: null,
        deduplication_strategy: 'FIRST_WINS',
        cmove_strategy: 'PROXY',
        max_concurrent_sources: 5
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        
        // Client-side validation
        const hasDimseSupport = formData.supports_cfind || formData.supports_cget || formData.supports_cmove;
        const hasDicomWebSupport = formData.supports_qido || formData.supports_wado;
        
        if (!hasDimseSupport && !hasDicomWebSupport) {
            setError('At least one querying protocol (DIMSE or DICOMweb) must be supported');
            setIsSubmitting(false);
            return;
        }
        
        try {
            await createSpannerConfig(formData);
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to create spanner config:', error);
            setError(error instanceof Error ? error.message : 'Failed to create configuration');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleInputChange = (field: keyof SpannerConfigCreate, value: unknown) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        Create Spanner Configuration
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        ✕
                    </button>
                </div>
                
                {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md">
                        {error}
                    </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Name *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                            placeholder="Enter configuration name"
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Description
                        </label>
                        <textarea
                            value={formData.description || ''}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                            rows={3}
                            placeholder="Enter description"
                        />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Query Timeout (seconds)
                            </label>
                            <input
                                type="number"
                                value={formData.query_timeout_seconds}
                                onChange={(e) => handleInputChange('query_timeout_seconds', parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                                min="1"
                                max="3600"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Retrieval Timeout (seconds)
                            </label>
                            <input
                                type="number"
                                value={formData.retrieval_timeout_seconds}
                                onChange={(e) => handleInputChange('retrieval_timeout_seconds', parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                                min="1"
                                max="3600"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Max Concurrent Sources
                            </label>
                            <input
                                type="number"
                                value={formData.max_concurrent_sources}
                                onChange={(e) => handleInputChange('max_concurrent_sources', parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                                min="1"
                                max="100"
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            DIMSE Protocol Support
                        </label>
                        <div className="space-y-2">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={formData.supports_cfind}
                                    onChange={(e) => handleInputChange('supports_cfind', e.target.checked)}
                                    className="mr-2"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">C-FIND Support</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={formData.supports_cget}
                                    onChange={(e) => handleInputChange('supports_cget', e.target.checked)}
                                    className="mr-2"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">C-GET Support</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={formData.supports_cmove}
                                    onChange={(e) => handleInputChange('supports_cmove', e.target.checked)}
                                    className="mr-2"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">C-MOVE Support</span>
                            </label>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            DICOMweb Protocol Support
                        </label>
                        <div className="space-y-2">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={formData.supports_qido}
                                    onChange={(e) => handleInputChange('supports_qido', e.target.checked)}
                                    className="mr-2"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">QIDO-RS Support (Query)</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={formData.supports_wado}
                                    onChange={(e) => handleInputChange('supports_wado', e.target.checked)}
                                    className="mr-2"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">WADO-RS Support (Retrieve)</span>
                            </label>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Failure Strategy
                        </label>
                        <select
                            value={formData.failure_strategy}
                            onChange={(e) => handleInputChange('failure_strategy', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                        >
                            <option value="FAIL_FAST">Fail Fast</option>
                            <option value="BEST_EFFORT">Best Effort</option>
                            <option value="MINIMUM_THRESHOLD">Minimum Threshold</option>
                        </select>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Deduplication Strategy
                            </label>
                            <select
                                value={formData.deduplication_strategy}
                                onChange={(e) => handleInputChange('deduplication_strategy', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                            >
                                <option value="FIRST_WINS">First Wins</option>
                                <option value="MOST_COMPLETE">Most Complete</option>
                                <option value="MERGE_ALL">Merge All</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                C-MOVE Strategy
                            </label>
                            <select
                                value={formData.cmove_strategy}
                                onChange={(e) => handleInputChange('cmove_strategy', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                            >
                                <option value="PROXY">Proxy</option>
                                <option value="DIRECT">Direct</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !formData.name.trim() || (
                                !(formData.supports_cfind || formData.supports_cget || formData.supports_cmove) && 
                                !(formData.supports_qido || formData.supports_wado)
                            )}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                        >
                            {isSubmitting ? 'Creating...' : 'Create Configuration'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateSpannerConfigModal;
