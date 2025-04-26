// src/components/rule-form/RuleFormTagModifications.tsx
import React, { useCallback } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { z } from 'zod';

// Import specific Zod schemas for type inference within the component
import {
    TagModificationFormData, // Base type for the array
    ModifyActionSchema,
    TagSetModificationSchema,
    TagPrependModificationSchema,
    TagSuffixModificationSchema,
    TagRegexReplaceModificationSchema,
    TagCopyModificationSchema,
    TagMoveModificationSchema,
    TagCrosswalkModificationSchema // Import the Zod schema for crosswalk
} from '@/schemas/ruleSchema'; // Assuming schemas index exports the Zod schema

import { DicomTagInfo } from '@/dicom/dictionary';

import DicomTagCombobox from '../DicomTagCombobox';
import { Label } from "@/components/ui/label";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';

interface RuleFormTagModificationsProps {
    tagModifications: TagModificationFormData[];
    // Ensure the type allows specific fields like 'crosswalk_map_id'
    updateTagModification: (index: number, field: keyof TagModificationFormData | 'tagInfo' | 'sourceTagInfo' | 'destTagInfo' | 'crosswalk_map_id', value: any) => void;
    addTagModification: () => void;
    removeTagModification: (index: number) => void;
    isLoading: boolean;
    validationErrors: Record<string, string>;
    baseInputStyles: string;
    errorInputStyles: string;
    normalInputStyles: string;
}

const MODIFICATION_ACTIONS = ModifyActionSchema.options;

const RuleFormTagModifications: React.FC<RuleFormTagModificationsProps> = ({
    tagModifications,
    updateTagModification,
    addTagModification,
    removeTagModification,
    isLoading,
    validationErrors,
    baseInputStyles,
    errorInputStyles,
    normalInputStyles,
}) => {

    const renderModificationInputs = useCallback((mod: TagModificationFormData, index: number) => {
        const valueError = validationErrors[`tag_modifications[${index}].value`];
        const vrError = validationErrors[`tag_modifications[${index}].vr`];
        const patternError = validationErrors[`tag_modifications[${index}].pattern`];
        const replacementError = validationErrors[`tag_modifications[${index}].replacement`];
        const destTagError = validationErrors[`tag_modifications[${index}].destination_tag`];
        const destVrError = validationErrors[`tag_modifications[${index}].destination_vr`];
        // --- Added Error Key for Crosswalk ---
        const crosswalkMapIdError = validationErrors[`tag_modifications[${index}].crosswalk_map_id`];
        // --- End Added ---

        switch (mod.action) {
            case ModifyActionSchema.enum.set:
                const setMod = mod as z.infer<typeof TagSetModificationSchema>;
                return (
                    <>
                        <div>
                            <Input
                                type="text" placeholder="Value"
                                value={setMod.value ?? ''}
                                onChange={(e) => updateTagModification(index, 'value', e.target.value)}
                                required disabled={isLoading} aria-invalid={!!valueError} aria-describedby={`tm-value-${index}-error`}
                                className={`${baseInputStyles} ${valueError ? errorInputStyles : normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}
                            />
                            {valueError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-value-${index}-error`}>{valueError}</p>}
                        </div>
                        <div>
                            <Input
                                type="text" placeholder="VR (e.g., SH)" maxLength={2}
                                value={setMod.vr ?? ''}
                                onChange={(e) => updateTagModification(index, 'vr', e.target.value.toUpperCase())}
                                disabled={isLoading} aria-invalid={!!vrError} aria-describedby={`tm-vr-${index}-error`}
                                className={`${baseInputStyles} ${vrError ? errorInputStyles : normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}
                            />
                            {vrError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-vr-${index}-error`}>{vrError}</p>}
                        </div>
                    </>
                );
            case ModifyActionSchema.enum.prepend:
            case ModifyActionSchema.enum.suffix:
                 const stringMod = mod as z.infer<typeof TagPrependModificationSchema | typeof TagSuffixModificationSchema>;
                 return (
                    <div className="sm:col-span-2">
                         <Input
                            type="text" placeholder="Value to Add"
                            value={stringMod.value ?? ''}
                            onChange={(e) => updateTagModification(index, 'value', e.target.value)}
                            required disabled={isLoading} aria-invalid={!!valueError} aria-describedby={`tm-value-${index}-error`}
                            className={`${baseInputStyles} ${valueError ? errorInputStyles : normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}
                        />
                         {valueError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-value-${index}-error`}>{valueError}</p>}
                     </div>
                 );
             case ModifyActionSchema.enum.regex_replace:
                 const regexMod = mod as z.infer<typeof TagRegexReplaceModificationSchema>;
                 return (
                    <>
                         <div>
                             <Input
                                type="text" placeholder="Regex Pattern"
                                value={regexMod.pattern ?? ''}
                                onChange={(e) => updateTagModification(index, 'pattern', e.target.value)}
                                required disabled={isLoading} aria-invalid={!!patternError} aria-describedby={`tm-pattern-${index}-error`}
                                className={`${baseInputStyles} ${patternError ? errorInputStyles : normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}
                            />
                             {patternError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-pattern-${index}-error`}>{patternError}</p>}
                         </div>
                         <div>
                             <Input
                                type="text" placeholder="Replacement String"
                                value={regexMod.replacement ?? ''}
                                onChange={(e) => updateTagModification(index, 'replacement', e.target.value)}
                                required disabled={isLoading} aria-invalid={!!replacementError} aria-describedby={`tm-replacement-${index}-error`}
                                className={`${baseInputStyles} ${replacementError ? errorInputStyles : normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}
                            />
                             {replacementError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-replacement-${index}-error`}>{replacementError}</p>}
                         </div>
                     </>
                 );
             case ModifyActionSchema.enum.copy:
             case ModifyActionSchema.enum.move:
                 const copyMoveMod = mod as z.infer<typeof TagCopyModificationSchema | typeof TagMoveModificationSchema>;
                 return (
                    <>
                        <div>
                            <Label htmlFor={`tm-dest-tag-${index}`} className="text-xs font-medium text-gray-600 dark:text-gray-400">Destination Tag*</Label>
                            <DicomTagCombobox
                                value={copyMoveMod.destination_tag ?? ''}
                                onChange={(tagInfo: DicomTagInfo | null) => updateTagModification(index, 'destTagInfo', tagInfo)}
                                disabled={isLoading}
                                required
                                aria-invalid={!!validationErrors[`tag_modifications[${index}].destination_tag`]}
                                aria-describedby={`tm-dest-tag-${index}-error`}
                                inputClassName={`${baseInputStyles} ${validationErrors[`tag_modifications[${index}].destination_tag`] ? errorInputStyles : normalInputStyles}`}
                            />
                            {validationErrors[`tag_modifications[${index}].destination_tag`] && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-dest-tag-${index}-error`}>{validationErrors[`tag_modifications[${index}].destination_tag`]}</p>}
                        </div>
                        <div>
                            <Label htmlFor={`tm-dest-vr-${index}`} className="text-xs font-medium text-gray-600 dark:text-gray-400">Dest VR (Optional)</Label>
                            <Input
                                type="text" placeholder="e.g., SH" maxLength={2} id={`tm-dest-vr-${index}`}
                                value={copyMoveMod.destination_vr ?? ''}
                                onChange={(e) => updateTagModification(index, 'destination_vr', e.target.value.toUpperCase())}
                                disabled={isLoading} aria-invalid={!!validationErrors[`tag_modifications[${index}].destination_vr`]} aria-describedby={`tm-dest-vr-${index}-error`}
                                className={`${baseInputStyles} ${validationErrors[`tag_modifications[${index}].destination_vr`] ? errorInputStyles : normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}
                            />
                            {validationErrors[`tag_modifications[${index}].destination_vr`] && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-dest-vr-${index}-error`}>{validationErrors[`tag_modifications[${index}].destination_vr`]}</p>}
                        </div>
                     </>
                 );
            // --- ADDED Case for Crosswalk ---
            case ModifyActionSchema.enum.crosswalk:
                 const crosswalkMod = mod as z.infer<typeof TagCrosswalkModificationSchema>;
                 return (
                    <div className="sm:col-span-2"> {/* Span across the two columns */}
                         <Label htmlFor={`tm-crosswalk-map-${index}`} className="text-xs font-medium text-gray-600 dark:text-gray-400">Crosswalk Map ID*</Label>
                         <Input
                            id={`tm-crosswalk-map-${index}`}
                            type="number"
                            min="1"
                            step="1"
                            placeholder="Enter Mapping ID"
                            // Ensure value is string for input, handle potential undefined/null
                            value={crosswalkMod.crosswalk_map_id?.toString() ?? ''}
                             // Update state with the *number* value
                            onChange={(e) => updateTagModification(index, 'crosswalk_map_id', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                            required
                            disabled={isLoading}
                            aria-invalid={!!crosswalkMapIdError}
                            aria-describedby={`tm-crosswalk-map-${index}-error`}
                            className={`${baseInputStyles} ${crosswalkMapIdError ? errorInputStyles : normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}
                        />
                         {crosswalkMapIdError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-crosswalk-map-${index}-error`}>{crosswalkMapIdError}</p>}
                     </div>
                 );
            // --- END ADDED ---
            case ModifyActionSchema.enum.delete:
            default:
                return (
                    <div className="sm:col-span-2 text-sm text-gray-500 dark:text-gray-400 italic self-center pt-2">
                        (No other fields needed)
                    </div>
                );
        }
    }, [validationErrors, isLoading, baseInputStyles, errorInputStyles, normalInputStyles, updateTagModification]);

    return (
        <fieldset className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <legend className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">Tag Modifications</legend>
            <div className="space-y-3 pr-2">
                {tagModifications.map((mod, index) => {
                     const actionError = validationErrors[`tag_modifications[${index}].action`];
                     // Use 'as any' for dynamic access or check action type first
                     const targetTagError = validationErrors[`tag_modifications[${index}].tag`];
                     const sourceTagError = validationErrors[`tag_modifications[${index}].source_tag`];

                     return (
                        <div key={index} className="relative flex items-start space-x-2 p-2 border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700/50">
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                                {/* Action Select */}
                                <div>
                                    <Select
                                        onValueChange={(value) => updateTagModification(index, 'action', value as ModifyAction)}
                                        value={mod.action}
                                        disabled={isLoading}
                                        required
                                        aria-invalid={!!actionError}
                                    >
                                        <SelectTrigger className={`${baseInputStyles} ${actionError ? errorInputStyles : normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}>
                                            <SelectValue placeholder="Select Action" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {MODIFICATION_ACTIONS.map(act => <SelectItem key={act} value={act}>{act}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    {actionError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-action-${index}-error`}>{actionError}</p>}
                                </div>

                                {/* Target/Source Tag Combobox */}
                                { (mod.action === ModifyActionSchema.enum.copy || mod.action === ModifyActionSchema.enum.move) ? (
                                     <div>
                                         <Label htmlFor={`tm-source-tag-${index}`} className="text-xs font-medium text-gray-600 dark:text-gray-400">Source Tag*</Label>
                                         <DicomTagCombobox
                                            value={(mod as any).source_tag ?? ''} // Use dynamic access or type guard
                                            onChange={(tagInfo: DicomTagInfo | null) => updateTagModification(index, 'sourceTagInfo', tagInfo)}
                                            disabled={isLoading} required aria-invalid={!!sourceTagError} aria-describedby={`tm-source-tag-${index}-error`}
                                            inputClassName={`${baseInputStyles} ${sourceTagError ? errorInputStyles : normalInputStyles}`}
                                        />
                                         {sourceTagError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-source-tag-${index}-error`}>{sourceTagError}</p>}
                                     </div>
                                 ) : mod.action !== ModifyActionSchema.enum.crosswalk ? ( // Don't show target tag for crosswalk
                                     <div>
                                         <Label htmlFor={`tm-tag-${index}`} className="text-xs font-medium text-gray-600 dark:text-gray-400">Target Tag*</Label>
                                         <DicomTagCombobox
                                            value={(mod as any).tag ?? ''} // Use dynamic access or type guard
                                            onChange={(tagInfo: DicomTagInfo | null) => updateTagModification(index, 'tagInfo', tagInfo)}
                                            disabled={isLoading} required aria-invalid={!!targetTagError} aria-describedby={`tm-tag-${index}-error`}
                                            inputClassName={`${baseInputStyles} ${targetTagError ? errorInputStyles : normalInputStyles}`}
                                        />
                                         {targetTagError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-tag-${index}-error`}>{targetTagError}</p>}
                                     </div>
                                 ) : (
                                     // Placeholder or empty div for crosswalk action in this column
                                     <div>{/* Intentionally empty for crosswalk */}</div>
                                 )}

                                {/* Render Action-Specific Inputs */}
                                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {renderModificationInputs(mod, index)}
                                </div>
                            </div>

                            {/* Delete Button */}
                            <button
                                type="button"
                                onClick={() => removeTagModification(index)}
                                disabled={isLoading}
                                className="text-red-500 hover:text-red-700 p-1 mt-1 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed self-start"
                            >
                                <TrashIcon className="h-5 w-5"/>
                            </button>
                        </div>
                     );
                })}
            </div>
            {/* Add Button */}
            <Button type="button" variant="outline" size="sm" onClick={addTagModification} disabled={isLoading} className="mt-2">
                <PlusIcon className="h-4 w-4 mr-1"/> Add Modification
            </Button>
             {validationErrors['tag_modifications'] && typeof validationErrors['tag_modifications'] === 'string' && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validationErrors['tag_modifications']}</p>}
        </fieldset>
    );
};

export default RuleFormTagModifications;
