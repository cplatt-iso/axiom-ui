// src/components/rule-form/RuleFormTagModifications.tsx
import React, { useCallback } from 'react';
import { PlusIcon, TrashIcon, Loader2 } from '@heroicons/react/24/outline';
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
    TagCrosswalkModificationSchema
} from '@/schemas/ruleSchema';

import { CrosswalkMapRead } from '@/schemas';

import { DicomTagInfo } from '@/dicom/dictionary';

import DicomTagCombobox from '../DicomTagCombobox';
import { Label } from "@/components/ui/label";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { useFormField } from '@/components/ui/form';

interface RuleFormTagModificationsProps {
    tagModifications: TagModificationFormData[]; // This prop might be undefined/null initially
    updateTagModification: (index: number, field: keyof TagModificationFormData | 'tagInfo' | 'sourceTagInfo' | 'destTagInfo' | 'crosswalk_map_id', value: any) => void;
    addTagModification: () => void;
    removeTagModification: (index: number) => void;
    isLoading: boolean;
    validationErrors: Record<string, string>; // This prop might be undefined/null initially
    baseInputStyles: string;
    errorInputStyles: string;
    normalInputStyles: string;
    availableCrosswalkMaps: CrosswalkMapRead[]; // This prop might be undefined/null initially
    crosswalkMapsLoading: boolean;
    crosswalkMapsError: Error | null;
}

const MODIFICATION_ACTIONS = ModifyActionSchema.options;

const SpacerLabel = () => <Label className="text-xs font-medium text-transparent select-none"> </Label>;

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
    availableCrosswalkMaps,
    crosswalkMapsLoading,
    crosswalkMapsError,
}) => {

    // Ensure arrays are safe before operating on them
    const modsToRender = Array.isArray(tagModifications) ? tagModifications : [];
    const crosswalkMapsToDisplay = Array.isArray(availableCrosswalkMaps) ? availableCrosswalkMaps : [];

    const renderModificationInputs = useCallback((mod: TagModificationFormData, index: number): [React.ReactNode, React.ReactNode] => {
        const valueError = validationErrors?.[`tag_modifications[${index}].value`];
        const vrError = validationErrors?.[`tag_modifications[${index}].vr`];
        const patternError = validationErrors?.[`tag_modifications[${index}].pattern`];
        const replacementError = validationErrors?.[`tag_modifications[${index}].replacement`];
        const destTagError = validationErrors?.[`tag_modifications[${index}].destination_tag`];
        const destVrError = validationErrors?.[`tag_modifications[${index}].destination_vr`];
        const crosswalkMapIdError = validationErrors?.[`tag_modifications[${index}].crosswalk_map_id`];
        const hasError = (keySuffix: string) => !!validationErrors?.[`tag_modifications[${index}].${keySuffix}`];

        switch (mod.action) {
            case ModifyActionSchema.enum.set:
                const setMod = mod as z.infer<typeof TagSetModificationSchema>;
                return [
                    <div key="set-val" className="flex flex-col space-y-1">
                        <Label htmlFor={`tm-value-${index}`} className="text-xs font-medium text-gray-600 dark:text-gray-400">Value*</Label>
                        <Input
                            id={`tm-value-${index}`} type="text" placeholder="Value" value={setMod.value ?? ''}
                            onChange={(e) => updateTagModification(index, 'value', e.target.value)} required disabled={isLoading}
                            aria-invalid={!!valueError} aria-describedby={valueError ? `tm-value-${index}-error` : undefined}
                            className={`${baseInputStyles} ${valueError ? errorInputStyles : normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}
                        />
                        {valueError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-value-${index}-error`}>{valueError}</p>}
                    </div>,
                    <div key="set-vr" className="flex flex-col space-y-1">
                        <Label htmlFor={`tm-vr-${index}`} className="text-xs font-medium text-gray-600 dark:text-gray-400">VR (Optional)</Label>
                        <Input
                            id={`tm-vr-${index}`} type="text" placeholder="VR (e.g., SH)" maxLength={2} value={setMod.vr ?? ''}
                            onChange={(e) => updateTagModification(index, 'vr', e.target.value.toUpperCase())} disabled={isLoading}
                            aria-invalid={!!vrError} aria-describedby={vrError ? `tm-vr-${index}-error` : undefined}
                            className={`${baseInputStyles} ${vrError ? errorInputStyles : normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}
                        />
                        {vrError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-vr-${index}-error`}>{vrError}</p>}
                    </div>
                ];
            case ModifyActionSchema.enum.prepend:
            case ModifyActionSchema.enum.suffix:
                 const stringMod = mod as z.infer<typeof TagPrependModificationSchema | typeof TagSuffixModificationSchema>;
                 return [
                    <div key="string-val" className="flex flex-col space-y-1 sm:col-span-2">
                        <Label htmlFor={`tm-value-${index}`} className="text-xs font-medium text-gray-600 dark:text-gray-400">Value to Add*</Label>
                         <Input
                            id={`tm-value-${index}`} type="text" placeholder="Value to Add" value={stringMod.value ?? ''}
                            onChange={(e) => updateTagModification(index, 'value', e.target.value)} required disabled={isLoading}
                            aria-invalid={!!valueError} aria-describedby={valueError ? `tm-value-${index}-error` : undefined}
                            className={`${baseInputStyles} ${valueError ? errorInputStyles : normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}
                        />
                         {valueError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-value-${index}-error`}>{valueError}</p>}
                     </div>,
                     <div key="string-empty" className="hidden sm:flex sm:flex-col"></div>
                 ];
             case ModifyActionSchema.enum.regex_replace:
                 const regexMod = mod as z.infer<typeof TagRegexReplaceModificationSchema>;
                 return [
                    <div key="regex-pattern" className="flex flex-col space-y-1">
                        <Label htmlFor={`tm-pattern-${index}`} className="text-xs font-medium text-gray-600 dark:text-gray-400">Regex Pattern*</Label>
                         <Input
                            id={`tm-pattern-${index}`} type="text" placeholder="Regex Pattern" value={regexMod.pattern ?? ''}
                            onChange={(e) => updateTagModification(index, 'pattern', e.target.value)} required disabled={isLoading}
                            aria-invalid={!!patternError} aria-describedby={patternError ? `tm-pattern-${index}-error` : undefined}
                            className={`${baseInputStyles} ${patternError ? errorInputStyles : normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}
                        />
                         {patternError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-pattern-${index}-error`}>{patternError}</p>}
                     </div>,
                     <div key="regex-replace" className="flex flex-col space-y-1">
                        <Label htmlFor={`tm-replacement-${index}`} className="text-xs font-medium text-gray-600 dark:text-gray-400">Replacement*</Label>
                         <Input
                            id={`tm-replacement-${index}`} type="text" placeholder="Replacement String" value={regexMod.replacement ?? ''}
                            onChange={(e) => updateTagModification(index, 'replacement', e.target.value)} required disabled={isLoading}
                            aria-invalid={!!replacementError} aria-describedby={replacementError ? `tm-replacement-${index}-error` : undefined}
                            className={`${baseInputStyles} ${replacementError ? errorInputStyles : normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}
                        />
                         {replacementError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-replacement-${index}-error`}>{replacementError}</p>}
                     </div>
                 ];
             case ModifyActionSchema.enum.copy:
             case ModifyActionSchema.enum.move:
                 const copyMoveMod = mod as z.infer<typeof TagCopyModificationSchema | typeof TagMoveModificationSchema>;
                 const destTagValidationError = hasError('destination_tag');
                 const destVrValidationError = hasError('destination_vr');
                 return [
                    <div key="cpymv-desttag" className="flex flex-col space-y-1">
                        <Label htmlFor={`tm-dest-tag-${index}`} className="text-xs font-medium text-gray-600 dark:text-gray-400">Destination Tag*</Label>
                        <DicomTagCombobox
                            inputId={`tm-dest-tag-${index}`} value={copyMoveMod.destination_tag ?? ''}
                            onChange={(tagInfo: DicomTagInfo | null) => updateTagModification(index, 'destTagInfo', tagInfo)}
                            disabled={isLoading} required aria-invalid={!!destTagValidationError}
                            aria-describedby={destTagValidationError ? `tm-dest-tag-${index}-error` : undefined}
                            inputClassName={`${baseInputStyles} ${destTagValidationError ? errorInputStyles : normalInputStyles}`}
                        />
                        {destTagValidationError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-dest-tag-${index}-error`}>{validationErrors[`tag_modifications[${index}].destination_tag`]}</p>}
                    </div>,
                    <div key="cpymv-destvr" className="flex flex-col space-y-1">
                        <Label htmlFor={`tm-dest-vr-${index}`} className="text-xs font-medium text-gray-600 dark:text-gray-400">Dest VR (Optional)</Label>
                        <Input
                            id={`tm-dest-vr-${index}`} type="text" placeholder="e.g., SH" maxLength={2} value={copyMoveMod.destination_vr ?? ''}
                            onChange={(e) => updateTagModification(index, 'destination_vr', e.target.value.toUpperCase())}
                            disabled={isLoading} aria-invalid={!!destVrValidationError}
                            aria-describedby={destVrValidationError ? `tm-dest-vr-${index}-error` : undefined}
                            className={`${baseInputStyles} ${destVrValidationError ? errorInputStyles : normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}
                        />
                        {destVrValidationError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-dest-vr-${index}-error`}>{validationErrors[`tag_modifications[${index}].destination_vr`]}</p>}
                    </div>
                 ];
            case ModifyActionSchema.enum.crosswalk:
                 const crosswalkMod = mod as z.infer<typeof TagCrosswalkModificationSchema>;
                 const enabledMaps = crosswalkMapsToDisplay.filter(m => m.is_enabled);
                 const hasCwError = !!crosswalkMapIdError;
                 const isSelectDisabled = isLoading || crosswalkMapsLoading;
                 return [
                    <div key="cw-map" className="flex flex-col space-y-1 sm:col-span-2">
                         <Label htmlFor={`tm-crosswalk-map-${index}`} className="text-xs font-medium text-gray-600 dark:text-gray-400">Crosswalk Map*</Label>
                         <Select
                             onValueChange={(value) => updateTagModification(index, 'crosswalk_map_id', value ? parseInt(value, 10) : undefined)}
                             value={crosswalkMod.crosswalk_map_id?.toString()}
                             disabled={isSelectDisabled} required aria-invalid={hasCwError}
                         >
                             <SelectTrigger
                                 id={`tm-crosswalk-map-${index}`}
                                 className={`${baseInputStyles} ${hasCwError ? errorInputStyles : normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}
                                 aria-describedby={hasCwError ? `tm-crosswalk-map-${index}-error` : undefined}
                             >
                                 <SelectValue placeholder={
                                     crosswalkMapsLoading ? "Loading maps..." : crosswalkMapsError ? "Error loading maps" :
                                     enabledMaps.length === 0 ? "No enabled maps found" : "Select Mapping"
                                 } />
                             </SelectTrigger>
                             <SelectContent>
                                 {crosswalkMapsError ? (
                                     <div className="px-2 py-1 text-sm text-red-600">Error loading maps</div>
                                 ) : crosswalkMapsLoading ? (
                                     <div className="px-2 py-1 text-sm text-gray-500">Loading...</div>
                                 ) : enabledMaps.length === 0 ? (
                                     <div className="px-2 py-1 text-sm text-gray-500">No enabled maps found.</div>
                                 ) : (
                                     enabledMaps.map(map => (
                                         <SelectItem key={map.id} value={map.id.toString()}> [{map.id}] - {map.name} </SelectItem>
                                     ))
                                 )}
                             </SelectContent>
                         </Select>
                         {crosswalkMapIdError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-crosswalk-map-${index}-error`}>{crosswalkMapIdError}</p>}
                     </div>,
                     <div key="cw-empty" className="hidden sm:flex sm:flex-col"></div>
                 ];
            case ModifyActionSchema.enum.delete:
            default:
                return [
                    <div key="del-empty" className="sm:col-span-2 flex flex-col space-y-1">
                         <SpacerLabel />
                         <div className="text-sm text-gray-500 dark:text-gray-400 italic self-start pt-2"> (No other fields needed) </div>
                    </div>,
                     null
                ];
        }
    }, [ validationErrors, isLoading, baseInputStyles, errorInputStyles, normalInputStyles, updateTagModification, crosswalkMapsToDisplay, crosswalkMapsLoading, crosswalkMapsError ]);

    return (
        <fieldset className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <legend className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">Tag Modifications</legend>
            <div className="space-y-3 pr-2">
                 {/* Map over the safe array */}
                {modsToRender.map((mod, index) => {
                     const actionError = validationErrors?.[`tag_modifications[${index}].action`];
                     const targetTagError = validationErrors?.[`tag_modifications[${index}].tag`];
                     const sourceTagError = validationErrors?.[`tag_modifications[${index}].source_tag`];
                     const [inputCol1, inputCol2] = renderModificationInputs(mod, index);

                     return (
                        <div key={index} className="relative flex items-start space-x-2 p-2 border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700/50">
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                                <div className="flex flex-col space-y-1">
                                    <Label htmlFor={`tm-action-${index}`} className="text-xs font-medium text-gray-600 dark:text-gray-400">Action*</Label>
                                    <Select
                                        onValueChange={(value) => updateTagModification(index, 'action', value as ModifyAction)}
                                        value={mod.action} disabled={isLoading} required aria-invalid={!!actionError}
                                    >
                                        <SelectTrigger id={`tm-action-${index}`} className={`${baseInputStyles} ${actionError ? errorInputStyles : normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}>
                                            <SelectValue placeholder="Select Action" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {MODIFICATION_ACTIONS.map(act => <SelectItem key={act} value={act}>{act}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    {actionError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-action-${index}-error`}>{actionError}</p>}
                                </div>
                                <div className="flex flex-col space-y-1">
                                    { (mod.action === ModifyActionSchema.enum.copy || mod.action === ModifyActionSchema.enum.move) ? (
                                         <>
                                             <Label htmlFor={`tm-source-tag-${index}`} className="text-xs font-medium text-gray-600 dark:text-gray-400">Source Tag*</Label>
                                             <DicomTagCombobox
                                                inputId={`tm-source-tag-${index}`} value={(mod as any).source_tag ?? ''}
                                                onChange={(tagInfo: DicomTagInfo | null) => updateTagModification(index, 'sourceTagInfo', tagInfo)}
                                                disabled={isLoading} required aria-invalid={!!sourceTagError}
                                                aria-describedby={sourceTagError ? `tm-source-tag-${index}-error` : undefined}
                                                inputClassName={`${baseInputStyles} ${sourceTagError ? errorInputStyles : normalInputStyles}`}
                                            />
                                             {sourceTagError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-source-tag-${index}-error`}>{sourceTagError}</p>}
                                         </>
                                     ) : mod.action !== ModifyActionSchema.enum.crosswalk ? (
                                         <>
                                             <Label htmlFor={`tm-tag-${index}`} className="text-xs font-medium text-gray-600 dark:text-gray-400">Target Tag*</Label>
                                             <DicomTagCombobox
                                                inputId={`tm-tag-${index}`} value={(mod as any).tag ?? ''}
                                                onChange={(tagInfo: DicomTagInfo | null) => updateTagModification(index, 'tagInfo', tagInfo)}
                                                disabled={isLoading} required aria-invalid={!!targetTagError}
                                                aria-describedby={targetTagError ? `tm-tag-${index}-error` : undefined}
                                                inputClassName={`${baseInputStyles} ${targetTagError ? errorInputStyles : normalInputStyles}`}
                                            />
                                             {targetTagError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-tag-${index}-error`}>{targetTagError}</p>}
                                         </>
                                     ) : ( <SpacerLabel /> )}
                                </div>
                                {inputCol1}
                                {inputCol2}
                            </div>
                            <button
                                type="button" onClick={() => removeTagModification(index)} disabled={isLoading}
                                className="text-red-500 hover:text-red-700 p-1 mt-1 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed self-start"
                                title="Remove Modification"
                            >
                                <TrashIcon className="h-5 w-5"/>
                                <span className="sr-only">Remove</span>
                            </button>
                        </div>
                     );
                })}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addTagModification} disabled={isLoading} className="mt-2">
                <PlusIcon className="h-4 w-4 mr-1"/> Add Modification
            </Button>
             {validationErrors?.['tag_modifications'] && typeof validationErrors['tag_modifications'] === 'string' && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400" id="tag_modifications-error">
                    {validationErrors['tag_modifications']}
                </p>
            )}
        </fieldset>
    );
};

export default RuleFormTagModifications;
