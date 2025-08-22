// src/components/rule-wizard/RuleWizardStep1.tsx
import React from 'react';
import { InformationCircleIcon, ClockIcon, PlayIcon, PauseIcon } from '@heroicons/react/24/outline';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@headlessui/react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Schedule } from '@/schemas';

interface WizardFormData {
    name: string;
    description: string;
    priority: number;
    isActive: boolean;
    selectedScheduleId: number | null;
    selectedSources: string[];
    matchCriteria: any[];
    associationCriteria: any[];
    tagModifications: any[];
    selectedAiPromptConfigIds: number[];
    selectedDestinationIds: number[];
}

interface RuleWizardStep1Props {
    formData: WizardFormData;
    updateFormData: (updates: Partial<WizardFormData>) => void;
    validationErrors: Record<string, string>;
    isLoading: boolean;
    availableSchedules: Schedule[];
    schedulesLoading: boolean;
}

const RuleWizardStep1: React.FC<RuleWizardStep1Props> = ({
    formData,
    updateFormData,
    validationErrors,
    isLoading,
    availableSchedules,
    schedulesLoading,
}) => {
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateFormData({ name: e.target.value });
    };

    const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        updateFormData({ description: e.target.value });
    };

    const handlePriorityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value)) {
            updateFormData({ priority: value });
        }
    };

    const handleActiveToggle = (checked: boolean) => {
        updateFormData({ isActive: checked });
    };

    const handleScheduleChange = (value: string) => {
        const scheduleId = value === 'none' ? null : parseInt(value, 10);
        updateFormData({ selectedScheduleId: scheduleId });
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
                    <InformationCircleIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="mt-2">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Rule Identity & Basic Setup
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Give your rule a name and configure its basic settings
                    </p>
                </div>
            </div>

            {/* Form Content */}
            <div className="mx-auto max-w-2xl">
                <div className="space-y-4">
                    {/* Rule Name */}
                    <div className="space-y-1">
                        <Label htmlFor="rule-name" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Rule Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="rule-name"
                            type="text"
                            value={formData.name}
                            onChange={handleNameChange}
                            placeholder="Enter a descriptive name for your rule"
                            disabled={isLoading}
                            className={cn(
                                "h-9",
                                validationErrors.name && "border-red-300 focus:border-red-500 focus:ring-red-500"
                            )}
                        />
                        {validationErrors.name && (
                            <p className="text-sm text-red-600 dark:text-red-400">{validationErrors.name}</p>
                        )}
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                        <Label htmlFor="rule-description" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Description
                        </Label>
                        <Textarea
                            id="rule-description"
                            value={formData.description}
                            onChange={handleDescriptionChange}
                            placeholder="Provide additional details about this rule's purpose"
                            rows={2}
                            disabled={isLoading}
                            className="resize-none text-sm"
                        />
                    </div>

                    {/* Priority and Active Status */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {/* Priority */}
                        <div className="space-y-1">
                            <Label htmlFor="rule-priority" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                Priority
                            </Label>
                            <Input
                                id="rule-priority"
                                type="number"
                                min="1"
                                max="1000"
                                value={formData.priority}
                                onChange={handlePriorityChange}
                                disabled={isLoading}
                                className={cn(
                                    "h-9",
                                    validationErrors.priority && "border-red-300 focus:border-red-500 focus:ring-red-500"
                                )}
                            />
                            {validationErrors.priority && (
                                <p className="text-sm text-red-600 dark:text-red-400">{validationErrors.priority}</p>
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Lower numbers = higher priority (1-1000)
                            </p>
                        </div>

                        {/* Active Status */}
                        <div className="space-y-1">
                            <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                Rule Status
                            </Label>
                            <div className="flex items-center space-x-3 h-9">
                                <Switch
                                    checked={formData.isActive}
                                    onChange={handleActiveToggle}
                                    disabled={isLoading}
                                    className={cn(
                                        formData.isActive ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700',
                                        'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
                                    )}
                                >
                                    <span className="sr-only">Toggle rule active status</span>
                                    <span
                                        aria-hidden="true"
                                        className={cn(
                                            formData.isActive ? 'translate-x-4' : 'translate-x-0',
                                            'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
                                        )}
                                    />
                                </Switch>
                                <div className="flex items-center space-x-1">
                                    {formData.isActive ? (
                                        <>
                                            <PlayIcon className="h-3 w-3 text-green-500" />
                                            <span className="text-sm text-green-700 dark:text-green-400 font-medium">Active</span>
                                        </>
                                    ) : (
                                        <>
                                            <PauseIcon className="h-3 w-3 text-gray-500" />
                                            <span className="text-sm text-gray-700 dark:text-gray-400 font-medium">Inactive</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Schedule Selection */}
                    <div className="space-y-1">
                        <Label htmlFor="rule-schedule" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Schedule
                        </Label>
                        <Select
                            value={formData.selectedScheduleId?.toString() || 'none'}
                            onValueChange={handleScheduleChange}
                            disabled={isLoading || schedulesLoading}
                        >
                            <SelectTrigger className="w-full h-9">
                                <div className="flex items-center">
                                    <ClockIcon className="h-4 w-4 text-gray-400 mr-2" />
                                    <SelectValue placeholder="Choose when this rule runs" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">
                                    <div className="flex items-center">
                                        <div className="h-2 w-2 rounded-full bg-green-400 mr-2" />
                                        Always Active (No schedule)
                                    </div>
                                </SelectItem>
                                {availableSchedules?.map((schedule) => (
                                    <SelectItem key={schedule.id} value={schedule.id.toString()}>
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center">
                                                <div className="h-2 w-2 rounded-full bg-indigo-400 mr-2" />
                                                <span>{schedule.name}</span>
                                            </div>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RuleWizardStep1;
