// src/components/rule-form/RuleFormSchedule.tsx
import React from 'react';
import { Schedule } from '@/schemas'; // API Schema Type
import { Label } from "@/components/ui/label"; // Shadcn Label
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"; // Shadcn Select components
import { cn } from "@/lib/utils"; // For conditional classes

interface RuleFormScheduleProps {
    selectedScheduleId: number | null | undefined;
    availableSchedules: Schedule[]; // Array of Schedule objects from API
    onScheduleChange: (scheduleId: number | null) => void; // Callback to update parent state
    isLoading: boolean; // General loading state for the form
    schedulesLoading: boolean; // Specific loading state for schedules data
    schedulesError: Error | null; // Error object if schedules fetch failed
    validationErrors: Record<string, string | undefined>; // Validation errors object
    // Remove style props if not needed, or adjust as necessary
    // baseInputStyles: string;
    // errorInputStyles: string;
    // normalInputStyles: string;
    containerRef: React.RefObject<HTMLDivElement | null>; // Prop for Radix Portal container fix
}

// Re-define style constants locally if needed
const baseInputStyles = "block w-full rounded-md shadow-sm sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 border focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed py-2 pl-3 px-3";
const errorInputStyles = "border-red-500 focus:border-red-500 focus:ring-red-500";
const normalInputStyles = "border-gray-300 dark:border-gray-600";

const RuleFormSchedule: React.FC<RuleFormScheduleProps> = ({
    selectedScheduleId,
    availableSchedules,
    onScheduleChange,
    isLoading, // Use for disabling component
    schedulesLoading, // Use for "Loading..." text
    schedulesError,
    validationErrors,
    // baseInputStyles, // Use local constants or pass explicitly if needed
    // errorInputStyles,
    // normalInputStyles,
    containerRef, // Use this for SelectContent portal
}) => {
    // Determine error state based on validationErrors prop
    const scheduleIdError = validationErrors?.['schedule_id'];
    const hasError = !!scheduleIdError;

    // Handler for when the Select value changes
    const handleValueChange = (value: string) => {
        if (value === "none") {
            onScheduleChange(null); // Pass null if "None" is selected
        } else {
            const id = parseInt(value, 10);
            onScheduleChange(isNaN(id) ? null : id); // Pass the parsed number or null
        }
    };

    // Determine the value prop for the Select component
    const selectValue = selectedScheduleId === null || selectedScheduleId === undefined
        ? "none" // Use "none" for the placeholder/default option
        : selectedScheduleId.toString(); // Convert the number ID to string for Select value

    // Ensure availableSchedules is an array
    const schedulesToDisplay = Array.isArray(availableSchedules) ? availableSchedules : [];

    return (
        <fieldset className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <legend className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
                Schedule (Optional)
            </legend>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Select a schedule to control when this rule is active. If "None" is selected, the rule is active whenever its main 'Active' toggle is on.
            </p>
            <div className="space-y-1"> {/* Added space-y-1 for spacing */}
                {/* Label is associated via SelectTrigger's id */}
                <Label htmlFor="ruleSchedule" className="sr-only">
                    Schedule
                </Label>
                <Select
                    onValueChange={handleValueChange}
                    value={selectValue}
                    disabled={isLoading || schedulesLoading} // Disable if general form is loading OR schedules are loading
                    required={false} // Schedule is optional
                    // No need for aria-invalid here, it's handled on the trigger
                >
                    {/* Apply conditional styles directly to the trigger */}
                    <SelectTrigger
                        id="ruleSchedule" // Assign ID for label association
                        className={cn(
                            baseInputStyles, // Base styles
                            hasError ? errorInputStyles : normalInputStyles, // Error/normal border
                            "dark:bg-gray-700" // Dark mode background
                        )}
                        aria-invalid={hasError} // Set aria-invalid based on error state
                        aria-describedby={hasError ? "schedule-error" : undefined} // Link error message
                    >
                        <SelectValue placeholder={
                            schedulesLoading ? "Loading schedules..." :
                            schedulesError ? "Error loading schedules" :
                            "Select a schedule..."
                        } />
                    </SelectTrigger>
                    {/* Pass containerRef to SelectContent for portal fix */}
                    <SelectContent container={containerRef?.current}>
                        {/* Default "None" option */}
                        <SelectItem value="none">None (Always Active)</SelectItem>

                        {/* Conditional rendering for loading/error/empty/options */}
                        {schedulesError ? (
                            <div className="px-2 py-1 text-sm text-red-600 italic">Error loading</div>
                        ) : schedulesLoading ? (
                            <div className="px-2 py-1 text-sm text-gray-500 italic">Loading...</div>
                        ) : schedulesToDisplay.length === 0 ? (
                            <div className="px-2 py-1 text-sm text-gray-500 italic">No enabled schedules found</div>
                        ) : (
                            // Map over the available (and already filtered for enabled) schedules
                            schedulesToDisplay.map(schedule => (
                                <SelectItem key={schedule.id} value={schedule.id.toString()}>
                                    [{schedule.id}] - {schedule.name}
                                </SelectItem>
                            ))
                        )}
                    </SelectContent>
                </Select>
                {/* Display validation error message */}
                {scheduleIdError && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400" id="schedule-error">
                        {scheduleIdError}
                    </p>
                )}
            </div>
        </fieldset>
    );
};

export default RuleFormSchedule;
