// src/components/RuleFormModal.tsx
import React, { useState, useEffect, Fragment, FormEvent, useCallback, useRef } from 'react';
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
import RuleFormSources from './rule-form/RuleFormSources';
import RuleFormMatchCriteria from './rule-form/RuleFormMatchCriteria';
import RuleFormAssociationCriteria from './rule-form/RuleFormAssociationCriteria';
import RuleFormTagModifications from './rule-form/RuleFormTagModifications';
import RuleFormDestinations from './rule-form/RuleFormDestinations';
import RuleFormSchedule from './rule-form/RuleFormSchedule';

import { isValueRequired, isValueList, isIpOperator } from '@/utils/ruleHelpers';

export interface SourceInfo {
    name: string;
    type: 'listener' | 'scraper' | 'api';
}

const baseInputStyles = "block w-full rounded-md shadow-sm sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 border focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed py-2 pl-3 px-3";
const errorInputStyles = "border-red-500 focus:border-red-500 focus:ring-red-500";
const normalInputStyles = "border-gray-300 dark:border-gray-600";

function deepClone<T>(obj: T): T {
    try {
        if (typeof structuredClone === 'function') {
            return structuredClone(obj);
        } else {
            return JSON.parse(JSON.stringify(obj));
        }
    } catch (e) {
        console.error("Deep clone failed:", e);
        return typeof obj === 'object' ? { ...obj } : obj;
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
            console.error(`Unhandled modification action: ${exhaustiveCheck}`);
            return { ...base, tag: '', value: '', vr: null, action: ModifyActionSchema.enum.set };
    }
};


const RuleFormModal: React.FC<RuleFormModalProps> = ({
    isOpen, onClose, onSuccess, rulesetId, existingRule,
}) => {
    const queryClient = useQueryClient();
    const panelRef = useRef<HTMLDivElement>(null);
    const processedRuleIdRef = useRef<number | null | string>(null);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState(100);
    const [isActive, setIsActive] = useState(true);
    const [matchCriteria, setMatchCriteria] = useState<MatchCriterionFormData[]>([]);
    const [associationCriteria, setAssociationCriteria] = useState<AssociationMatchCriterionFormData[]>([]);
    const [tagModifications, setTagModifications] = useState<TagModificationFormData[]>([]);
    const [selectedSources, setSelectedSources] = useState<SourceInfo[]>([]);
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
                    getKnownInputSources().catch(e => { console.error("Failed fetching fixed sources:", e); return []; }),
                    getDicomWebSources(0, 500).catch(e => { console.error("Failed fetching DICOMweb sources:", e); return []; }),
                    getDimseListenerConfigs(0, 500).catch(e => { console.error("Failed fetching DIMSE listeners:", e); return []; }),
                    getDimseQrSources(0, 500).catch(e => { console.error("Failed fetching DIMSE Q/R sources:", e); return []; })
                ]);
                const sourcesMap = new Map<string, SourceInfo>();
                fixedSources.forEach(name => sourcesMap.set(name, { name, type: 'api' }));
                dimseListenerConfigs.forEach(l => { if (l.name) sourcesMap.set(String(l.name), { name: String(l.name), type: 'listener' }); });
                dicomWebConfigs.forEach(s => { if (s.name) sourcesMap.set(String(s.name), { name: String(s.name), type: 'scraper' }); });
                dimseQrConfigs.forEach(s => { if (s.name) sourcesMap.set(String(s.name), { name: String(s.name), type: 'scraper' }); });
                const allSources = Array.from(sourcesMap.values());
                allSources.sort((a, b) => a.name.localeCompare(b.name));
                console.log("RuleFormModal: Fetched combined sources:", allSources);
                return allSources;
            } catch (fetchError) {
                console.error("Failed to fetch combined source lists:", fetchError);
                throw new Error(`Failed to load sources: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
            }
        },
        enabled: isOpen, staleTime: 60000, gcTime: 300000, refetchOnWindowFocus: false
    });
    const { data: availableCrosswalkMaps = [], isLoading: crosswalkMapsLoading, error: crosswalkMapsError } = useQuery<CrosswalkMapRead[], Error>({ queryKey: ['crosswalkMapsListForRuleForm'], queryFn: () => getCrosswalkMaps(undefined, 0, 500), enabled: isOpen, staleTime: 300000, gcTime: 600000, refetchOnWindowFocus: false });
    const { data: availableSchedules = [], isLoading: schedulesLoading, error: schedulesError, refetch: refetchSchedules } = useQuery<ScheduleRead[], Error>({
        queryKey: ['schedulesListForRuleForm'],
        queryFn: () => getSchedules(0, 500),
        enabled: isOpen, staleTime: 300000, gcTime: 600000, refetchOnWindowFocus: false,
        select: (data) => data.filter(schedule => schedule.is_enabled)
    });

    const isDataLoading = sourcesLoading || destinationsLoading || crosswalkMapsLoading || schedulesLoading;
    const overallIsLoading = isSubmitting || isDataLoading;

    const _createDefaultModification = useCallback(createDefaultModification, []);

    useEffect(() => {
        if (isOpen) {
            const currentRuleIdentifier = existingRule ? existingRule.id : 'create';
            if (processedRuleIdRef.current !== currentRuleIdentifier) {
                console.log(`RuleFormModal useEffect: Running full reset for rule ${currentRuleIdentifier}`);
                processedRuleIdRef.current = currentRuleIdentifier;

                refetchDestinations();
                refetchSchedules();
                setValidationErrors({});

                if (existingRule) {
                    setName(existingRule.name);
                    setDescription(existingRule.description ?? '');
                    setPriority(existingRule.priority ?? 100);
                    setIsActive(existingRule.is_active ?? true);
                    setSelectedScheduleId(existingRule.schedule_id ?? null);

                    if (combinedSources.length > 0) {
                        const initialSelectedNames = existingRule.applicable_sources || [];
                        const initialSelectedSourceObjects = combinedSources.filter(source =>
                           initialSelectedNames.includes(source.name)
                        );
                        setSelectedSources(initialSelectedSourceObjects);
                    } else {
                        setSelectedSources([]);
                    }

                    const parsedCriteria = existingRule.match_criteria ?? [];
                    const parsedAssocCriteria = existingRule.association_criteria ?? [];
                    const parsedMods = existingRule.tag_modifications ?? [];

                    setMatchCriteria(deepClone(parsedCriteria).map((c: any) => ({
                        tag: c.tag ?? '',
                        op: MatchOperationSchema.safeParse(c.op).success ? c.op : MatchOperationSchema.enum.eq,
                        value: Array.isArray(c.value) ? c.value.join(', ') : String(c.value ?? ''),
                    })));
                    setAssociationCriteria(deepClone(parsedAssocCriteria).map((c: any) => ({
                        parameter: associationParameterSchema.safeParse(c.parameter).success ? c.parameter : 'CALLING_AE_TITLE',
                        op: MatchOperationSchema.safeParse(c.op).success ? c.op : MatchOperationSchema.enum.eq,
                        value: Array.isArray(c.value) ? c.value.join(', ') : String(c.value ?? '')
                    })));
                    setTagModifications(deepClone(parsedMods).map((m: any) => {
                        const action = ModifyActionSchema.safeParse(m.action);
                        const defaultMod = _createDefaultModification(action.success ? action.data : ModifyActionSchema.enum.set);
                         if (m.action === ModifyActionSchema.enum.crosswalk && m.crosswalk_map_id !== undefined && m.crosswalk_map_id !== null) {
                             m.crosswalk_map_id = parseInt(String(m.crosswalk_map_id), 10);
                             if (isNaN(m.crosswalk_map_id)) {
                                 m.crosswalk_map_id = undefined;
                             }
                         }
                        return { ...defaultMod, ...m };
                    }));
                    setSelectedDestinationIds(new Set(existingRule.destinations?.map(d => d.id) || []));
                } else {
                    setName(''); setDescription(''); setPriority(100); setIsActive(true);
                    setMatchCriteria([]); setAssociationCriteria([]); setTagModifications([]);
                    setSelectedSources([]);
                    setSelectedDestinationIds(new Set());
                    setSelectedScheduleId(null);
                    processedRuleIdRef.current = 'create';
                }
                setError(null);
                setIsSubmitting(false);

            } else if (existingRule && combinedSources.length > 0 && selectedSources.length === 0 && (existingRule.applicable_sources?.length ?? 0) > 0) {
                 console.log("RuleFormModal useEffect: Updating selectedSources after combinedSources loaded.");
                 const initialSelectedNames = existingRule.applicable_sources || [];
                 const initialSelectedSourceObjects = combinedSources.filter(source =>
                    initialSelectedNames.includes(source.name)
                 );
                 setSelectedSources(initialSelectedSourceObjects);
            }
        } else {
            processedRuleIdRef.current = null;
        }
    }, [isOpen, existingRule, combinedSources, refetchDestinations, refetchSchedules, _createDefaultModification]);

    const handleDialogClose = useCallback(() => {
        if (!overallIsLoading) {
            onClose();
        }
    }, [overallIsLoading, onClose]);


    const handlePotentialOutsideClick = useCallback((event: React.MouseEvent | React.TouchEvent) => {
        const targetElement = event.target as HTMLElement;

        // Check if click is inside a Radix dropdown/popover content area
        // Adjust selectors based on actual attributes rendered by Radix/Shadcn
        if (targetElement.closest('[data-radix-popper-content-wrapper], [data-radix-select-content], [data-headlessui-state="open"]')) {
            console.log("Click inside portal/dropdown detected, preventing modal close.");
            return; // Don't close if click is inside a known dropdown/popover type
        }

        // Check if click is inside the main dialog panel
        if (panelRef.current && panelRef.current.contains(targetElement)) {
             console.log("Click inside Dialog Panel detected.");
             return; // Don't close if click is inside the panel itself
        }


        console.log("Click outside detected, closing modal.");
        handleDialogClose(); // Close if click is truly outside relevant areas
    }, [handleDialogClose]); // Depend on handleDialogClose

    const handleNameChange = useCallback((value: string) => { setName(value); setValidationErrors(p => ({ ...p, name: undefined })) }, []);
    const handleDescriptionChange = useCallback((value: string) => { setDescription(value) }, []);
    const handlePriorityChange = useCallback((value: number) => { setPriority(value) }, []);
    const handleIsActiveChange = useCallback((value: boolean) => { setIsActive(value) }, []);

    const handleSourceSelectionChange = useCallback((selectedItems: SourceInfo[]) => {
        setSelectedSources(selectedItems);
        setValidationErrors(prev => { const { applicable_sources, ...rest } = prev; return rest; });
    }, []);

    const handleScheduleChange = useCallback((scheduleId: number | null) => {
        setSelectedScheduleId(scheduleId);
        setValidationErrors(prev => { const { schedule_id, ...rest } = prev; return rest; });
    }, []);

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
                    currentCrit.value = '';
                }
            }
            return updated;
        });
        const key = `match_criteria[${index}].${field === 'tagInfo' ? 'tag' : field}`;
        setValidationErrors(prev => { const { [key]: _, ...rest } = prev; delete rest[`match_criteria[${index}]`]; return rest; });
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
        setValidationErrors(prev => { const { [key]: _, ...rest } = prev; delete rest[`association_criteria[${index}]`]; return rest; });
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
                 const relevantFields = Object.keys(updated[index]);
                 Object.keys(oldMod).forEach(key => {
                     if (!relevantFields.includes(key)) {
                         delete (updated[index] as any)[key];
                     }
                 });

            } else {
                 if (field === 'crosswalk_map_id') {
                     const numValue = value !== undefined && value !== null && String(value).trim() !== '' ? Number(value) : undefined;
                     currentMod[field] = isNaN(numValue) ? undefined : numValue;
                 } else if (field in currentMod) {
                     currentMod[field] = value;
                 }
            }
            return updated;
        });

        const fieldName = field.replace('Info', '');
        const baseKey = `tag_modifications[${index}]`;
        const keysToClear = [`${baseKey}.${fieldName}`];

        if (field === 'action') {
            ['value', 'vr', 'pattern', 'replacement', 'source_tag', 'destination_tag', 'destination_vr', 'crosswalk_map_id'].forEach(f => {
                keysToClear.push(`${baseKey}.${f}`);
            });
            const currentAction = value as ModifyAction;
            if (!('tag' in createDefaultModification(currentAction))) keysToClear.push(`${baseKey}.tag`);
            if (!('source_tag' in createDefaultModification(currentAction))) keysToClear.push(`${baseKey}.source_tag`);
        }

        setValidationErrors(prev => {
            let next = { ...prev };
            keysToClear.forEach(key => { delete next[key]; });
            Object.keys(next).filter(k => k.startsWith(baseKey + '.')).forEach(nestedKey => {
                 const suffix = nestedKey.substring(baseKey.length + 1);
                 if(keysToClear.includes(`${baseKey}.${suffix.split('.')[0]}`)) {
                      delete next[nestedKey];
                 }
            });
             delete next[`tag_modifications[${index}]`];
            return next;
        });

    }, [_createDefaultModification]);


    const removeTagModification = useCallback((index: number) => {
        setTagModifications(prev => prev.filter((_, i) => i !== index));
        setValidationErrors(prev => {
            const next: Record<string, string> = {};
            Object.entries(prev).forEach(([key, message]) => {
                const match = key.match(/^tag_modifications\[(\d+)\](\..+)?$/);
                if (match) {
                    const errorIndex = parseInt(match[1], 10);
                    const suffix = match[2] || '';
                    if (errorIndex < index) {
                        next[key] = message;
                    } else if (errorIndex > index) {
                        next[`tag_modifications[${errorIndex - 1}]${suffix}`] = message;
                    }
                } else {
                    next[key] = message;
                }
            });
             delete next[`tag_modifications[${index}]`];
            return next;
        });
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
        setValidationErrors(prev => { const { destination_ids, ...rest } = prev; return rest; });
    }, []);

    const createMutation = useMutation({
        mutationFn: createRule,
        onSuccess: (savedRule) => {
            onSuccess(savedRule);
            queryClient.invalidateQueries({ queryKey: ['rules', rulesetId] });
            toast.success(`Rule "${savedRule.name}" created successfully.`);
            onClose();
        },
        onError: (err: any) => {
            handleApiError(err, 'create');
        }
    });

    const updateMutation = useMutation({
        mutationFn: (payload: { ruleId: number; data: RuleUpdatePayload }) => updateRule(payload.ruleId, payload.data),
        onSuccess: (savedRule) => {
            onSuccess(savedRule);
            queryClient.invalidateQueries({ queryKey: ['rules', rulesetId] });
            queryClient.invalidateQueries({ queryKey: ['rule', savedRule.id] });
            toast.success(`Rule "${savedRule.name}" updated successfully.`);
            onClose();
        },
        onError: (err: any, variables) => {
            handleApiError(err, 'update', variables.ruleId);
        }
    });

    const handleApiError = (err: any, action: 'create' | 'update', ruleId?: number) => {
         console.error(`Failed to ${action} rule${ruleId ? ` (ID: ${ruleId})` : ''}:`, err);
         const errorDetail = err.detail?.detail || err.detail;
         let errorMessage = `Failed to ${action} rule.`;
         let backendValidationErrors: Record<string, string> = {};

         if (err.status === 422 && Array.isArray(errorDetail)) {
             errorDetail.forEach((validationError: any) => {
                 const key = (validationError.loc || [])
                             .slice(1)
                             .map((item: string | number) => typeof item === 'number' ? `[${item}]` : `${item}`)
                             .join('.')
                             .replace(/\.\[/g, '[');
                 backendValidationErrors[key || 'general'] = validationError.msg || 'Invalid input.';
             });
             errorMessage = "Please fix validation errors from the server.";
             toast.error("Validation Error", { description: errorMessage });
         } else if (typeof errorDetail === 'string') {
             errorMessage = errorDetail;
             backendValidationErrors['general'] = errorMessage;
             toast.error("Save Failed", { description: errorMessage });
         } else if (err.message) {
             errorMessage = err.message;
             backendValidationErrors['general'] = errorMessage;
             toast.error("Save Failed", { description: errorMessage });
         } else {
             backendValidationErrors['general'] = errorMessage;
             toast.error("Save Failed", { description: "An unknown error occurred." });
         }

         setError(errorMessage);
         setValidationErrors(backendValidationErrors);
         setIsSubmitting(false);
     };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        setValidationErrors({});

        const selectedSourceNames = selectedSources.map(source => source.name);

        const formDataForZod = {
            name, description, priority, is_active: isActive,
            match_criteria: matchCriteria,
            association_criteria: associationCriteria.length > 0 ? associationCriteria : null,
            tag_modifications: tagModifications,
            applicable_sources: selectedSourceNames.length > 0 ? selectedSourceNames : null,
            destination_ids: Array.from(selectedDestinationIds),
            schedule_id: selectedScheduleId,
        };

        console.log("Data before Zod validation:", JSON.stringify(formDataForZod, null, 2));

        const validationResult = RuleFormDataSchema.safeParse(formDataForZod);

        if (!validationResult.success) {
            const errors: Record<string, string> = {};
            validationResult.error.errors.forEach((err) => {
                const path = err.path.map(p => typeof p === 'number' ? `[${p}]` : p).join('.').replace(/\.\[/g, '[');
                errors[path] = err.message;
            });
            setValidationErrors(errors);
            setError("Please fix the validation errors marked below.");
            console.warn("Frontend Validation Errors:", errors);
            toast.error("Validation Error", { description: "Please check the form fields." });
            return;
        }

        const validatedData = validationResult.data;
        console.log("Data AFTER Zod validation:", JSON.stringify(validatedData, null, 2));

        const commonPayload = {
            name: validatedData.name,
            description: validatedData.description,
            priority: validatedData.priority,
            is_active: validatedData.is_active,
             match_criteria: validatedData.match_criteria.map(crit => ({
                ...crit,
                value: (crit.op === 'in' || crit.op === 'not_in') && typeof crit.value === 'string'
                    ? crit.value.split(',').map(s => s.trim()).filter(Boolean)
                    : crit.value
            })),
            association_criteria: validatedData.association_criteria?.map(crit => ({
                 ...crit,
                  value: (crit.op === 'in' || crit.op === 'not_in') && typeof crit.value === 'string'
                    ? crit.value.split(',').map(s => s.trim()).filter(Boolean)
                    : crit.value
            })) || null,
            tag_modifications: validatedData.tag_modifications,
            applicable_sources: validatedData.applicable_sources,
            destination_ids: validatedData.destination_ids,
            schedule_id: validatedData.schedule_id,
        };

        setIsSubmitting(true);
        console.log('Submitting Final Rule Payload to API:', JSON.stringify(commonPayload, null, 2));

        if (existingRule) {
             const updatePayload: RuleUpdatePayload = commonPayload;
             updateMutation.mutate({ ruleId: existingRule.id, data: updatePayload });
        } else {
            const createPayload: RuleCreatePayload = { ...commonPayload, ruleset_id: rulesetId };
            createMutation.mutate(createPayload);
        }
    };


    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-20" onClose={() => { /* No direct close */ }}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                    {/* Use onClick capture to handle overlay clicks */}
                    <div
                        className="fixed inset-0 bg-black bg-opacity-30 dark:bg-opacity-60"
                        onClick={handlePotentialOutsideClick}
                        aria-hidden="true"
                    />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                            <Dialog.Panel ref={panelRef} className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-0 text-left align-middle shadow-xl transition-all flex flex-col">
                                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                                    <span>{existingRule ? 'Edit Rule' : 'Create New Rule'}</span>
                                    <button onClick={handleDialogClose} disabled={overallIsLoading} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none disabled:opacity-50">
                                        <XMarkIcon className="h-6 w-6" />
                                    </button>
                                </Dialog.Title>

                                <form onSubmit={handleSubmit} className="space-y-6 flex-grow overflow-y-auto p-6">
                                     {error && !Object.keys(validationErrors).length && (
                                         <Alert variant="destructive" className="mb-4">
                                             <AlertCircle className="h-4 w-4" />
                                             <AlertTitle>Error</AlertTitle>
                                             <AlertDescription>{error}</AlertDescription>
                                         </Alert>
                                     )}
                                     {Object.keys(validationErrors).length > 0 && validationErrors['general'] && (
                                          <Alert variant="destructive" className="mb-4">
                                              <AlertCircle className="h-4 w-4" />
                                              <AlertTitle>Validation Error</AlertTitle>
                                              <AlertDescription>{validationErrors['general']}</AlertDescription>
                                          </Alert>
                                     )}

                                     <RuleFormBasicInfo
                                        name={name} description={description} priority={priority} isActive={isActive}
                                        onNameChange={handleNameChange}
                                        onDescriptionChange={handleDescriptionChange}
                                        onPriorityChange={handlePriorityChange}
                                        onIsActiveChange={handleIsActiveChange}
                                        isLoading={overallIsLoading} validationErrors={validationErrors}
                                    />
                                     <RuleFormSources
                                        selectedSources={selectedSources} availableSources={combinedSources}
                                        onSelectionChange={handleSourceSelectionChange}
                                        isLoading={overallIsLoading} sourcesLoading={sourcesLoading}
                                        validationErrors={validationErrors} normalInputStyles={normalInputStyles}
                                    />
                                     <RuleFormSchedule
                                        selectedScheduleId={selectedScheduleId} availableSchedules={availableSchedules ?? []}
                                        onScheduleChange={handleScheduleChange}
                                        isLoading={overallIsLoading} schedulesLoading={schedulesLoading} schedulesError={schedulesError}
                                        validationErrors={validationErrors} containerRef={panelRef}
                                    />
                                     <RuleFormMatchCriteria
                                        matchCriteria={matchCriteria} updateMatchCriterion={updateMatchCriterion}
                                        addMatchCriterion={addMatchCriterion} removeMatchCriterion={removeMatchCriterion}
                                        isLoading={overallIsLoading} validationErrors={validationErrors} containerRef={panelRef}
                                    />
                                     <RuleFormAssociationCriteria
                                        associationCriteria={associationCriteria} updateAssociationCriterion={updateAssociationCriterion}
                                        addAssociationCriterion={addAssociationCriterion} removeAssociationCriterion={removeAssociationCriterion}
                                        isLoading={overallIsLoading} validationErrors={validationErrors} containerRef={panelRef}
                                    />
                                     <RuleFormTagModifications
                                        tagModifications={tagModifications} updateTagModification={updateTagModification}
                                        addTagModification={addTagModification} removeTagModification={removeTagModification}
                                        isLoading={overallIsLoading} validationErrors={validationErrors}
                                        availableCrosswalkMaps={availableCrosswalkMaps} crosswalkMapsLoading={crosswalkMapsLoading} crosswalkMapsError={crosswalkMapsError}
                                        containerRef={panelRef}
                                    />
                                     <RuleFormDestinations
                                        selectedDestinationIds={selectedDestinationIds} availableDestinations={availableDestinations}
                                        onSelectionChange={handleDestinationChange}
                                        isLoading={overallIsLoading} validationErrors={validationErrors}
                                    />

                                     <div className="flex justify-end space-x-3 pt-4">
                                         <Button type="button" variant="outline" onClick={handleDialogClose} disabled={overallIsLoading}> Cancel </Button>
                                         <Button type="submit" disabled={overallIsLoading}>
                                             {overallIsLoading && ( <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"/> )}
                                             {isSubmitting ? 'Saving...' : (isDataLoading ? 'Loading Data...' : (existingRule ? 'Update Rule' : 'Create Rule'))}
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
