// src/components/rule-form/RuleFormAssociationCriteria.tsx
import React from 'react'; // Removed useCallback as it wasn't strictly needed here
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { z } from 'zod';

import {
    AssociationMatchCriterionFormData,
    MatchOperation,
    MatchOperationSchema,
    AssociationParameter,
    associationParameterSchema,
} from '@/schemas'; // Assuming schemas are correctly imported
import { isValueList, isIpOperator } from '@/utils/ruleHelpers';

import { Label } from "@/components/ui/label";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { cn } from "@/lib/utils"; // Import cn for conditional classes

interface RuleFormAssociationCriteriaProps {
    associationCriteria: AssociationMatchCriterionFormData[];
    updateAssociationCriterion: (index: number, field: keyof AssociationMatchCriterionFormData, value: any) => void;
    addAssociationCriterion: () => void;
    removeAssociationCriterion: (index: number) => void;
    isLoading: boolean;
    validationErrors: Record<string, string>; // Expects errors keyed like "association_criteria[0].parameter"
    // Remove style props if not strictly needed
    // baseInputStyles: string;
    // errorInputStyles: string;
    // normalInputStyles: string;
    containerRef?: React.RefObject<HTMLElement>; // Add containerRef for Select portal fix
}

// Define constants within the component or globally
const ASSOCIATION_PARAMETERS = associationParameterSchema.options;
const MATCH_OPERATORS = MatchOperationSchema.options;

// Define base styles locally or import
const baseInputStyles = "block w-full rounded-md shadow-sm sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 border focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed py-2 pl-3 px-3";
const errorInputStyles = "border-red-500 focus:border-red-500 focus:ring-red-500";
const normalInputStyles = "border-gray-300 dark:border-gray-600";

const RuleFormAssociationCriteria: React.FC<RuleFormAssociationCriteriaProps> = ({
    associationCriteria,
    updateAssociationCriterion,
    addAssociationCriterion,
    removeAssociationCriterion,
    isLoading,
    validationErrors,
    // baseInputStyles, // Removed if using local consts
    // errorInputStyles,
    // normalInputStyles,
    containerRef, // Destructure containerRef
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
                    // Check for errors specific to this criterion item
                    const paramKey = `association_criteria[${index}].parameter`;
                    const opKey = `association_criteria[${index}].op`;
                    const valueKey = `association_criteria[${index}].value`;
                    const paramError = validationErrors?.[paramKey];
                    const opError = validationErrors?.[opKey];
                    const valueError = validationErrors?.[valueKey];

                    // Determine available operators based on the selected parameter
                    const availableOps = criterion.parameter === 'SOURCE_IP'
                        ? MATCH_OPERATORS.filter(op => isIpOperator(op) || ["eq", "startswith", "in", "not_in"].includes(op))
                        : MATCH_OPERATORS.filter(op => !isIpOperator(op) && !["exists", "not_exists"].includes(op)); // Exclude exists/not_exists for association? Check schema if needed

                    return (
                        <div key={index} className="relative flex items-start space-x-2 p-3 border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700/50">
                            {/* Grid Layout for Inputs */}
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">

                                {/* Parameter Select */}
                                <div className="flex flex-col space-y-1">
                                    <Label htmlFor={`ac-param-${index}`} className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                        Parameter*
                                    </Label>
                                    <Select
                                        onValueChange={(value) => updateAssociationCriterion(index, 'parameter', value as AssociationParameter)}
                                        value={criterion.parameter}
                                        disabled={isLoading}
                                        required
                                    >
                                        <SelectTrigger
                                            id={`ac-param-${index}`} // Assign ID
                                            className={cn(
                                                baseInputStyles,
                                                paramError ? errorInputStyles : normalInputStyles,
                                                "dark:bg-gray-900/80 dark:disabled:bg-gray-800"
                                            )}
                                            aria-invalid={!!paramError}
                                            aria-describedby={paramError ? `${paramKey}-error` : undefined}
                                        >
                                            <SelectValue placeholder="Select Parameter" />
                                        </SelectTrigger>
                                        {/* Pass containerRef */}
                                        <SelectContent container={containerRef?.current}>
                                            {ASSOCIATION_PARAMETERS.map(p => (
                                                <SelectItem key={p} value={p}>{p}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {paramError && (
                                        <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`${paramKey}-error`}>
                                            {paramError}
                                        </p>
                                    )}
                                </div>

                                {/* Operator Select */}
                                <div className="flex flex-col space-y-1">
                                    <Label htmlFor={`ac-op-${index}`} className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                        Operator*
                                    </Label>
                                    <Select
                                        onValueChange={(value) => updateAssociationCriterion(index, 'op', value as MatchOperation)}
                                        value={criterion.op}
                                        disabled={isLoading}
                                        required
                                    >
                                        <SelectTrigger
                                            id={`ac-op-${index}`} // Assign ID
                                            className={cn(
                                                baseInputStyles,
                                                opError ? errorInputStyles : normalInputStyles,
                                                "dark:bg-gray-900/80 dark:disabled:bg-gray-800"
                                            )}
                                            aria-invalid={!!opError}
                                            aria-describedby={opError ? `${opKey}-error` : undefined}
                                        >
                                            <SelectValue placeholder="Select Operator" />
                                        </SelectTrigger>
                                        {/* Pass containerRef */}
                                        <SelectContent container={containerRef?.current}>
                                            {availableOps.map(op => (
                                                <SelectItem key={op} value={op}>{op}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {opError && (
                                        <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`${opKey}-error`}>
                                            {opError}
                                        </p>
                                    )}
                                </div>

                                {/* Value Input */}
                                <div className="flex flex-col space-y-1">
                                    <Label htmlFor={`ac-value-${index}`} className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                        Value*
                                    </Label>
                                    <Input
                                        id={`ac-value-${index}`} // Assign ID
                                        type={'text'} // Use text for lists/IPs
                                        placeholder={isValueList(criterion.op) ? "List, comma-separated" : criterion.parameter === 'SOURCE_IP' ? 'IP or CIDR' : "Value"}
                                        value={criterion.value ?? ''}
                                        onChange={(e) => updateAssociationCriterion(index, 'value', e.target.value)}
                                        disabled={isLoading}
                                        required
                                        aria-invalid={!!valueError}
                                        aria-describedby={valueError ? `${valueKey}-error` : undefined}
                                        className={cn(
                                            baseInputStyles,
                                            valueError ? errorInputStyles : normalInputStyles,
                                            "dark:bg-gray-900/80 dark:disabled:bg-gray-800"
                                        )}
                                    />
                                    {valueError && (
                                        <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`${valueKey}-error`}>
                                            {valueError}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Remove Button */}
                            <button
                                type="button"
                                onClick={() => removeAssociationCriterion(index)}
                                disabled={isLoading}
                                className="text-red-500 hover:text-red-700 p-1 mt-1 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed self-start"
                                title="Remove Association Criterion"
                            >
                                <TrashIcon className="h-5 w-5"/>
                                <span className="sr-only">Remove Association Criterion {index + 1}</span>
                            </button>
                        </div>
                    );
                })}
            </div>
            {/* Add Criterion Button */}
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAssociationCriterion}
                disabled={isLoading}
                className="mt-3" // Increased margin-top
            >
                <PlusIcon className="h-4 w-4 mr-1"/> Add Association Criterion
            </Button>
            {/* General validation error for the whole array */}
            {validationErrors?.['association_criteria'] && typeof validationErrors['association_criteria'] === 'string' && (
                 <p className="mt-1 text-xs text-red-600 dark:text-red-400" id="association_criteria-error">
                    {validationErrors['association_criteria']}
                 </p>
            )}
        </fieldset>
    );
};

export default RuleFormAssociationCriteria;
