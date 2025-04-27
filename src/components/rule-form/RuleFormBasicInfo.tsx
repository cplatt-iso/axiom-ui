// src/components/rule-form/RuleFormBasicInfo.tsx
import React from 'react';
import { Switch } from '@headlessui/react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface RuleFormBasicInfoProps {
    name: string;
    description: string;
    priority: number;
    isActive: boolean;
    onNameChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
    onPriorityChange: (value: number) => void;
    onIsActiveChange: (value: boolean) => void;
    isLoading: boolean;
    validationErrors: Record<string, string>;
    baseInputStyles: string; // Pass base styles
    errorInputStyles: string; // Pass error styles
    normalInputStyles: string; // Pass normal styles
}

const RuleFormBasicInfo: React.FC<RuleFormBasicInfoProps> = ({
    name,
    description,
    priority,
    isActive,
    onNameChange,
    onDescriptionChange,
    onPriorityChange,
    onIsActiveChange,
    isLoading,
    validationErrors,
    baseInputStyles, // Receive styles as props
    errorInputStyles,
    normalInputStyles,
}) => {
    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name Field */}
                <div>
                    <Label htmlFor="ruleName">Name <span className="text-red-500">*</span></Label>
                    <Input
                        id="ruleName"
                        value={name}
                        onChange={(e) => onNameChange(e.target.value)}
                        required
                        disabled={isLoading}
                        aria-invalid={!!validationErrors['name']}
                        aria-describedby="ruleName-error"
                        className={`mt-1 ${validationErrors['name'] ? errorInputStyles : normalInputStyles} dark:bg-gray-700 `}
                    />
                    {validationErrors['name'] && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id="ruleName-error">{validationErrors['name']}</p>}
                </div>
                {/* Priority Field */}
                <div>
                    <Label htmlFor="rulePriority">Priority</Label>
                    <Input
                        id="rulePriority"
                        type="number"
                        value={priority}
                        onChange={(e) => onPriorityChange(parseInt(e.target.value, 10) || 0)}
                        disabled={isLoading}
                        aria-invalid={!!validationErrors['priority']}
                        aria-describedby="rulePriority-error"
                        className={`mt-1 ${validationErrors['priority'] ? errorInputStyles : normalInputStyles} dark:bg-gray-700 `}
                    />
                    {validationErrors['priority'] && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id="rulePriority-error">{validationErrors['priority']}</p>}
                </div>
            </div>
            {/* Description Field */}
            <div>
                <Label htmlFor="ruleDescription">Description</Label>
                <Textarea
                    id="ruleDescription"
                    value={description}
                    onChange={(e) => onDescriptionChange(e.target.value)}
                    rows={2}
                    disabled={isLoading}
                    aria-invalid={!!validationErrors['description']}
                    aria-describedby="ruleDescription-error"
                    className={`mt-1 ${validationErrors['description'] ? errorInputStyles : normalInputStyles} dark:bg-gray-700 `}
                />
                {validationErrors['description'] && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id="ruleDescription-error">{validationErrors['description']}</p>}
            </div>
            {/* Active Status Switch */}
            <div className="flex items-center pt-2">
                <Switch
                    checked={isActive}
                    onChange={isLoading ? () => {} : onIsActiveChange}
                    disabled={isLoading}
                    className={`${isActive ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    <span className={`${isActive ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                </Switch>
                <Label
                    htmlFor={undefined} // Switch doesn't need direct label link via htmlFor
                    onClick={() => !isLoading && onIsActiveChange(!isActive)}
                    className={`ml-3 text-sm font-medium ${isLoading ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300 cursor-pointer'}`}
                >
                    Active
                </Label>
                 {validationErrors['is_active'] && <p className="ml-4 text-xs text-red-600 dark:text-red-400">{validationErrors['is_active']}</p>}
            </div>
        </>
    );
};

export default RuleFormBasicInfo;
