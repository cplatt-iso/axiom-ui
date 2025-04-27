// src/components/rule-form/RuleFormMatchCriteria.tsx
import React, { useCallback } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { z } from 'zod';

import {
    MatchCriterionFormData,
    MatchOperation,
    MatchOperationSchema,
} from '@/schemas';
import { DicomTagInfo } from '@/dicom/dictionary';
import { isValueRequired, isValueList, isIpOperator } from '@/utils/ruleHelpers';

import DicomTagCombobox from '../DicomTagCombobox';
import { Label } from "@/components/ui/label";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';

interface RuleFormMatchCriteriaProps {
    matchCriteria: MatchCriterionFormData[];
    updateMatchCriterion: (index: number, field: keyof MatchCriterionFormData | 'tagInfo', value: any) => void;
    addMatchCriterion: () => void;
    removeMatchCriterion: (index: number) => void;
    isLoading: boolean;
    validationErrors: Record<string, string>;
    baseInputStyles: string;
    errorInputStyles: string;
    normalInputStyles: string;
}

const MATCH_OPERATORS = MatchOperationSchema.options;

const RuleFormMatchCriteria: React.FC<RuleFormMatchCriteriaProps> = ({
    matchCriteria,
    updateMatchCriterion,
    addMatchCriterion,
    removeMatchCriterion,
    isLoading,
    validationErrors,
    baseInputStyles,
    errorInputStyles,
    normalInputStyles,
}) => {
    return (
        <fieldset className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <legend className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">Match Criteria (ALL must match)<span className="text-red-500">*</span></legend>
            <div className="space-y-3 pr-2">
                {matchCriteria.map((criterion, index) => {
                    const tagError = validationErrors[`match_criteria[${index}].tag`];
                    const opError = validationErrors[`match_criteria[${index}].op`];
                    const valueError = validationErrors[`match_criteria[${index}].value`];
                    const showValueInput = isValueRequired(criterion.op);

                    return (
                        <div key={index} className="relative flex items-start space-x-2 p-2 border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700/50">
                            {/* Use consistent grid structure */}
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">

                                {/* Column 1: Tag */}
                                <div className="flex flex-col space-y-1">
                                    <Label htmlFor={`mc-tag-${index}`} className="text-xs font-medium text-gray-600 dark:text-gray-400">Tag*</Label>
                                    <DicomTagCombobox
                                        inputId={`mc-tag-${index}`} // Pass ID for label association
                                        value={criterion.tag ?? ''}
                                        onChange={(tagInfo: DicomTagInfo | null) => updateMatchCriterion(index, 'tagInfo', tagInfo)}
                                        disabled={isLoading}
                                        required
                                        aria-invalid={!!tagError}
                                        aria-describedby={`mc-tag-${index}-error`}
                                        inputClassName={`${baseInputStyles} ${tagError ? errorInputStyles : normalInputStyles}`}
                                    />
                                    {tagError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`mc-tag-${index}-error`}>{tagError}</p>}
                                </div>

                                {/* Column 2: Operator */}
                                <div className="flex flex-col space-y-1">
                                    <Label htmlFor={`mc-op-${index}`} className="text-xs font-medium text-gray-600 dark:text-gray-400">Operator*</Label>
                                    <Select
                                        onValueChange={(value) => updateMatchCriterion(index, 'op', value as MatchOperation)}
                                        value={criterion.op}
                                        disabled={isLoading}
                                        required
                                        aria-invalid={!!opError}
                                    >
                                        {/* Associate trigger with label */}
                                        <SelectTrigger id={`mc-op-${index}`} className={`${baseInputStyles} ${opError ? errorInputStyles : normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}>
                                            <SelectValue placeholder="Select Operator" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {MATCH_OPERATORS.filter(op => !isIpOperator(op)).map(op => (
                                                <SelectItem key={op} value={op}>{op}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {opError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`mc-op-${index}-error`}>{opError}</p>}
                                </div>

                                {/* Column 3: Value */}
                                <div className="flex flex-col space-y-1">
                                    {/* Conditionally render Label or a spacer */}
                                    {showValueInput ? (
                                         <Label htmlFor={`mc-value-${index}`} className="text-xs font-medium text-gray-600 dark:text-gray-400">Value*</Label>
                                    ) : (
                                         <Label className="text-xs font-medium text-transparent select-none"> </Label> // Spacer Label
                                    )}

                                    {showValueInput ? (
                                        <>
                                            <Input
                                                id={`mc-value-${index}`} // Associate with label
                                                type={isValueList(criterion.op) ? 'text' : 'text'}
                                                placeholder={isValueList(criterion.op) ? "List, comma-separated" : "Value"}
                                                value={criterion.value ?? ''}
                                                onChange={(e) => updateMatchCriterion(index, 'value', e.target.value)}
                                                disabled={isLoading}
                                                aria-invalid={!!valueError}
                                                aria-describedby={`mc-value-${index}-error`}
                                                className={`${baseInputStyles} ${valueError ? errorInputStyles : normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}
                                            />
                                            {valueError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`mc-value-${index}-error`}>{valueError}</p>}
                                        </>
                                    ) : (
                                        <div className="text-sm text-gray-500 dark:text-gray-400 italic self-center pt-2">
                                            (No value needed)
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* Delete Button (aligns with inputs due to flex items-start on parent) */}
                            <button
                                type="button"
                                onClick={() => removeMatchCriterion(index)}
                                disabled={isLoading}
                                className="text-red-500 hover:text-red-700 p-1 mt-1 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed self-start"
                                title="Remove Criterion"
                            >
                                <TrashIcon className="h-5 w-5"/>
                                <span className="sr-only">Remove</span>
                            </button>
                        </div>
                    );
                })}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addMatchCriterion} disabled={isLoading} className="mt-2">
                <PlusIcon className="h-4 w-4 mr-1"/> Add Criterion
            </Button>
            {validationErrors['match_criteria'] && typeof validationErrors['match_criteria'] === 'string' && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validationErrors['match_criteria']}</p>}
        </fieldset>
    );
};

export default RuleFormMatchCriteria;
