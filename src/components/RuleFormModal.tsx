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
    // --- ADDED: Import getSchedules ---
    getSchedules,
    // --- END ADDED ---
} from '../services/api';

import {
    Rule,
    StorageBackendConfigRead,
    CrosswalkMapRead,
    // --- ADDED: Import ScheduleRead ---
    ScheduleRead,
    // --- END ADDED ---
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
// --- ADDED: Import RuleFormSchedule ---
import RuleFormSchedule from './rule-form/RuleFormSchedule';
// --- END ADDED ---


// Import helpers
import { isValueRequired, isValueList, isIpOperator } from '@/utils/ruleHelpers';

// Style constants
const baseInputStyles = "block w-full rounded-md shadow-sm sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 border focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed py-2 pl-3 px-3";
const errorInputStyles = "border-red-500 focus:border-red-500 focus:ring-red-500";
const normalInputStyles = "border-gray-300 dark:border-gray-600";

// Deep clone function
function deepClone<T>(obj: T): T {
    try { return JSON.parse(JSON.stringify(obj)); }
    catch (e) { console.error("Deep clone failed:", e); return obj; }
}

interface RuleFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (rule: Rule) => void; // Keep onSuccess for parent notification if needed
    rulesetId: number;
    existingRule: Rule | null;
}

// Default modification creator remains the same
const createDefaultModification = (action: ModifyAction): TagModificationFormData => { /* ... as before ... */
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
    // --- ADDED: Schedule State ---
    const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
    // --- END ADDED ---
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    // --- Data Fetching ---
    // Destinations Query (remains the same)
    const { data: availableDestinations = [], isLoading: destinationsLoading, error: destinationsError, refetch: refetchDestinations } = useQuery<StorageBackendConfigRead[], Error>({ queryKey: ['storageBackendConfigsList'], queryFn: () => getStorageBackendConfigs(0, 500), enabled: isOpen, staleTime: 300000, gcTime: 600000, refetchOnWindowFocus: false });
    // Sources Query (remains the same)
    const { data: combinedSources = [], isLoading: sourcesLoading, error: sourcesError } = useQuery<SourceInfo[], Error>({ queryKey: ['applicableSourcesListWithType'], queryFn: async (): Promise<SourceInfo[]> => { /* ... as before ... */ return []; }, enabled: isOpen, staleTime: 0, gcTime: 600000, refetchOnWindowFocus: false });
    // Crosswalk Maps Query (remains the same)
    const { data: availableCrosswalkMaps = [], isLoading: crosswalkMapsLoading, error: crosswalkMapsError } = useQuery<CrosswalkMapRead[], Error>({ queryKey: ['crosswalkMapsListForRuleForm'], queryFn: () => getCrosswalkMaps(undefined, 0, 500), enabled: isOpen, staleTime: 300000, gcTime: 600000, refetchOnWindowFocus: false });
    // --- ADDED: Schedules Query ---
    const { data: availableSchedules = [], isLoading: schedulesLoading, error: schedulesError, refetch: refetchSchedules } = useQuery<ScheduleRead[], Error>({
        queryKey: ['schedulesListForRuleForm'], // Unique key
        queryFn: () => getSchedules(0, 500), // Fetch all schedules
        enabled: isOpen, // Only fetch when modal is open
        staleTime: 300000, // 5 minutes
        gcTime: 600000, // 10 minutes
        refetchOnWindowFocus: false,
        // Filter for enabled schedules here
        select: (data) => data.filter(schedule => schedule.is_enabled),
    });
    // --- END ADDED ---

    // Combine loading states
    const isDataLoading = sourcesLoading || destinationsLoading || crosswalkMapsLoading || schedulesLoading; // Add schedulesLoading
    const overallIsLoading = isSubmitting || isDataLoading;

    // --- Form Reset Logic ---
    const _createDefaultModification = useCallback(createDefaultModification, []);
    useEffect(() => {
        if (isOpen) {
            refetchDestinations();
            refetchSchedules(); // Refetch schedules when modal opens
            setValidationErrors({});
            if (existingRule) {
                // Basic info
                setName(existingRule.name);
                setDescription(existingRule.description ?? '');
                setPriority(existingRule.priority ?? 0);
                setIsActive(existingRule.is_active ?? true);
                // Schedule ID
                setSelectedScheduleId(existingRule.schedule_id ?? null); // <-- Initialize schedule state
                // Criteria, Mods, Sources, Destinations (as before)
                const parsedCriteria = Array.isArray(existingRule.match_criteria) ? existingRule.match_criteria : [];
                const parsedAssocCriteria = Array.isArray(existingRule.association_criteria) ? existingRule.association_criteria : [];
                const parsedMods = Array.isArray(existingRule.tag_modifications) ? existingRule.tag_modifications : [];
                setMatchCriteria(deepClone(parsedCriteria).map(/* ... */));
                setAssociationCriteria(deepClone(parsedAssocCriteria).map(/* ... */));
                setTagModifications(deepClone(parsedMods).map(/* ... */));
                setSelectedDestinationIds(new Set(existingRule.destinations?.map(d => d.id) || []));
                setSelectedSources(existingRule.applicable_sources ? [...existingRule.applicable_sources] : []);
            } else {
                // Reset all state for creation
                setName(''); setDescription(''); setPriority(100); setIsActive(true);
                setMatchCriteria([]); setAssociationCriteria([]); setTagModifications([]);
                setSelectedDestinationIds(new Set()); setSelectedSources([]);
                setSelectedScheduleId(null); // <-- Reset schedule state
            }
            setError(null); setIsSubmitting(false);
        }
    }, [isOpen, existingRule, refetchDestinations, refetchSchedules, _createDefaultModification]); // Add refetchSchedules

    // --- Modal Close Handler ---
    const handleDialogClose = () => { if (!overallIsLoading) { onClose(); } };

    // --- CRUD Callbacks (remain the same) ---
    const addMatchCriterion = useCallback(() => { setMatchCriteria((prev) => [...prev, { tag: '', op: 'eq', value: '' }]); }, []);
    const updateMatchCriterion = useCallback((index: number, field: keyof MatchCriterionFormData | 'tagInfo', value: any) => { /* ... */ }, []);
    const removeMatchCriterion = useCallback((index: number) => { setMatchCriteria(prev => prev.filter((_, i) => i !== index)); }, []);
    const addAssociationCriterion = useCallback(() => { setAssociationCriteria((prev) => [...prev, { parameter: 'CALLING_AE_TITLE', op: 'eq', value: '' }]); }, []);
    const updateAssociationCriterion = useCallback((index: number, field: keyof AssociationMatchCriterionFormData, value: any) => { /* ... */ }, []);
    const removeAssociationCriterion = useCallback((index: number) => { setAssociationCriteria(prev => prev.filter((_, i) => i !== index)); }, []);
    const addTagModification = useCallback(() => { setTagModifications((prev) => [...prev, _createDefaultModification('set')]); }, [_createDefaultModification]);
    const updateTagModification = useCallback((index: number, field: keyof TagModificationFormData | 'tagInfo' | 'sourceTagInfo' | 'destTagInfo' | 'crosswalk_map_id', value: any) => { /* ... */ }, [_createDefaultModification, tagModifications]);
    const removeTagModification = useCallback((index: number) => { setTagModifications(prev => prev.filter((_, i) => i !== index)); }, []);
    const handleDestinationChange = useCallback((backendId: number, checked: boolean) => { /* ... */ }, []);

    // --- ADDED: Schedule Change Handler ---
    const handleScheduleChange = useCallback((scheduleId: number | null) => {
        setSelectedScheduleId(scheduleId);
        setValidationErrors(prev => ({ ...prev, schedule_id: undefined })); // Clear validation error
    }, []);
    // --- END ADDED ---


    // --- Form Submission ---
    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        setValidationErrors({});

        // Prepare data for Zod validation
        const formDataForZod = {
            name, description, priority, is_active: isActive,
            match_criteria: matchCriteria,
            association_criteria: associationCriteria.length > 0 ? associationCriteria : null,
            tag_modifications: tagModifications,
            applicable_sources: selectedSources.length > 0 ? selectedSources : null,
            destination_ids: Array.from(selectedDestinationIds),
            schedule_id: selectedScheduleId, // <-- Include schedule_id
        };

        const validationResult = RuleFormDataSchema.safeParse(formDataForZod);

        if (!validationResult.success) {
            // Error handling remains the same
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

        const parseListValue = (op: MatchOperation, value: any): any => { /* ... */ }; // Remains the same

        // Prepare final API payload
        const commonPayload = {
            name: validatedData.name,
            description: validatedData.description,
            priority: validatedData.priority,
            is_active: validatedData.is_active,
            match_criteria: validatedData.match_criteria.map(/* ... */),
            association_criteria: validatedData.association_criteria?.map(/* ... */) || null,
            tag_modifications: validatedData.tag_modifications,
            applicable_sources: validatedData.applicable_sources,
            destination_ids: validatedData.destination_ids,
            schedule_id: validatedData.schedule_id, // <-- Include schedule_id
        };

        setIsSubmitting(true);
        console.log('Submitting Rule Payload:', JSON.stringify(commonPayload, null, 2));

        try {
            let savedRule: Rule;
            if (existingRule) {
                const updatePayload: RuleUpdatePayload = commonPayload;
                // Ensure schedule_id is explicitly included if it changed or was set
                 if ('schedule_id' in validatedData) {
                    updatePayload.schedule_id = validatedData.schedule_id;
                 }
                savedRule = await updateRule(existingRule.id, updatePayload);
            } else {
                const createPayload: RuleCreatePayload = { ...commonPayload, ruleset_id: rulesetId };
                savedRule = await createRule(createPayload);
            }
            onSuccess(savedRule); // Call parent onSuccess
            onClose(); // Close modal
            toast.success(`Rule "${savedRule.name}" ${existingRule ? 'updated' : 'created'} successfully.`);
            queryClient.invalidateQueries({ queryKey: ['rules', rulesetId] }); // Invalidate rules for this ruleset
        } catch (err: any) {
            // Error handling remains the same
            console.error('Failed to save rule:', err);
            const errorDetail = err.detail?.detail || err.detail;
             if (err.status === 422 && Array.isArray(errorDetail)) { /* ... */ }
             else { /* ... */ }
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-20" onClose={handleDialogClose}>
                {/* Backdrop */}
                <Transition.Child as={Fragment} enter="ease-out duration-300" /* ... */ >
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
                                    {error && ( <Alert variant="destructive" /* ... */ >...</Alert> )}
                                    {validationErrors['general'] && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{validationErrors['general']}</p>}

                                    {/* --- Use Sub-Components --- */}
                                    <RuleFormBasicInfo /* ...props... */ />
                                    <RuleFormSources /* ...props... */ />

                                     {/* --- ADDED: Render RuleFormSchedule --- */}
                                     <RuleFormSchedule
                                         selectedScheduleId={selectedScheduleId}
                                         availableSchedules={availableSchedules ?? []} // Pass fetched schedules
                                         onScheduleChange={handleScheduleChange} // Pass handler
                                         isLoading={overallIsLoading}
                                         schedulesLoading={schedulesLoading} // Pass specific loading state
                                         schedulesError={schedulesError} // Pass specific error state
                                         validationErrors={validationErrors}
                                         baseInputStyles={baseInputStyles}
                                         errorInputStyles={errorInputStyles}
                                         normalInputStyles={normalInputStyles}
                                     />
                                     {/* --- END ADDED --- */}

                                    <RuleFormMatchCriteria /* ...props... */ />
                                    <RuleFormAssociationCriteria /* ...props... */ />
                                    <RuleFormTagModifications /* ...props... availableCrosswalkMaps={availableCrosswalkMaps} etc */ />
                                    <RuleFormDestinations /* ...props... */ />


                                    {/* --- Footer Buttons --- */}
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
