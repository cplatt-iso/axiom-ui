// src/components/rule-wizard/RuleWizardStep3.tsx
import React from 'react';
import { 
    CogIcon, 
    PlusIcon, 
    TrashIcon,
    PencilIcon,
    DocumentDuplicateIcon,
    XMarkIcon,
    ArrowRightIcon,
    ClipboardDocumentIcon,
    MagnifyingGlassIcon,
    SparklesIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { TagModificationFormData, ModifyAction, ModifyActionSchema, CrosswalkMapRead } from '@/schemas';
import DicomTagCombobox from '../DicomTagCombobox';
import { DicomTagInfo } from '@/dicom/dictionary';

interface WizardFormData {
    name: string;
    description: string;
    priority: number;
    isActive: boolean;
    selectedScheduleId: number | null;
    selectedSources: string[];
    matchCriteria: any[];
    associationCriteria: any[];
    tagModifications: TagModificationFormData[];
    selectedAiPromptConfigIds: number[];
    selectedDestinationIds: number[];
}

interface RuleWizardStep3Props {
    formData: WizardFormData;
    updateFormData: (updates: Partial<WizardFormData>) => void;
    validationErrors: Record<string, string>;
    isLoading: boolean;
    availableCrosswalkMaps: CrosswalkMapRead[];
    crosswalkMapsLoading: boolean;
}

const OPERATION_ICONS = {
    set: PencilIcon,
    delete: XMarkIcon,
    prepend: PlusIcon,
    suffix: PlusIcon,
    copy: DocumentDuplicateIcon,
    move: ArrowRightIcon,
    regex_replace: MagnifyingGlassIcon,
    crosswalk: ClipboardDocumentIcon,
} as const;

const OPERATION_DESCRIPTIONS = {
    set: 'Set a tag to a specific value',
    delete: 'Remove a tag from the data',
    prepend: 'Add text to the beginning of a tag value',
    suffix: 'Add text to the end of a tag value',
    copy: 'Copy value from one tag to another',
    move: 'Move value from one tag to another',
    regex_replace: 'Replace text using regular expressions',
    crosswalk: 'Map values using a crosswalk table',
} as const;

const createDefaultModification = (action: ModifyAction): TagModificationFormData => {
    const base = { action };
    switch (action) {
        case ModifyActionSchema.enum.set:
            return { ...base, tag: '', value: '', vr: null, action: ModifyActionSchema.enum.set };
        case ModifyActionSchema.enum.delete:
            return { ...base, tag: '', action: ModifyActionSchema.enum.delete };
        case ModifyActionSchema.enum.prepend:
            return { ...base, tag: '', value: '', action: ModifyActionSchema.enum.prepend };
        case ModifyActionSchema.enum.suffix:
            return { ...base, tag: '', value: '', action: ModifyActionSchema.enum.suffix };
        case ModifyActionSchema.enum.regex_replace:
            return { ...base, tag: '', pattern: '', replacement: '', action: ModifyActionSchema.enum.regex_replace };
        case ModifyActionSchema.enum.copy:
            return { ...base, source_tag: '', destination_tag: '', destination_vr: null, action: ModifyActionSchema.enum.copy };
        case ModifyActionSchema.enum.move:
            return { ...base, source_tag: '', destination_tag: '', destination_vr: null, action: ModifyActionSchema.enum.move };
        case ModifyActionSchema.enum.crosswalk:
            return { ...base, crosswalk_map_id: 0, action: ModifyActionSchema.enum.crosswalk };
        default:
            return { ...base, tag: '', value: '', vr: null, action: ModifyActionSchema.enum.set };
    }
};

const RuleWizardStep3: React.FC<RuleWizardStep3Props> = ({
    formData,
    updateFormData,
    isLoading,
    availableCrosswalkMaps,
    crosswalkMapsLoading,
}) => {
    const addTagModification = (action: ModifyAction) => {
        const newModification = createDefaultModification(action);
        updateFormData({ 
            tagModifications: [...formData.tagModifications, newModification] 
        });
    };

    const updateTagModification = (index: number, field: string, value: unknown) => {
        const newModifications = [...formData.tagModifications];
        const modification = newModifications[index];
        
        if (field === 'tagInfo') {
            const tagInfo = value as DicomTagInfo | null;
            (modification as any).tag = tagInfo?.tag || '';
        } else if (field === 'sourceTagInfo') {
            const tagInfo = value as DicomTagInfo | null;
            (modification as any).source_tag = tagInfo?.tag || '';
        } else if (field === 'destTagInfo') {
            const tagInfo = value as DicomTagInfo | null;
            (modification as any).destination_tag = tagInfo?.tag || '';
        } else {
            (modification as any)[field] = value;
        }
        
        updateFormData({ tagModifications: newModifications });
    };

    const removeTagModification = (index: number) => {
        const newModifications = formData.tagModifications.filter((_, i) => i !== index);
        updateFormData({ tagModifications: newModifications });
    };

    const renderModificationInputs = (modification: TagModificationFormData, index: number) => {
        switch (modification.action) {
            case 'set':
                return (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                Target Tag *
                            </Label>
                            <DicomTagCombobox
                                value={modification.tag || ''}
                                onChange={(tagInfo: DicomTagInfo | null) => updateTagModification(index, 'tagInfo', tagInfo)}
                                disabled={isLoading}
                                inputClassName="text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                Value *
                            </Label>
                            <Input
                                value={modification.value || ''}
                                onChange={(e) => updateTagModification(index, 'value', e.target.value)}
                                placeholder="Enter value to set"
                                disabled={isLoading}
                                className="text-sm"
                            />
                        </div>
                    </div>
                );

            case 'delete':
                return (
                    <div className="space-y-1">
                        <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Tag to Delete *
                        </Label>
                        <DicomTagCombobox
                            value={modification.tag || ''}
                            onChange={(tagInfo: DicomTagInfo | null) => updateTagModification(index, 'tagInfo', tagInfo)}
                            disabled={isLoading}
                            inputClassName="text-sm"
                        />
                    </div>
                );

            case 'prepend':
            case 'suffix':
                return (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                Target Tag *
                            </Label>
                            <DicomTagCombobox
                                value={modification.tag || ''}
                                onChange={(tagInfo: DicomTagInfo | null) => updateTagModification(index, 'tagInfo', tagInfo)}
                                disabled={isLoading}
                                inputClassName="text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                Text to {modification.action === 'prepend' ? 'Prepend' : 'Append'} *
                            </Label>
                            <Input
                                value={modification.value || ''}
                                onChange={(e) => updateTagModification(index, 'value', e.target.value)}
                                placeholder={`Text to ${modification.action}`}
                                disabled={isLoading}
                                className="text-sm"
                            />
                        </div>
                    </div>
                );

            case 'copy':
            case 'move':
                return (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                Source Tag *
                            </Label>
                            <DicomTagCombobox
                                value={modification.source_tag || ''}
                                onChange={(tagInfo: DicomTagInfo | null) => updateTagModification(index, 'sourceTagInfo', tagInfo)}
                                disabled={isLoading}
                                inputClassName="text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                Destination Tag *
                            </Label>
                            <DicomTagCombobox
                                value={modification.destination_tag || ''}
                                onChange={(tagInfo: DicomTagInfo | null) => updateTagModification(index, 'destTagInfo', tagInfo)}
                                disabled={isLoading}
                                inputClassName="text-sm"
                            />
                        </div>
                    </div>
                );

            case 'regex_replace':
                return (
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                Target Tag *
                            </Label>
                            <DicomTagCombobox
                                value={modification.tag || ''}
                                onChange={(tagInfo: DicomTagInfo | null) => updateTagModification(index, 'tagInfo', tagInfo)}
                                disabled={isLoading}
                                inputClassName="text-sm"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                    Pattern (Regex) *
                                </Label>
                                <Input
                                    value={modification.pattern || ''}
                                    onChange={(e) => updateTagModification(index, 'pattern', e.target.value)}
                                    placeholder="Regular expression pattern"
                                    disabled={isLoading}
                                    className="text-sm font-mono"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                    Replacement *
                                </Label>
                                <Input
                                    value={modification.replacement || ''}
                                    onChange={(e) => updateTagModification(index, 'replacement', e.target.value)}
                                    placeholder="Replacement text"
                                    disabled={isLoading}
                                    className="text-sm"
                                />
                            </div>
                        </div>
                    </div>
                );

            case 'crosswalk':
                return (
                    <div className="space-y-1">
                        <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Crosswalk Map *
                        </Label>
                        <Select
                            value={modification.crosswalk_map_id?.toString() || ''}
                            onValueChange={(value) => updateTagModification(index, 'crosswalk_map_id', parseInt(value, 10))}
                            disabled={isLoading || crosswalkMapsLoading}
                        >
                            <SelectTrigger className="text-sm">
                                <SelectValue placeholder="Select a crosswalk map" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableCrosswalkMaps.map((map) => (
                                    <SelectItem key={map.id} value={map.id.toString()}>
                                        {map.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
                    <CogIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="mt-3">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Data Operations
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Transform and modify DICOM data as it flows through the rule
                    </p>
                </div>
            </div>

            {/* Operation Type Selector */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="text-base font-medium text-gray-900 dark:text-gray-100">
                        Available Operations
                    </h4>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        Click to add an operation
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {ModifyActionSchema.options.map((action) => {
                        const IconComponent = OPERATION_ICONS[action];
                        return (
                            <button
                                key={action}
                                onClick={() => addTagModification(action)}
                                disabled={isLoading}
                                className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <IconComponent className="h-6 w-6 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 mb-2" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-indigo-900 dark:group-hover:text-indigo-100 capitalize">
                                    {action.replace('_', ' ')}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
                                    {OPERATION_DESCRIPTIONS[action]}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Active Operations */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="text-base font-medium text-gray-900 dark:text-gray-100">
                        Configured Operations
                    </h4>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        {formData.tagModifications.length} operation{formData.tagModifications.length !== 1 ? 's' : ''}
                    </div>
                </div>

                {formData.tagModifications.length === 0 ? (
                    <div className="text-center p-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                        <SparklesIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <h5 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                            No Operations Configured
                        </h5>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                            Data will pass through unchanged. Add operations above to transform your data.
                        </p>
                        <p className="text-sm text-gray-400 dark:text-gray-500">
                            Operations are applied in the order they are added
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {formData.tagModifications.map((modification, index) => {
                            const IconComponent = OPERATION_ICONS[modification.action];
                            
                            return (
                                <div
                                    key={index}
                                    className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800/50 p-4"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
                                                <IconComponent className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                            </div>
                                            <div>
                                                <h6 className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                                                    {modification.action.replace('_', ' ')} Operation
                                                </h6>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    Step {index + 1} of {formData.tagModifications.length}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            onClick={() => removeTagModification(index)}
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    {renderModificationInputs(modification, index)}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* AI Standardization Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900">
                            <SparklesIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <h4 className="text-base font-medium text-gray-900 dark:text-gray-100">
                                AI Standardization
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Apply AI-powered standardization to clean and normalize data
                            </p>
                        </div>
                    </div>

                    <div className="rounded-lg bg-purple-50 dark:bg-purple-900/20 p-4 border border-purple-200 dark:border-purple-800">
                        <p className="text-sm text-purple-800 dark:text-purple-200">
                            <strong>Coming Soon:</strong> AI-powered data standardization will be available in a future update. 
                            This feature will automatically clean and standardize DICOM data using machine learning models.
                        </p>
                    </div>
                </div>
            </div>

            {/* Operations Summary */}
            {formData.tagModifications.length > 0 && (
                <div className="rounded-lg bg-gray-50 dark:bg-gray-900/50 p-6 border border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                        Operations Summary
                    </h4>
                    <div className="space-y-2">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                            <span className="font-medium">Processing Pipeline:</span> {formData.tagModifications.length} operation{formData.tagModifications.length !== 1 ? 's' : ''} will be applied in sequence
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3">
                            {formData.tagModifications.map((mod, index) => (
                                <span
                                    key={index}
                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-200"
                                >
                                    {index + 1}. {mod.action.replace('_', ' ')}
                                </span>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                            → Operations will be applied before sending data to destinations
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RuleWizardStep3;
