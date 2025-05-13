// src/components/rule-form/RuleFormDestinations.tsx
import React from 'react';

import { StorageBackendConfigRead } from '@/schemas'; // API Schema type
import { Checkbox } from "@/components/ui/checkbox"; // Shadcn Checkbox
import { Label } from "@/components/ui/label"; // Shadcn Label
import { cn } from "@/lib/utils"; // For conditional classes

interface RuleFormDestinationsProps {
    selectedDestinationIds: Set<number>; // Use a Set for efficient lookup
    availableDestinations: StorageBackendConfigRead[]; // Array of Destination objects from API
    onSelectionChange: (backendId: number, checked: boolean) => void; // Callback to update parent state
    isLoading: boolean; // General loading state for the form
    validationErrors: Record<string, string | undefined>; // Validation errors object (expects "destination_ids" key for general error)
}

const RuleFormDestinations: React.FC<RuleFormDestinationsProps> = ({
    selectedDestinationIds,
    availableDestinations,
    onSelectionChange,
    isLoading,
    validationErrors,
}) => {
    // Ensure availableDestinations is an array before filtering/mapping
    const destinationsToDisplay = Array.isArray(availableDestinations) ? availableDestinations : [];

    // Separate enabled and disabled destinations for clearer UI
    const enabledDestinations = destinationsToDisplay.filter(d => d.is_enabled);
    const disabledDestinations = destinationsToDisplay.filter(d => !d.is_enabled);

    // Check for a general error message related to the destinations selection
    const destinationIdError = validationErrors?.['destination_ids'];
    const hasGeneralError = !!destinationIdError;

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
            ) : destinationsToDisplay.length === 0 ? ( // Check the original list length
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    No storage backends configured. Please configure one under Configuration → Storage Backends.
                </div>
            ) : (
                <>
                    {/* Message if only disabled destinations exist */}
                    {enabledDestinations.length === 0 && disabledDestinations.length > 0 && (
                         <div className="text-sm text-amber-600 dark:text-amber-400 mb-3 p-3 border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 rounded-md">
                            No *enabled* storage backends found. Please enable or create one under Configuration → Storage Backends.
                         </div>
                    )}

                    {/* Render enabled destinations if any exist */}
                    {enabledDestinations.length > 0 && (
                        <div
                            className={cn(
                                "space-y-2 max-h-48 overflow-y-auto border rounded p-3 bg-gray-50 dark:bg-gray-700/50 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800",
                                hasGeneralError && "border-red-500 ring-1 ring-red-500" // Add error ring if general error
                            )}
                            // Add aria-describedby if there's a general error for the group
                            aria-describedby={hasGeneralError ? "destination_ids-error" : undefined}
                        >
                            {enabledDestinations.map((dest) => (
                                <div key={dest.id} className="flex items-center space-x-2"> {/* Use space-x for spacing */}
                                    <Checkbox
                                        id={`dest-${dest.id}`} // Unique ID for each checkbox
                                        checked={selectedDestinationIds.has(dest.id)} // Check if ID is in the Set
                                        onCheckedChange={(checked) => onSelectionChange(dest.id, !!checked)} // Pass ID and boolean state
                                        disabled={isLoading}
                                        // No need for aria-invalid here directly, group handles general error
                                        aria-labelledby={`dest-label-${dest.id}`} // Associate with label
                                        // Removed className="mr-2" - using space-x on parent div
                                    />
                                    <Label
                                        htmlFor={`dest-${dest.id}`} // Link label to checkbox
                                        id={`dest-label-${dest.id}`} // ID for association
                                        className="text-sm font-medium text-gray-800 dark:text-gray-200 cursor-pointer select-none" // Make label clickable
                                    >
                                        {dest.name}{' '}
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            ({dest.backend_type})
                                        </span>
                                    </Label>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Note about disabled destinations */}
                    {disabledDestinations.length > 0 && enabledDestinations.length > 0 && ( // Show only if there are also enabled ones
                         <p className="text-xs text-gray-400 dark:text-gray-500 italic pt-2 border-t border-gray-200 dark:border-gray-600 mt-2">
                            Note: Disabled backends ({disabledDestinations.map(d => d.name).join(', ')}) cannot be selected.
                         </p>
                    )}
                </>
            )}
            {/* Display the general validation error message for the destination selection */}
            {hasGeneralError && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400" id="destination_ids-error">
                    {destinationIdError}
                </p>
            )}
        </fieldset>
    );
};

export default RuleFormDestinations;
