// src/components/rule-form/RuleFormDestinations.tsx
import React from 'react';

import { StorageBackendConfigRead } from '@/schemas'; // Import type for destinations
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface RuleFormDestinationsProps {
    selectedDestinationIds: Set<number>;
    availableDestinations: StorageBackendConfigRead[];
    onSelectionChange: (backendId: number, checked: boolean) => void;
    isLoading: boolean; // Use combined loading state from parent
    validationErrors: Record<string, string>;
}

const RuleFormDestinations: React.FC<RuleFormDestinationsProps> = ({
    selectedDestinationIds,
    availableDestinations,
    onSelectionChange,
    isLoading,
    validationErrors,
}) => {
    const enabledDestinations = availableDestinations.filter(d => d.is_enabled);
    const disabledDestinations = availableDestinations.filter(d => !d.is_enabled);

    return (
        <fieldset className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <legend className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
                Destinations <span className="text-red-500">*</span>
            </legend>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Select one or more configured and enabled storage backends where processed DICOM instances should be sent.
            </p>
            {isLoading ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">Loading destinations...</div>
            ) : availableDestinations.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    No storage backends configured. Please configure one under Configuration → Storage Backends.
                </div>
            ) : (
                <>
                    {enabledDestinations.length === 0 && disabledDestinations.length > 0 && (
                         <div className="text-sm text-amber-600 dark:text-amber-400">
                            No *enabled* storage backends found. Please enable one under Configuration → Storage Backends.
                         </div>
                    )}
                    {enabledDestinations.length > 0 && (
                        <div className="space-y-2 max-h-48 overflow-y-auto border rounded p-3 bg-gray-50 dark:bg-gray-700/50 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
                            {enabledDestinations.map((dest) => (
                                <div key={dest.id} className="flex items-center">
                                    <Checkbox
                                        id={`dest-${dest.id}`}
                                        checked={selectedDestinationIds.has(dest.id)}
                                        onCheckedChange={(checked) => onSelectionChange(dest.id, !!checked)}
                                        disabled={isLoading}
                                        className="mr-2"
                                        aria-labelledby={`dest-label-${dest.id}`}
                                    />
                                    <Label
                                        htmlFor={`dest-${dest.id}`}
                                        id={`dest-label-${dest.id}`} // Add ID for association
                                        className="text-sm font-medium text-gray-800 dark:text-gray-200 cursor-pointer"
                                    >
                                        {dest.name} <span className="text-xs text-gray-500 dark:text-gray-400">({dest.backend_type})</span>
                                    </Label>
                                </div>
                            ))}
                        </div>
                    )}
                    {disabledDestinations.length > 0 && (
                         <p className="text-xs text-gray-400 dark:text-gray-500 italic pt-2 border-t border-gray-200 dark:border-gray-600 mt-2">
                            Note: Disabled backends ({disabledDestinations.map(d => d.name).join(', ')}) cannot be selected.
                         </p>
                    )}
                </>
            )}
            {validationErrors['destination_ids'] && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400" id="destination_ids-error">
                    {validationErrors['destination_ids']}
                </p>
            )}
        </fieldset>
    );
};

export default RuleFormDestinations;
