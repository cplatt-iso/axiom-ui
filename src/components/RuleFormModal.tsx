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
    getDimseQrSources,
    getStorageBackendConfigs,
    getCrosswalkMaps,
    getSchedules,
} from '../services/api';

import {
    Rule,
    StorageBackendConfigRead,
    CrosswalkMapRead,
    ScheduleRead,
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

import RuleFormBasicInfo from './rule-form/RuleFormBasicInfo';
import RuleFormSources, { SourceInfo } from './rule-form/RuleFormSources';
import RuleFormMatchCriteria from './rule-form/RuleFormMatchCriteria';
import RuleFormAssociationCriteria from './rule-form/RuleFormAssociationCriteria';
import RuleFormTagModifications from './rule-form/RuleFormTagModifications';
import RuleFormDestinations from './rule-form/RuleFormDestinations';
import RuleFormSchedule from './rule-form/RuleFormSchedule';

import { isValueRequired, isValueList, isIpOperator } from '@/utils/ruleHelpers';

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

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState(100);
    const [isActive, setIsActive] = useState(true);
    const [matchCriteria, setMatchCriteria] = useState<MatchCriterionFormData[]>([]);
    const [associationCriteria, setAssociationCriteria] = useState<AssociationMatchCriterionFormData[]>([]);
    const [tagModifications, setTagModifications] = useState<TagModificationFormData[]>([]);
    const [selectedSources, setSelectedSources] = useState<string[]>([]);
    const [selectedDestinationIds, setSelectedDestinationIds] = useState<Set<number>>(new Set());
    const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    const { data: availableDestinations = [], isLoading: destinationsLoading, error: destinationsError, refetch: refetchDestinations } = useQuery<StorageBackendConfigRead[], Error>({ queryKey: ['storageBackendConfigsList'], queryFn: () => getStorageBackendConfigs(0, 500), enabled: isOpen, staleTime: 300000, gcTime: 600000, refetchOnWindowFocus: false });
    const { data: combinedSources = [], isLoading: sourcesLoading, error: sourcesError } = useQuery<SourceInfo[], Error>({
        queryKey: ['applicableSourcesListWithType'],
        queryFn: async (): Promise<SourceInfo[]> => {
            try {
                const [fixedSources, dicomWebConfigs, dimseListenerConfigs, dimseQrConfigs] = await Promise.all([
                    getKnownInputSources(),
                    getDicomWebSources(0, 500),
                    getDimseListenerConfigs(0, 500),
                    getDimseQrSources(0, 500)
                ]);
                const sourcesMap = new Map<string, SourceInfo>();
                fixedSources.forEach(name => sourcesMap.set(name, { name, type: 'api' }));
                dimseListenerConfigs.forEach(l => sourcesMap.set(String(l.name), { name: String(l.name), type: 'listener' }));
                dicomWebConfigs.forEach(s => sourcesMap.set(String(s.name), { name: String(s.name), type: 'scraper' }));
                dimseQrConfigs.forEach(s => sourcesMap.set(String(s.name), { name: String(s.name), type: 'scraper' }));
                const allSources = Array.from(sourcesMap.values());
                allSources.sort((a, b) => a.name.localeCompare(b.name));
                return allSources;
            } catch (fetchError) {
                console.error("Failed to fetch source lists:", fetchError);
                throw new Error(`Failed to load sources: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
            }
        },
        enabled: isOpen, staleTime: 0, gcTime: 600000, refetchOnWindowFocus: false
    });
    const { data: availableCrosswalkMaps = [], isLoading: crosswalkMapsLoading, error: crosswalkMapsError } = useQuery<CrosswalkMapRead[], Error>({ queryKey: ['crosswalkMapsListForRuleForm'], queryFn: () => getCrosswalkMaps(undefined, 0, 500), enabled: isOpen, staleTime: 300000, gcTime: 600000, refetchOnWindowFocus: false });
    const { data: availableSchedules = [], isLoading: schedulesLoading, error: schedulesError, refetch: refetchSchedules } = useQuery<ScheduleRead[], Error>({ queryKey: ['schedulesListForRuleForm'], queryFn: () => getSchedules(0, 500), enabled: isOpen, staleTime: 300000, gcTime: 600000, refetchOnWindowFocus: false, select: (data) => data.filter(schedule => schedule.is_enabled) });

    const isDataLoading = sourcesLoading || destinationsLoading || crosswalkMapsLoading || schedulesLoading;
    const overallIsLoading = isSubmitting || isDataLoading;

    const _createDefaultModification = useCallback(createDefaultModification, []);
    useEffect(() => {
        if (isOpen) {
            refetchDestinations();
            refetchSchedules();
            setValidationErrors({});
            if (existingRule) {
                setName(existingRule.name);
                setDescription(existingRule.description ?? '');
                setPriority(existingRule.priority ?? 0);
                setIsActive(existingRule.is_active ?? true);
                setSelectedScheduleId(existingRule.schedule_id ?? null);

                const parsedCriteria = existingRule.match_criteria ?? [];
                const parsedAssocCriteria = existingRule.association_criteria ?? [];
                const parsedMods = existingRule.tag_modifications ?? [];

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
                setSelectedScheduleId(null);
            }
            setError(null); setIsSubmitting(false);
        }
    }, [isOpen, existingRule, refetchDestinations, refetchSchedules, _createDefaultModification]);

    const handleDialogClose = () => {
        if (!overallIsLoading) {
            onClose();
        }
    };

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
                if ('crosswalk_map_id' in updated[index] && 'crosswalk_map_id' in oldMod) (updated[index] as any).crosswalk_map_id = oldMod.crosswalk_map_id;


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
                 if (field === 'crosswalk_map_id') {
                     currentMod[field] = value !== undefined && value !== null && !isNaN(Number(value)) ? Number(value) : undefined;
                 } else if (field in currentMod) {
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
    }, [_createDefaultModification, tagModifications]);

    const removeTagModification = useCallback((index: number) => {
        setTagModifications(prev => prev.filter((_, i) => i !== index));
    }, []);

    const handleDestinationChange = useCallback((backendId: number, checked: boolean) => {
        setSelectedDestinationIds(prev => {
            const newSet = new Set(prev);
            if (checked) {
                newSet.add(backendId);
            } else {
                newSet.delete(backendId);
            }
            return newSet;
        });
        setValidationErrors(prev => ({ ...prev, destination_ids: undefined }));
    }, []);

    const handleScheduleChange = useCallback((scheduleId: number | null) => {
        setSelectedScheduleId(scheduleId);
        setValidationErrors(prev => ({ ...prev, schedule_id: undefined }));
    }, []);

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
            schedule_id: selectedScheduleId,
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
            schedule_id: validatedData.schedule_id,
        };

        setIsSubmitting(true);
        console.log('Submitting Rule Payload:', JSON.stringify(commonPayload, null, 2));

        try {
            let savedRule: Rule;
            if (existingRule) {
                const updatePayload: RuleUpdatePayload = commonPayload;
                 if ('schedule_id' in validatedData) {
                     updatePayload.schedule_id = validatedData.schedule_id;
                 }
                savedRule = await updateRule(existingRule.id, updatePayload);
            } else {
                const createPayload: RuleCreatePayload = { ...commonPayload, ruleset_id: rulesetId };
                savedRule = await createRule(createPayload);
            }

            onSuccess(savedRule);
            queryClient.invalidateQueries({ queryKey: ['rules', rulesetId] });
            toast.success(`Rule "${savedRule.name}" ${existingRule ? 'updated' : 'created'} successfully.`);
            onClose();
        } catch (err: any) {
            console.error('Failed to save rule:', err);
            const errorDetail = err.detail?.detail || err.detail;
             if (err.status === 422 && Array.isArray(errorDetail)) {
                 const backendErrors: Record<string, string> = {};
                 errorDetail.forEach((validationError: any) => {
                     const key = (validationError.loc || []).slice(1).map((item: string | number) => typeof item === 'number' ? `[${item}]` : `${item}`).join('.').replace(/\.\[/g, '[');
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
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-30 dark:bg-opacity-50" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-0 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title
                                    as="h3"
                                    className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700"
                                >
                                    <span>{existingRule ? 'Edit Rule' : 'Create New Rule'}</span>
                                    <button
                                        onClick={handleDialogClose}
                                        disabled={overallIsLoading}
                                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none disabled:opacity-50"
                                    >
                                        <XMarkIcon className="h-6 w-6" />
                                    </button>
                                </Dialog.Title>

                                <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto p-6">
                                    {error && (
                                        <Alert variant="destructive" className="mb-4">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertTitle>Error</AlertTitle>
                                            <AlertDescription>{error}</AlertDescription>
                                        </Alert>
                                    )}
                                    {validationErrors['general'] && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{validationErrors['general']}</p>}

                                    <RuleFormBasicInfo
                                        name={name}
                                        description={description}
                                        priority={priority}
                                        isActive={isActive}
                                        onNameChange={(v) => { setName(v); setValidationErrors(p => ({ ...p, name: undefined })) }}
                                        onDescriptionChange={setDescription}
                                        onPriorityChange={setPriority}
                                        onIsActiveChange={setIsActive}
                                        isLoading={overallIsLoading}
                                        validationErrors={validationErrors}
                                        baseInputStyles={baseInputStyles}
                                        errorInputStyles={errorInputStyles}
                                        normalInputStyles={normalInputStyles}
                                    />
                                    <RuleFormSources
                                        selectedSources={selectedSources}
                                        availableSources={combinedSources}
                                        onSelectionChange={setSelectedSources}
                                        isLoading={overallIsLoading}
                                        validationErrors={validationErrors}
                                        normalInputStyles={normalInputStyles}
                                    />
                                    <RuleFormSchedule
                                        selectedScheduleId={selectedScheduleId}
                                        availableSchedules={availableSchedules ?? []}
                                        onScheduleChange={handleScheduleChange}
                                        isLoading={overallIsLoading}
                                        schedulesLoading={schedulesLoading}
                                        schedulesError={schedulesError}
                                        validationErrors={validationErrors}
                                        baseInputStyles={baseInputStyles}
                                        errorInputStyles={errorInputStyles}
                                        normalInputStyles={normalInputStyles}
                                    />
                                    <RuleFormMatchCriteria
                                        matchCriteria={matchCriteria}
                                        updateMatchCriterion={updateMatchCriterion}
                                        addMatchCriterion={addMatchCriterion}
                                        removeMatchCriterion={removeMatchCriterion}
                                        isLoading={overallIsLoading}
                                        validationErrors={validationErrors}
                                        baseInputStyles={baseInputStyles}
                                        errorInputStyles={errorInputStyles}
                                        normalInputStyles={normalInputStyles}
                                    />
                                    <RuleFormAssociationCriteria
                                        associationCriteria={associationCriteria}
                                        updateAssociationCriterion={updateAssociationCriterion}
                                        addAssociationCriterion={addAssociationCriterion}
                                        removeAssociationCriterion={removeAssociationCriterion}
                                        isLoading={overallIsLoading}
                                        validationErrors={validationErrors}
                                        baseInputStyles={baseInputStyles}
                                        errorInputStyles={errorInputStyles}
                                        normalInputStyles={normalInputStyles}
                                    />
                                    <RuleFormTagModifications
                                        tagModifications={tagModifications}
                                        updateTagModification={updateTagModification}
                                        addTagModification={addTagModification}
                                        removeTagModification={removeTagModification}
                                        isLoading={overallIsLoading}
                                        validationErrors={validationErrors}
                                        baseInputStyles={baseInputStyles}
                                        errorInputStyles={errorInputStyles}
                                        normalInputStyles={normalInputStyles}
                                        availableCrosswalkMaps={availableCrosswalkMaps}
                                        crosswalkMapsLoading={crosswalkMapsLoading}
                                        crosswalkMapsError={crosswalkMapsError}
                                    />
                                    <RuleFormDestinations
                                        selectedDestinationIds={selectedDestinationIds}
                                        availableDestinations={availableDestinations}
                                        onSelectionChange={handleDestinationChange}
                                        isLoading={overallIsLoading}
                                        validationErrors={validationErrors}
                                    />

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
