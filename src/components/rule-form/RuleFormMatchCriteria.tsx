// src/components/rule-form/RuleFormMatchCriteria.tsx
import React from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
// import { z } from 'zod';

import {
    MatchCriterionFormData,
    MatchOperation,
    MatchOperationSchema,
} from '@/schemas'; // Assuming schemas are correctly imported from main index or ruleSchema
import { DicomTagInfo } from '@/dicom/dictionary';
import { isValueRequired, isValueList, isIpOperator } from '@/utils/ruleHelpers';

import DicomTagCombobox from '../DicomTagCombobox'; // The custom combobox
import { Label } from "@/components/ui/label";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { cn } from "@/lib/utils"; // Import cn for conditional classes

interface RuleFormMatchCriteriaProps {
    matchCriteria: MatchCriterionFormData[];
    updateMatchCriterion: (index: number, field: keyof MatchCriterionFormData | 'tagInfo', value: any) => void;
    addMatchCriterion: () => void;
    removeMatchCriterion: (index: number) => void;
    isLoading: boolean;
    validationErrors: Record<string, string | undefined>; // Expects errors keyed like "match_criteria[0].tag"
    // Remove style props if not strictly needed
    // baseInputStyles: string;
    // errorInputStyles: string;
    // normalInputStyles: string;
    containerRef: React.RefObject<HTMLDivElement | null>; // Add containerRef for Select portal fix
}

// Define constants within the component or globally if needed elsewhere
const MATCH_OPERATORS = MatchOperationSchema.options;

// Define base styles locally or import from a central place
const baseInputStyles = "block w-full rounded-md shadow-sm sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 border focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed py-2 pl-3 px-3";
const errorInputStyles = "border-red-500 focus:border-red-500 focus:ring-red-500";
const normalInputStyles = "border-gray-300 dark:border-gray-600";


const RuleFormMatchCriteria: React.FC<RuleFormMatchCriteriaProps> = ({
    matchCriteria,
    updateMatchCriterion,
    addMatchCriterion,
    removeMatchCriterion,
    isLoading,
    validationErrors,
    // baseInputStyles, // Removed if using local consts
    // errorInputStyles,
    // normalInputStyles,
    containerRef, // Destructure containerRef
}) => {
    // Ensure matchCriteria is an array before mapping
    const criteriaToRender = Array.isArray(matchCriteria) ? matchCriteria : [];

    return (
        <fieldset className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <legend className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
                Match Criteria (ALL must match)<span className="text-red-500">*</span>
            </legend>
            <div className="space-y-3 pr-2">
                {/* Map over the safe array */}
                {criteriaToRender.map((criterion, index) => {
                    // Check for errors specific to this criterion item
                    const tagKey = `match_criteria[${index}].tag`;
                    const opKey = `match_criteria[${index}].op`;
                    const valueKey = `match_criteria[${index}].value`;
                    const tagError = validationErrors?.[tagKey];
                    const opError = validationErrors?.[opKey];
                    const valueError = validationErrors?.[valueKey];
                    const showValueInput = isValueRequired(criterion.op);

                    return (
                        <div key={index} className="relative flex items-start space-x-2 p-3 border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700/50"> {/* Increased padding */}
                            {/* Grid Layout for Inputs */}
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3"> {/* Increased gap */}

                                {/* Tag Combobox */}
                                <div className="flex flex-col space-y-1">
                                    <Label htmlFor={`mc-tag-${index}`} className="text-xs font-medium text-gray-700 dark:text-gray-300"> {/* Adjusted label color */}
                                        Tag*
                                    </Label>
                                    <DicomTagCombobox
                                        inputId={`mc-tag-${index}`} // Pass unique ID
                                        value={criterion.tag ?? ''}
                                        onChange={(tagInfo: DicomTagInfo | null) => updateMatchCriterion(index, 'tagInfo', tagInfo)}
                                        disabled={isLoading}
                                        required // Keep required for visual cue, validation handled by parent
                                        aria-invalid={!!tagError}
                                        aria-describedby={tagError ? `${tagKey}-error` : undefined}
                                        inputClassName={cn(
                                            baseInputStyles,
                                            tagError ? errorInputStyles : normalInputStyles,
                                            "dark:bg-gray-900/80 dark:disabled:bg-gray-800" // Specific dark mode bg
                                        )}
                                    />
                                    {tagError && (
                                        <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`${tagKey}-error`}>
                                            {tagError}
                                        </p>
                                    )}
                                </div>

                                {/* Operator Select */}
                                <div className="flex flex-col space-y-1">
                                    <Label htmlFor={`mc-op-${index}`} className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                        Operator*
                                    </Label>
                                    <Select
                                        onValueChange={(value) => updateMatchCriterion(index, 'op', value as MatchOperation)}
                                        value={criterion.op}
                                        disabled={isLoading}
                                        required
                                        // No aria-invalid needed on Select itself, trigger handles it
                                    >
                                        <SelectTrigger
                                            id={`mc-op-${index}`} // Assign ID
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
                                        {/* Pass containerRef to SelectContent */}
                                        <SelectContent container={containerRef?.current}>
                                            {MATCH_OPERATORS
                                                .filter(op => !isIpOperator(op)) // Filter out IP operators for standard criteria
                                                .map(op => (
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

                                {/* Value Input (Conditional) */}
                                <div className="flex flex-col space-y-1">
                                    {/* Label: Render conditionally or use invisible placeholder */}
                                    <Label
                                        htmlFor={`mc-value-${index}`}
                                        className={cn(
                                            "text-xs font-medium text-gray-700 dark:text-gray-300",
                                            !showValueInput && "text-transparent select-none" // Hide if no input needed
                                        )}
                                    >
                                        Value{showValueInput ? '*' : ''} {/* Add asterisk only if required */}
                                    </Label>

                                    {showValueInput ? (
                                        <>
                                            <Input
                                                id={`mc-value-${index}`} // Assign ID
                                                type={'text'} // Use text for comma-separated lists too
                                                placeholder={isValueList(criterion.op) ? "List, comma-separated" : "Value"}
                                                value={criterion.value ?? ''}
                                                onChange={(e) => updateMatchCriterion(index, 'value', e.target.value)}
                                                disabled={isLoading}
                                                required // Keep required visually
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
                                        </>
                                    ) : (
                                        // Render a placeholder div to maintain layout height
                                        <div className="h-9 flex items-center"> {/* Match Input height */}
                                            <span className="text-sm text-gray-500 dark:text-gray-400 italic">
                                                (No value needed)
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Remove Button */}
                            <button
                                type="button"
                                onClick={() => removeMatchCriterion(index)}
                                disabled={isLoading}
                                className="text-red-500 hover:text-red-700 p-1 mt-1 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed self-start"
                                title="Remove Criterion"
                            >
                                <TrashIcon className="h-5 w-5"/>
                                <span className="sr-only">Remove Criterion {index + 1}</span>
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
                onClick={addMatchCriterion}
                disabled={isLoading}
                className="mt-3" // Increased margin-top
            >
                <PlusIcon className="h-4 w-4 mr-1"/> Add Criterion
            </Button>
            {/* General validation error for the whole array */}
            {validationErrors?.['match_criteria'] && typeof validationErrors['match_criteria'] === 'string' && (
                 <p className="mt-1 text-xs text-red-600 dark:text-red-400" id="match_criteria-error">
                    {validationErrors['match_criteria']}
                 </p>
            )}
        </fieldset>
    );
};

export default RuleFormMatchCriteria;
