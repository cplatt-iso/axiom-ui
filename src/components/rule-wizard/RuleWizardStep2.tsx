import React from 'react';
import { 
    FunnelIcon, 
    ServerIcon, 
    PlusIcon, 
    TrashIcon,
    CheckCircleIcon,
    CloudIcon,
    RadioIcon,
    CircleStackIcon
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
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { MatchCriterionFormData, MatchOperation, MatchOperationSchema, AssociationMatchCriterionFormData, AssociationParameter, associationParameterSchema } from '@/schemas';
import DicomTagCombobox from '../DicomTagCombobox';
import { DicomTagInfo } from '@/dicom/dictionary';
import { isValueRequired, getSourceTypeFromSource, createSourceFrontendId, SOURCE_TYPE_LABELS } from '@/utils/ruleHelpers';

interface WizardFormData {
    name: string;
    description: string;
    priority: number;
    isActive: boolean;
    selectedScheduleId: number | null;
    selectedSources: string[];
    matchCriteria: MatchCriterionFormData[];
    associationCriteria: AssociationMatchCriterionFormData[];
    tagModifications: any[];
    selectedAiPromptConfigIds: number[];
    selectedDestinationIds: number[];
}

interface RuleWizardStep2Props {
    formData: WizardFormData;
    updateFormData: (updates: Partial<WizardFormData>) => void;
    validationErrors: Record<string, string>;
    isLoading: boolean;
    availableSources: any[];
    sourcesLoading: boolean;
}

const SOURCE_TYPE_ICONS = {
    dicom_web: CloudIcon,
    dimse_listener: RadioIcon,
    dimse_qr: CircleStackIcon,
    file_system: ServerIcon,
} as const;

const RuleWizardStep2: React.FC<RuleWizardStep2Props> = ({
    formData,
    updateFormData,
    validationErrors,
    isLoading,
    availableSources,
    sourcesLoading,
}) => {
    const handleSourceToggle = (sourceId: string, checked: boolean) => {
        const newSources = checked
            ? [...formData.selectedSources, sourceId]
            : formData.selectedSources.filter(id => id !== sourceId);
        updateFormData({ selectedSources: newSources });
    };

    const addMatchCriterion = () => {
        const newCriterion: MatchCriterionFormData = {
            tag: '',
            op: MatchOperationSchema.enum.exists,
            value: '',
        };
        updateFormData({ 
            matchCriteria: [...formData.matchCriteria, newCriterion] 
        });
    };

    const updateMatchCriterion = (index: number, field: keyof MatchCriterionFormData | 'tagInfo', value: unknown) => {
        const newCriteria = [...formData.matchCriteria];
        if (field === 'tagInfo') {
            const tagInfo = value as DicomTagInfo | null;
            newCriteria[index] = {
                ...newCriteria[index],
                tag: tagInfo?.tag || '',
            };
        } else {
            newCriteria[index] = {
                ...newCriteria[index],
                [field]: value,
            };
        }
        updateFormData({ matchCriteria: newCriteria });
    };

    const removeMatchCriterion = (index: number) => {
        const newCriteria = formData.matchCriteria.filter((_, i) => i !== index);
        updateFormData({ matchCriteria: newCriteria });
    };

    // Association criteria handlers
    const addAssociationCriterion = () => {
        const newCriterion: AssociationMatchCriterionFormData = {
            parameter: associationParameterSchema.enum.CALLING_AE_TITLE,
            op: MatchOperationSchema.enum.eq,
            value: '',
        };
        updateFormData({ 
            associationCriteria: [...formData.associationCriteria, newCriterion] 
        });
    };

    const updateAssociationCriterion = (index: number, field: keyof AssociationMatchCriterionFormData, value: unknown) => {
        const newCriteria = [...formData.associationCriteria];
        newCriteria[index] = {
            ...newCriteria[index],
            [field]: value,
        };
        updateFormData({ associationCriteria: newCriteria });
    };

    const removeAssociationCriterion = (index: number) => {
        const newCriteria = formData.associationCriteria.filter((_, i) => i !== index);
        updateFormData({ associationCriteria: newCriteria });
    };

    const selectedSourcesCount = formData.selectedSources.length;
    const matchCriteriaCount = formData.matchCriteria.length;
    const associationCriteriaCount = formData.associationCriteria.length;
    const totalCriteriaCount = matchCriteriaCount + associationCriteriaCount;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
                    <FunnelIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="mt-3">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Input Sources & Matching
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Select where data comes from and define criteria for processing
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Panel - Input Sources */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-base font-medium text-gray-900 dark:text-gray-100">
                                Input Sources
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Select sources that this rule applies to (optional - no selection means all sources)
                            </p>
                        </div>
                        <div className="flex items-center space-x-2">
                            {selectedSourcesCount > 0 ? (
                                <div className="flex items-center text-green-600 dark:text-green-400">
                                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                                    <span className="text-sm font-medium">{selectedSourcesCount} selected</span>
                                </div>
                            ) : (
                                <div className="flex items-center text-blue-600 dark:text-blue-400">
                                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                                    <span className="text-sm">All sources (no filter)</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {validationErrors.selectedSources && (
                        <p className="text-sm text-red-600 dark:text-red-400">{validationErrors.selectedSources}</p>
                    )}

                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {sourcesLoading ? (
                            <div className="flex items-center justify-center p-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            </div>
                        ) : availableSources.length === 0 ? (
                            <div className="text-center p-8 text-gray-500 dark:text-gray-400">
                                <ServerIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                <p>No input sources available</p>
                            </div>
                        ) : (
            availableSources.map((source, index) => {
                // Use the new function that works with the normalized source structure
                const sourceType = getSourceTypeFromSource(source);
                const IconComponent = SOURCE_TYPE_ICONS[sourceType];
                
                // Create a unique identifier using the shared function
                const uniqueId = createSourceFrontendId(source, index);
                
                const isSelected = formData.selectedSources.includes(uniqueId);                                return (
                                    <div
                                        key={uniqueId}
                                        className={cn(
                                            'flex items-center p-3 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md',
                                            isSelected
                                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                                        )}
                                        onClick={() => handleSourceToggle(uniqueId, !isSelected)}
                                    >
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={(checked) => handleSourceToggle(uniqueId, !!checked)}
                                            className="mr-3"
                                            disabled={isLoading}
                                        />
                                        <IconComponent className={cn(
                                            'h-5 w-5 mr-3',
                                            isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'
                                        )} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <p className={cn(
                                                    'text-sm font-medium truncate',
                                                    isSelected ? 'text-indigo-900 dark:text-indigo-100' : 'text-gray-900 dark:text-gray-100'
                                                )}>
                                                    {source.name || source.id}
                                                </p>
                                                <span className={cn(
                                                    'text-xs px-2 py-1 rounded-full',
                                                    isSelected
                                                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-800 dark:text-indigo-200'
                                                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                                )}>
                                                    {SOURCE_TYPE_LABELS[sourceType]}
                                                </span>
                                            </div>
                                            {source.description && (
                                                <p className={cn(
                                                    'text-xs truncate mt-1',
                                                    isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-500 dark:text-gray-400'
                                                )}>
                                                    {source.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Panel - Match Criteria */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-base font-medium text-gray-900 dark:text-gray-100">
                                Match Criteria
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Define conditions that data must meet (optional - no criteria means match all)
                            </p>
                        </div>
                        <div className="flex items-center space-x-2">
                            {matchCriteriaCount > 0 ? (
                                <div className="flex items-center text-green-600 dark:text-green-400">
                                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                                    <span className="text-sm font-medium">{matchCriteriaCount} criteria</span>
                                </div>
                            ) : (
                                <div className="flex items-center text-blue-600 dark:text-blue-400">
                                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                                    <span className="text-sm">Match all data</span>
                                </div>
                            )}
                            <Button
                                type="button"
                                onClick={addMatchCriterion}
                                disabled={isLoading}
                                size="sm"
                                className="h-8"
                            >
                                <PlusIcon className="h-4 w-4 mr-1" />
                                Add
                            </Button>
                        </div>
                    </div>

                    {validationErrors.matchCriteria && (
                        <p className="text-sm text-red-600 dark:text-red-400">{validationErrors.matchCriteria}</p>
                    )}

                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {formData.matchCriteria.length === 0 ? (
                            <div className="text-center p-8 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                                <FunnelIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                <p className="mb-3">No match criteria defined - will match all data</p>
                                <Button onClick={addMatchCriterion} variant="outline" size="sm">
                                    <PlusIcon className="h-4 w-4 mr-2" />
                                    Add First Criterion
                                </Button>
                            </div>
                        ) : (
                            formData.matchCriteria.map((criterion, index) => {
                                const showValueInput = isValueRequired(criterion.op);
                                
                                return (
                                    <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800/50">
                                        <div className="flex items-start justify-between mb-3">
                                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                                Criterion {index + 1}
                                            </span>
                                            <Button
                                                type="button"
                                                onClick={() => removeMatchCriterion(index)}
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <div className="space-y-3">
                                            {/* DICOM Tag */}
                                            <div className="space-y-1 relative z-10">
                                                <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                    DICOM Tag *
                                                </Label>
                                                <DicomTagCombobox
                                                    value={criterion.tag || ''}
                                                    onChange={(tagInfo: DicomTagInfo | null) => updateMatchCriterion(index, 'tagInfo', tagInfo)}
                                                    disabled={isLoading}
                                                    inputClassName="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                />
                                            </div>

                                            {/* Operation */}
                                            <div className="space-y-1">
                                                <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                    Operation *
                                                </Label>
                                                <Select
                                                    value={criterion.op}
                                                    onValueChange={(value: MatchOperation) => updateMatchCriterion(index, 'op', value)}
                                                    disabled={isLoading}
                                                >
                                                    <SelectTrigger className="text-sm">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {MatchOperationSchema.options.map((op) => (
                                                            <SelectItem key={op} value={op}>
                                                                {op.charAt(0).toUpperCase() + op.slice(1).replace('_', ' ')}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Value (conditional) */}
                                            {showValueInput && (
                                                <div className="space-y-1">
                                                    <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                        Value *
                                                    </Label>
                                                    <Input
                                                        value={criterion.value || ''}
                                                        onChange={(e) => updateMatchCriterion(index, 'value', e.target.value)}
                                                        placeholder="Enter comparison value"
                                                        disabled={isLoading}
                                                        className="text-sm"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Association/Connection Matching */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-base font-medium text-gray-900 dark:text-gray-100">
                                    Connection Criteria
                                </h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Match by calling AE title, source IP, or called AE title
                                </p>
                            </div>
                            <div className="flex items-center space-x-2">
                                {associationCriteriaCount > 0 ? (
                                    <div className="flex items-center text-green-600 dark:text-green-400">
                                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                                        <span className="text-sm font-medium">{associationCriteriaCount} criteria</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center text-gray-400">
                                        <span className="text-sm">No connection filters</span>
                                    </div>
                                )}
                                <Button
                                    type="button"
                                    onClick={addAssociationCriterion}
                                    disabled={isLoading}
                                    size="sm"
                                    className="h-8"
                                >
                                    <PlusIcon className="h-4 w-4 mr-1" />
                                    Add Filter
                                </Button>
                            </div>
                        </div>

                        {validationErrors.associationCriteria && (
                            <p className="text-sm text-red-600 dark:text-red-400">{validationErrors.associationCriteria}</p>
                        )}

                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                            {formData.associationCriteria.length === 0 ? (
                                <div className="text-center p-8 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                                    <ServerIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                    <p className="mb-3">No connection criteria defined</p>
                                    <Button onClick={addAssociationCriterion} variant="outline" size="sm">
                                        <PlusIcon className="h-4 w-4 mr-2" />
                                        Add First Filter
                                    </Button>
                                </div>
                            ) : (
                                formData.associationCriteria.map((criterion, index) => {
                                    const showValueInput = criterion.op !== 'exists' && criterion.op !== 'not_exists';
                                    
                                    return (
                                        <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800/50">
                                            <div className="flex items-start justify-between mb-3">
                                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                                    Filter {index + 1}
                                                </span>
                                                <Button
                                                    type="button"
                                                    onClick={() => removeAssociationCriterion(index)}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            <div className="space-y-3">
                                                {/* Parameter */}
                                                <div className="space-y-1">
                                                    <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                        Connection Parameter *
                                                    </Label>
                                                    <Select
                                                        value={criterion.parameter}
                                                        onValueChange={(value: AssociationParameter) => updateAssociationCriterion(index, 'parameter', value)}
                                                        disabled={isLoading}
                                                    >
                                                        <SelectTrigger className="text-sm">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="CALLING_AE_TITLE">Calling AE Title</SelectItem>
                                                            <SelectItem value="CALLED_AE_TITLE">Called AE Title</SelectItem>
                                                            <SelectItem value="SOURCE_IP">Source IP Address</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {/* Operation */}
                                                <div className="space-y-1">
                                                    <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                        Operation *
                                                    </Label>
                                                    <Select
                                                        value={criterion.op}
                                                        onValueChange={(value: MatchOperation) => updateAssociationCriterion(index, 'op', value)}
                                                        disabled={isLoading}
                                                    >
                                                        <SelectTrigger className="text-sm">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {MatchOperationSchema.options
                                                                .filter(op => {
                                                                    // For IP addresses, show IP-specific operations
                                                                    if (criterion.parameter === 'SOURCE_IP') {
                                                                        return ['eq', 'ne', 'ip_eq', 'ip_startswith', 'ip_in_subnet', 'in', 'not_in'].includes(op);
                                                                    }
                                                                    // For AE titles, show string operations
                                                                    return ['eq', 'ne', 'contains', 'startswith', 'endswith', 'in', 'not_in', 'exists', 'not_exists'].includes(op);
                                                                })
                                                                .map((op) => (
                                                                    <SelectItem key={op} value={op}>
                                                                        {op.charAt(0).toUpperCase() + op.slice(1).replace('_', ' ')}
                                                                    </SelectItem>
                                                                ))
                                                            }
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {/* Value (conditional) */}
                                                {showValueInput && (
                                                    <div className="space-y-1">
                                                        <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                            Value *
                                                        </Label>
                                                        <Input
                                                            value={criterion.value || ''}
                                                            onChange={(e) => updateAssociationCriterion(index, 'value', e.target.value)}
                                                            placeholder={
                                                                criterion.parameter === 'SOURCE_IP' 
                                                                    ? (criterion.op === 'ip_in_subnet' ? 'e.g., 192.168.1.0/24' : 'e.g., 192.168.1.100')
                                                                    : criterion.parameter === 'CALLING_AE_TITLE'
                                                                    ? 'e.g., PACS_STATION'
                                                                    : 'e.g., MY_AE_TITLE'
                                                            }
                                                            disabled={isLoading}
                                                            className="text-sm"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Preview Box */}
            {(selectedSourcesCount > 0 || totalCriteriaCount > 0) && (
                <div className="rounded-lg bg-gray-50 dark:bg-gray-900/50 p-6 border border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                        Rule Logic Preview
                    </h4>
                    <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                        <p>
                            <span className="font-medium">When data from:</span>{' '}
                            {selectedSourcesCount > 0 
                                ? `${selectedSourcesCount} selected source${selectedSourcesCount > 1 ? 's' : ''}` 
                                : 'any source'
                            }
                        </p>
                        <p>
                            <span className="font-medium">Matches criteria:</span>{' '}
                            {totalCriteriaCount > 0 
                                ? `${matchCriteriaCount} DICOM tag${matchCriteriaCount !== 1 ? 's' : ''}${associationCriteriaCount > 0 ? `, ${associationCriteriaCount} connection${associationCriteriaCount !== 1 ? 's' : ''}` : ''} (ALL must match)`
                                : 'no specific criteria'
                            }
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                            → Then apply data operations and send to destinations (configured in next steps)
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RuleWizardStep2;
