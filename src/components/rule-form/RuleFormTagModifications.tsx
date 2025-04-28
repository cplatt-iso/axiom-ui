// src/components/rule-form/RuleFormTagModifications.tsx
import React, { useCallback } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'; // Keep TrashIcon
import { Loader2 } from 'lucide-react'; // Keep Loader2 if used elsewhere, or remove
import { z } from 'zod';

import {
    TagModificationFormData,
    ModifyActionSchema,
    TagSetModificationSchema,
    TagPrependModificationSchema,
    TagSuffixModificationSchema,
    TagRegexReplaceModificationSchema,
    TagCopyModificationSchema,
    TagMoveModificationSchema,
    TagCrosswalkModificationSchema,
    ModifyAction, // Import the type
} from '@/schemas/ruleSchema';

import { CrosswalkMapRead } from '@/schemas'; // Main schema import

import { DicomTagInfo } from '@/dicom/dictionary'; // DICOM dictionary import

import DicomTagCombobox from '../DicomTagCombobox'; // Custom combobox
import { Label } from "@/components/ui/label";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { cn } from "@/lib/utils"; // Import cn utility

interface RuleFormTagModificationsProps {
    tagModifications: TagModificationFormData[];
    updateTagModification: (index: number, field: keyof TagModificationFormData | 'tagInfo' | 'sourceTagInfo' | 'destTagInfo' | 'crosswalk_map_id', value: any) => void;
    addTagModification: () => void;
    removeTagModification: (index: number) => void;
    isLoading: boolean;
    validationErrors: Record<string, string>; // Expects errors like "tag_modifications[0].tag"
    // Remove style props if not strictly needed
    // baseInputStyles: string;
    // errorInputStyles: string;
    // normalInputStyles: string;
    availableCrosswalkMaps: CrosswalkMapRead[];
    crosswalkMapsLoading: boolean;
    crosswalkMapsError: Error | null;
    containerRef?: React.RefObject<HTMLElement>; // Add containerRef prop
}

// Define constants
const MODIFICATION_ACTIONS = ModifyActionSchema.options;

// Define base styles locally or import
const baseInputStyles = "block w-full rounded-md shadow-sm sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 border focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed py-2 pl-3 px-3";
const errorInputStyles = "border-red-500 focus:border-red-500 focus:ring-red-500";
const normalInputStyles = "border-gray-300 dark:border-gray-600";

// Placeholder label for layout consistency
const SpacerLabel = () => <Label className="text-xs font-medium text-transparent select-none"> </Label>;

const RuleFormTagModifications: React.FC<RuleFormTagModificationsProps> = ({
    tagModifications,
    updateTagModification,
    addTagModification,
    removeTagModification,
    isLoading,
    validationErrors,
    // baseInputStyles, // Removed if using local consts
    // errorInputStyles,
    // normalInputStyles,
    availableCrosswalkMaps,
    crosswalkMapsLoading,
    crosswalkMapsError,
    containerRef, // Destructure containerRef
}) => {

    // Ensure arrays are safe before operating on them
    const modsToRender = Array.isArray(tagModifications) ? tagModifications : [];
    const crosswalkMapsToDisplay = Array.isArray(availableCrosswalkMaps) ? availableCrosswalkMaps : [];

    // --- renderModificationInputs Callback ---
    // This function generates the specific input fields based on the selected action
    const renderModificationInputs = useCallback((mod: TagModificationFormData, index: number): [React.ReactNode, React.ReactNode] => {
        // Helper to get error message for a specific field
        const getError = (keySuffix: string): string | undefined => validationErrors?.[`tag_modifications[${index}].${keySuffix}`];
        const hasError = (keySuffix: string): boolean => !!getError(keySuffix);

        switch (mod.action) {
            case ModifyActionSchema.enum.set:
                const setMod = mod as z.infer<typeof TagSetModificationSchema>;
                const setValueError = getError('value');
                const setVrError = getError('vr');
                return [
                    // Value Input for 'set'
                    <div key={`set-val-${index}`} className="flex flex-col space-y-1">
                        <Label htmlFor={`tm-value-${index}`} className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Value*
                        </Label>
                        <Input
                            id={`tm-value-${index}`}
                            type="text"
                            placeholder="Value to set"
                            value={setMod.value ?? ''}
                            onChange={(e) => updateTagModification(index, 'value', e.target.value)}
                            required
                            disabled={isLoading}
                            aria-invalid={!!setValueError}
                            aria-describedby={setValueError ? `tm-value-${index}-error` : undefined}
                            className={cn(baseInputStyles, setValueError ? errorInputStyles : normalInputStyles, "dark:bg-gray-900/80 dark:disabled:bg-gray-800")}
                        />
                        {setValueError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-value-${index}-error`}>{setValueError}</p>}
                    </div>,
                    // VR Input for 'set' (Optional)
                    <div key={`set-vr-${index}`} className="flex flex-col space-y-1">
                        <Label htmlFor={`tm-vr-${index}`} className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            VR (Optional)
                        </Label>
                        <Input
                            id={`tm-vr-${index}`}
                            type="text"
                            placeholder="e.g., SH"
                            maxLength={2}
                            value={setMod.vr ?? ''}
                            onChange={(e) => updateTagModification(index, 'vr', e.target.value.toUpperCase())} // Ensure uppercase
                            disabled={isLoading}
                            aria-invalid={!!setVrError}
                            aria-describedby={setVrError ? `tm-vr-${index}-error` : undefined}
                            className={cn(baseInputStyles, setVrError ? errorInputStyles : normalInputStyles, "dark:bg-gray-900/80 dark:disabled:bg-gray-800")}
                        />
                        {setVrError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-vr-${index}-error`}>{setVrError}</p>}
                    </div>
                ];

            case ModifyActionSchema.enum.prepend:
            case ModifyActionSchema.enum.suffix:
                 const stringMod = mod as z.infer<typeof TagPrependModificationSchema | typeof TagSuffixModificationSchema>;
                 const stringValueError = getError('value');
                 return [
                    // Value Input for 'prepend'/'suffix'
                    <div key={`string-val-${index}`} className="flex flex-col space-y-1 sm:col-span-2"> {/* Span across 2 columns */}
                        <Label htmlFor={`tm-value-${index}`} className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Value to Add*
                        </Label>
                         <Input
                            id={`tm-value-${index}`}
                            type="text"
                            placeholder="Value to add"
                            value={stringMod.value ?? ''}
                            onChange={(e) => updateTagModification(index, 'value', e.target.value)}
                            required
                            disabled={isLoading}
                            aria-invalid={!!stringValueError}
                            aria-describedby={stringValueError ? `tm-value-${index}-error` : undefined}
                            className={cn(baseInputStyles, stringValueError ? errorInputStyles : normalInputStyles, "dark:bg-gray-900/80 dark:disabled:bg-gray-800")}
                        />
                         {stringValueError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-value-${index}-error`}>{stringValueError}</p>}
                     </div>,
                     // Spacer to maintain grid layout
                     <div key={`string-empty-${index}`} className="hidden sm:flex sm:flex-col"></div>
                 ];

             case ModifyActionSchema.enum.regex_replace:
                 const regexMod = mod as z.infer<typeof TagRegexReplaceModificationSchema>;
                 const patternError = getError('pattern');
                 const replacementError = getError('replacement');
                 return [
                    // Regex Pattern Input
                    <div key={`regex-pattern-${index}`} className="flex flex-col space-y-1">
                        <Label htmlFor={`tm-pattern-${index}`} className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Regex Pattern*
                        </Label>
                         <Input
                            id={`tm-pattern-${index}`}
                            type="text"
                            placeholder="Regex Pattern"
                            value={regexMod.pattern ?? ''}
                            onChange={(e) => updateTagModification(index, 'pattern', e.target.value)}
                            required
                            disabled={isLoading}
                            aria-invalid={!!patternError}
                            aria-describedby={patternError ? `tm-pattern-${index}-error` : undefined}
                            className={cn(baseInputStyles, patternError ? errorInputStyles : normalInputStyles, "dark:bg-gray-900/80 dark:disabled:bg-gray-800 font-mono text-xs")} // Mono for regex
                        />
                         {patternError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-pattern-${index}-error`}>{patternError}</p>}
                     </div>,
                     // Replacement String Input
                     <div key={`regex-replace-${index}`} className="flex flex-col space-y-1">
                        <Label htmlFor={`tm-replacement-${index}`} className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Replacement*
                        </Label>
                         <Input
                            id={`tm-replacement-${index}`}
                            type="text"
                            placeholder="Replacement String"
                            value={regexMod.replacement ?? ''}
                            onChange={(e) => updateTagModification(index, 'replacement', e.target.value)}
                            required
                            disabled={isLoading}
                            aria-invalid={!!replacementError}
                            aria-describedby={replacementError ? `tm-replacement-${index}-error` : undefined}
                            className={cn(baseInputStyles, replacementError ? errorInputStyles : normalInputStyles, "dark:bg-gray-900/80 dark:disabled:bg-gray-800")}
                        />
                         {replacementError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-replacement-${index}-error`}>{replacementError}</p>}
                     </div>
                 ];

             case ModifyActionSchema.enum.copy:
             case ModifyActionSchema.enum.move:
                 const copyMoveMod = mod as z.infer<typeof TagCopyModificationSchema | typeof TagMoveModificationSchema>;
                 const destTagError = getError('destination_tag');
                 const destVrError = getError('destination_vr');
                 return [
                    // Destination Tag Combobox
                    <div key={`cpymv-desttag-${index}`} className="flex flex-col space-y-1">
                        <Label htmlFor={`tm-dest-tag-${index}`} className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Destination Tag*
                        </Label>
                        <DicomTagCombobox
                            inputId={`tm-dest-tag-${index}`}
                            value={copyMoveMod.destination_tag ?? ''}
                            onChange={(tagInfo: DicomTagInfo | null) => updateTagModification(index, 'destTagInfo', tagInfo)}
                            disabled={isLoading}
                            required
                            aria-invalid={!!destTagError}
                            aria-describedby={destTagError ? `tm-dest-tag-${index}-error` : undefined}
                            inputClassName={cn(baseInputStyles, destTagError ? errorInputStyles : normalInputStyles, "dark:bg-gray-900/80 dark:disabled:bg-gray-800")}
                        />
                        {destTagError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-dest-tag-${index}-error`}>{destTagError}</p>}
                    </div>,
                    // Destination VR Input (Optional)
                    <div key={`cpymv-destvr-${index}`} className="flex flex-col space-y-1">
                        <Label htmlFor={`tm-dest-vr-${index}`} className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Dest VR (Optional)
                        </Label>
                        <Input
                            id={`tm-dest-vr-${index}`}
                            type="text"
                            placeholder="e.g., SH"
                            maxLength={2}
                            value={copyMoveMod.destination_vr ?? ''}
                            onChange={(e) => updateTagModification(index, 'destination_vr', e.target.value.toUpperCase())}
                            disabled={isLoading}
                            aria-invalid={!!destVrError}
                            aria-describedby={destVrError ? `tm-dest-vr-${index}-error` : undefined}
                            className={cn(baseInputStyles, destVrError ? errorInputStyles : normalInputStyles, "dark:bg-gray-900/80 dark:disabled:bg-gray-800")}
                        />
                        {destVrError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-dest-vr-${index}-error`}>{destVrError}</p>}
                    </div>
                 ];

            case ModifyActionSchema.enum.crosswalk:
                 const crosswalkMod = mod as z.infer<typeof TagCrosswalkModificationSchema>;
                 // Filter maps that are enabled *before* rendering
                 const enabledMaps = crosswalkMapsToDisplay.filter(m => m.is_enabled);
                 const crosswalkMapIdError = getError('crosswalk_map_id');
                 const isSelectDisabled = isLoading || crosswalkMapsLoading;

                 return [
                    // Crosswalk Map Select
                    <div key={`cw-map-${index}`} className="flex flex-col space-y-1 sm:col-span-2"> {/* Span 2 columns */}
                         <Label htmlFor={`tm-crosswalk-map-${index}`} className="text-xs font-medium text-gray-700 dark:text-gray-300">
                             Crosswalk Map*
                         </Label>
                         <Select
                             onValueChange={(value) => updateTagModification(index, 'crosswalk_map_id', value ? parseInt(value, 10) : undefined)}
                             value={crosswalkMod.crosswalk_map_id?.toString()} // Ensure value is string for Select
                             disabled={isSelectDisabled}
                             required
                         >
                             <SelectTrigger
                                 id={`tm-crosswalk-map-${index}`} // Assign ID
                                 className={cn(
                                     baseInputStyles,
                                     crosswalkMapIdError ? errorInputStyles : normalInputStyles,
                                     "dark:bg-gray-900/80 dark:disabled:bg-gray-800"
                                 )}
                                 aria-invalid={!!crosswalkMapIdError}
                                 aria-describedby={crosswalkMapIdError ? `tm-crosswalk-map-${index}-error` : undefined}
                             >
                                 <SelectValue placeholder={
                                     crosswalkMapsLoading ? "Loading maps..." :
                                     crosswalkMapsError ? "Error loading maps" :
                                     enabledMaps.length === 0 ? "No enabled maps found" :
                                     "Select Mapping"
                                 } />
                             </SelectTrigger>
                             {/* Pass containerRef */}
                             <SelectContent container={containerRef?.current}>
                                 {crosswalkMapsError ? (
                                     <div className="px-2 py-1 text-sm text-red-600 italic">Error loading maps</div>
                                 ) : crosswalkMapsLoading ? (
                                     <div className="px-2 py-1 text-sm text-gray-500 italic">Loading...</div>
                                 ) : enabledMaps.length === 0 ? (
                                     <div className="px-2 py-1 text-sm text-gray-500 italic">No enabled maps found. Configure under Crosswalk.</div>
                                 ) : (
                                     enabledMaps.map(map => (
                                         <SelectItem key={map.id} value={map.id.toString()}>
                                             [{map.id}] - {map.name}
                                         </SelectItem>
                                     ))
                                 )}
                             </SelectContent>
                         </Select>
                         {crosswalkMapIdError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-crosswalk-map-${index}-error`}>{crosswalkMapIdError}</p>}
                     </div>,
                     // Spacer
                     <div key={`cw-empty-${index}`} className="hidden sm:flex sm:flex-col"></div>
                 ];

            case ModifyActionSchema.enum.delete:
            default:
                // No additional inputs needed for 'delete'
                return [
                    <div key={`del-empty-${index}`} className="sm:col-span-2 flex flex-col space-y-1">
                         <SpacerLabel /> {/* Maintain height */}
                         <div className="h-9 flex items-center"> {/* Match input height */}
                            <span className="text-sm text-gray-500 dark:text-gray-400 italic">
                                (No other fields needed)
                            </span>
                         </div>
                    </div>,
                     null // No second column needed
                ];
        }
    }, [ validationErrors, isLoading, updateTagModification, crosswalkMapsToDisplay, crosswalkMapsLoading, crosswalkMapsError, containerRef ]); // Dependencies for the callback


    // --- Main Render ---
    return (
        <fieldset className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <legend className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">Tag Modifications</legend>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Define actions to modify DICOM tags based on the match criteria above. Actions run in the order listed.
            </p>
            <div className="space-y-3 pr-2">
                 {/* Map over the safe array */}
                {modsToRender.map((mod, index) => {
                     // Get errors for the common fields (action, tag, source_tag)
                     const actionKey = `tag_modifications[${index}].action`;
                     const targetTagKey = `tag_modifications[${index}].tag`;
                     const sourceTagKey = `tag_modifications[${index}].source_tag`;
                     const actionError = validationErrors?.[actionKey];
                     const targetTagError = validationErrors?.[targetTagKey];
                     const sourceTagError = validationErrors?.[sourceTagKey];

                     // Get the specific inputs for the current action
                     const [inputCol1, inputCol2] = renderModificationInputs(mod, index);

                     // Determine if we need a target tag or source tag based on action
                     const needsTargetTag = ![ModifyActionSchema.enum.copy, ModifyActionSchema.enum.move, ModifyActionSchema.enum.crosswalk].includes(mod.action);
                     const needsSourceTag = [ModifyActionSchema.enum.copy, ModifyActionSchema.enum.move].includes(mod.action);

                     return (
                        <div key={index} className="relative flex items-start space-x-2 p-3 border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700/50">
                             {/* Grid for inputs */}
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3"> {/* 4 columns */}
                                {/* Action Select */}
                                <div className="flex flex-col space-y-1">
                                    <Label htmlFor={`tm-action-${index}`} className="text-xs font-medium text-gray-700 dark:text-gray-300">Action*</Label>
                                    <Select
                                        onValueChange={(value) => updateTagModification(index, 'action', value as ModifyAction)}
                                        value={mod.action}
                                        disabled={isLoading}
                                        required
                                    >
                                        <SelectTrigger
                                            id={`tm-action-${index}`} // Assign ID
                                            className={cn(baseInputStyles, actionError ? errorInputStyles : normalInputStyles, "dark:bg-gray-900/80 dark:disabled:bg-gray-800")}
                                            aria-invalid={!!actionError}
                                            aria-describedby={actionError ? `${actionKey}-error` : undefined}
                                        >
                                            <SelectValue placeholder="Select Action" />
                                        </SelectTrigger>
                                        {/* Pass containerRef */}
                                        <SelectContent container={containerRef?.current}>
                                            {MODIFICATION_ACTIONS.map(act => <SelectItem key={act} value={act}>{act}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    {actionError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`${actionKey}-error`}>{actionError}</p>}
                                </div>

                                {/* Tag / Source Tag Column */}
                                <div className="flex flex-col space-y-1">
                                    { needsTargetTag ? (
                                         <>
                                             <Label htmlFor={`tm-tag-${index}`} className="text-xs font-medium text-gray-700 dark:text-gray-300">Target Tag*</Label>
                                             <DicomTagCombobox
                                                inputId={`tm-tag-${index}`}
                                                value={(mod as any).tag ?? ''}
                                                onChange={(tagInfo: DicomTagInfo | null) => updateTagModification(index, 'tagInfo', tagInfo)}
                                                disabled={isLoading}
                                                required
                                                aria-invalid={!!targetTagError}
                                                aria-describedby={targetTagError ? `${targetTagKey}-error` : undefined}
                                                inputClassName={cn(baseInputStyles, targetTagError ? errorInputStyles : normalInputStyles, "dark:bg-gray-900/80 dark:disabled:bg-gray-800")}
                                            />
                                             {targetTagError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`${targetTagKey}-error`}>{targetTagError}</p>}
                                         </>
                                     ) : needsSourceTag ? (
                                         <>
                                             <Label htmlFor={`tm-source-tag-${index}`} className="text-xs font-medium text-gray-700 dark:text-gray-300">Source Tag*</Label>
                                             <DicomTagCombobox
                                                inputId={`tm-source-tag-${index}`}
                                                value={(mod as any).source_tag ?? ''}
                                                onChange={(tagInfo: DicomTagInfo | null) => updateTagModification(index, 'sourceTagInfo', tagInfo)}
                                                disabled={isLoading}
                                                required
                                                aria-invalid={!!sourceTagError}
                                                aria-describedby={sourceTagError ? `${sourceTagKey}-error` : undefined}
                                                inputClassName={cn(baseInputStyles, sourceTagError ? errorInputStyles : normalInputStyles, "dark:bg-gray-900/80 dark:disabled:bg-gray-800")}
                                            />
                                             {sourceTagError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`${sourceTagKey}-error`}>{sourceTagError}</p>}
                                         </>
                                     ) : (
                                         // Placeholder for actions like 'crosswalk' that don't use tag/source_tag directly here
                                         <>
                                            <SpacerLabel />
                                            <div className="h-9 flex items-center"> {/* Match Input height */}
                                                <span className="text-sm text-gray-500 dark:text-gray-400 italic">
                                                    (No target/source tag)
                                                </span>
                                            </div>
                                         </>
                                     )}
                                </div>

                                {/* Render action-specific inputs */}
                                {inputCol1}
                                {inputCol2}
                            </div>
                            {/* Remove Button */}
                            <button
                                type="button"
                                onClick={() => removeTagModification(index)}
                                disabled={isLoading}
                                className="text-red-500 hover:text-red-700 p-1 mt-1 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed self-start"
                                title="Remove Modification"
                            >
                                <TrashIcon className="h-5 w-5"/>
                                <span className="sr-only">Remove Modification {index + 1}</span>
                            </button>
                        </div>
                     );
                })}
            </div>
            {/* Add Modification Button */}
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTagModification}
                disabled={isLoading}
                className="mt-3" // Increased margin-top
            >
                <PlusIcon className="h-4 w-4 mr-1"/> Add Modification
            </Button>
             {/* General validation error for the whole array */}
             {validationErrors?.['tag_modifications'] && typeof validationErrors['tag_modifications'] === 'string' && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400" id="tag_modifications-error">
                    {validationErrors['tag_modifications']}
                </p>
            )}
        </fieldset>
    );
};

export default RuleFormTagModifications;
