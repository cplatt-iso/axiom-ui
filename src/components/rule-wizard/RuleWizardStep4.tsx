// src/components/rule-wizard/RuleWizardStep4.tsx
import React from 'react';
import { 
    CheckCircleIcon,
    ArrowRightIcon,
    CloudIcon,
    ServerIcon,
    CircleStackIcon,
    FolderIcon,
    CogIcon,
    FunnelIcon,
    PlayIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/20/solid';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { StorageBackendConfigRead, Schedule, CrosswalkMapRead } from '@/schemas';

interface WizardFormData {
    name: string;
    description: string;
    priority: number;
    isActive: boolean;
    selectedScheduleId: number | null;
    selectedSources: string[];
    matchCriteria: any[];
    associationCriteria: any[];
    tagModifications: any[];
    selectedAiPromptConfigIds: number[];
    selectedDestinationIds: number[];
}

interface RuleWizardStep4Props {
    formData: WizardFormData;
    updateFormData: (updates: Partial<WizardFormData>) => void;
    validationErrors: Record<string, string>;
    isLoading: boolean;
    availableDestinations: StorageBackendConfigRead[];
    destinationsLoading: boolean;
    availableSchedules: Schedule[];
    availableSources: any[];
    availableCrosswalkMaps: CrosswalkMapRead[];
}

const getDestinationIcon = (type: string) => {
    switch (type?.toLowerCase()) {
        case 'gcp_healthcare':
            return CloudIcon;
        case 'local_filesystem':
            return FolderIcon;
        case 'orthanc_dimse_tls':
        case 'dicomweb':
            return ServerIcon;
        default:
            return CircleStackIcon;
    }
};

const getDestinationTypeLabel = (type: string) => {
    switch (type?.toLowerCase()) {
        case 'gcp_healthcare':
            return 'GCP Healthcare';
        case 'local_filesystem':
            return 'Local Filesystem';
        case 'orthanc_dimse_tls':
            return 'DIMSE TLS';
        case 'dicomweb':
            return 'DICOM Web';
        default:
            return type || 'Unknown';
    }
};

const RuleWizardStep4: React.FC<RuleWizardStep4Props> = ({
    formData,
    updateFormData,
    validationErrors,
    isLoading,
    availableDestinations,
    destinationsLoading,
    availableSchedules,
    availableSources,
}) => {
    const handleDestinationToggle = (destinationId: number, checked: boolean) => {
        const newDestinations = checked
            ? [...formData.selectedDestinationIds, destinationId]
            : formData.selectedDestinationIds.filter(id => id !== destinationId);
        updateFormData({ selectedDestinationIds: newDestinations });
    };

    const selectedDestinationsCount = formData.selectedDestinationIds.length;
    const selectedSchedule = availableSchedules?.find(s => s.id === formData.selectedScheduleId);

    // Data Flow Visualization Component
    const DataFlowVisualization = () => {
        const sources = availableSources?.filter(source => 
            formData.selectedSources.includes(source.id || source.name || '')
        ) || [];
        const destinations = availableDestinations?.filter(dest => 
            formData.selectedDestinationIds.includes(dest.id)
        ) || [];

        return (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 text-center">
                    Data Flow Visualization
                </h4>
                
                <div className="flex items-center justify-between space-x-4 overflow-x-auto min-w-0">
                    {/* Sources */}
                    <div className="flex-shrink-0 space-y-3">
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
                            Input Sources
                        </h5>
                        <div className="space-y-2">
                            {sources.length > 0 ? sources.map((source, index) => (
                                <div key={index} className="flex items-center space-x-2 bg-blue-100 dark:bg-blue-900/30 px-3 py-2 rounded-lg">
                                    <ServerIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    <span className="text-sm text-blue-800 dark:text-blue-200 truncate max-w-24">
                                        {source.name || source.id}
                                    </span>
                                </div>
                            )) : (
                                <div className="bg-gray-200 dark:bg-gray-700 px-3 py-2 rounded-lg">
                                    <span className="text-sm text-gray-500">No sources</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Arrow */}
                    <ArrowRightIcon className="h-6 w-6 text-gray-400 flex-shrink-0" />

                    {/* Matching */}
                    <div className="flex-shrink-0 space-y-3">
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
                            Matching
                        </h5>
                        <div className="bg-yellow-100 dark:bg-yellow-900/30 px-3 py-2 rounded-lg">
                            <div className="flex items-center space-x-2">
                                <FunnelIcon className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                <span className="text-sm text-yellow-800 dark:text-yellow-200">
                                    {formData.matchCriteria.length} criteria
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Arrow */}
                    <ArrowRightIcon className="h-6 w-6 text-gray-400 flex-shrink-0" />

                    {/* Operations */}
                    <div className="flex-shrink-0 space-y-3">
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
                            Operations
                        </h5>
                        <div className="bg-purple-100 dark:bg-purple-900/30 px-3 py-2 rounded-lg">
                            <div className="flex items-center space-x-2">
                                <CogIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                <span className="text-sm text-purple-800 dark:text-purple-200">
                                    {formData.tagModifications.length} ops
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Arrow */}
                    <ArrowRightIcon className="h-6 w-6 text-gray-400 flex-shrink-0" />

                    {/* Destinations */}
                    <div className="flex-shrink-0 space-y-3">
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
                            Destinations
                        </h5>
                        <div className="space-y-2">
                            {destinations.length > 0 ? destinations.map((dest) => {
                                const IconComponent = getDestinationIcon(dest.backend_type);
                                return (
                                    <div key={dest.id} className="flex items-center space-x-2 bg-green-100 dark:bg-green-900/30 px-3 py-2 rounded-lg">
                                        <IconComponent className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        <span className="text-sm text-green-800 dark:text-green-200 truncate max-w-24">
                                            {dest.name}
                                        </span>
                                    </div>
                                );
                            }) : (
                                <div className="bg-gray-200 dark:bg-gray-700 px-3 py-2 rounded-lg">
                                    <span className="text-sm text-gray-500">No destinations</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Flow Description */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Data flows from <strong>{sources.length}</strong> source{sources.length !== 1 ? 's' : ''} → 
                        matches <strong>{formData.matchCriteria.length}</strong> criteria → 
                        applies <strong>{formData.tagModifications.length}</strong> operation{formData.tagModifications.length !== 1 ? 's' : ''} → 
                        sends to <strong>{destinations.length}</strong> destination{destinations.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
                    <CheckCircleIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="mt-3">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Destinations & Review
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Choose where to send processed data and review your rule configuration
                    </p>
                </div>
            </div>

            {/* Destinations Selection */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-base font-medium text-gray-900 dark:text-gray-100">
                            Output Destinations <span className="text-red-500">*</span>
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Select where processed data should be sent
                        </p>
                    </div>
                    <div className="flex items-center space-x-2">
                        {selectedDestinationsCount > 0 ? (
                            <div className="flex items-center text-green-600 dark:text-green-400">
                                <CheckCircleIconSolid className="h-4 w-4 mr-1" />
                                <span className="text-sm font-medium">{selectedDestinationsCount} selected</span>
                            </div>
                        ) : (
                            <div className="flex items-center text-amber-600 dark:text-amber-400">
                                <span className="text-sm">None selected</span>
                            </div>
                        )}
                    </div>
                </div>

                {validationErrors.selectedDestinationIds && (
                    <p className="text-sm text-red-600 dark:text-red-400">{validationErrors.selectedDestinationIds}</p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {destinationsLoading ? (
                        <div className="col-span-full flex items-center justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : availableDestinations.length === 0 ? (
                        <div className="col-span-full text-center p-8 text-gray-500 dark:text-gray-400">
                            <CircleStackIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            <p>No destinations available</p>
                        </div>
                    ) : (
                        availableDestinations.map((destination) => {
                            const IconComponent = getDestinationIcon(destination.backend_type);
                            const isSelected = formData.selectedDestinationIds.includes(destination.id);
                            
                            return (
                                <div
                                    key={destination.id}
                                    className={cn(
                                        'flex flex-col p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md',
                                        isSelected
                                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                    )}
                                    onClick={() => handleDestinationToggle(destination.id, !isSelected)}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center space-x-3">
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={(checked) => handleDestinationToggle(destination.id, !!checked)}
                                                disabled={isLoading}
                                            />
                                            <IconComponent className={cn(
                                                'h-6 w-6',
                                                isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'
                                            )} />
                                        </div>
                                        <span className={cn(
                                            'text-xs px-2 py-1 rounded-full',
                                            isSelected
                                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-800 dark:text-indigo-200'
                                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                        )}>
                                            {getDestinationTypeLabel(destination.backend_type)}
                                        </span>
                                    </div>

                                    <div className="flex-1">
                                        <h5 className={cn(
                                            'font-medium mb-1',
                                            isSelected ? 'text-indigo-900 dark:text-indigo-100' : 'text-gray-900 dark:text-gray-100'
                                        )}>
                                            {destination.name}
                                        </h5>
                                        {destination.description && (
                                            <p className={cn(
                                                'text-sm',
                                                isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-500 dark:text-gray-400'
                                            )}>
                                                {destination.description}
                                            </p>
                                        )}
                                    </div>

                                    {destination.is_enabled ? (
                                        <div className="flex items-center mt-3 text-green-600 dark:text-green-400">
                                            <PlayIcon className="h-4 w-4 mr-1" />
                                            <span className="text-xs">Active</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center mt-3 text-gray-400">
                                            <span className="text-xs">Inactive</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Data Flow Visualization */}
            <div className="space-y-4">
                <h4 className="text-base font-medium text-gray-900 dark:text-gray-100 text-center">
                    Complete Rule Flow
                </h4>
                <DataFlowVisualization />
            </div>

            {/* Rule Summary */}
            <div className="space-y-6">
                <h4 className="text-base font-medium text-gray-900 dark:text-gray-100">
                    Rule Configuration Summary
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Information */}
                    <div className="bg-white dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                            <CheckCircleIconSolid className="h-4 w-4 text-green-500 mr-2" />
                            Basic Information
                        </h5>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Name:</span>
                                <span className="text-gray-900 dark:text-gray-100 font-medium">{formData.name || 'Unnamed Rule'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Priority:</span>
                                <span className="text-gray-900 dark:text-gray-100">{formData.priority}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Status:</span>
                                <span className={cn(
                                    'px-2 py-1 rounded-full text-xs',
                                    formData.isActive 
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                )}>
                                    {formData.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Schedule:</span>
                                <span className="text-gray-900 dark:text-gray-100">
                                    {selectedSchedule ? selectedSchedule.name : 'Always Active'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Processing Pipeline */}
                    <div className="bg-white dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                            <CheckCircleIconSolid className="h-4 w-4 text-green-500 mr-2" />
                            Processing Pipeline
                        </h5>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Input Sources:</span>
                                <span className="text-gray-900 dark:text-gray-100">{formData.selectedSources.length} selected</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Match Criteria:</span>
                                <span className="text-gray-900 dark:text-gray-100">{formData.matchCriteria.length} conditions</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Operations:</span>
                                <span className="text-gray-900 dark:text-gray-100">{formData.tagModifications.length} transformations</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Destinations:</span>
                                <span className="text-gray-900 dark:text-gray-100">{formData.selectedDestinationIds.length} targets</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Description */}
                {formData.description && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Description</h5>
                        <p className="text-sm text-blue-800 dark:text-blue-200">{formData.description}</p>
                    </div>
                )}
            </div>

            {/* Final Status Check */}
            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-4 border border-green-200 dark:border-green-800">
                <div className="flex items-center">
                    <CheckCircleIconSolid className="h-5 w-5 text-green-400 mr-3" />
                    <div className="flex-1">
                        <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                            Rule Ready for Creation
                        </h3>
                        <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                            Your rule is properly configured and ready to be created. Click "Create Rule" to save and activate it.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RuleWizardStep4;
