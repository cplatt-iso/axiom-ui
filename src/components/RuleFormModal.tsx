// frontend/src/components/RuleFormModal.tsx
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
    StorageBackendConfigRead, // Used for availableDestinations
    CrosswalkMapRead,
    Schedule, // Used for availableSchedules
    MatchOperation,
    ModifyAction,
} from '@/schemas'; // Reading types

import {
    RuleCreate, // Correct type for create payload
    RuleUpdate, // Correct type for update payload
    //   RuleFormData, // Can be used for form state type if helpful
    MatchCriterionFormData,
    AssociationMatchCriterionFormData,
    TagModificationFormData,
    ModifyActionSchema,
    MatchOperationSchema,
    associationParameterSchema,
    TagSetModificationSchema, // Import specific schemas if needed for type guards inside component
    TagDeleteModificationSchema,
    TagPrependModificationSchema,
    TagSuffixModificationSchema,
    TagRegexReplaceModificationSchema,
    TagCopyModificationSchema,
    TagMoveModificationSchema,
    TagCrosswalkModificationSchema,
    RuleCreateSchema, // Zod schema for validation on create
    RuleUpdateSchema, // Zod schema for validation on update
} from '@/schemas/ruleSchema'; // Form/Payload types/schemas

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
import RuleFormAiStandardization from './rule-form/RuleFormAiStandardization';

import { isValueRequired, isIpOperator } from '@/utils/ruleHelpers';

export interface SourceInfo {
    name: string;
    type: 'listener' | 'scraper' | 'api';
}

//const baseInputStyles = "block w-full rounded-md shadow-sm sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 border focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed py-2 pl-3 px-3";
//const errorInputStyles = "border-red-500 focus:border-red-500 focus:ring-red-500";
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

type AllTagModificationFieldKeys =
    | keyof z.infer<typeof TagSetModificationSchema>
    | keyof z.infer<typeof TagDeleteModificationSchema>
    | keyof z.infer<typeof TagPrependModificationSchema>
    | keyof z.infer<typeof TagSuffixModificationSchema>
    | keyof z.infer<typeof TagRegexReplaceModificationSchema>
    | keyof z.infer<typeof TagCopyModificationSchema>
    | keyof z.infer<typeof TagMoveModificationSchema>
    | keyof z.infer<typeof TagCrosswalkModificationSchema>;

type SpecialTagModificationFields = 'tagInfo' | 'sourceTagInfo' | 'destTagInfo';

export type UpdatableTagModificationField = AllTagModificationFieldKeys | SpecialTagModificationFields;


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
            return { ...base, crosswalk_map_id: 0, action: ModifyActionSchema.enum.crosswalk };
        default: {
            const exhaustiveCheck: never = action;
            console.error(`Unhandled modification action: ${exhaustiveCheck}`);
            return { ...base, tag: '', value: '', vr: null, action: ModifyActionSchema.enum.set };
        }
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
    // const [aiStandardizationTags, setAiStandardizationTags] = useState<string[]>([]);
    const [selectedAiPromptConfigIds, setSelectedAiPromptConfigIds] = useState<number[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string | undefined>>({}); // Allows undefined values

    const { data: availableDestinations = [], isLoading: destinationsLoading, refetch: refetchDestinations } = useQuery<StorageBackendConfigRead[], Error>({
        queryKey: ['storageBackendConfigsList'],
        queryFn: () => getStorageBackendConfigs(0, 500),
        enabled: isOpen, staleTime: 300000, gcTime: 600000, refetchOnWindowFocus: false
    });
    const { data: combinedSources = [], isLoading: sourcesLoading } = useQuery<SourceInfo[], Error>({
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
                return allSources;
            } catch (fetchError) {
                console.error("Failed to fetch combined source lists:", fetchError);
                throw new Error(`Failed to load sources: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
            }
        },
        enabled: isOpen, staleTime: 60000, gcTime: 300000, refetchOnWindowFocus: false
    });
    const { data: availableCrosswalkMaps = [], isLoading: crosswalkMapsLoading, error: crosswalkMapsError } = useQuery<CrosswalkMapRead[], Error>({
        queryKey: ['crosswalkMapsListForRuleForm'],
        queryFn: () => getCrosswalkMaps(undefined, 0, 500),
        enabled: isOpen, staleTime: 300000, gcTime: 600000, refetchOnWindowFocus: false
    });
    const { data: availableSchedules = [], isLoading: schedulesLoading, error: schedulesError, refetch: refetchSchedules } = useQuery<Schedule[], Error>({ // Use ScheduleRead type
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
            const currentRuleIdentifier = existingRule ? String(existingRule.id) : 'create';
            if (processedRuleIdRef.current !== currentRuleIdentifier) {
                processedRuleIdRef.current = currentRuleIdentifier;

                refetchDestinations();
                refetchSchedules();
                setValidationErrors({});

                if (existingRule) {
                    setName(existingRule.name);
                    setDescription(existingRule.description ?? '');
                    setPriority(existingRule.priority ?? 100);
                    setIsActive(existingRule.is_active ?? true);
                    // setAiStandardizationTags(existingRule.ai_standardization_tags || []);
                    setSelectedAiPromptConfigIds(existingRule.ai_prompt_config_ids || []);
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

                    setMatchCriteria(deepClone(parsedCriteria).map((c: unknown) => {
                        const isValidCriterion = c && typeof c === 'object' && 'tag' in c && 'op' in c;
                        const tag = (isValidCriterion && typeof c.tag === 'string') ? c.tag : '';
                        const op = (isValidCriterion && MatchOperationSchema.safeParse(c.op).success) 
                            ? c.op as MatchOperation 
                            : MatchOperationSchema.enum.eq;
                        const value = (isValidCriterion && 'value' in c) 
                            ? (Array.isArray(c.value) ? c.value.join(', ') : String(c.value ?? '')) 
                            : '';
                        return { tag, op, value };
                    }));
                    setAssociationCriteria(deepClone(parsedAssocCriteria).map((c: unknown) => {
                        const isValidCriterion = c && typeof c === 'object' && 'parameter' in c && 'op' in c;
                        const parameter = (isValidCriterion && associationParameterSchema.safeParse(c.parameter).success) 
                            ? c.parameter as 'CALLING_AE_TITLE' | 'CALLED_AE_TITLE' | 'SOURCE_IP' 
                            : 'CALLING_AE_TITLE';
                        const op = (isValidCriterion && MatchOperationSchema.safeParse(c.op).success) 
                            ? c.op as MatchOperation 
                            : MatchOperationSchema.enum.eq;
                        const value = (isValidCriterion && 'value' in c) 
                            ? (Array.isArray(c.value) ? c.value.join(', ') : String(c.value ?? '')) 
                            : '';
                        return { parameter, op, value };
                    }));
                    setTagModifications(deepClone(parsedMods).map((m: unknown) => {
                        const action = (m && typeof m === 'object' && 'action' in m && ModifyActionSchema.safeParse(m.action).success) 
                            ? m.action 
                            : ModifyActionSchema.enum.set;
                        const defaultMod = _createDefaultModification(action as ModifyAction);
                        
                        // Handle crosswalk map ID parsing
                        if (action === ModifyActionSchema.enum.crosswalk && m && typeof m === 'object' && 'crosswalk_map_id' in m && m.crosswalk_map_id !== undefined && m.crosswalk_map_id !== null) {
                            const parsedId = parseInt(String(m.crosswalk_map_id), 10);
                            const crosswalkMapId = (!isNaN(parsedId) && parsedId > 0) ? parsedId : 0;
                            return { ...defaultMod, ...(m as Record<string, unknown>), crosswalk_map_id: crosswalkMapId };
                        } else if (action === ModifyActionSchema.enum.crosswalk) {
                            return { ...defaultMod, ...(m as Record<string, unknown>), crosswalk_map_id: 0 };
                        }
                        
                        return { ...defaultMod, ...(m as Record<string, unknown>) };
                    }));
                    setSelectedDestinationIds(new Set(existingRule.destinations?.map(d => d.id) || []));
                } else {
                    setName(''); setDescription(''); setPriority(100); setIsActive(true);
                    setMatchCriteria([]); setAssociationCriteria([]); setTagModifications([]);
                    setSelectedSources([]);
                    setSelectedDestinationIds(new Set());
                    setSelectedAiPromptConfigIds([]);
                    setSelectedScheduleId(null);
                    processedRuleIdRef.current = 'create';
                }
                setError(null);
                setIsSubmitting(false);

            } else if (existingRule && combinedSources.length > 0 && selectedSources.length === 0 && (existingRule.applicable_sources?.length ?? 0) > 0) {
                const initialSelectedNames = existingRule.applicable_sources || [];
                const initialSelectedSourceObjects = combinedSources.filter(source =>
                    initialSelectedNames.includes(source.name)
                );
                setSelectedSources(initialSelectedSourceObjects);
            }
        } else {
            processedRuleIdRef.current = null;
        }
    }, [isOpen, existingRule, combinedSources, selectedSources.length, refetchDestinations, refetchSchedules, _createDefaultModification]);

    const handleDialogClose = useCallback(() => {
        if (!overallIsLoading) {
            onClose();
        }
    }, [overallIsLoading, onClose]);


    const handlePotentialOutsideClick = useCallback((event: React.MouseEvent | React.TouchEvent) => {
        const targetElement = event.target as HTMLElement;
        if (targetElement.closest('[data-radix-popper-content-wrapper], [data-radix-select-content], [data-headlessui-state="open"]')) {
            return;
        }
        if (panelRef.current && panelRef.current.contains(targetElement)) {
            return;
        }
        handleDialogClose();
    }, [handleDialogClose]);

    const handleNameChange = useCallback((value: string) => { setName(value); setValidationErrors(p => ({ ...p, name: undefined })) }, []);
    const handleDescriptionChange = useCallback((value: string) => { setDescription(value) }, []);
    const handlePriorityChange = useCallback((value: number) => { setPriority(value) }, []);
    const handleIsActiveChange = useCallback((value: boolean) => { setIsActive(value) }, []);

    const handleAiPromptConfigIdsChange = useCallback((configIds: number[]) => {
        setSelectedAiPromptConfigIds(configIds);
        setValidationErrors(prev => ({ ...prev, ai_prompt_config_ids: undefined })); // Ensure error key matches new schema field
    }, []);

    const handleSourceSelectionChange = useCallback((selectedItems: SourceInfo[]) => {
        setSelectedSources(selectedItems);
        setValidationErrors(prev => { 
            const newErrors = { ...prev };
            delete newErrors.applicable_sources;
            return newErrors;
        });
    }, []);

    const handleScheduleChange = useCallback((scheduleId: number | null) => {
        setSelectedScheduleId(scheduleId);
        setValidationErrors(prev => { 
            const newErrors = { ...prev };
            delete newErrors.schedule_id;
            return newErrors;
        });
    }, []);

    const addMatchCriterion = useCallback(() => {
        setMatchCriteria((prev) => [
            ...prev,
            { tag: '', op: MatchOperationSchema.enum.eq, value: '' }
        ]);
    }, []);

    const updateMatchCriterion = useCallback((index: number, field: keyof MatchCriterionFormData | 'tagInfo', value: unknown) => {
        setMatchCriteria(prev => {
            const updated = deepClone(prev);
            const currentCrit = updated[index];
            if (!currentCrit) {
                return prev;
            }

            if (field === 'tagInfo') {
                currentCrit.tag = (value && typeof value === 'object' && 'tag' in value && typeof value.tag === 'string') ? value.tag : '';
            } else {
                (currentCrit as Record<string, unknown>)[field] = value;
                if (field === 'op' && !isValueRequired(value as MatchOperation)) {
                    currentCrit.value = '';
                }
            }
            return updated;
        });
        const key = `match_criteria[${index}].${field === 'tagInfo' ? 'tag' : field}`;
        setValidationErrors(prev => { 
            const newErrors = { ...prev };
            delete newErrors[key];
            delete newErrors[`match_criteria[${index}]`];
            return newErrors;
        });
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

    const updateAssociationCriterion = useCallback((index: number, field: keyof AssociationMatchCriterionFormData, value: unknown) => {
        setAssociationCriteria(prev => {
            const updated = deepClone(prev);
            const currentCrit = updated[index];
            if (!currentCrit) {
                return prev;
            }

            (currentCrit as Record<string, unknown>)[field] = value;

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
        setValidationErrors(prev => { 
            const newErrors = { ...prev };
            delete newErrors[key];
            delete newErrors[`association_criteria[${index}]`];
            return newErrors;
        });
    }, []);


    const removeAssociationCriterion = useCallback((index: number) => {
        setAssociationCriteria(prev => prev.filter((_, i) => i !== index));
    }, []);

    const addTagModification = useCallback(() => {
        setTagModifications((prev) => [...prev, _createDefaultModification(ModifyActionSchema.enum.set)]);
    }, [_createDefaultModification]);

    const updateTagModification = useCallback((index: number, field: UpdatableTagModificationField, value: unknown) => {
        setTagModifications(prev => {
            const updated = deepClone(prev);
            const currentModFromState = updated[index];
            if (!currentModFromState) {
                return prev;
            }

            const currentMod = currentModFromState as Record<string, unknown>;

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
                updateTagField('tag', 'vr', value as DicomTagInfo | null);
            } else if (field === 'sourceTagInfo') {
                updateTagField('source_tag', null, value as DicomTagInfo | null);
            } else if (field === 'destTagInfo') {
                updateTagField('destination_tag', 'destination_vr', value as DicomTagInfo | null);
            } else if (field === 'action') {
                const newAction = value as ModifyAction;
                const oldModData = { ...currentModFromState };

                updated[index] = _createDefaultModification(newAction);
                const newModObject = updated[index] as Record<string, unknown>;

                if ('tag' in newModObject && 'tag' in oldModData) newModObject.tag = oldModData.tag;
                if ('value' in newModObject && 'value' in oldModData && typeof oldModData.value === 'string') newModObject.value = oldModData.value;

                if ('source_tag' in newModObject && 'source_tag' in oldModData) newModObject.source_tag = oldModData.source_tag;
                if ('destination_tag' in newModObject && 'destination_tag' in oldModData) newModObject.destination_tag = oldModData.destination_tag;

                if ('crosswalk_map_id' in newModObject && 'crosswalk_map_id' in oldModData) newModObject.crosswalk_map_id = oldModData.crosswalk_map_id;

                const tagToUseForVrLookup = (typeof newModObject.tag === 'string' ? newModObject.tag : '') || (typeof newModObject.destination_tag === 'string' ? newModObject.destination_tag : '');

                const ACTIONS_REQUIRING_VR_UPDATE = new Set<ModifyAction>([
                    ModifyActionSchema.enum.set,
                    ModifyActionSchema.enum.copy,
                    ModifyActionSchema.enum.move,
                ]);
                const needsVrUpdate = ACTIONS_REQUIRING_VR_UPDATE.has(newAction);

                if (needsVrUpdate && tagToUseForVrLookup) {
                    const tagInfo = getTagInfo(tagToUseForVrLookup);
                    let vrFieldToUpdate: 'vr' | 'destination_vr' | null = null;
                    if (newAction === ModifyActionSchema.enum.set) {
                        vrFieldToUpdate = 'vr';
                    } else if (newAction === ModifyActionSchema.enum.copy || newAction === ModifyActionSchema.enum.move) {
                        vrFieldToUpdate = 'destination_vr';
                    }

                    if (tagInfo && vrFieldToUpdate && vrFieldToUpdate in newModObject) {
                        newModObject[vrFieldToUpdate] = tagInfo.vr;
                    }
                }
            } else if (field === 'crosswalk_map_id') {
                let finalValue: number = 0; // Default to 0 (not selected / invalid input state)
                if (value !== undefined && value !== null) {
                    const stringValue = String(value).trim();
                    if (stringValue !== '') { // Only parse if not an empty string
                        const num = Number(stringValue);
                        if (!isNaN(num) && isFinite(num)) {
                            finalValue = num; // Assign the parsed number (could be positive, zero, or negative)
                            // Zod's .refine(id > 0) will validate it upon submission.
                        }
                        // If stringValue is not a valid number, finalValue remains 0.
                    }
                    // If stringValue is empty, finalValue remains 0.
                }
                // If value is undefined or null, finalValue remains 0.
                currentMod[field] = finalValue;
            } else if (field in currentMod) {
                currentMod[field] = value;
            } else {
                console.warn(`Attempted to set field '${field}' which does not exist on current modification action '${currentMod.action}'.`);
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
            if (!('tag' in createDefaultModification(currentAction))) {
                keysToClear.push(`${baseKey}.tag`);
            }
            if (!('source_tag' in createDefaultModification(currentAction))) {
                keysToClear.push(`${baseKey}.source_tag`);
            }
        }

        setValidationErrors(prev => {
            const next = { ...prev };
            keysToClear.forEach(key => { delete next[key]; });
            Object.keys(next).filter(k => k.startsWith(baseKey + '.')).forEach(nestedKey => {
                const suffix = nestedKey.substring(baseKey.length + 1);
                if (keysToClear.includes(`${baseKey}.${suffix.split('.')[0]}`)) {
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
            const next: Record<string, string | undefined> = {}; // Correct type for next
            Object.entries(prev).forEach(([key, message]) => { // message is string | undefined
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
        setValidationErrors(prev => { 
            const newErrors = { ...prev };
            delete newErrors.destination_ids;
            return newErrors;
        });
    }, []);

    const createMutation = useMutation({
        mutationFn: createRule,
        onSuccess: (savedRule) => {
            onSuccess(savedRule);
            queryClient.invalidateQueries({ queryKey: ['rules', rulesetId] });
            toast.success(`Rule "${savedRule.name}" created successfully.`);
            onClose();
        },
        onError: (err: unknown) => {
            handleApiError(err, 'create');
        }
    });

    const updateMutation = useMutation({
        mutationFn: (payload: { ruleId: number; data: RuleUpdate }) => updateRule(payload.ruleId, payload.data),
        onSuccess: (savedRule) => {
            onSuccess(savedRule);
            queryClient.invalidateQueries({ queryKey: ['rules', rulesetId] });
            queryClient.invalidateQueries({ queryKey: ['rule', savedRule.id] });
            toast.success(`Rule "${savedRule.name}" updated successfully.`);
            onClose();
        },
        onError: (err: unknown, variables) => {
            handleApiError(err, 'update', variables.ruleId);
        }
    });

    const handleApiError = (err: unknown, action: 'create' | 'update', ruleId?: number) => {
        console.error(`Failed to ${action} rule${ruleId ? ` (ID: ${ruleId})` : ''}:`, err);
        const errorDetail = (err && typeof err === 'object' && 'detail' in err && err.detail && typeof err.detail === 'object' && 'detail' in err.detail) 
            ? err.detail.detail 
            : (err && typeof err === 'object' && 'detail' in err) 
                ? err.detail 
                : null;
        let errorMessage = `Failed to ${action} rule.`;
        const backendValidationErrors: Record<string, string | undefined> = {}; // Allow undefined

        if (err && typeof err === 'object' && 'status' in err && err.status === 422 && Array.isArray(errorDetail)) {
            errorDetail.forEach((validationError: unknown) => {
                if (validationError && typeof validationError === 'object' && 'loc' in validationError && 'msg' in validationError) {
                    const key = (Array.isArray(validationError.loc) ? validationError.loc : [])
                        .slice(1)
                        .map((item: unknown) => typeof item === 'number' ? `[${item}]` : `${item}`)
                        .join('.')
                        .replace(/\.\[/g, '[');
                    const message = (typeof validationError.msg === 'string') ? validationError.msg : 'Invalid input.';
                    backendValidationErrors[key || 'general'] = message;
                }
            });
            errorMessage = "Please fix validation errors from the server.";
            toast.error("Validation Error", { description: errorMessage });
        } else if (typeof errorDetail === 'string') {
            errorMessage = errorDetail;
            backendValidationErrors['general'] = errorMessage;
            toast.error("Save Failed", { description: errorMessage });
        } else if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
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


    const transformPayloadValue = (value: unknown, op: MatchOperation): unknown => {
        if ((op === 'in' || op === 'not_in') && typeof value === 'string') {
            return value.split(',').map(s => s.trim()).filter(Boolean);
        }
        return value;
    };


    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        setValidationErrors({});

        const selectedSourceNames = selectedSources.map(source => source.name);

        const baseFormData = {
            name: name,
            description: description,
            priority: priority,
            is_active: isActive,
            match_criteria: matchCriteria,
            association_criteria: associationCriteria.length > 0 ? associationCriteria : null,
            tag_modifications: tagModifications,
            applicable_sources: selectedSourceNames.length > 0 ? selectedSourceNames : null,
            destination_ids: Array.from(selectedDestinationIds),
            ai_prompt_config_ids: selectedAiPromptConfigIds.length > 0 ? selectedAiPromptConfigIds : null,
            schedule_id: selectedScheduleId,
        };

        setIsSubmitting(true);

        if (existingRule) {
            const validationResult = RuleUpdateSchema.safeParse(baseFormData);
            if (!validationResult.success) {
                const errors: Record<string, string> = {};
                validationResult.error.errors.forEach((err) => {
                    const path = err.path.map(p => typeof p === 'number' ? `[${p}]` : p).join('.').replace(/\.\[/g, '[');
                    errors[path] = err.message;
                });
                setValidationErrors(errors);
                setError("Please fix the validation errors marked below.");
                toast.error("Validation Error", { description: "Please check the form fields." });
                setIsSubmitting(false);
                return;
            }

            const validatedUpdateData = validationResult.data;
            const updateApiPayload: RuleUpdate = {
                name: validatedUpdateData.name,
                description: validatedUpdateData.description,
                priority: validatedUpdateData.priority,
                is_active: validatedUpdateData.is_active,
                match_criteria: validatedUpdateData.match_criteria?.map(crit => ({
                    ...crit,
                    value: transformPayloadValue(crit.value, crit.op)
                })),
                association_criteria: validatedUpdateData.association_criteria?.map(crit => ({
                    ...crit,
                    value: transformPayloadValue(crit.value, crit.op)
                })) || null,
                tag_modifications: validatedUpdateData.tag_modifications,
                applicable_sources: validatedUpdateData.applicable_sources,
                destination_ids: validatedUpdateData.destination_ids,
                // ai_standardization_tags: validatedUpdateData.ai_standardization_tags,
                ai_prompt_config_ids: validatedUpdateData.ai_prompt_config_ids,
                schedule_id: validatedUpdateData.schedule_id,
            };
            console.log('Submitting Final Update Rule Payload to API:', JSON.stringify(updateApiPayload, null, 2));
            updateMutation.mutate({ ruleId: existingRule.id, data: updateApiPayload });

        } else {
            const createDataForZod = { ...baseFormData, ruleset_id: rulesetId };
            const validationResult = RuleCreateSchema.safeParse(createDataForZod);
            if (!validationResult.success) {
                const errors: Record<string, string> = {};
                validationResult.error.errors.forEach((err) => {
                    const path = err.path.map(p => typeof p === 'number' ? `[${p}]` : p).join('.').replace(/\.\[/g, '[');
                    errors[path] = err.message;
                });
                setValidationErrors(errors);
                setError("Please fix the validation errors marked below.");
                toast.error("Validation Error", { description: "Please check the form fields." });
                setIsSubmitting(false);
                return;
            }

            const validatedCreateData = validationResult.data;
            const createApiPayload: RuleCreate = {
                ruleset_id: validatedCreateData.ruleset_id,
                name: validatedCreateData.name,
                description: validatedCreateData.description,
                priority: validatedCreateData.priority,
                is_active: validatedCreateData.is_active,
                match_criteria: validatedCreateData.match_criteria.map(crit => ({
                    ...crit,
                    value: transformPayloadValue(crit.value, crit.op)
                })),
                association_criteria: validatedCreateData.association_criteria?.map(crit => ({
                    ...crit,
                    value: transformPayloadValue(crit.value, crit.op)
                })) || null,
                tag_modifications: validatedCreateData.tag_modifications,
                applicable_sources: validatedCreateData.applicable_sources,
                destination_ids: validatedCreateData.destination_ids,
                // ai_standardization_tags: validatedCreateData.ai_standardization_tags,
                ai_prompt_config_ids: validatedCreateData.ai_prompt_config_ids,
                schedule_id: validatedCreateData.schedule_id,
            };
            createMutation.mutate(createApiPayload);
        }
    };


    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-20" onClose={() => { }}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
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
                                    {(error && !Object.keys(validationErrors).length) && (
                                        <Alert variant="destructive" className="mb-4">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertTitle>Error</AlertTitle>
                                            <AlertDescription>{error}</AlertDescription>
                                        </Alert>
                                    )}
                                    {(Object.keys(validationErrors).length > 0 && validationErrors['general']) && (
                                        <Alert variant="destructive" className="mb-4">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertTitle>Validation Error</AlertTitle>
                                            <AlertDescription>{validationErrors['general']}</AlertDescription>
                                        </Alert>
                                    )}

                                    <RuleFormBasicInfo
                                        name={name} description={description ?? ''} priority={priority} isActive={isActive}
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
                                        validationErrors={validationErrors}
                                        // WORKAROUND: panelRef is RefObject<HTMLDivElement | null>, but child prop might expect RefObject<HTMLDivElement>.
                                        // Ideal fix: Child component prop type should be RefObject<HTMLDivElement | null>.
                                        containerRef={panelRef as React.RefObject<HTMLDivElement>}
                                    />
                                    <RuleFormMatchCriteria
                                        matchCriteria={matchCriteria} updateMatchCriterion={updateMatchCriterion}
                                        addMatchCriterion={addMatchCriterion} removeMatchCriterion={removeMatchCriterion}
                                        isLoading={overallIsLoading} validationErrors={validationErrors}
                                        // WORKAROUND: panelRef is RefObject<HTMLDivElement | null>, but child prop might expect RefObject<HTMLDivElement>.
                                        // Ideal fix: Child component prop type should be RefObject<HTMLDivElement | null>.
                                        containerRef={panelRef as React.RefObject<HTMLDivElement>}
                                    />
                                    <RuleFormAssociationCriteria
                                        associationCriteria={associationCriteria} updateAssociationCriterion={updateAssociationCriterion}
                                        addAssociationCriterion={addAssociationCriterion} removeAssociationCriterion={removeAssociationCriterion}
                                        isLoading={overallIsLoading} validationErrors={validationErrors}
                                        // WORKAROUND: panelRef is RefObject<HTMLDivElement | null>, but child prop might expect RefObject<HTMLDivElement>.
                                        // Ideal fix: Child component prop type should be RefObject<HTMLDivElement | null>.
                                        containerRef={panelRef as React.RefObject<HTMLDivElement>}
                                    />
                                    <RuleFormTagModifications
                                        tagModifications={tagModifications} updateTagModification={updateTagModification}
                                        addTagModification={addTagModification} removeTagModification={removeTagModification}
                                        isLoading={overallIsLoading} validationErrors={validationErrors}
                                        availableCrosswalkMaps={availableCrosswalkMaps} crosswalkMapsLoading={crosswalkMapsLoading}
                                        crosswalkMapsError={crosswalkMapsError ? crosswalkMapsError.message : undefined}
                                        // WORKAROUND: panelRef is RefObject<HTMLDivElement | null>, but child prop (containerRef) expects RefObject<HTMLDivElement>.
                                        // This assertion silences the TS error.
                                        // Ideal fix: Change RuleFormTagModificationsProps.containerRef to React.RefObject<HTMLDivElement | null>.
                                        containerRef={panelRef as React.RefObject<HTMLDivElement>}
                                    />
                                    <RuleFormAiStandardization
                                        selectedConfigIds={selectedAiPromptConfigIds}
                                        onSelectedConfigIdsChange={handleAiPromptConfigIdsChange}
                                        isLoading={overallIsLoading}
                                        validationErrors={validationErrors}
                                    />
                                    <RuleFormDestinations
                                        selectedDestinationIds={selectedDestinationIds} availableDestinations={availableDestinations}
                                        onSelectionChange={handleDestinationChange}
                                        isLoading={overallIsLoading} validationErrors={validationErrors}
                                    />

                                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <Button type="button" variant="outline" onClick={handleDialogClose} disabled={overallIsLoading}> Cancel </Button>
                                        <Button type="submit" disabled={overallIsLoading}>
                                            {overallIsLoading ? (<Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />) : null}
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