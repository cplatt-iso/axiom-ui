// src/components/RuleWizardModal.tsx
import React, { useState, useEffect, Fragment, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/20/solid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
    RuleCreate,
    RuleUpdate,
    MatchCriterionFormData,
    AssociationMatchCriterionFormData,
    TagModificationFormData,
} from '@/schemas';

// Step Components
import RuleWizardStep1 from './rule-wizard/RuleWizardStep1';
import RuleWizardStep2 from './rule-wizard/RuleWizardStep2';
import RuleWizardStep3 from './rule-wizard/RuleWizardStep3';
import RuleWizardStep4 from './rule-wizard/RuleWizardStep4';

// Wizard Step Definitions
const WIZARD_STEPS = [
    { id: 1, name: 'Rule Identity', description: 'Basic information and settings' },
    { id: 2, name: 'Sources & Matching', description: 'Input sources and criteria' },
    { id: 3, name: 'Data Operations', description: 'Transform and modify data' },
    { id: 4, name: 'Destinations & Review', description: 'Output destinations and summary' },
] as const;

interface RuleWizardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (rule: Rule) => void;
    rulesetId: number;
    existingRule?: Rule | null;
}

interface WizardFormData {
    // Step 1: Basic Info
    name: string;
    description: string;
    priority: number;
    isActive: boolean;
    selectedScheduleId: number | null;
    
    // Step 2: Sources & Matching
    selectedSources: string[];
    matchCriteria: MatchCriterionFormData[];
    associationCriteria: AssociationMatchCriterionFormData[];
    
    // Step 3: Data Operations
    tagModifications: TagModificationFormData[];
    selectedAiPromptConfigIds: number[];
    
    // Step 4: Destinations
    selectedDestinationIds: number[];
}

const createDefaultFormData = (): WizardFormData => ({
    name: '',
    description: '',
    priority: 100,
    isActive: true,
    selectedScheduleId: null,
    selectedSources: [],
    matchCriteria: [],
    associationCriteria: [],
    tagModifications: [],
    selectedAiPromptConfigIds: [],
    selectedDestinationIds: [],
});

const RuleWizardModal: React.FC<RuleWizardModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    rulesetId,
    existingRule,
}) => {
    const queryClient = useQueryClient();
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState<WizardFormData>(createDefaultFormData());
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset form when modal opens/closes or when switching between create/edit
    useEffect(() => {
        if (isOpen) {
            if (existingRule) {
                // Populate form with existing rule data
                setFormData({
                    name: existingRule.name || '',
                    description: existingRule.description || '',
                    priority: existingRule.priority || 100,
                    isActive: existingRule.is_active ?? true,
                    selectedScheduleId: existingRule.schedule_id || null,
                    selectedSources: existingRule.applicable_sources || [],
                    matchCriteria: existingRule.match_criteria?.map((mc: any) => ({
                        tag: mc.tag,
                        op: mc.op,
                        value: Array.isArray(mc.value) ? mc.value.join(',') : mc.value?.toString() || '',
                    })) || [],
                    associationCriteria: existingRule.association_criteria?.map(ac => ({
                        parameter: ac.parameter,
                        op: ac.op,
                        value: Array.isArray(ac.value) ? ac.value.join(',') : ac.value?.toString() || '',
                    })) || [],
                    tagModifications: existingRule.tag_modifications?.map(tm => ({
                        action: tm.action,
                        tag: 'tag' in tm ? tm.tag : '',
                        value: 'value' in tm ? tm.value || '' : '',
                        vr: 'vr' in tm ? tm.vr || null : null,
                        source_tag: 'source_tag' in tm ? tm.source_tag || '' : '',
                        destination_tag: 'destination_tag' in tm ? tm.destination_tag || '' : '',
                        destination_vr: 'destination_vr' in tm ? tm.destination_vr || null : null,
                        pattern: 'pattern' in tm ? tm.pattern || '' : '',
                        replacement: 'replacement' in tm ? tm.replacement || '' : '',
                        crosswalk_map_id: 'crosswalk_map_id' in tm ? tm.crosswalk_map_id || 0 : 0,
                    })) || [],
                    selectedAiPromptConfigIds: existingRule.ai_prompt_config_ids || [],
                    selectedDestinationIds: existingRule.destinations?.map(d => d.id) || [],
                });
            } else {
                setFormData(createDefaultFormData());
            }
            setCurrentStep(1);
            setValidationErrors({});
        }
    }, [isOpen, existingRule]);

    // Data fetching queries
    const { data: availableSchedules, isLoading: schedulesLoading } = useQuery({
        queryKey: ['schedules'],
        queryFn: () => getSchedules(),
        enabled: isOpen,
    });

    const { data: availableDestinations, isLoading: destinationsLoading } = useQuery({
        queryKey: ['storage-backends'],
        queryFn: () => getStorageBackendConfigs(),
        enabled: isOpen,
    });

    const { data: availableCrosswalkMaps, isLoading: crosswalkMapsLoading } = useQuery({
        queryKey: ['crosswalk-maps'],
        queryFn: () => getCrosswalkMaps(undefined),
        enabled: isOpen,
    });

    // Combined sources query with deduplication
    const { data: combinedSources, isLoading: sourcesLoading } = useQuery({
        queryKey: ['combined-sources'],
        queryFn: async () => {
            const [knownSources, dicomWebSources, dimseListeners, dimseQrSources] = await Promise.all([
                getKnownInputSources(),
                getDicomWebSources(),
                getDimseListenerConfigs(),
                getDimseQrSources(),
            ]);
            
            // Add type field to other sources for easier identification
            const typedDicomWebSources = dicomWebSources.map(source => ({ ...source, type: 'dicomweb' }));
            const typedDimseListeners = dimseListeners.map(source => ({ ...source, type: 'dimse_listener' }));
            const typedDimseQrSources = dimseQrSources.map(source => ({ ...source, type: 'dimse_qr' }));
            
            // Collect all specialized source names for deduplication
            const specializedSources = [...typedDicomWebSources, ...typedDimseListeners, ...typedDimseQrSources];
            const specializedSourceNames = new Set(specializedSources.map(source => source.name));
            
            // Also check for instance_id matches (for DIMSE listeners)
            const specializedInstanceIds = new Set(
                specializedSources
                    .filter(source => 'instance_id' in source)
                    .map(source => (source as any).instance_id)
                    .filter(Boolean)
            );
            
            // Only include known sources that don't have a specialized equivalent
            // Filter out duplicates by name and instance_id
            const uniqueKnownSources = knownSources
                .filter(source => {
                    // Don't include if we have a specialized source with the same name
                    if (specializedSourceNames.has(source)) {
                        return false;
                    }
                    // Don't include if we have a specialized source with the same instance_id
                    if (specializedInstanceIds.has(source)) {
                        return false;
                    }
                    return true;
                })
                .map((source, index) => ({
                    id: `known-${index}`,
                    name: source,
                    type: 'known',
                    description: `Known input source: ${source}`
                }));
            
            return [...uniqueKnownSources, ...typedDicomWebSources, ...typedDimseListeners, ...typedDimseQrSources];
        },
        enabled: isOpen,
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: createRule,
        onSuccess: (createdRule) => {
            queryClient.invalidateQueries({ queryKey: ['rules'] });
            toast.success('Rule created successfully!');
            onSuccess(createdRule);
            handleClose();
        },
        onError: (error) => {
            console.error('Error creating rule:', error);
            toast.error('Failed to create rule');
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ ruleId, data }: { ruleId: number; data: RuleUpdate }) => updateRule(ruleId, data),
        onSuccess: (updatedRule) => {
            queryClient.invalidateQueries({ queryKey: ['rules'] });
            toast.success('Rule updated successfully!');
            onSuccess(updatedRule);
            handleClose();
        },
        onError: (error) => {
            console.error('Error updating rule:', error);
            toast.error('Failed to update rule');
        },
    });

    const handleClose = useCallback(() => {
        setCurrentStep(1);
        setFormData(createDefaultFormData());
        setValidationErrors({});
        setIsSubmitting(false);
        onClose();
    }, [onClose]);

    const updateFormData = useCallback((updates: Partial<WizardFormData>) => {
        setFormData(prev => ({ ...prev, ...updates }));
        // Clear related validation errors
        setValidationErrors(prev => {
            const newErrors = { ...prev };
            Object.keys(updates).forEach(key => {
                delete newErrors[key];
            });
            return newErrors;
        });
    }, []);

    const validateCurrentStep = useCallback((): boolean => {
        const errors: Record<string, string> = {};

        switch (currentStep) {
            case 1:
                if (!formData.name.trim()) errors.name = 'Rule name is required';
                if (formData.priority < 1 || formData.priority > 1000) errors.priority = 'Priority must be between 1 and 1000';
                break;
            case 2:
                // Sources and match criteria are optional - no criteria means "match all"
                // This allows rules that process any data from any source to specific destinations
                break;
            case 3:
                // Tag modifications are optional, but if present, should be valid
                break;
            case 4:
                if (formData.selectedDestinationIds.length === 0) errors.selectedDestinationIds = 'At least one destination is required';
                break;
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    }, [currentStep, formData]);

    const handleNext = useCallback(() => {
        if (validateCurrentStep()) {
            setCurrentStep(prev => Math.min(prev + 1, WIZARD_STEPS.length));
        }
    }, [validateCurrentStep]);

    const handlePrevious = useCallback(() => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    }, []);

    const handleStepClick = useCallback((stepNumber: number) => {
        // Allow going to previous steps or current step, but validate before going forward
        if (stepNumber <= currentStep || validateCurrentStep()) {
            setCurrentStep(stepNumber);
        }
    }, [currentStep, validateCurrentStep]);

    const handleSubmit = useCallback(async () => {
        if (!validateCurrentStep()) return;

        setIsSubmitting(true);
        try {
            const ruleData: RuleCreate | RuleUpdate = {
                name: formData.name,
                description: formData.description || undefined,
                priority: formData.priority,
                is_active: formData.isActive,
                schedule_id: formData.selectedScheduleId || undefined,
                applicable_sources: formData.selectedSources,
                match_criteria: formData.matchCriteria.map(mc => ({
                    tag: mc.tag,
                    op: mc.op,
                    value: mc.value,
                })),
                association_criteria: formData.associationCriteria.length > 0 ? formData.associationCriteria.map(ac => ({
                    parameter: ac.parameter,
                    op: ac.op,
                    value: ac.value,
                })) : undefined,
                tag_modifications: formData.tagModifications.length > 0 ? formData.tagModifications : undefined,
                ai_prompt_config_ids: formData.selectedAiPromptConfigIds.length > 0 ? formData.selectedAiPromptConfigIds : undefined,
                destination_ids: formData.selectedDestinationIds,
            };

            if (existingRule) {
                updateMutation.mutate({ ruleId: existingRule.id, data: ruleData as RuleUpdate });
            } else {
                createMutation.mutate({ ...ruleData, ruleset_id: rulesetId } as RuleCreate);
            }
        } catch (error) {
            console.error('Error submitting rule:', error);
            toast.error('Failed to save rule');
        } finally {
            setIsSubmitting(false);
        }
    }, [formData, existingRule, rulesetId, validateCurrentStep, createMutation, updateMutation]);

    const isLoading = sourcesLoading || schedulesLoading || destinationsLoading || crosswalkMapsLoading;

    const renderStepContent = () => {
        const commonProps = {
            formData,
            updateFormData,
            validationErrors,
            isLoading,
        };

        switch (currentStep) {
            case 1:
                return (
                    <RuleWizardStep1
                        {...commonProps}
                        availableSchedules={availableSchedules || []}
                        schedulesLoading={schedulesLoading}
                    />
                );
            case 2:
                return (
                    <RuleWizardStep2
                        {...commonProps}
                        availableSources={combinedSources || []}
                        sourcesLoading={sourcesLoading}
                    />
                );
            case 3:
                return (
                    <RuleWizardStep3
                        {...commonProps}
                        availableCrosswalkMaps={availableCrosswalkMaps || []}
                        crosswalkMapsLoading={crosswalkMapsLoading}
                    />
                );
            case 4:
                return (
                    <RuleWizardStep4
                        {...commonProps}
                        availableDestinations={availableDestinations || []}
                        destinationsLoading={destinationsLoading}
                        availableSchedules={availableSchedules || []}
                        availableSources={combinedSources || []}
                        availableCrosswalkMaps={availableCrosswalkMaps || []}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-20" onClose={() => {}}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-30 dark:bg-opacity-60" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full justify-center p-4 py-8">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-xl transition-all flex flex-col my-auto">
                                {/* Header */}
                                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                                    <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                        {existingRule ? 'Edit Rule' : 'Create New Rule'}
                                    </Dialog.Title>
                                    <button
                                        onClick={handleClose}
                                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none"
                                        disabled={isSubmitting}
                                    >
                                        <XMarkIcon className="h-6 w-6" />
                                    </button>
                                </div>

                                {/* Progress Steps */}
                                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                                    <nav aria-label="Progress">
                                        <ol className="flex items-center justify-between">
                                            {WIZARD_STEPS.map((step, stepIdx) => (
                                                <li key={step.id} className="flex items-center">
                                                    <button
                                                        onClick={() => handleStepClick(step.id)}
                                                        disabled={isSubmitting}
                                                        className={cn(
                                                            'flex items-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-lg p-2',
                                                            step.id === currentStep
                                                                ? 'text-indigo-600 dark:text-indigo-400'
                                                                : step.id < currentStep
                                                                ? 'text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300'
                                                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                                        )}
                                                    >
                                                        <span
                                                            className={cn(
                                                                'flex h-8 w-8 items-center justify-center rounded-full border-2 mr-3',
                                                                step.id === currentStep
                                                                    ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-600 dark:bg-indigo-400 text-white'
                                                                    : step.id < currentStep
                                                                    ? 'border-green-600 dark:border-green-400 bg-green-600 dark:bg-green-400 text-white'
                                                                    : 'border-gray-300 dark:border-gray-600'
                                                            )}
                                                        >
                                                            {step.id < currentStep ? (
                                                                <CheckIcon className="h-5 w-5" />
                                                            ) : (
                                                                <span>{step.id}</span>
                                                            )}
                                                        </span>
                                                        <div className="text-left">
                                                            <div className="font-medium">{step.name}</div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                {step.description}
                                                            </div>
                                                        </div>
                                                    </button>
                                                    {stepIdx < WIZARD_STEPS.length - 1 && (
                                                        <ChevronRightIcon className="h-5 w-5 text-gray-300 dark:text-gray-600 mx-2" />
                                                    )}
                                                </li>
                                            ))}
                                        </ol>
                                    </nav>
                                </div>

                                {/* Step Content - Fixed height with scrolling */}
                                <div className="px-6 py-6 flex-1">
                                    {renderStepContent()}
                                </div>

                                {/* Footer */}
                                <div className="flex items-center justify-between px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                                    <button
                                        onClick={handlePrevious}
                                        disabled={currentStep === 1 || isSubmitting}
                                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeftIcon className="h-4 w-4 mr-2" />
                                        Previous
                                    </button>

                                    <div className="flex space-x-3">
                                        <button
                                            onClick={handleClose}
                                            disabled={isSubmitting}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>

                                        {currentStep < WIZARD_STEPS.length ? (
                                            <button
                                                onClick={handleNext}
                                                disabled={isSubmitting}
                                                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                                            >
                                                Next
                                                <ChevronRightIcon className="h-4 w-4 ml-2" />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleSubmit}
                                                disabled={isSubmitting}
                                                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                                            >
                                                {isSubmitting ? (
                                                    <>
                                                        <div className="animate-spin -ml-1 mr-3 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                                        Saving...
                                                    </>
                                                ) : (
                                                    existingRule ? 'Update Rule' : 'Create Rule'
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default RuleWizardModal;
