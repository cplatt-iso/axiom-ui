// src/components/rule-form/RuleFormBasicInfo.tsx
import React from 'react';
import { Switch } from '@headlessui/react'; // Assuming you still use Headless UI Switch

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from "@/lib/utils"; // Import cn for conditional classes

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
    validationErrors: Record<string, string>; // Keep this for error messages
    // Remove style props if not strictly needed, or adjust as necessary
    // baseInputStyles: string;
    // errorInputStyles: string;
    // normalInputStyles: string;
}

// Re-define style constants locally if needed, or pass them down differently
const baseInputStyles = "block w-full rounded-md shadow-sm sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 border focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed py-2 pl-3 px-3";
const errorInputStyles = "border-red-500 focus:border-red-500 focus:ring-red-500";
const normalInputStyles = "border-gray-300 dark:border-gray-600";


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
    // Remove style props from destructuring if defined locally
    // baseInputStyles,
    // errorInputStyles,
    // normalInputStyles,
}) => {
    // Determine error state based on validationErrors prop
    const nameError = validationErrors?.['name'];
    const priorityError = validationErrors?.['priority'];
    const descriptionError = validationErrors?.['description'];
    const isActiveError = validationErrors?.['is_active'];

    return (
        <>
            {/* Basic Info Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name Field */}
                <div className="space-y-1"> {/* Added space-y-1 for better spacing */}
                    <Label htmlFor="ruleName">
                        Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        id="ruleName" // Use a simple ID
                        value={name}
                        onChange={(e) => onNameChange(e.target.value)}
                        required
                        disabled={isLoading}
                        aria-invalid={!!nameError} // Set aria-invalid based on error state
                        aria-describedby={nameError ? "ruleName-error" : undefined} // Link to error message if exists
                        // Apply conditional styling using cn
                        className={cn(
                            baseInputStyles,
                            nameError ? errorInputStyles : normalInputStyles,
                            "mt-1 dark:bg-gray-700" // Ensure dark mode style is included
                        )}
                        placeholder="Descriptive rule name"
                    />
                    {nameError && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400" id="ruleName-error">
                            {nameError}
                        </p>
                    )}
                </div>

                {/* Priority Field */}
                <div className="space-y-1"> {/* Added space-y-1 */}
                    <Label htmlFor="rulePriority">
                        Priority
                    </Label>
                    <Input
                        id="rulePriority" // Use a simple ID
                        type="number"
                        value={priority}
                        onChange={(e) => onPriorityChange(parseInt(e.target.value, 10) || 0)}
                        disabled={isLoading}
                        aria-invalid={!!priorityError} // Set aria-invalid
                        aria-describedby={priorityError ? "rulePriority-error" : undefined} // Link to error
                        // Apply conditional styling
                        className={cn(
                            baseInputStyles,
                            priorityError ? errorInputStyles : normalInputStyles,
                            "mt-1 dark:bg-gray-700"
                        )}
                        placeholder="Lower numbers run first (e.g., 100)"
                    />
                    {priorityError && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400" id="rulePriority-error">
                            {priorityError}
                        </p>
                    )}
                </div>
            </div>

            {/* Description Field */}
            <div className="space-y-1"> {/* Added space-y-1 */}
                <Label htmlFor="ruleDescription">
                    Description
                </Label>
                <Textarea
                    id="ruleDescription" // Use a simple ID
                    value={description}
                    onChange={(e) => onDescriptionChange(e.target.value)}
                    rows={2}
                    disabled={isLoading}
                    aria-invalid={!!descriptionError} // Set aria-invalid
                    aria-describedby={descriptionError ? "ruleDescription-error" : undefined} // Link to error
                    // Apply conditional styling
                    className={cn(
                        // Use Shadcn's base textarea styles (from ui/textarea.tsx) and add margin
                        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                        descriptionError ? errorInputStyles : normalInputStyles, // Apply error border if needed
                        "mt-1 dark:bg-gray-700" // Add specific dark mode bg and margin
                    )}
                    placeholder="Optional: Explain what this rule does"
                />
                {descriptionError && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400" id="ruleDescription-error">
                        {descriptionError}
                    </p>
                )}
            </div>

            {/* Active Status Switch */}
            <div className="flex items-center pt-2 space-x-3"> {/* Added space-x-3 */}
                <Switch
                    checked={isActive}
                    onChange={isLoading ? () => {} : onIsActiveChange} // Prevent change while loading
                    disabled={isLoading}
                    className={cn(
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800',
                        isActive ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600',
                        'disabled:opacity-50 disabled:cursor-not-allowed' // Added disabled styles
                    )}
                    aria-invalid={!!isActiveError}
                    aria-describedby={isActiveError ? "ruleIsActive-error" : undefined}
                >
                    <span className="sr-only">Enable this rule</span> {/* Better accessibility */}
                    <span
                        className={cn(
                            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                            isActive ? 'translate-x-6' : 'translate-x-1'
                        )}
                    />
                </Switch>
                {/* Link Label to Switch via click handler */}
                <Label
                    onClick={() => !isLoading && onIsActiveChange(!isActive)} // Trigger change on label click if not loading
                    className={cn(
                        'text-sm font-medium',
                        isLoading ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'text-gray-700 dark:text-gray-300 cursor-pointer'
                    )}
                >
                    Active
                </Label>
                 {isActiveError && (
                    <p className="text-xs text-red-600 dark:text-red-400" id="ruleIsActive-error">
                        {isActiveError}
                    </p>
                )}
            </div>
        </>
    );
};

export default RuleFormBasicInfo;
