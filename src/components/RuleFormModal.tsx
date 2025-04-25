// src/components/RuleFormModal.tsx
import React, { useState, useEffect, Fragment, FormEvent, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import { Dialog, Transition, Switch, Listbox } from '@headlessui/react';

import {
    XMarkIcon,
    PlusIcon,
    TrashIcon,
    CheckIcon,
    ChevronUpDownIcon,
} from '@heroicons/react/24/outline';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import {
    createRule,
    updateRule,
    getKnownInputSources,
    getDicomWebSources,
    getDimseListenerConfigs,
    getStorageBackendConfigs,
} from '../services/api';


import {
    Rule,
    StorageBackendConfigRead,
    RuleCreatePayload,
    RuleUpdatePayload,
    RuleFormData,
    MatchCriterionFormData,
    AssociationMatchCriterionFormData,
    TagModificationFormData,
    MatchOperation,
    MatchOperationSchema,
    ModifyAction,
    ModifyActionSchema,
    associationParameterSchema,
    AssociationParameter,
    RuleFormDataSchema
} from '@/schemas';


import { DicomTagInfo, getTagInfo } from '../dicom/dictionary';
import DicomTagCombobox from './DicomTagCombobox';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

// Import sub-components
import RuleFormTagModifications from './rule-form/RuleFormTagModifications';
import RuleFormMatchCriteria from './rule-form/RuleFormMatchCriteria';
// Import helpers
import { isValueRequired, isValueList, isIpOperator } from '@/utils/ruleHelpers';


const ASSOCIATION_PARAMETERS = associationParameterSchema.options;
const MATCH_OPERATORS = MatchOperationSchema.options;

const baseInputStyles = "block w-full rounded-md shadow-sm sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 border focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed py-2 pl-3 px-3";
const errorInputStyles = "border-red-500 focus:border-red-500 focus:ring-red-500";
const normalInputStyles = "border-gray-300 dark:border-gray-600";


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
        default:

            const exhaustiveCheck: never = action;
            throw new Error(`Unhandled modification action: ${exhaustiveCheck}`);
    }
};



const RuleFormModal: React.FC<RuleFormModalProps> = ({
    isOpen, onClose, onSuccess, rulesetId, existingRule,
}) => {
    const queryClient = useQueryClient();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState(100);
    const [isActive, setIsActive] = useState(true);
    const [matchCriteria, setMatchCriteria] = useState<MatchCriterionFormData[]>([]);
    const [associationCriteria, setAssociationCriteria] = useState<AssociationMatchCriterionFormData[]>([]);
    const [tagModifications, setTagModifications] = useState<TagModificationFormData[]>([]);
    const [selectedSources, setSelectedSources] = useState<string[]>([]);
    const [selectedDestinationIds, setSelectedDestinationIds] = useState<Set<number>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});


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

    const {
        data: combinedSources = [],
        isLoading: sourcesLoading,
        error: sourcesError
    } = useQuery<string[], Error>({
        queryKey: ['applicableSourcesList'],
        queryFn: async () => {
            try {
                const [fixedSources, dicomWebConfigs, dimseListenerConfigs] = await Promise.all([
                    getKnownInputSources(),
                    getDicomWebSources(0, 500),
                    getDimseListenerConfigs(0, 500)
                ]);
                const dicomWebNames = dicomWebConfigs.map(s => String(s.name));
                const dimseListenerNames = dimseListenerConfigs.map(l => String(l.name));
                const allSourceNames = new Set([...fixedSources, ...dicomWebNames, ...dimseListenerNames]);
                return Array.from(allSourceNames).sort();
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

                setMatchCriteria(deepClone(parsedCriteria).map((c: any) => ({ tag: c.tag ?? '', op: c.op ?? MatchOperationSchema.enum.eq, value: c.value ?? '' })));
                setAssociationCriteria(deepClone(parsedAssocCriteria).map((c: any) => ({ parameter: c.parameter ?? 'CALLING_AE_TITLE', op: c.op ?? MatchOperationSchema.enum.eq, value: c.value ?? '' })));
                setTagModifications(deepClone(parsedMods).map((m: any) => {
                    const action = ModifyActionSchema.safeParse(m.action);
                    return { ...createDefaultModification(action.success ? action.data : ModifyActionSchema.enum.set), ...m };
                }));

                setSelectedDestinationIds(new Set(existingRule.destinations?.map(d => d.id) || []));
                setSelectedSources(existingRule.applicable_sources ? [...existingRule.applicable_sources] : []);
            } else {
                setName(''); setDescription(''); setPriority(100); setIsActive(true);
                setMatchCriteria([]); setAssociationCriteria([]); setTagModifications([]);
                setSelectedDestinationIds(new Set()); setSelectedSources([]);
            }
            setError(null); setIsLoading(false);
        }
    }, [isOpen, existingRule, refetchDestinations]);

    const handleDialogClose = () => { if (!isLoading && !sourcesLoading && !destinationsLoading) { onClose(); } };


    const addMatchCriterion = useCallback(() => {
        setMatchCriteria((prev) => [...prev, { tag: '', op: MatchOperationSchema.enum.eq, value: '' }]);
    }, []);

    const updateMatchCriterion = useCallback((index: number, field: keyof MatchCriterionFormData | 'tagInfo', value: any) => {
        setMatchCriteria(prev => {
            const updated = deepClone(prev);
            const currentCrit = updated[index];
            if (field === 'tagInfo') {
                currentCrit.tag = value ? value.tag : '';
            } else {
                (currentCrit as any)[field] = value;
                // Use the imported helper function
                if (field === 'op' && !isValueRequired(value as MatchOperation)) {
                    currentCrit.value = undefined;
                }
            }
            return updated;
        });
        const key = `match_criteria[${index}].${field === 'tagInfo' ? 'tag' : field}`;
        setValidationErrors(prev => { const { [key]: _, ...rest } = prev; return rest; });
    }, []); // Dependency array is empty, helpers are stable imports

    const removeMatchCriterion = useCallback((index: number) => {
        setMatchCriteria(prev => prev.filter((_, i) => i !== index));
    }, []);

    const addAssociationCriterion = useCallback(() => {
        setAssociationCriteria((prev) => [...prev, { parameter: 'CALLING_AE_TITLE', op: MatchOperationSchema.enum.eq, value: '' }]);
    }, []);

    const updateAssociationCriterion = useCallback((index: number, field: keyof AssociationMatchCriterionFormData, value: any) => {
        setAssociationCriteria(prev => {
            const updated = deepClone(prev);
            (updated[index] as any)[field] = value;
            if (field === 'parameter') {

                const isIpParam = value === 'SOURCE_IP';
                const currentOp = updated[index].op;
                // Use imported helper
                const isValidForParam = isIpParam
                    ? isIpOperator(currentOp) || ["eq", "startswith", "in", "not_in"].includes(currentOp)
                    : !isIpOperator(currentOp) && !["exists", "not_exists"].includes(currentOp);

                if (!isValidForParam) {
                    updated[index].op = MatchOperationSchema.enum.eq;
                }
            }
            return updated;
        });
        const key = `association_criteria[${index}].${field}`;
        setValidationErrors(prev => { const { [key]: _, ...rest } = prev; return rest; });
    }, []); // Dependency array is empty, helpers are stable imports

    const removeAssociationCriterion = useCallback((index: number) => {
        setAssociationCriteria(prev => prev.filter((_, i) => i !== index));
    }, []);

    const addTagModification = useCallback(() => {
        setTagModifications((prev) => [...prev, createDefaultModification(ModifyActionSchema.enum.set)]);
    }, []);


    const updateTagModification = useCallback((index: number, field: keyof TagModificationFormData | 'tagInfo' | 'sourceTagInfo' | 'destTagInfo', value: any) => {
        setTagModifications(prev => {
            const updated = deepClone(prev);
            const currentMod = updated[index] as any;

            const updateTagField = (
                fieldName: 'tag' | 'source_tag' | 'destination_tag',
                vrFieldName: 'vr' | 'destination_vr' | null,
                tagInfo: DicomTagInfo | null
            ) => {
                currentMod[fieldName] = tagInfo ? tagInfo.tag : '';
                if (vrFieldName && vrFieldName in currentMod) {
                    currentMod[vrFieldName] = tagInfo ? tagInfo.vr : null;
                }
            };

            if (field === 'tagInfo') {
                updateTagField('tag', 'vr', value);
            } else if (field === 'sourceTagInfo') {
                updateTagField('source_tag', null, value);
            } else if (field === 'destTagInfo') {
                updateTagField('destination_tag', 'destination_vr', value);
            } else if (field === 'action') {
                const newAction = value as ModifyAction;
                const oldMod = updated[index];
                updated[index] = createDefaultModification(newAction);


                if ('tag' in updated[index] && 'tag' in oldMod) (updated[index] as any).tag = oldMod.tag;
                if ('source_tag' in updated[index] && 'source_tag' in oldMod) (updated[index] as any).source_tag = oldMod.source_tag;
                if ('destination_tag' in updated[index] && 'destination_tag' in oldMod) (updated[index] as any).destination_tag = oldMod.destination_tag;


                const tagToUseForVrLookup = (updated[index] as any).tag || (updated[index] as any).destination_tag;
                const needsVrUpdate = [
                    ModifyActionSchema.enum.set,
                    ModifyActionSchema.enum.copy,
                    ModifyActionSchema.enum.move
                ].includes(newAction);

                if (needsVrUpdate && tagToUseForVrLookup) {
                    const tagInfo = getTagInfo(tagToUseForVrLookup);
                    const vrField = newAction === ModifyActionSchema.enum.set ? 'vr' : 'destination_vr';
                    if (tagInfo && vrField in updated[index]) {
                        (updated[index] as any)[vrField] = tagInfo.vr;
                    }
                }
            } else {

                if (field in currentMod) {
                    currentMod[field] = value;
                }
            }
            return updated;
        });


        const fieldName = field.replace('Info', '');
        const keysToClear = [`tag_modifications[${index}].${fieldName}`];
        if (field === 'action') {
            ['value', 'vr', 'pattern', 'replacement', 'source_tag', 'destination_tag', 'destination_vr'].forEach(f => keysToClear.push(`tag_modifications[${index}].${f}`));
        }
        setValidationErrors(prev => {
            let next = { ...prev };
            keysToClear.forEach(key => { delete next[key]; });
            return next;
        });
    }, []);


    const removeTagModification = useCallback((index: number) => {
        setTagModifications(prev => prev.filter((_, i) => i !== index));
    }, []);

    const handleDestinationChange = useCallback((backendId: number, checked: boolean) => {
        setSelectedDestinationIds(prev => {
            const newSet = new Set(prev);
            if (checked) newSet.add(backendId); else newSet.delete(backendId);
            return newSet;
        });
        setValidationErrors(prev => ({ ...prev, destination_ids: undefined }));
    }, []);


    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        setValidationErrors({});


        const formData: RuleFormData = {
            name, description, priority, is_active: isActive,
            match_criteria: matchCriteria,
            association_criteria: associationCriteria.length > 0 ? associationCriteria : null,
            tag_modifications: tagModifications,
            applicable_sources: selectedSources.length > 0 ? selectedSources : null,
            destination_ids: Array.from(selectedDestinationIds),
        };



        const validationResult = RuleFormDataSchema.safeParse(formData);

        if (!validationResult.success) {
            const errors: Record<string, string> = {};
            validationResult.error.errors.forEach((err) => {
                const path = err.path.join('.');
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
            // Use imported helper
            if (isValueList(op) && typeof value === 'string') {
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

        setIsLoading(true);
        console.log('Submitting Rule Payload:', JSON.stringify(commonPayload, null, 2));

        try {
            let savedRule: Rule;
            if (existingRule) {
                const updatePayload: RuleUpdatePayload = commonPayload;
                savedRule = await updateRule(existingRule.id, updatePayload);
                toast.success(`Rule "${savedRule.name}" updated successfully.`);
            } else {
                const createPayload: RuleCreatePayload = { ...commonPayload, ruleset_id: rulesetId };
                savedRule = await createRule(createPayload);
                toast.success(`Rule "${savedRule.name}" created successfully.`);
            }
            queryClient.invalidateQueries({ queryKey: ['rules', rulesetId] });
            onSuccess(savedRule);
        } catch (err: any) {
            console.error('Failed to save rule:', err);
            const errorDetail = err.detail?.detail || err.detail;
             if (err.status === 422 && Array.isArray(errorDetail)) {
                 const backendErrors: Record<string, string> = {};
                 errorDetail.forEach((validationError: any) => { const key = (validationError.loc || []).slice(1).map((item: string | number) => typeof item === 'number' ? `[${item}]` : `${item}`).join('.'); backendErrors[key || 'general'] = validationError.msg || 'Unknown validation error'; });
                 setValidationErrors(backendErrors); setError("Please fix validation errors from the server."); toast.error("Validation Error", { description: "Server rejected the input." });
             } else {
                 const message = typeof errorDetail === 'string' ? errorDetail : (err.message || `Failed to ${existingRule ? 'update' : 'create'} rule.`); setError(message); toast.error("Save Failed", { description: message });
             }
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-20" onClose={handleDialogClose}>

                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-black bg-opacity-30 dark:bg-opacity-50" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                            <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-0 text-left align-middle shadow-xl transition-all">

                                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                    <span>{existingRule ? 'Edit Rule' : 'Create New Rule'}</span>
                                    <button onClick={handleDialogClose} disabled={isLoading || sourcesLoading || destinationsLoading} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none disabled:opacity-50"> <XMarkIcon className="h-6 w-6" /> </button>
                                </Dialog.Title>


                                <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto p-6">

                                    {error && ( <Alert variant="destructive" className="mb-4"> <AlertCircle className="h-4 w-4" /> <AlertTitle>Error</AlertTitle> <AlertDescription>{error}</AlertDescription> </Alert> )}
                                    {validationErrors['general'] && <p className="text-sm text-red-600 dark:text-red-400 mb-4" id="general-error">{validationErrors['general']}</p>}


                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="ruleName">Name <span className="text-red-500">*</span></Label>
                                            <Input id="ruleName" value={name} onChange={(e)=>{setName(e.target.value); setValidationErrors(p=>({...p,name:undefined}))}} required disabled={isLoading} aria-invalid={!!validationErrors['name']} aria-describedby="ruleName-error" className={`mt-1 ${validationErrors['name']?errorInputStyles:normalInputStyles} dark:bg-gray-700 `} />
                                            {validationErrors['name'] && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id="ruleName-error">{validationErrors['name']}</p>}
                                        </div>
                                        <div>
                                            <Label htmlFor="rulePriority">Priority</Label>
                                            <Input id="rulePriority" type="number" value={priority} onChange={(e)=>setPriority(parseInt(e.target.value,10)||0)} disabled={isLoading} className={`mt-1 ${validationErrors['priority']?errorInputStyles:normalInputStyles} dark:bg-gray-700 `} />
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor="ruleDescription">Description</Label>
                                        <Textarea id="ruleDescription" value={description} onChange={(e)=>setDescription(e.target.value)} rows={2} disabled={isLoading} className={`mt-1 ${validationErrors['description']?errorInputStyles:normalInputStyles} dark:bg-gray-700 `} />
                                    </div>
                                    <div className="flex items-center">
                                        <Switch checked={isActive} onChange={isLoading?()=>{}:setIsActive} disabled={isLoading} className={`${isActive?'bg-indigo-600':'bg-gray-200 dark:bg-gray-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed`}>
                                            <span className={`${isActive?'translate-x-6':'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}/>
                                        </Switch>

                                        <Label onClick={() => !isLoading && setIsActive(!isActive)} className={`ml-3 text-sm font-medium ${isLoading?'text-gray-400 dark:text-gray-500':'text-gray-700 dark:text-gray-300 cursor-pointer'}`}>Active</Label>

                                    </div>


                                    <fieldset className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                        <legend className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">Applicable Input Sources</legend>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Select sources this rule applies to. If none selected, applies to ALL sources.</p>
                                        {sourcesLoading ? ( <div className="text-sm text-gray-500 dark:text-gray-400">Loading sources...</div>
                                        ) : sourcesError ? ( <div className="text-sm text-red-600 dark:text-red-400">Error loading sources: {sourcesError.message}</div>
                                        ) : combinedSources.length > 0 ? (
                                            <Listbox value={selectedSources} onChange={setSelectedSources} multiple disabled={isLoading}>
                                                <div className="relative mt-1">
                                                    <Listbox.Button className={`relative w-full cursor-default rounded-lg py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-300 sm:text-sm ${normalInputStyles} bg-white dark:bg-gray-700`}>
                                                        <span className="block truncate text-gray-900 dark:text-white">{selectedSources.length === 0 ? 'Applies to all sources' : selectedSources.join(', ')}</span>
                                                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"><ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" /></span>
                                                    </Listbox.Button>
                                                    <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                                                        <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-30">
                                                            {combinedSources.map((source, sourceIdx) => (
                                                                <Listbox.Option key={sourceIdx} className={({ active }) =>`relative cursor-default select-none py-2 pl-10 pr-4 ${ active ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-700 dark:text-white' : 'text-gray-900 dark:text-white'}`} value={source} >
                                                                    {({ selected }) => (<><span className={`block truncate ${ selected ? 'font-medium' : 'font-normal' }`}>{source}</span>{selected ? (<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-600 dark:text-indigo-400"><CheckIcon className="h-5 w-5" aria-hidden="true" /></span>) : null}</>)}
                                                                </Listbox.Option>
                                                            ))}
                                                        </Listbox.Options>
                                                    </Transition>
                                                </div>
                                            </Listbox>
                                        ) : (<div className="text-sm text-gray-500 dark:text-gray-400">No input sources found or configured. Rule will apply to all sources.</div>)}
                                    </fieldset>


                                    <RuleFormMatchCriteria
                                         matchCriteria={matchCriteria}
                                         updateMatchCriterion={updateMatchCriterion}
                                         addMatchCriterion={addMatchCriterion}
                                         removeMatchCriterion={removeMatchCriterion}
                                         isLoading={isLoading}
                                         validationErrors={validationErrors}
                                         baseInputStyles={baseInputStyles}
                                         errorInputStyles={errorInputStyles}
                                         normalInputStyles={normalInputStyles}
                                    />


                                    <fieldset className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                        <legend className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">Association Criteria (Optional, ALL must match)</legend>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Match against incoming DICOM connection details (Calling AE, Source IP, etc.).</p>
                                        <div className="space-y-3 pr-2">
                                            {associationCriteria.map((criterion, index) => {
                                                const paramError = validationErrors[`association_criteria[${index}].parameter`];
                                                const opError = validationErrors[`association_criteria[${index}].op`];
                                                const valueError = validationErrors[`association_criteria[${index}].value`];
                                                const availableOps = criterion.parameter === 'SOURCE_IP'
                                                    ? MATCH_OPERATORS.filter(op => isIpOperator(op) || ["eq", "startswith", "in", "not_in"].includes(op))
                                                    : MATCH_OPERATORS.filter(op => !isIpOperator(op) && !["exists", "not_exists"].includes(op));
                                                return (
                                                    <div key={index} className="relative flex items-start space-x-2 p-2 border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700/50">
                                                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                            <div>
                                                                <Select
                                                                    onValueChange={(value) => updateAssociationCriterion(index, 'parameter', value as AssociationParameter)}
                                                                    value={criterion.parameter}
                                                                    disabled={isLoading}
                                                                    required
                                                                    aria-invalid={!!paramError}
                                                                >
                                                                    <SelectTrigger className={`${baseInputStyles} ${paramError ? errorInputStyles : normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}>
                                                                        <SelectValue placeholder="Select Parameter" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {ASSOCIATION_PARAMETERS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                                                    </SelectContent>
                                                                </Select>
                                                                {paramError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`ac-param-${index}-error`}>{paramError}</p>}
                                                            </div>
                                                            <div>
                                                                <Select
                                                                    onValueChange={(value) => updateAssociationCriterion(index, 'op', value as MatchOperation)}
                                                                    value={criterion.op}
                                                                    disabled={isLoading}
                                                                    required
                                                                    aria-invalid={!!opError}
                                                                >
                                                                    <SelectTrigger className={`${baseInputStyles} ${opError ? errorInputStyles : normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}>
                                                                        <SelectValue placeholder="Select Operator" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {availableOps.map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}
                                                                    </SelectContent>
                                                                </Select>
                                                                {opError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`ac-op-${index}-error`}>{opError}</p>}
                                                            </div>
                                                            <div>
                                                                <Input
                                                                    type={isValueList(criterion.op) ? 'text' : 'text'}
                                                                    placeholder={isValueList(criterion.op) ? "List, comma-separated" : "Value"}
                                                                    value={criterion.value ?? ''}
                                                                    onChange={(e) => updateAssociationCriterion(index, 'value', e.target.value)}
                                                                    disabled={isLoading}
                                                                    required
                                                                    aria-invalid={!!valueError}
                                                                    aria-describedby={`ac-value-${index}-error`}
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
                                                        >
                                                            <TrashIcon className="h-5 w-5"/>
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <Button type="button" variant="outline" size="sm" onClick={addAssociationCriterion} disabled={isLoading} className="mt-2">
                                            <PlusIcon className="h-4 w-4 mr-1"/> Add Association Criterion
                                        </Button>
                                    </fieldset>


                                    <RuleFormTagModifications
                                         tagModifications={tagModifications}
                                         updateTagModification={updateTagModification}
                                         addTagModification={addTagModification}
                                         removeTagModification={removeTagModification}
                                         isLoading={isLoading}
                                         validationErrors={validationErrors}
                                         baseInputStyles={baseInputStyles}
                                         errorInputStyles={errorInputStyles}
                                         normalInputStyles={normalInputStyles}
                                    />


                                     <fieldset className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                        <legend className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">Destinations<span className="text-red-500">*</span></legend>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Select one or more configured and enabled storage backends.</p>
                                        {destinationsLoading ? ( <div className="text-sm text-gray-500 dark:text-gray-400">Loading destinations...</div>
                                        ) : destinationsError ? ( <div className="text-sm text-red-600 dark:text-red-400">Error loading destinations: {destinationsError.message}</div>
                                        ) : availableDestinations.length === 0 ? ( <div className="text-sm text-gray-500 dark:text-gray-400">No storage backends configured.</div>
                                        ) : (
                                            <div className="space-y-2 max-h-48 overflow-y-auto border rounded p-3 bg-gray-50 dark:bg-gray-700/50">
                                                {availableDestinations.filter(d => d.is_enabled).map((dest) => (
                                                    <div key={dest.id} className="flex items-center">
                                                        <Checkbox id={`dest-${dest.id}`} checked={selectedDestinationIds.has(dest.id)} onCheckedChange={(checked) => handleDestinationChange(dest.id, !!checked)} disabled={isLoading} className="mr-2" />
                                                        <Label htmlFor={`dest-${dest.id}`} className="text-sm font-medium text-gray-800 dark:text-gray-200 cursor-pointer">
                                                            {dest.name} <span className="text-xs text-gray-500 dark:text-gray-400">({dest.backend_type})</span>
                                                        </Label>
                                                    </div>
                                                ))}
                                                {availableDestinations.filter(d => !d.is_enabled).length > 0 && (
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 italic pt-2 border-t border-gray-200 dark:border-gray-600">
                                                        Note: Disabled backends cannot be selected.
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        {validationErrors['destination_ids'] && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validationErrors['destination_ids']}</p>}
                                    </fieldset>


                                    <div className="flex justify-end space-x-3 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800 py-4 px-6 -mx-6 -mb-6 rounded-b-2xl">
                                        <Button type="button" variant="outline" onClick={handleDialogClose} disabled={isLoading || sourcesLoading || destinationsLoading}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={isLoading || sourcesLoading || destinationsLoading}>
                                            {(isLoading || sourcesLoading || destinationsLoading) && (
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            )}
                                            {isLoading ? 'Saving...' : ((sourcesLoading || destinationsLoading) ? 'Loading...' : (existingRule ? 'Update Rule' : 'Create Rule'))}
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
