// src/components/rule-form/RuleFormSchedule.tsx
import React from 'react';
import { ScheduleRead } from '@/schemas'; // Import the ScheduleRead schema
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFormField } from '@/components/ui/form'; // Import useFormField if needed for accessibility linking

interface RuleFormScheduleProps {
    selectedScheduleId: number | null | undefined; // ID of the currently selected schedule, or null/undefined
    availableSchedules: ScheduleRead[]; // List of fetched, *enabled* schedules
    onScheduleChange: (scheduleId: number | null) => void; // Callback returns number or null
    isLoading: boolean; // Combined loading state (form submission + schedule fetching)
    schedulesLoading: boolean; // Specific loading state for schedules
    schedulesError: Error | null; // Specific error state for schedules
    validationErrors: Record<string, string>;
    baseInputStyles: string; // Pass base styles for SelectTrigger
    errorInputStyles: string; // Pass error styles
    normalInputStyles: string; // Pass normal styles
}

const RuleFormSchedule: React.FC<RuleFormScheduleProps> = ({
    selectedScheduleId,
    availableSchedules,
    onScheduleChange,
    isLoading,
    schedulesLoading,
    schedulesError,
    validationErrors,
    baseInputStyles,
    errorInputStyles,
    normalInputStyles,
}) => {
    const scheduleIdError = validationErrors['schedule_id'];
    const hasError = !!scheduleIdError;

    // Handle change: Convert string value from Select back to number or null
    const handleValueChange = (value: string) => {
        if (value === "none") {
            onScheduleChange(null);
        } else {
            const id = parseInt(value, 10);
            onScheduleChange(isNaN(id) ? null : id);
        }
    };

    // Determine the string value for the Select component
    const selectValue = selectedScheduleId === null || selectedScheduleId === undefined
        ? "none"
        : selectedScheduleId.toString();

    return (
        <fieldset className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <legend className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
                Schedule (Optional)
            </legend>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Select a schedule to control when this rule is active. If "None" is selected, the rule is active whenever its main 'Active' toggle is on.
            </p>
            <div>
                <Label htmlFor="ruleSchedule" className="sr-only">Schedule</Label> {/* Hidden label for accessibility */}
                <Select
                    onValueChange={handleValueChange}
                    value={selectValue}
                    disabled={isLoading || schedulesLoading} // Disable if form submitting or schedules loading
                    required={false} // Not strictly required, null is valid
                    aria-invalid={hasError}
                >
                    <SelectTrigger
                        id="ruleSchedule"
                        className={`${baseInputStyles} ${hasError ? errorInputStyles : normalInputStyles} dark:bg-gray-700`}
                        aria-describedby="schedule-error" // Link error message
                    >
                        <SelectValue placeholder={
                            schedulesLoading ? "Loading schedules..." :
                            schedulesError ? "Error loading schedules" :
                            "Select a schedule..."
                        } />
                    </SelectTrigger>
                    <SelectContent>
                        {/* Always include the "None" option */}
                        <SelectItem value="none">None (Always Active)</SelectItem>

                        {/* Render fetched schedules */}
                        {schedulesError ? (
                            <div className="px-2 py-1 text-sm text-red-600 italic">Error loading</div>
                        ) : schedulesLoading ? (
                            <div className="px-2 py-1 text-sm text-gray-500 italic">Loading...</div>
                        ) : availableSchedules.length === 0 ? (
                            <div className="px-2 py-1 text-sm text-gray-500 italic">No schedules configured</div>
                        ) : (
                            availableSchedules.map(schedule => (
                                <SelectItem key={schedule.id} value={schedule.id.toString()}>
                                    [{schedule.id}] - {schedule.name}
                                </SelectItem>
                            ))
                        )}
                    </SelectContent>
                </Select>
                {scheduleIdError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id="schedule-error">{scheduleIdError}</p>}
            </div>
        </fieldset>
    );
};

export default RuleFormSchedule;
