// frontend/src/components/rule-form/RuleFormAiStandardization.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAiPromptConfigs, AiPromptConfigRead } from '@/services/api'; // Or AiPromptConfigSummary if you prefer minimal data
import { Button } from '@/components/ui/button';
import { XCircleIcon } from '@heroicons/react/20/solid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react'; // Assuming you have this for loading states

interface RuleFormAiStandardizationProps {
    selectedConfigIds: number[]; // Prop type remains as number[]
    onSelectedConfigIdsChange: (updatedIds: number[]) => void;
    isLoading?: boolean;
    validationErrors?: Record<string, string | undefined>;
}

export const RuleFormAiStandardization: React.FC<RuleFormAiStandardizationProps> = ({
    selectedConfigIds: selectedConfigIdsFromProps, // Rename to avoid confusion
    onSelectedConfigIdsChange,
    isLoading: isFormLoading = false,
    validationErrors = {},
}) => {
    // Ensure selectedConfigIds is always an array within this component
    const selectedConfigIds = selectedConfigIdsFromProps || []; // <<<< KEY CHANGE/GUARD

    // ... rest of your component logic using `selectedConfigIds` ...
    // For example:
    const { data: availableAiConfigs = [], isLoading: isLoadingAiConfigs } = useQuery<AiPromptConfigRead[], Error>({
        queryKey: ['aiPromptConfigsListForRuleForm'],
        queryFn: () => getAiPromptConfigs(0, 200, true), // Assuming this now works
        staleTime: 1000 * 60 * 5,
    });

    const fieldError = validationErrors?.['ai_prompt_config_ids'];

    const selectableConfigs = React.useMemo(() => {
        // `selectedConfigIds` here is now guaranteed to be an array
        return availableAiConfigs.filter(config => config.is_enabled && !selectedConfigIds.includes(config.id));
    }, [availableAiConfigs, selectedConfigIds]);

    const selectedConfigObjects = React.useMemo(() => {
        // `selectedConfigIds` here is now guaranteed to be an array
        return availableAiConfigs.filter(config => selectedConfigIds.includes(config.id));
    }, [availableAiConfigs, selectedConfigIds]);

    const handleAddConfig = (configIdStr: string) => {
        const configId = parseInt(configIdStr, 10);
        const currentSelectedIds = selectedConfigIds || [];
        if (configId && !currentSelectedIds.includes(configId)) {
            if (typeof onSelectedConfigIdsChange === 'function') { // Explicit check
                onSelectedConfigIdsChange([...currentSelectedIds, configId]);
            } else {
                console.error('onSelectedConfigIdsChange is NOT a function here!', onSelectedConfigIdsChange);
            }
        }
    };

    const handleRemoveConfig = (configIdToRemove: number) => {
        // `selectedConfigIds` is an array
        onSelectedConfigIdsChange(selectedConfigIds.filter(id => id !== configIdToRemove));
    };

    return (
        <div className="space-y-4 rounded-lg border p-4 dark:border-gray-700">
            <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-1">
                AI Prompt Configurations
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Select pre-defined AI Prompt Configurations to apply for AI-based vocabulary standardization when this rule matches.
            </p>

            <div>
                <label htmlFor="ai-prompt-config-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Add AI Prompt Configuration
                </label>
                {isLoadingAiConfigs ? (
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading AI configurations...
                    </div>
                ) : (
                    <Select
                        onValueChange={handleAddConfig}
                        value="" // Always reset select after choosing to allow re-adding if removed
                        disabled={isFormLoading || selectableConfigs.length === 0}
                    >
                        <SelectTrigger id="ai-prompt-config-select" className={`w-full ${fieldError ? 'border-red-500' : ''}`}>
                            <SelectValue placeholder={selectableConfigs.length === 0 ? "No more available configurations" : "Select an AI Prompt Config..."} />
                        </SelectTrigger>
                        <SelectContent>
                            {selectableConfigs.map(config => (
                                <SelectItem key={config.id} value={String(config.id)} title={config.description || config.name}>
                                    {config.name}
                                    <span className="text-xs opacity-70 ml-2">
                                        (Tag: {config.dicom_tag_keyword} / Model: {config.model_identifier})
                                    </span>
                                </SelectItem>
                            ))}
                            {selectableConfigs.length === 0 && !isLoadingAiConfigs && (
                                <div className="px-2 py-2 text-center text-sm text-gray-500 dark:text-gray-400">
                                    {availableAiConfigs.length > 0 ? 'All available configurations added.' : 'No enabled AI Prompt Configurations found.'}
                                </div>
                            )}
                        </SelectContent>
                    </Select>
                )}
                {fieldError && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400" id="ai_prompt_config_ids-error">
                        {fieldError}
                    </p>
                )}
            </div>

            {selectedConfigObjects.length > 0 && (
                <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Selected Configurations:
                    </h4>
                    <ul className="space-y-2">
                        {selectedConfigObjects.map(config => (
                            <li
                                key={config.id}
                                className="flex items-center justify-between p-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                <div className="flex flex-col">
                                    <span className="font-semibold text-gray-800 dark:text-gray-100">{config.name}</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        Tag: {config.dicom_tag_keyword}, Model: {config.model_identifier}
                                    </span>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveConfig(config.id)}
                                    disabled={isFormLoading}
                                    aria-label={`Remove ${config.name}`}
                                    className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 h-6 w-6 p-0"
                                >
                                    <XCircleIcon className="h-5 w-5" />
                                </Button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {selectedConfigObjects.length === 0 && !isLoadingAiConfigs && (
                <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-2">
                    No AI Prompt Configurations selected for this rule.
                </p>
            )}
        </div>
    );
};

export default RuleFormAiStandardization;