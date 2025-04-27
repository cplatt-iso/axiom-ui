// src/components/RuleFormModal.tsx
import React, { useState, useEffect, Fragment, FormEvent, useCallback } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { toast } from 'sonner';

import {
    createRule,
    updateRule,
    getKnownInputSources,
    getDicomWebSources,
    getDimseListenerConfigs,
    // --- ADDED: Import DIMSE Q/R Sources API ---
    getDimseQrSources,
    // --- END ADDED ---
    getStorageBackendConfigs,
    getCrosswalkMaps,
} from '../services/api';

import {
    Rule,
    StorageBackendConfigRead,
    CrosswalkMapRead,
    RuleCreatePayload,
    RuleUpdatePayload,
    MatchOperation,
    ModifyAction,
    AssociationParameter
} from '@/schemas';

import {
    RuleFormDataSchema,
    RuleFormData,
    MatchCriterionFormData,
    AssociationMatchCriterionFormData,
    TagModificationFormData,
    ModifyActionSchema,
    MatchOperationSchema,
    associationParameterSchema
} from '@/schemas/ruleSchema';

import { DicomTagInfo, getTagInfo } from '../dicom/dictionary';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';

// Import sub-components
import RuleFormBasicInfo from './rule-form/RuleFormBasicInfo';
import RuleFormSources from './rule-form/RuleFormSources';
import RuleFormMatchCriteria from './rule-form/RuleFormMatchCriteria';
import RuleFormAssociationCriteria from './rule-form/RuleFormAssociationCriteria';
import RuleFormTagModifications from './rule-form/RuleFormTagModifications';
import RuleFormDestinations from './rule-form/RuleFormDestinations';

// Import helpers
import { isValueRequired, isValueList, isIpOperator } from '@/utils/ruleHelpers';

// Style constants (remain the same)
const baseInputStyles = "block w-full rounded-md shadow-sm sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 border focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed py-2 pl-3 px-3";
const errorInputStyles = "border-red-500 focus:border-red-500 focus:ring-red-500";
const normalInputStyles = "border-gray-300 dark:border-gray-600";

// Deep clone function (remains the same)
function deepClone<T>(obj: T): T {
    try {
        return JSON.parse(JSON.stringify(obj));
    } catch (e) {
        console.error("Deep clone failed:", e);
        return obj;
    }
}

interface RuleFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (rule: Rule) => void;
    rulesetId: number;
    existingRule: Rule | null;
}

// --- ADDED: Type for the source object ---
export interface SourceInfo {
    name: string;
    type: 'listener' | 'scraper' | 'api' | 'unknown';
}
// --- END ADDED ---


// createDefaultModification function (remains the same)
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
            return { ...base, crosswalk_map_id: undefined, action: ModifyActionSchema.enum.crosswalk };
        default:
            const exhaustiveCheck: never = action;
            throw new Error(`Unhandled modification action: ${exhaustiveCheck}`);
    }
};


const RuleFormModal: React.FC<RuleFormModalProps> = ({
    isOpen, onClose, onSuccess, rulesetId, existingRule,
}) => {
    const queryClient = useQueryClient();

    // --- State Hooks (remain the same) ---
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState(100);
    const [isActive, setIsActive] = useState(true);
    const [matchCriteria, setMatchCriteria] = useState<MatchCriterionFormData[]>([]);
    const [associationCriteria, setAssociationCriteria] = useState<AssociationMatchCriterionFormData[]>([]);
    const [tagModifications, setTagModifications] = useState<TagModificationFormData[]>([]);
    const [selectedSources, setSelectedSources] = useState<string[]>([]); // State still holds only names
    const [selectedDestinationIds, setSelectedDestinationIds] = useState<Set<number>>(new Set());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    // --- Data Fetching ---
    const {
        data: availableDestinations = [],
        isLoading: destinationsLoading,
        error: destinationsError,
        refetch: refetchDestinations
    } = useQuery<StorageBackendConfigRead[], Error>({
        queryKey: ['storageBackendConfigsList'],
        queryFn: () => getStorageBackendConfigs(0, 500),
        enabled: isOpen,
        staleTime: 300000,
        gcTime: 600000,
        refetchOnWindowFocus: false,
    });

    // --- UPDATED Source Fetching ---
    const {
        data: combinedSources = [], // Default to empty array
        isLoading: sourcesLoading,
        error: sourcesError
    } = useQuery<SourceInfo[], Error>({ // <<< Updated query data type
        queryKey: ['applicableSourcesListWithType'], // <<< Updated query key
        queryFn: async (): Promise<SourceInfo[]> => { // <<< Updated return type
            try {
                const [fixedSources, dicomWebConfigs, dimseListenerConfigs, dimseQrConfigs] = await Promise.all([
                    getKnownInputSources(),
                    getDicomWebSources(0, 500),
                    getDimseListenerConfigs(0, 500),
                    getDimseQrSources(0, 500) // Fetch DIMSE Q/R sources
                ]);

                const sourcesMap = new Map<string, SourceInfo>();

                // Add fixed sources (API)
                fixedSources.forEach(name => sourcesMap.set(name, { name, type: 'api' }));

                // Add listeners
                dimseListenerConfigs.forEach(l => sourcesMap.set(String(l.name), { name: String(l.name), type: 'listener' }));

                // Add scrapers (DICOMweb)
                dicomWebConfigs.forEach(s => sourcesMap.set(String(s.name), { name: String(s.name), type: 'scraper' }));

                // Add scrapers (DIMSE Q/R)
                dimseQrConfigs.forEach(s => sourcesMap.set(String(s.name), { name: String(s.name), type: 'scraper' }));

                // Convert map values to array and sort
                const allSources = Array.from(sourcesMap.values());
                allSources.sort((a, b) => a.name.localeCompare(b.name));

                return allSources;
            } catch (fetchError) {
                console.error("Failed to fetch source lists:", fetchError);
                throw new Error(`Failed to load sources: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
            }
        },
        enabled: isOpen,
        staleTime: 0,
        gcTime: 600000,
        refetchOnWindowFocus: false,
    });
    // --- END UPDATED Source Fetching ---

    const {
        data: availableCrosswalkMaps = [],
        isLoading: crosswalkMapsLoading,
        error: crosswalkMapsError,
    } = useQuery<CrosswalkMapRead[], Error>({
        queryKey: ['crosswalkMapsListForRuleForm'],
        queryFn: () => getCrosswalkMaps(undefined, 0, 500),
        enabled: isOpen,
        staleTime: 300000,
        gcTime: 600000,
        refetchOnWindowFocus: false,
    });

    const isDataLoading = sourcesLoading || destinationsLoading || crosswalkMapsLoading;
    const overallIsLoading = isSubmitting || isDataLoading;

    // --- Form Reset Logic (remains the same) ---
    const _createDefaultModification = useCallback(createDefaultModification, []);
    useEffect(() => {
        if (isOpen) {
            refetchDestinations();
            setValidationErrors({});
            if (existingRule) {
                setName(existingRule.name);
                setDescription(existingRule.description ?? '');
                setPriority(existingRule.priority ?? 0);
                setIsActive(existingRule.is_active ?? true);

                const parsedCriteria = Array.isArray(existingRule.match_criteria) ? existingRule.match_criteria : [];
                const parsedAssocCriteria = Array.isArray(existingRule.association_criteria) ? existingRule.association_criteria : [];
                const parsedMods = Array.isArray(existingRule.tag_modifications) ? existingRule.tag_modifications : [];

                setMatchCriteria(deepClone(parsedCriteria).map((c: any) => ({
                    tag: c.tag ?? '',
                    op: MatchOperationSchema.safeParse(c.op).success ? c.op : MatchOperationSchema.enum.eq,
                    value: Array.isArray(c.value) ? c.value.join(', ') : (c.value ?? ''),
                })));
                setAssociationCriteria(deepClone(parsedAssocCriteria).map((c: any) => ({
                    parameter: associationParameterSchema.safeParse(c.parameter).success ? c.parameter : 'CALLING_AE_TITLE',
                    op: MatchOperationSchema.safeParse(c.op).success ? c.op : MatchOperationSchema.enum.eq,
                    value: Array.isArray(c.value) ? c.value.join(', ') : (c.value ?? '')
                })));
                setTagModifications(deepClone(parsedMods).map((m: any) => {
                    const action = ModifyActionSchema.safeParse(m.action);
                    const defaultMod = _createDefaultModification(action.success ? action.data : ModifyActionSchema.enum.set);
                    if (m.action === ModifyActionSchema.enum.crosswalk && m.crosswalk_map_id !== undefined && m.crosswalk_map_id !== null) {
                        m.crosswalk_map_id = parseInt(m.crosswalk_map_id, 10);
                        if (isNaN(m.crosswalk_map_id)) {
                            m.crosswalk_map_id = undefined;
                        }
                    }
                    return { ...defaultMod, ...m };
                }));

                setSelectedDestinationIds(new Set(existingRule.destinations?.map(d => d.id) || []));
                setSelectedSources(existingRule.applicable_sources ? [...existingRule.applicable_sources] : []);
            } else {
                setName(''); setDescription(''); setPriority(100); setIsActive(true);
                setMatchCriteria([]); setAssociationCriteria([]); setTagModifications([]);
                setSelectedDestinationIds(new Set()); setSelectedSources([]);
            }
            setError(null); setIsSubmitting(false);
        }
    }, [isOpen, existingRule, refetchDestinations, _createDefaultModification]);

    // --- Modal Close Handler (remains the same) ---
    const handleDialogClose = () => {
        if (!overallIsLoading) {
            onClose();
        }
    };

    // --- CRUD Callbacks (remain the same) ---
    const addMatchCriterion = useCallback(() => { setMatchCriteria((prev) => [...prev, { tag: '', op: 'eq', value: '' }]); }, []);
    const updateMatchCriterion = useCallback((index: number, field: keyof MatchCriterionFormData | 'tagInfo', value: any) => { /* ... */ }, []);
    const removeMatchCriterion = useCallback((index: number) => { setMatchCriteria(prev => prev.filter((_, i) => i !== index)); }, []);
    const addAssociationCriterion = useCallback(() => { setAssociationCriteria((prev) => [...prev, { parameter: 'CALLING_AE_TITLE', op: 'eq', value: '' }]); }, []);
    const updateAssociationCriterion = useCallback((index: number, field: keyof AssociationMatchCriterionFormData, value: any) => { /* ... */ }, []);
    const removeAssociationCriterion = useCallback((index: number) => { setAssociationCriteria(prev => prev.filter((_, i) => i !== index)); }, []);
    const addTagModification = useCallback(() => { setTagModifications((prev) => [...prev, _createDefaultModification('set')]); }, [_createDefaultModification]);
    const updateTagModification = useCallback((index: number, field: keyof TagModificationFormData | 'tagInfo' | 'sourceTagInfo' | 'destTagInfo' | 'crosswalk_map_id', value: any) => { /* ... */ }, [_createDefaultModification, tagModifications]); // Pass tagModifications here
    const removeTagModification = useCallback((index: number) => { setTagModifications(prev => prev.filter((_, i) => i !== index)); }, []);
    const handleDestinationChange = useCallback((backendId: number, checked: boolean) => { /* ... */ }, []);

    // --- Form Submission (remains the same) ---
    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        setValidationErrors({});

        const formDataForZod = {
            name, description, priority, is_active: isActive,
            match_criteria: matchCriteria,
            association_criteria: associationCriteria.length > 0 ? associationCriteria : null,
            tag_modifications: tagModifications,
            applicable_sources: selectedSources.length > 0 ? selectedSources : null,
            destination_ids: Array.from(selectedDestinationIds),
        };

        const validationResult = RuleFormDataSchema.safeParse(formDataForZod);

        if (!validationResult.success) {
            const errors: Record<string, string> = {};
            validationResult.error.errors.forEach((err) => {
                const path = err.path.map(p => typeof p === 'number' ? `[${p}]` : p).join('.').replace(/\.\[/g, '[');
                errors[path] = err.message;
            });
            setValidationErrors(errors);
            setError("Please fix the validation errors marked below.");
            console.warn("Form Validation Errors:", errors);
            toast.error("Validation Error", { description: "Please check the form fields." });
            return;
        }

        const validatedData = validationResult.data;

        const parseListValue = (op: MatchOperation, value: any): any => {
            if (['in', 'not_in'].includes(op) && typeof value === 'string') {
                return value.split(',').map(s => s.trim()).filter(Boolean);
            }
            return value;
        };

        const commonPayload = {
            name: validatedData.name,
            description: validatedData.description,
            priority: validatedData.priority,
            is_active: validatedData.is_active,
            match_criteria: validatedData.match_criteria.map(crit => ({
                ...crit,
                value: parseListValue(crit.op, crit.value)
            })),
            association_criteria: validatedData.association_criteria?.map(crit => ({
                 ...crit,
                 value: parseListValue(crit.op, crit.value)
            })) || null,
            tag_modifications: validatedData.tag_modifications,
            applicable_sources: validatedData.applicable_sources,
            destination_ids: validatedData.destination_ids,
        };

        setIsSubmitting(true);
        console.log('Submitting Rule Payload:', JSON.stringify(commonPayload, null, 2));

        try {
            let savedRule: Rule;
            if (existingRule) {
                const updatePayload: RuleUpdatePayload = commonPayload;
                savedRule = await updateRule(existingRule.id, updatePayload);
            } else {
                const createPayload: RuleCreatePayload = { ...commonPayload, ruleset_id: rulesetId };
                savedRule = await createRule(createPayload);
            }
            onSuccess(savedRule);
        } catch (err: any) {
            console.error('Failed to save rule:', err);
            const errorDetail = err.detail?.detail || err.detail;
             if (err.status === 422 && Array.isArray(errorDetail)) {
                 const backendErrors: Record<string, string> = {};
                 errorDetail.forEach((validationError: any) => {
                     const key = (validationError.loc || [])
                         .slice(1)
                         .map((item: string | number) => typeof item === 'number' ? `[${item}]` : `${item}`)
                         .join('.')
                         .replace(/\.\[/g, '[');
                     backendErrors[key || 'general'] = validationError.msg || 'Unknown validation error';
                 });
                 setValidationErrors(backendErrors);
                 setError("Please fix validation errors from the server.");
                 toast.error("Validation Error", { description: "Server rejected the input." });
             } else {
                 const message = typeof errorDetail === 'string' ? errorDetail : (err.message || `Failed to ${existingRule ? 'update' : 'create'} rule.`);
                 setError(message);
                 toast.error("Save Failed", { description: message });
             }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-20" onClose={handleDialogClose}>
                {/* Backdrop */}
                <Transition.Child as={Fragment} /* ... */ >
                    <div className="fixed inset-0 bg-black bg-opacity-30 dark:bg-opacity-50" />
                </Transition.Child>

                {/* Modal Panel */}
                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child as={Fragment} /* ... */ >
                            <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-0 text-left align-middle shadow-xl transition-all">
                                {/* Header */}
                                <Dialog.Title as="h3" /* ... */ >
                                    <span>{existingRule ? 'Edit Rule' : 'Create New Rule'}</span>
                                    <button onClick={handleDialogClose} disabled={overallIsLoading} /* ... */ >
                                        <XMarkIcon className="h-6 w-6" />
                                    </button>
                                </Dialog.Title>

                                {/* Form Body */}
                                <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto p-6">
                                    {/* General Error Alert */}
                                    {error && ( <Alert variant="destructive" /* ... */ > <AlertCircle className="h-4 w-4" /> <AlertTitle>Error</AlertTitle> <AlertDescription>{error}</AlertDescription> </Alert> )}
                                    {validationErrors['general'] && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{validationErrors['general']}</p>}

                                    {/* --- Use Sub-Components --- */}
                                    <RuleFormBasicInfo
                                        name={name} description={description} priority={priority} isActive={isActive}
                                        onNameChange={(v) => {setName(v); setValidationErrors(p=>({...p,name:undefined}))}}
                                        onDescriptionChange={setDescription} onPriorityChange={setPriority} onIsActiveChange={setIsActive}
                                        isLoading={overallIsLoading} validationErrors={validationErrors}
                                        baseInputStyles={baseInputStyles} errorInputStyles={errorInputStyles} normalInputStyles={normalInputStyles}
                                    />

                                    {/* --- Pass updated sources list (with type info) --- */}
                                    <RuleFormSources
                                        selectedSources={selectedSources}
                                        availableSources={combinedSources} // Pass the array of SourceInfo objects
                                        onSelectionChange={setSelectedSources}
                                        isLoading={overallIsLoading}
                                        validationErrors={validationErrors}
                                        normalInputStyles={normalInputStyles}
                                    />
                                    {/* --- End Pass --- */}

                                    <RuleFormMatchCriteria
                                        matchCriteria={matchCriteria} updateMatchCriterion={updateMatchCriterion} addMatchCriterion={addMatchCriterion} removeMatchCriterion={removeMatchCriterion}
                                        isLoading={overallIsLoading} validationErrors={validationErrors}
                                        baseInputStyles={baseInputStyles} errorInputStyles={errorInputStyles} normalInputStyles={normalInputStyles}
                                    />
                                    <RuleFormAssociationCriteria
                                        associationCriteria={associationCriteria} updateAssociationCriterion={updateAssociationCriterion} addAssociationCriterion={addAssociationCriterion} removeAssociationCriterion={removeAssociationCriterion}
                                        isLoading={overallIsLoading} validationErrors={validationErrors}
                                        baseInputStyles={baseInputStyles} errorInputStyles={errorInputStyles} normalInputStyles={normalInputStyles}
                                    />
                                    <RuleFormTagModifications
                                        tagModifications={tagModifications} updateTagModification={updateTagModification} addTagModification={addTagModification} removeTagModification={removeTagModification}
                                        isLoading={overallIsLoading} validationErrors={validationErrors}
                                        baseInputStyles={baseInputStyles} errorInputStyles={errorInputStyles} normalInputStyles={normalInputStyles}
                                        availableCrosswalkMaps={availableCrosswalkMaps} crosswalkMapsLoading={crosswalkMapsLoading} crosswalkMapsError={crosswalkMapsError}
                                    />
                                    <RuleFormDestinations
                                        selectedDestinationIds={selectedDestinationIds} availableDestinations={availableDestinations} onSelectionChange={handleDestinationChange}
                                        isLoading={overallIsLoading} validationErrors={validationErrors}
                                    />

                                    {/* Footer Buttons */}
                                     <div className="flex justify-end space-x-3 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800 py-4 px-6 -mx-6 -mb-6 rounded-b-2xl">
                                         <Button type="button" variant="outline" onClick={handleDialogClose} disabled={overallIsLoading}> Cancel </Button>
                                         <Button type="submit" disabled={overallIsLoading}>
                                             {overallIsLoading && ( <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"/> )}
                                             {isSubmitting ? 'Saving...' : (isDataLoading ? 'Loading...' : (existingRule ? 'Update Rule' : 'Create Rule'))}
                                         </Button>
                                     </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default RuleFormModal;
