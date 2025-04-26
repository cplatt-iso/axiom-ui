// src/components/RuleFormModal.tsx
import React, { useState, useEffect, Fragment, FormEvent, useCallback } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react'; // Ensure Loader2 is imported
import { Dialog, Transition, Switch, Listbox } from '@headlessui/react';
import {
    XMarkIcon,
    PlusIcon,
    TrashIcon,
    CheckIcon,
    ChevronUpDownIcon,
} from '@heroicons/react/24/outline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // Import useMutation
import { z } from 'zod'; // Keep Zod import

import {
    createRule,
    updateRule,
    getKnownInputSources,
    getDicomWebSources,
    getDimseListenerConfigs,
    getStorageBackendConfigs,
} from '../services/api';


// --- Import Schemas/Types ---
import {
    Rule, // API Response type
    StorageBackendConfigRead,
    RuleCreatePayload, // API Create type
    RuleUpdatePayload, // API Update type
    MatchOperation, // Enum for operators
    ModifyAction, // Enum for actions
    AssociationParameter // Enum for assoc params
} from '@/schemas'; // Import general API types

// --- Import Form Schema and Form Data Type ---
import {
    RuleFormDataSchema, // The main Zod schema for validation
    RuleFormData, // TypeScript type for the form state AFTER validation
    MatchCriterionFormData, // Type for state array
    AssociationMatchCriterionFormData, // Type for state array
    TagModificationFormData, // Type for state array (Union)
    ModifyActionSchema, // Enum Zod schema to get options
    MatchOperationSchema, // Enum Zod schema
    associationParameterSchema // Enum Zod schema
} from '@/schemas/ruleSchema'; // Import from specific schema file

// --- End Imports ---

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


const baseInputStyles = "block w-full rounded-md shadow-sm sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 border focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed py-2 pl-3 px-3";
const errorInputStyles = "border-red-500 focus:border-red-500 focus:ring-red-500";
const normalInputStyles = "border-gray-300 dark:border-gray-600";
const ASSOCIATION_PARAMETERS = associationParameterSchema.options;
const MATCH_OPERATORS = MatchOperationSchema.options;

// Helper function for deep cloning state arrays
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

    // --- State Hooks ---
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


    // --- Data Fetching with TanStack Query ---
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


    // --- Form Reset Logic ---
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
                    value: Array.isArray(c.value) ? c.value.join(', ') : (c.value ?? ''), // Store list as comma-separated
                })));
                setAssociationCriteria(deepClone(parsedAssocCriteria).map((c: any) => ({
                    parameter: associationParameterSchema.safeParse(c.parameter).success ? c.parameter : 'CALLING_AE_TITLE',
                    op: MatchOperationSchema.safeParse(c.op).success ? c.op : MatchOperationSchema.enum.eq,
                    value: Array.isArray(c.value) ? c.value.join(', ') : (c.value ?? '') // Store list as comma-separated
                })));
                setTagModifications(deepClone(parsedMods).map((m: any) => {
                    const action = ModifyActionSchema.safeParse(m.action);
                    const defaultMod = _createDefaultModification(action.success ? action.data : ModifyActionSchema.enum.set);
                    // Ensure crosswalk_map_id is number or undefined
                    if (m.action === ModifyActionSchema.enum.crosswalk && m.crosswalk_map_id !== undefined && m.crosswalk_map_id !== null) {
                        m.crosswalk_map_id = parseInt(m.crosswalk_map_id, 10);
                        if (isNaN(m.crosswalk_map_id)) {
                            m.crosswalk_map_id = undefined; // Reset if parse fails
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
            setError(null); setIsLoading(false);
        }
    }, [isOpen, existingRule, refetchDestinations, _createDefaultModification]); // Added helper to dependencies

    // --- Modal Close Handler ---
    const handleDialogClose = () => {
        if (!isLoading && !sourcesLoading && !destinationsLoading) {
            onClose();
        }
    };


    // --- CRUD Operation Callbacks ---
    const addMatchCriterion = useCallback(() => {
        setMatchCriteria((prev) => [
            ...prev,
            { tag: '', op: MatchOperationSchema.enum.eq, value: '' }
        ]);
    }, []);

    const updateMatchCriterion = useCallback((index: number, field: keyof MatchCriterionFormData | 'tagInfo', value: any) => {
        setMatchCriteria(prev => {
            const updated = deepClone(prev);
            const currentCrit = updated[index];
            if (!currentCrit) return prev;

            if (field === 'tagInfo') {
                currentCrit.tag = value ? value.tag : '';
            } else {
                (currentCrit as any)[field] = value;
                if (field === 'op' && !isValueRequired(value as MatchOperation)) {
                    currentCrit.value = undefined;
                }
            }
            return updated;
        });
        const key = `match_criteria[${index}].${field === 'tagInfo' ? 'tag' : field}`;
        setValidationErrors(prev => { const { [key]: _, ...rest } = prev; return rest; });
    }, []);

    const removeMatchCriterion = useCallback((index: number) => {
        setMatchCriteria(prev => prev.filter((_, i) => i !== index));
    }, []);

    const addAssociationCriterion = useCallback(() => {
        setAssociationCriteria((prev) => [
            ...prev,
            { parameter: 'CALLING_AE_TITLE', op: MatchOperationSchema.enum.eq, value: '' }
        ]);
    }, []);

    const updateAssociationCriterion = useCallback((index: number, field: keyof AssociationMatchCriterionFormData, value: any) => {
        setAssociationCriteria(prev => {
            const updated = deepClone(prev);
            const currentCrit = updated[index];
            if (!currentCrit) return prev;

            (currentCrit as any)[field] = value;

            if (field === 'parameter') {
                const isIpParam = value === 'SOURCE_IP';
                const currentOp = currentCrit.op;
                const isValidForParam = isIpParam
                    ? isIpOperator(currentOp) || ["eq", "startswith", "in", "not_in"].includes(currentOp)
                    : !isIpOperator(currentOp) && !["exists", "not_exists"].includes(currentOp);

                if (!isValidForParam) {
                    currentCrit.op = MatchOperationSchema.enum.eq;
                    currentCrit.value = '';
                }
            }
            return updated;
        });
        const key = `association_criteria[${index}].${field}`;
        setValidationErrors(prev => { const { [key]: _, ...rest } = prev; return rest; });
    }, []);

    const removeAssociationCriterion = useCallback((index: number) => {
        setAssociationCriteria(prev => prev.filter((_, i) => i !== index));
    }, []);

    const addTagModification = useCallback(() => {
        setTagModifications((prev) => [...prev, _createDefaultModification(ModifyActionSchema.enum.set)]);
    }, [_createDefaultModification]);


    const updateTagModification = useCallback((index: number, field: keyof TagModificationFormData | 'tagInfo' | 'sourceTagInfo' | 'destTagInfo' | 'crosswalk_map_id', value: any) => {
        setTagModifications(prev => {
            const updated = deepClone(prev);
            const currentMod = updated[index] as any;
            if (!currentMod) return prev;

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
                updated[index] = _createDefaultModification(newAction);

                if ('tag' in updated[index] && 'tag' in oldMod) (updated[index] as any).tag = oldMod.tag;
                if ('source_tag' in updated[index] && 'source_tag' in oldMod) (updated[index] as any).source_tag = oldMod.source_tag;
                if ('destination_tag' in updated[index] && 'destination_tag' in oldMod) (updated[index] as any).destination_tag = oldMod.destination_tag;
                // Keep crosswalk_map_id if switching back? No, handled by default creation
                // if ('crosswalk_map_id' in updated[index] && 'crosswalk_map_id' in oldMod) (updated[index] as any).crosswalk_map_id = oldMod.crosswalk_map_id;

                const tagToUseForVrLookup = (updated[index] as any).tag || (updated[index] as any).destination_tag;
                const needsVrUpdate = [ModifyActionSchema.enum.set, ModifyActionSchema.enum.copy, ModifyActionSchema.enum.move].includes(newAction);

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
                } else if (field === 'crosswalk_map_id') { // Explicitly handle crosswalk_map_id
                    currentMod[field] = value;
                }
            }
            return updated;
        });

        const fieldName = field.replace('Info', '');
        const keysToClear = [`tag_modifications[${index}].${fieldName}`];
        if (field === 'action') {
            ['value', 'vr', 'pattern', 'replacement', 'source_tag', 'destination_tag', 'destination_vr', 'crosswalk_map_id'].forEach(f => {
                keysToClear.push(`tag_modifications[${index}].${f}`);
            });
            if ('tag' in tagModifications[index]) keysToClear.push(`tag_modifications[${index}].tag`);
            if ('source_tag' in tagModifications[index]) keysToClear.push(`tag_modifications[${index}].source_tag`);
        }
        setValidationErrors(prev => {
            let next = { ...prev };
            keysToClear.forEach(key => { delete next[key];
                Object.keys(next).filter(k => k.startsWith(key + '.')).forEach(nestedKey => delete next[nestedKey]);
            });
            return next;
        });
    }, [_createDefaultModification, tagModifications]); // Added tagModifications dependency

    const removeTagModification = useCallback((index: number) => {
        setTagModifications(prev => prev.filter((_, i) => i !== index));
    }, []);

    const handleDestinationChange = useCallback((backendId: number, checked: boolean) => {
        setSelectedDestinationIds(prev => {
            const newSet = new Set(prev);
            if (checked) { newSet.add(backendId); } else { newSet.delete(backendId); }
            return newSet;
        });
        setValidationErrors(prev => ({ ...prev, destination_ids: undefined }));
    }, []);

    // --- Form Submission ---
    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        setValidationErrors({});

        // Prepare data for Zod validation (values are mostly strings here)
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

        // Use the data AFTER Zod validation and transformation
        const validatedData = validationResult.data;

        // Helper to parse comma-separated lists for 'in'/'not_in' operators
        const parseListValue = (op: MatchOperation, value: any): any => {
            if (['in', 'not_in'].includes(op) && typeof value === 'string') {
                return value.split(',').map(s => s.trim()).filter(Boolean);
            }
            return value;
        };

        // Prepare the final payload for the API
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
            tag_modifications: validatedData.tag_modifications, // Already transformed
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
            } else {
                const createPayload: RuleCreatePayload = { ...commonPayload, ruleset_id: rulesetId };
                savedRule = await createRule(createPayload);
            }
            onSuccess(savedRule); // Call parent's success handler
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
            setIsLoading(false);
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-20" onClose={handleDialogClose}>
                {/* Backdrop */}
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
                    leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-30 dark:bg-opacity-50" />
                </Transition.Child>

                {/* Modal Panel */}
                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-0 text-left align-middle shadow-xl transition-all">
                                {/* Header */}
                                <Dialog.Title
                                    as="h3"
                                    className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700"
                                >
                                    <span>{existingRule ? 'Edit Rule' : 'Create New Rule'}</span>
                                    <button
                                        onClick={handleDialogClose}
                                        disabled={isLoading || sourcesLoading || destinationsLoading}
                                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none disabled:opacity-50"
                                    >
                                        <XMarkIcon className="h-6 w-6" />
                                    </button>
                                </Dialog.Title>

                                {/* Form Body */}
                                <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto p-6">
                                    {/* General Error Alert */}
                                    {error && (
                                        <Alert variant="destructive" className="mb-4">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertTitle>Error</AlertTitle>
                                            <AlertDescription>{error}</AlertDescription>
                                        </Alert>
                                    )}
                                    {validationErrors['general'] && <p className="text-sm text-red-600 dark:text-red-400 mb-4" id="general-error">{validationErrors['general']}</p>}

                                    {/* --- Basic Info Section --- */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="ruleName">Name <span className="text-red-500">*</span></Label>
                                            <Input
                                                id="ruleName"
                                                value={name}
                                                onChange={(e)=>{setName(e.target.value); setValidationErrors(p=>({...p,name:undefined}))}}
                                                required
                                                disabled={isLoading}
                                                aria-invalid={!!validationErrors['name']}
                                                aria-describedby="ruleName-error"
                                                className={`mt-1 ${validationErrors['name']?errorInputStyles:normalInputStyles} dark:bg-gray-700 `}
                                            />
                                            {validationErrors['name'] && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id="ruleName-error">{validationErrors['name']}</p>}
                                        </div>
                                        <div>
                                            <Label htmlFor="rulePriority">Priority</Label>
                                            <Input
                                                id="rulePriority"
                                                type="number"
                                                value={priority}
                                                onChange={(e)=>setPriority(parseInt(e.target.value,10)||0)}
                                                disabled={isLoading}
                                                className={`mt-1 ${validationErrors['priority']?errorInputStyles:normalInputStyles} dark:bg-gray-700 `}
                                            />
                                             {validationErrors['priority'] && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validationErrors['priority']}</p>}
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor="ruleDescription">Description</Label>
                                        <Textarea
                                            id="ruleDescription"
                                            value={description}
                                            onChange={(e)=>setDescription(e.target.value)}
                                            rows={2}
                                            disabled={isLoading}
                                            className={`mt-1 ${validationErrors['description']?errorInputStyles:normalInputStyles} dark:bg-gray-700 `}
                                        />
                                         {validationErrors['description'] && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validationErrors['description']}</p>}
                                    </div>
                                    <div className="flex items-center">
                                        <Switch
                                            checked={isActive}
                                            onChange={isLoading?()=>{}:setIsActive}
                                            disabled={isLoading}
                                            className={`${isActive?'bg-indigo-600':'bg-gray-200 dark:bg-gray-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed`}
                                        >
                                            <span className={`${isActive?'translate-x-6':'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}/>
                                        </Switch>
                                        <Label
                                            htmlFor={undefined} // Switch doesn't need direct label link via htmlFor
                                            onClick={() => !isLoading && setIsActive(!isActive)}
                                            className={`ml-3 text-sm font-medium ${isLoading?'text-gray-400 dark:text-gray-500':'text-gray-700 dark:text-gray-300 cursor-pointer'}`}
                                        >
                                            Active
                                        </Label>
                                    </div>

                                    {/* --- Applicable Sources Section --- */}
                                    <fieldset className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                        <legend className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">Applicable Input Sources</legend>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Select sources this rule applies to. If none selected, applies to ALL sources.</p>
                                        {sourcesLoading ? (
                                            <div className="text-sm text-gray-500 dark:text-gray-400">Loading sources...</div>
                                        ) : sourcesError ? (
                                            <div className="text-sm text-red-600 dark:text-red-400">Error loading sources: {sourcesError.message}</div>
                                        ) : combinedSources.length > 0 ? (
                                            <Listbox value={selectedSources} onChange={setSelectedSources} multiple disabled={isLoading}>
                                                <div className="relative mt-1">
                                                    <Listbox.Button className={`relative w-full cursor-default rounded-lg py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-300 sm:text-sm ${normalInputStyles} bg-white dark:bg-gray-700`}>
                                                        <span className="block truncate text-gray-900 dark:text-white">
                                                            {selectedSources.length === 0 ? 'Applies to all sources' : selectedSources.join(', ')}
                                                        </span>
                                                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                                            <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                                        </span>
                                                    </Listbox.Button>
                                                    <Transition
                                                        as={Fragment}
                                                        leave="transition ease-in duration-100"
                                                        leaveFrom="opacity-100"
                                                        leaveTo="opacity-0"
                                                    >
                                                        <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-30">
                                                            {combinedSources.map((source, sourceIdx) => (
                                                                <Listbox.Option
                                                                    key={sourceIdx}
                                                                    className={({ active }) =>`relative cursor-default select-none py-2 pl-10 pr-4 ${ active ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-700 dark:text-white' : 'text-gray-900 dark:text-white'}`}
                                                                    value={source}
                                                                >
                                                                    {({ selected }) => (
                                                                        <>
                                                                            <span className={`block truncate ${ selected ? 'font-medium' : 'font-normal' }`}>{source}</span>
                                                                            {selected ? (
                                                                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-600 dark:text-indigo-400">
                                                                                    <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                                                                </span>
                                                                            ) : null}
                                                                        </>
                                                                    )}
                                                                </Listbox.Option>
                                                            ))}
                                                        </Listbox.Options>
                                                    </Transition>
                                                </div>
                                            </Listbox>
                                        ) : (
                                            <div className="text-sm text-gray-500 dark:text-gray-400">No input sources found or configured. Rule will apply to all sources.</div>
                                        )}
                                         {validationErrors['applicable_sources'] && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validationErrors['applicable_sources']}</p>}
                                    </fieldset>

                                    {/* --- Match Criteria Section --- */}
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

                                    {/* --- Association Criteria Section --- */}
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
                                                            {/* Parameter Select */}
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
                                                            {/* Operator Select */}
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
                                                            {/* Value Input */}
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
                                                        {/* Delete Button */}
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
                                         {validationErrors['association_criteria'] && typeof validationErrors['association_criteria'] === 'string' && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validationErrors['association_criteria']}</p>}
                                    </fieldset>

                                    {/* --- Tag Modifications Section --- */}
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

                                    {/* --- Destinations Section --- */}
                                     <fieldset className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                        <legend className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">Destinations<span className="text-red-500">*</span></legend>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Select one or more configured and enabled storage backends.</p>
                                        {destinationsLoading ? (
                                            <div className="text-sm text-gray-500 dark:text-gray-400">Loading destinations...</div>
                                        ) : destinationsError ? (
                                            <div className="text-sm text-red-600 dark:text-red-400">Error loading destinations: {destinationsError.message}</div>
                                        ) : availableDestinations.length === 0 ? (
                                            <div className="text-sm text-gray-500 dark:text-gray-400">No storage backends configured. Please configure one under Configuration → Storage Backends.</div>
                                        ) : (
                                            <div className="space-y-2 max-h-48 overflow-y-auto border rounded p-3 bg-gray-50 dark:bg-gray-700/50 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
                                                {availableDestinations.filter(d => d.is_enabled).map((dest) => (
                                                    <div key={dest.id} className="flex items-center">
                                                        <Checkbox
                                                            id={`dest-${dest.id}`}
                                                            checked={selectedDestinationIds.has(dest.id)}
                                                            onCheckedChange={(checked) => handleDestinationChange(dest.id, !!checked)}
                                                            disabled={isLoading}
                                                            className="mr-2"
                                                        />
                                                        <Label htmlFor={`dest-${dest.id}`} className="text-sm font-medium text-gray-800 dark:text-gray-200 cursor-pointer">
                                                            {dest.name} <span className="text-xs text-gray-500 dark:text-gray-400">({dest.backend_type})</span>
                                                        </Label>
                                                    </div>
                                                ))}
                                                {availableDestinations.filter(d => d.is_enabled).length === 0 && (
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 italic">No enabled storage backends found.</p>
                                                )}
                                                {availableDestinations.filter(d => !d.is_enabled).length > 0 && (
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 italic pt-2 border-t border-gray-200 dark:border-gray-600 mt-2">
                                                        Note: Disabled backends cannot be selected.
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        {validationErrors['destination_ids'] && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validationErrors['destination_ids']}</p>}
                                    </fieldset>

                                    {/* --- Footer Buttons --- */}
                                     <div className="flex justify-end space-x-3 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800 py-4 px-6 -mx-6 -mb-6 rounded-b-2xl">
                                         <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleDialogClose}
                                            disabled={isLoading || sourcesLoading || destinationsLoading}
                                         >
                                             Cancel
                                         </Button>
                                         <Button
                                            type="submit"
                                            disabled={isLoading || sourcesLoading || destinationsLoading}
                                         >
                                             {(isLoading || sourcesLoading || destinationsLoading) && (
                                                 <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"/>
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
