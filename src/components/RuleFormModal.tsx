// src/components/RuleFormModal.tsx
import React, { useState, useEffect, Fragment, FormEvent, useCallback } from 'react';
import { Dialog, Transition, Switch, Listbox } from '@headlessui/react';
import { XMarkIcon, PlusIcon, TrashIcon, CheckIcon, ChevronUpDownIcon, CircleStackIcon, ClipboardCopyIcon, AlertCircle } from '@heroicons/react/24/outline';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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
    RuleBase,
    RuleCreate,
    RuleUpdate,
    MatchCriterion,
    TagModification,
    TagSetModification,
    TagPrependModification,
    TagSuffixModification,
    TagRegexReplaceModification,
    ModifyAction,
    MatchOperation,
    StorageBackendConfigRead,
} from '../schemas';
import { DicomTagInfo, getTagInfo } from '../dicom/dictionary';
import DicomTagCombobox from './DicomTagCombobox';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';

// Define available options using the imported TS Enums
const MATCH_OPERATORS = Object.values(MatchOperation);
const MODIFICATION_ACTIONS = Object.values(ModifyAction);

const baseInputStyles = "block w-full rounded-md shadow-sm sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 border focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed py-2 pl-3 px-3";
const errorInputStyles = "border-red-500 focus:border-red-500 focus:ring-red-500";
const normalInputStyles = "border-gray-300 dark:border-gray-600";

interface RuleFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (rule: Rule) => void;
    rulesetId: number;
    existingRule: Rule | null;
}

// Helper to create a default modification object based on action
const createDefaultModification = (action: ModifyAction): TagModification => {
    const base = { tag: '' };
    switch (action) {
        case ModifyAction.SET:
            return { ...base, action, value: '', vr: '' };
        case ModifyAction.DELETE:
            return { ...base, action };
        case ModifyAction.PREPEND:
        case ModifyAction.SUFFIX:
            return { ...base, action, value: '' };
        case ModifyAction.REGEX_REPLACE:
            return { ...base, action, pattern: '', replacement: '' };
        default:
            console.warn(`Unknown modify action: ${action}, defaulting to SET.`);
            return { ...base, action: ModifyAction.SET, value: '', vr: '' };
    }
};

// Default JSON Config Examples for Storage Backends
const configExamples: Record<StorageBackendConfigRead['backend_type'], Record<string, any>> = {
    filesystem: { path: "/dicom_data/processed/my_archive" },
    cstore: { ae_title: "REMOTE_PACS_AE", host: "pacs.example.com", port: 104, calling_ae_title: "AXIOM_SCU" },
    gcs: { bucket_name: "your-gcs-bucket-name", path_prefix: "optional/folder/structure" },
    google_healthcare: { project_id: "your-gcp-project-id", location: "us-central1", dataset_id: "your-dataset", dicom_store_id: "your-dicom-store" },
    stow_rs: { stow_url: "https://dicom.server.com/dicom-web/studies", auth_type: "none", auth_config: null },
};

// Tooltips for Storage Backend Configs
const configTooltips: Record<StorageBackendConfigRead['backend_type'], string> = {
     filesystem: "Required: 'path' (string) - Absolute path *inside the container* where files will be stored (e.g., /dicom_data/processed/some_folder).",
     cstore: "Required: 'ae_title' (string), 'host' (string), 'port' (number). Optional: 'calling_ae_title' (string, default: AXIOM_SCU), timeouts (number).",
     gcs: "Required: 'bucket_name' (string). Optional: 'path_prefix' (string). Authentication uses ADC or GOOGLE_APPLICATION_CREDENTIALS env var.",
     google_healthcare: "Required: 'project_id', 'location', 'dataset_id', 'dicom_store_id' (all strings). Authentication uses ADC or GOOGLE_APPLICATION_CREDENTIALS env var.",
     stow_rs: "Required: 'stow_url' (string, full URL to /studies endpoint) OR 'base_url' (string, base DICOMweb URL). Optional: 'auth_type' ('none', 'basic', 'bearer', 'apikey'), 'auth_config' (object based on auth_type), 'timeout' (number).",
};


const RuleFormModal: React.FC<RuleFormModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    rulesetId,
    existingRule,
}) => {
    const queryClient = useQueryClient();
    // Form State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState(100);
    const [isActive, setIsActive] = useState(true);
    const [matchCriteria, setMatchCriteria] = useState<MatchCriterion[]>([]);
    const [tagModifications, setTagModifications] = useState<TagModification[]>([]);
    const [selectedSources, setSelectedSources] = useState<string[]>([]);
    const [selectedDestinationIds, setSelectedDestinationIds] = useState<Set<number>>(new Set());

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const [copiedTimeout, setCopiedTimeout] = useState<NodeJS.Timeout | null>(null);
    const [showCopied, setShowCopied] = useState(false);

    // Query for available Storage Backends
    const {
        data: availableDestinations = [],
        isLoading: destinationsLoading,
        error: destinationsError,
        refetch: refetchDestinations,
    } = useQuery<StorageBackendConfigRead[], Error>({
        queryKey: ['storageBackendConfigsList'],
        queryFn: () => getStorageBackendConfigs(0, 500),
        enabled: isOpen,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 10,
        refetchOnWindowFocus: false,
    });

    // Query for Applicable Sources
    const {
        data: combinedSources = [],
        isLoading: sourcesLoading,
        error: sourcesError,
    } = useQuery<string[], Error>({
        queryKey: ['applicableSourcesList'],
        queryFn: async () => {
            console.log("Fetching applicable sources...");
            try {
                const [fixedSources, dicomWebConfigs, dimseListenerConfigs] = await Promise.all([
                    getKnownInputSources(),
                    getDicomWebSources(0, 500),
                    getDimseListenerConfigs(0, 500)
                ]);
                const dicomWebNames = dicomWebConfigs.map(s => s.name);
                const dimseListenerNames = dimseListenerConfigs.map(l => l.name);
                const allSourceNames = new Set([...fixedSources, ...dicomWebNames, ...dimseListenerNames]);
                console.log("Combined applicable sources:", Array.from(allSourceNames));
                return Array.from(allSourceNames).sort();
            } catch (fetchError) {
                console.error("Failed to fetch one or more source lists:", fetchError);
                throw new Error(`Failed to load applicable sources: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
            }
        },
        enabled: isOpen,
        staleTime: 0,
        gcTime: 1000 * 60 * 10,
        refetchOnWindowFocus: false,
    });


    // Initialize form based on existingRule or reset
    useEffect(() => {
        if (isOpen) {
            refetchDestinations();
            setValidationErrors({});
            if (existingRule) {
                setName(existingRule.name);
                setDescription(existingRule.description ?? '');
                setPriority(existingRule.priority ?? 0);
                setIsActive(existingRule.is_active ?? true);
                setMatchCriteria(existingRule.match_criteria ? deepClone(existingRule.match_criteria) : []);
                setTagModifications(existingRule.tag_modifications ? deepClone(existingRule.tag_modifications) : []);
                setSelectedDestinationIds(new Set(existingRule.destinations?.map(d => d.id) || []));
                setSelectedSources(existingRule.applicable_sources ? [...existingRule.applicable_sources] : []);
            } else {
                setName('');
                setDescription('');
                setPriority(100);
                setIsActive(true);
                setMatchCriteria([]);
                setTagModifications([]);
                setSelectedDestinationIds(new Set());
                setSelectedSources([]);
            }
            setError(null);
            setIsLoading(false);
        }
    }, [isOpen, existingRule, refetchDestinations]);

    const deepClone = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));
    const handleDialogClose = () => { if (!isLoading && !sourcesLoading && !destinationsLoading) { onClose(); } };

    // Handlers for Match Criteria
    const addMatchCriterion = useCallback(() => {
        setMatchCriteria((prev) => [...prev, { tag: '', op: MatchOperation.EQUALS, value: '' }]);
    }, []);

    const updateMatchCriterion = useCallback((index: number, field: keyof MatchCriterion | 'tagInfo', value: any) => {
        setMatchCriteria(prev => {
            const updated = deepClone(prev);
            if (field === 'tagInfo') {
                updated[index].tag = value ? value.tag : '';
            } else {
                (updated[index] as any)[field] = value;
                if (field === 'op' && (value === MatchOperation.EXISTS || value === MatchOperation.NOT_EXISTS)) {
                    updated[index].value = undefined;
                }
            }
            return updated;
        });
        const key = `matchCriteria[${index}].${field === 'tagInfo' ? 'tag' : field}`;
        setValidationErrors(prev => { const { [key]: _, ...rest } = prev; return rest; });
    }, []);

    const removeMatchCriterion = useCallback((index: number) => {
        setMatchCriteria(prev => prev.filter((_, i) => i !== index));
    }, []);

    // Handlers for Tag Modifications
    const addTagModification = useCallback(() => {
        setTagModifications((prev) => [...prev, createDefaultModification(ModifyAction.SET)]);
    }, []);

    const updateTagModification = useCallback((index: number, field: keyof TagModification | 'tagInfo', value: any) => {
        setTagModifications(prev => {
            const updated = deepClone(prev);
            const currentMod = updated[index];
            let selectedTagInfo: DicomTagInfo | null = null;
            let vrUpdateNeeded = false;
            if (field === 'tagInfo') {
                selectedTagInfo = value;
                currentMod.tag = selectedTagInfo ? selectedTagInfo.tag : '';
                if (currentMod.action === ModifyAction.SET && 'vr' in currentMod) {
                    currentMod.vr = selectedTagInfo ? selectedTagInfo.vr : '';
                    vrUpdateNeeded = true;
                }
            } else if (field === 'action') {
                const newAction = value as ModifyAction;
                const currentTag = currentMod.tag;
                updated[index] = { ...createDefaultModification(newAction), tag: currentTag };
                if (newAction === ModifyAction.SET) {
                    const tagInfo = getTagInfo(currentTag);
                    if (tagInfo && 'vr' in updated[index]) {
                        (updated[index] as TagSetModification).vr = tagInfo.vr;
                    }
                }
            } else {
                if (field in currentMod) {
                    (currentMod as any)[field] = value;
                    if (currentMod.action !== ModifyAction.SET && field !== 'action' && field !== 'tag') {
                        if ('vr' in currentMod) currentMod.vr = undefined;
                    }
                }
            }
            return updated;
        });
        const fieldName = field === 'tagInfo' ? 'tag' : field;
        const keysToClear = [`tagModifications[${index}].${fieldName}`];
        if (field === 'action') {
            keysToClear.push(`tagModifications[${index}].value`);
            keysToClear.push(`tagModifications[${index}].vr`);
            keysToClear.push(`tagModifications[${index}].pattern`);
            keysToClear.push(`tagModifications[${index}].replacement`);
        }
        if (field === 'tagInfo' && vrUpdateNeeded) {
            keysToClear.push(`tagModifications[${index}].vr`);
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

    // Handler for Destination Checkbox
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
        setValidationErrors(prev => ({ ...prev, destinations: undefined }));
    }, []);


    // Form Submission
    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        setValidationErrors({});
        let isValid = true;
        const currentValidationErrors: Record<string, string> = {};

        if (!name.trim()) {
            currentValidationErrors['name'] = 'Rule name is required.';
            isValid = false;
        }

        const criteriaToValidate = matchCriteria.length > 0 ? matchCriteria : [];
        if (criteriaToValidate.length === 0) {
            currentValidationErrors['matchCriteria'] = 'At least one match criterion is required.';
            isValid = false;
        }
        criteriaToValidate.forEach((mc, index) => {
            const tagKey = `matchCriteria[${index}].tag`;
            const opKey = `matchCriteria[${index}].op`;
            const valueKey = `matchCriteria[${index}].value`;
            if (!mc.tag || !/^\(?[0-9a-fA-F]{4},\s*[0-9a-fA-F]{4}\)?$|^[a-zA-Z0-9]+$/.test(mc.tag.trim())) {
                currentValidationErrors[tagKey] = 'Valid tag required.'; isValid = false;
            }
            if (!mc.op) {
                currentValidationErrors[opKey] = 'Operator required.'; isValid = false;
            }
            if (![MatchOperation.EXISTS, MatchOperation.NOT_EXISTS].includes(mc.op) && (mc.value === undefined || mc.value === null || String(mc.value).trim() === '')) {
                currentValidationErrors[valueKey] = 'Value required for this operator.'; isValid = false;
            }
            if (mc.op === MatchOperation.REGEX && typeof mc.value === 'string') {
                try { new RegExp(mc.value); } catch (e) { currentValidationErrors[valueKey] = 'Invalid Regex pattern.'; isValid = false; }
            }
        });

        const validatedModifications: TagModification[] = [];
        tagModifications.forEach((tm, index) => {
            const baseKey = `tagModifications[${index}]`;
            const tagKey = `${baseKey}.tag`;
            const valueKey = `${baseKey}.value`;
            const vrKey = `${baseKey}.vr`;
            const patternKey = `${baseKey}.pattern`;
            const replacementKey = `${baseKey}.replacement`;
            if (!tm.tag || !/^\(?[0-9a-fA-F]{4},\s*[0-9a-fA-F]{4}\)?$|^[a-zA-Z0-9]+$/.test(tm.tag.trim())) {
                currentValidationErrors[tagKey] = 'Valid tag required.'; isValid = false;
            }
            switch (tm.action) {
                case ModifyAction.SET:
                    if ((tm as TagSetModification).value===undefined||(tm as TagSetModification).value===null||String((tm as TagSetModification).value).trim()==='') { currentValidationErrors[valueKey]="'Set' requires value."; isValid=false; }
                    if ((tm as TagSetModification).vr && !/^[A-Z]{2}$/.test((tm as TagSetModification).vr!)) { currentValidationErrors[vrKey]="VR must be 2 letters."; isValid=false; }
                    validatedModifications.push(tm); break;
                case ModifyAction.DELETE:
                    validatedModifications.push(tm); break;
                case ModifyAction.PREPEND: case ModifyAction.SUFFIX:
                    if ((tm as TagPrependModification|TagSuffixModification).value===undefined||(tm as TagPrependModification|TagSuffixModification).value===null||String((tm as TagPrependModification|TagSuffixModification).value).trim()==='') { currentValidationErrors[valueKey]=`'${tm.action}' requires value.`; isValid=false; }
                    validatedModifications.push(tm); break;
                case ModifyAction.REGEX_REPLACE:
                    if ((tm as TagRegexReplaceModification).pattern===undefined||String((tm as TagRegexReplaceModification).pattern).trim()==='') { currentValidationErrors[patternKey]="'regex_replace' requires pattern."; isValid=false; }
                    else { try { new RegExp((tm as TagRegexReplaceModification).pattern); } catch (e) { currentValidationErrors[patternKey]='Invalid Regex pattern.'; isValid=false; } }
                    if ((tm as TagRegexReplaceModification).replacement===undefined||(tm as TagRegexReplaceModification).replacement===null) { currentValidationErrors[replacementKey]="'regex_replace' requires replacement."; isValid=false; }
                    validatedModifications.push(tm); break;
                default: currentValidationErrors[`${baseKey}.action`]="Invalid action."; isValid=false;
            }
        });

        const destinationsToValidate = Array.from(selectedDestinationIds);
        if (destinationsToValidate.length === 0) {
            currentValidationErrors['destinations'] = 'At least one destination must be selected.';
            isValid = false;
        }

        setValidationErrors(currentValidationErrors);
        if (!isValid) {
            setError("Please fix the validation errors marked below.");
            return;
        }

        setIsLoading(true);
        const commonPayload: Omit<RuleBase, 'destinations'> & { destination_ids?: number[] | null } = {
            name: name.trim(),
            description: description.trim() || null,
            priority,
            is_active: isActive,
            match_criteria: matchCriteria,
            tag_modifications: validatedModifications,
            applicable_sources: selectedSources.length > 0 ? selectedSources : null,
            destination_ids: destinationsToValidate,
        };
        console.log('Submitting Rule Payload:', JSON.stringify(commonPayload, null, 2));

        try {
            let savedRule: Rule;
            if (existingRule) {
                const updatePayload: RuleUpdate = commonPayload;
                savedRule = await updateRule(existingRule.id, updatePayload);
            } else {
                const createPayload: RuleCreate = { ...commonPayload, ruleset_id: rulesetId };
                savedRule = await createRule(createPayload);
            }
            queryClient.invalidateQueries({ queryKey: ['rules', rulesetId] });
            onSuccess(savedRule);
        } catch (err: any) {
            console.error('Failed to save rule:', err);
            const errorDetail = err.detail?.detail || err.detail;
            if (err.status === 422 && Array.isArray(errorDetail)) {
                const backendErrors: Record<string, string> = {};
                errorDetail.forEach((validationError: any) => {
                    if (validationError.loc && Array.isArray(validationError.loc) && validationError.loc.length > 1) {
                        const key = validationError.loc.slice(1).map((item: string | number) => typeof item === 'number' ? `[${item}]` : `.${item}`).join('').replace(/^\./, '');
                        backendErrors[key] = validationError.msg;
                    } else {
                        backendErrors['general'] = validationError.msg || 'Unknown validation error';
                    }
                });
                setValidationErrors(backendErrors);
                setError("Please fix validation errors from the server.");
            } else {
                const message = typeof errorDetail === 'string' ? errorDetail : (err.message || `Failed to ${existingRule ? 'update' : 'create'} rule.`);
                setError(message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Helper to render modification inputs
    const renderModificationInputs = (mod: TagModification, index: number) => {
        const valueError=validationErrors[`tagModifications[${index}].value`];
        const vrError=validationErrors[`tagModifications[${index}].vr`];
        const patternError=validationErrors[`tagModifications[${index}].pattern`];
        const replacementError=validationErrors[`tagModifications[${index}].replacement`];
        switch (mod.action as ModifyAction) {
            case ModifyAction.SET:
                return (
                    <>
                        <div>
                            <input
                                type="text"
                                placeholder="Value"
                                value={(mod as TagSetModification).value ?? ''}
                                onChange={(e) => updateTagModification(index, 'value', e.target.value)}
                                required
                                disabled={isLoading}
                                aria-invalid={!!valueError}
                                aria-describedby={`tm-value-${index}-error`}
                                className={`${baseInputStyles} ${valueError ? errorInputStyles : normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}
                            />
                            {valueError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-value-${index}-error`}>{valueError}</p>}
                        </div>
                        <div>
                            <input
                                type="text"
                                placeholder="VR (e.g., SH)"
                                maxLength={2}
                                value={(mod as TagSetModification).vr ?? ''}
                                onChange={(e) => updateTagModification(index, 'vr', e.target.value.toUpperCase())}
                                disabled={isLoading}
                                aria-invalid={!!vrError}
                                aria-describedby={`tm-vr-${index}-error`}
                                className={`${baseInputStyles} ${vrError ? errorInputStyles : normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}
                            />
                            {vrError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-vr-${index}-error`}>{vrError}</p>}
                        </div>
                    </>
                );
            case ModifyAction.PREPEND:
            case ModifyAction.SUFFIX:
                return (
                    <>
                        <div className="sm:col-span-2">
                            <input
                                type="text"
                                placeholder="Value to Add"
                                value={(mod as TagPrependModification | TagSuffixModification).value ?? ''}
                                onChange={(e) => updateTagModification(index, 'value', e.target.value)}
                                required
                                disabled={isLoading}
                                aria-invalid={!!valueError}
                                aria-describedby={`tm-value-${index}-error`}
                                className={`${baseInputStyles} ${valueError ? errorInputStyles : normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}
                            />
                            {valueError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-value-${index}-error`}>{valueError}</p>}
                        </div>
                    </>
                );
            case ModifyAction.REGEX_REPLACE:
                return (
                    <>
                        <div>
                            <input
                                type="text"
                                placeholder="Regex Pattern"
                                value={(mod as TagRegexReplaceModification).pattern ?? ''}
                                onChange={(e) => updateTagModification(index, 'pattern', e.target.value)}
                                required
                                disabled={isLoading}
                                aria-invalid={!!patternError}
                                aria-describedby={`tm-pattern-${index}-error`}
                                className={`${baseInputStyles} ${patternError ? errorInputStyles : normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}
                            />
                            {patternError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-pattern-${index}-error`}>{patternError}</p>}
                        </div>
                        <div>
                            <input
                                type="text"
                                placeholder="Replacement String"
                                value={(mod as TagRegexReplaceModification).replacement ?? ''}
                                onChange={(e) => updateTagModification(index, 'replacement', e.target.value)}
                                required
                                disabled={isLoading}
                                aria-invalid={!!replacementError}
                                aria-describedby={`tm-replacement-${index}-error`}
                                className={`${baseInputStyles} ${replacementError ? errorInputStyles : normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}
                            />
                            {replacementError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-replacement-${index}-error`}>{replacementError}</p>}
                        </div>
                    </>
                );
            case ModifyAction.DELETE:
            default:
                return <div className="col-span-2 text-sm text-gray-500 dark:text-gray-400 italic self-center pt-2">(No value/VR needed for delete)</div>;
        }
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (copiedTimeout) clearTimeout(copiedTimeout);
        };
    }, [copiedTimeout]);

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
                                        disabled={isLoading || sourcesLoading || destinationsLoading}
                                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none disabled:opacity-50"
                                    >
                                        <XMarkIcon className="h-6 w-6" />
                                    </button>
                                </Dialog.Title>

                                <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto p-6">
                                    {error && (
                                        <div className="rounded-md bg-red-50 p-4 dark:bg-red-900 border border-red-200 dark:border-red-800">
                                            <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
                                        </div>
                                    )}
                                    {validationErrors['general'] && <p className="mt-1 text-sm text-red-600 dark:text-red-400" id="general-error">{validationErrors['general']}</p>}

                                    {/* Basic Rule Fields */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="ruleName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                id="ruleName"
                                                value={name}
                                                onChange={(e)=>{setName(e.target.value); setValidationErrors(p=>({...p,name:undefined}))}}
                                                required
                                                disabled={isLoading}
                                                aria-invalid={!!validationErrors['name']}
                                                aria-describedby="ruleName-error"
                                                className={`mt-1 ${baseInputStyles} ${validationErrors['name']?errorInputStyles:normalInputStyles} dark:bg-gray-700 `}
                                            />
                                            {validationErrors['name'] && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id="ruleName-error">{validationErrors['name']}</p>}
                                        </div>
                                        <div>
                                            <label htmlFor="rulePriority" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
                                            <input
                                                type="number"
                                                id="rulePriority"
                                                value={priority}
                                                onChange={(e)=>setPriority(parseInt(e.target.value,10)||0)}
                                                disabled={isLoading}
                                                className={`mt-1 ${baseInputStyles} ${validationErrors['priority']?errorInputStyles:normalInputStyles} dark:bg-gray-700 `}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="ruleDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                                        <textarea
                                            id="ruleDescription"
                                            value={description}
                                            onChange={(e)=>setDescription(e.target.value)}
                                            rows={2}
                                            disabled={isLoading}
                                            className={`mt-1 ${baseInputStyles} ${validationErrors['description']?errorInputStyles:normalInputStyles} dark:bg-gray-700 `}
                                        />
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
                                        <span className={`ml-3 text-sm font-medium ${isLoading?'text-gray-400 dark:text-gray-500':'text-gray-700 dark:text-gray-300'}`}>Active</span>
                                    </div>

                                    {/* Applicable Sources Section */}
                                    <fieldset className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                        <legend className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">Applicable Input Sources</legend>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Select sources this rule applies to. If none selected, applies to ALL sources.</p>
                                        {sourcesLoading ? (
                                            <div className="text-sm text-gray-500 dark:text-gray-400">Loading sources...</div>
                                        ) : sourcesError ? (
                                            <div className="text-sm text-red-600 dark:text-red-400">Error loading sources: {sourcesError.message}</div>
                                        ) : combinedSources.length > 0 ? (
                                            <Listbox value={selectedSources} onChange={setSelectedSources} multiple>
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
                                                                    className={({ active }) =>
                                                                        `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                                                            active ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-700 dark:text-white' : 'text-gray-900 dark:text-white'
                                                                        }`
                                                                    }
                                                                    value={source}
                                                                >
                                                                    {({ selected }) => (
                                                                        <>
                                                                            <span className={`block truncate ${ selected ? 'font-medium' : 'font-normal' }`} >
                                                                                {source}
                                                                            </span>
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
                                    </fieldset>

                                    {/* Match Criteria Section */}
                                    <fieldset className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                        <legend className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">Match Criteria (ALL must match)</legend>
                                        <div className="space-y-3 pr-2">
                                            {matchCriteria.map((criterion, index) => {
                                                const tagError = validationErrors[`matchCriteria[${index}].tag`];
                                                const opError = validationErrors[`matchCriteria[${index}].op`];
                                                const valueError = validationErrors[`matchCriteria[${index}].value`];
                                                const showValueInput = ![MatchOperation.EXISTS, MatchOperation.NOT_EXISTS].includes(criterion.op);
                                                return (
                                                    <div key={index} className="relative flex items-start space-x-2 p-2 border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700/50">
                                                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                            <div>
                                                                <DicomTagCombobox
                                                                    value={criterion.tag ?? ''}
                                                                    onChange={(tagInfo) => updateMatchCriterion(index, 'tagInfo', tagInfo)}
                                                                    disabled={isLoading}
                                                                    required
                                                                    aria-invalid={!!tagError}
                                                                    aria-describedby={`mc-tag-${index}-error`}
                                                                    inputClassName={`${baseInputStyles} ${tagError ? errorInputStyles : normalInputStyles}`}
                                                                />
                                                                {tagError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`mc-tag-${index}-error`}>{tagError}</p>}
                                                            </div>
                                                            <div>
                                                                <select
                                                                    value={criterion.op}
                                                                    onChange={(e) => updateMatchCriterion(index, 'op', e.target.value as MatchOperation)}
                                                                    required
                                                                    disabled={isLoading}
                                                                    aria-invalid={!!opError}
                                                                    aria-describedby={`mc-op-${index}-error`}
                                                                    className={`${baseInputStyles} pr-10 ${opError ? errorInputStyles : normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}
                                                                >
                                                                    {MATCH_OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
                                                                </select>
                                                                {opError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`mc-op-${index}-error`}>{opError}</p>}
                                                            </div>
                                                            <div>
                                                                {showValueInput ? (
                                                                    <>
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Value"
                                                                            value={criterion.value ?? ''}
                                                                            onChange={(e) => updateMatchCriterion(index, 'value', e.target.value)}
                                                                            disabled={isLoading}
                                                                            aria-invalid={!!valueError}
                                                                            aria-describedby={`mc-value-${index}-error`}
                                                                            className={`${baseInputStyles} ${valueError ? errorInputStyles : normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}
                                                                        />
                                                                        {valueError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`mc-value-${index}-error`}>{valueError}</p>}
                                                                    </>
                                                                ) : (
                                                                    <div className="text-sm text-gray-500 dark:text-gray-400 italic self-center pt-2">(No value needed)</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeMatchCriterion(index)}
                                                            disabled={isLoading}
                                                            className="text-red-500 hover:text-red-700 p-1 mt-1 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed self-start"
                                                        >
                                                            <TrashIcon className="h-5 w-5"/>
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={addMatchCriterion}
                                            disabled={isLoading}
                                            className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <PlusIcon className="h-4 w-4 mr-1"/> Add Criterion
                                        </button>
                                        {validationErrors['matchCriteria'] && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validationErrors['matchCriteria']}</p>}
                                    </fieldset>

                                    {/* Tag Modifications Section */}
                                    <fieldset className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                        <legend className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">Tag Modifications</legend>
                                        <div className="space-y-3 pr-2">
                                            {tagModifications.map((mod, index) => {
                                                 const actionError = validationErrors[`tagModifications[${index}].action`];
                                                 const tagError = validationErrors[`tagModifications[${index}].tag`];
                                                 return (
                                                    <div key={index} className="relative flex items-start space-x-2 p-2 border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700/50">
                                                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                                                            <div>
                                                                <select
                                                                    value={mod.action}
                                                                    onChange={(e) => updateTagModification(index, 'action', e.target.value as ModifyAction)}
                                                                    required
                                                                    disabled={isLoading}
                                                                    aria-invalid={!!actionError}
                                                                    aria-describedby={`tm-action-${index}-error`}
                                                                    className={`${baseInputStyles} pr-10 ${actionError ? errorInputStyles : normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}
                                                                >
                                                                    {MODIFICATION_ACTIONS.map(act => <option key={act} value={act}>{act}</option>)}
                                                                </select>
                                                                {actionError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-action-${index}-error`}>{actionError}</p>}
                                                            </div>
                                                            <div>
                                                                <DicomTagCombobox
                                                                    value={mod.tag ?? ''}
                                                                    onChange={(tagInfo) => updateTagModification(index, 'tagInfo', tagInfo)}
                                                                    disabled={isLoading}
                                                                    required
                                                                    aria-invalid={!!tagError}
                                                                    aria-describedby={`tm-tag-${index}-error`}
                                                                    inputClassName={`${baseInputStyles} ${tagError ? errorInputStyles : normalInputStyles}`}
                                                                />
                                                                {tagError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-tag-${index}-error`}>{tagError}</p>}
                                                            </div>
                                                            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                {renderModificationInputs(mod, index)}
                                                            </div>
                                                        </div>
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
                                        <button
                                            type="button"
                                            onClick={addTagModification}
                                            disabled={isLoading}
                                            className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <PlusIcon className="h-4 w-4 mr-1"/> Add Modification
                                        </button>
                                    </fieldset>

                                    {/* Destinations Section (Using Checkboxes) */}
                                    <fieldset className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                        <legend className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">Destinations*</legend>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Select one or more configured and enabled storage backends where processed data should be sent.</p>
                                        {destinationsLoading ? (
                                            <div className="text-sm text-gray-500 dark:text-gray-400">Loading available destinations...</div>
                                        ) : destinationsError ? (
                                            <div className="text-sm text-red-600 dark:text-red-400">Error loading destinations: {destinationsError.message}</div>
                                        ) : availableDestinations.length === 0 ? (
                                            <div className="text-sm text-gray-500 dark:text-gray-400">No storage backends configured or enabled. Please configure one first in Admin / Configuration / Storage Backends.</div>
                                        ) : (
                                            <div className="space-y-2 max-h-48 overflow-y-auto border rounded p-3 bg-gray-50 dark:bg-gray-700/50">
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
                                                {availableDestinations.filter(d => !d.is_enabled).length > 0 && (
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 italic pt-2 border-t border-gray-200 dark:border-gray-600">
                                                        Note: Some configured backends are disabled and cannot be selected.
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        {validationErrors['destinations'] && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validationErrors['destinations']}</p>}
                                    </fieldset>


                                    {/* Form Actions (Sticky Footer) */}
                                     <div className="flex justify-end space-x-3 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800 py-4 px-6 -mb-6 -ml-6 -mr-6 rounded-b-2xl">
                                         <button
                                             type="button"
                                             onClick={handleDialogClose}
                                             disabled={isLoading || sourcesLoading || destinationsLoading}
                                             className="inline-flex justify-center rounded-md border border-gray-300 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50"
                                         >
                                             Cancel
                                         </button>
                                         <button
                                             type="submit"
                                             disabled={isLoading || sourcesLoading || destinationsLoading}
                                             className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                         >
                                             {(isLoading || sourcesLoading || destinationsLoading) && (
                                                 <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                 </svg>
                                             )}
                                             {isLoading ? 'Saving...' : ((sourcesLoading || destinationsLoading) ? 'Loading...' : (existingRule ? 'Update Rule' : 'Create Rule'))}
                                         </button>
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
