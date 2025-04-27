// src/components/rule-form/RuleFormAssociationCriteria.tsx
import React, { useCallback } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { z } from 'zod';

import {
    AssociationMatchCriterionFormData,
    MatchOperation,
    MatchOperationSchema,
    AssociationParameter,
    associationParameterSchema,
} from '@/schemas';
import { isValueList, isIpOperator } from '@/utils/ruleHelpers';

import { Label } from "@/components/ui/label";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';

interface RuleFormAssociationCriteriaProps {
    associationCriteria: AssociationMatchCriterionFormData[]; // This prop might be undefined/null initially
    updateAssociationCriterion: (index: number, field: keyof AssociationMatchCriterionFormData, value: any) => void;
    addAssociationCriterion: () => void;
    removeAssociationCriterion: (index: number) => void;
    isLoading: boolean;
    validationErrors: Record<string, string>;
    baseInputStyles: string;
    errorInputStyles: string;
    normalInputStyles: string;
}

const ASSOCIATION_PARAMETERS = associationParameterSchema.options;
const MATCH_OPERATORS = MatchOperationSchema.options;

const RuleFormAssociationCriteria: React.FC<RuleFormAssociationCriteriaProps> = ({
    associationCriteria,
    updateAssociationCriterion,
    addAssociationCriterion,
    removeAssociationCriterion,
    isLoading,
    validationErrors,
    baseInputStyles,
    errorInputStyles,
    normalInputStyles,
}) => {
    // Ensure associationCriteria is an array before mapping
    const criteriaToRender = Array.isArray(associationCriteria) ? associationCriteria : [];

    return (
        <fieldset className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <legend className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
                Association Criteria (Optional, ALL must match)
            </legend>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Match against incoming DICOM connection details (Calling AE, Source IP, etc.). Applies only to C-STORE/STOW inputs.
            </p>
            <div className="space-y-3 pr-2">
                {/* Map over the safe array */}
                {criteriaToRender.map((criterion, index) => {
                    const paramError = validationErrors?.[`association_criteria[${index}].parameter`];
                    const opError = validationErrors?.[`association_criteria[${index}].op`];
                    const valueError = validationErrors?.[`association_criteria[${index}].value`];

                    const availableOps = criterion.parameter === 'SOURCE_IP'
                        ? MATCH_OPERATORS.filter(op => isIpOperator(op) || ["eq", "startswith", "in", "not_in"].includes(op))
                        : MATCH_OPERATORS.filter(op => !isIpOperator(op) && !["exists", "not_exists"].includes(op));

                    return (
                        <div key={index} className="relative flex items-start space-x-2 p-2 border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700/50">
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">

                                <div className="flex flex-col space-y-1">
                                    <Label htmlFor={`ac-param-${index}`} className="text-xs font-medium text-gray-600 dark:text-gray-400">Parameter*</Label>
                                    <Select
                                        onValueChange={(value) => updateAssociationCriterion(index, 'parameter', value as AssociationParameter)}
                                        value={criterion.parameter}
                                        disabled={isLoading}
                                        required
                                        aria-invalid={!!paramError}
                                    >
                                        <SelectTrigger id={`ac-param-${index}`} className={`${baseInputStyles} ${paramError ? errorInputStyles : normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}>
                                            <SelectValue placeholder="Select Parameter" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ASSOCIATION_PARAMETERS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    {paramError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`ac-param-${index}-error`}>{paramError}</p>}
                                </div>

                                <div className="flex flex-col space-y-1">
                                    <Label htmlFor={`ac-op-${index}`} className="text-xs font-medium text-gray-600 dark:text-gray-400">Operator*</Label>
                                    <Select
                                        onValueChange={(value) => updateAssociationCriterion(index, 'op', value as MatchOperation)}
                                        value={criterion.op}
                                        disabled={isLoading}
                                        required
                                        aria-invalid={!!opError}
                                    >
                                        <SelectTrigger id={`ac-op-${index}`} className={`${baseInputStyles} ${opError ? errorInputStyles : normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}>
                                            <SelectValue placeholder="Select Operator" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableOps.map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    {opError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`ac-op-${index}-error`}>{opError}</p>}
                                </div>

                                <div className="flex flex-col space-y-1">
                                    <Label htmlFor={`ac-value-${index}`} className="text-xs font-medium text-gray-600 dark:text-gray-400">Value*</Label>
                                    <Input
                                        id={`ac-value-${index}`}
                                        type={isValueList(criterion.op) ? 'text' : 'text'}
                                        placeholder={isValueList(criterion.op) ? "List, comma-separated" : "Value"}
                                        value={criterion.value ?? ''}
                                        onChange={(e) => updateAssociationCriterion(index, 'value', e.target.value)}
                                        disabled={isLoading}
                                        required
                                        aria-invalid={!!valueError}
                                        aria-describedby={valueError ? `ac-value-${index}-error` : undefined}
                                        className={`${baseInputStyles} ${valueError ? errorInputStyles : normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}
                                    />
                                    {valueError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`ac-value-${index}-error`}>{valueError}</p>}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => removeAssociationCriterion(index)}
                                disabled={isLoading}
                                className="text-red-500 hover:text-red-700 p-1 mt-1 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed self-start"
                                title="Remove Association Criterion"
                            >
                                <TrashIcon className="h-5 w-5"/>
                                <span className="sr-only">Remove</span>
                            </button>
                        </div>
                    );
                })}
            </div>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAssociationCriterion}
                disabled={isLoading}
                className="mt-2"
            >
                <PlusIcon className="h-4 w-4 mr-1"/> Add Association Criterion
            </Button>
            {validationErrors?.['association_criteria'] && typeof validationErrors['association_criteria'] === 'string' && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400" id="association_criteria-error">
                    {validationErrors['association_criteria']}
                </p>
            )}
        </fieldset>
    );
};

export default RuleFormAssociationCriteria;
