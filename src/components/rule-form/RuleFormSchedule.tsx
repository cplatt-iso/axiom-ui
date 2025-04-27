// src/components/rule-form/RuleFormSchedule.tsx
import React from 'react';
import { ScheduleRead } from '@/schemas';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface RuleFormScheduleProps {
    selectedScheduleId: number | null | undefined;
    availableSchedules: ScheduleRead[];
    onScheduleChange: (scheduleId: number | null) => void;
    isLoading: boolean;
    schedulesLoading: boolean;
    schedulesError: Error | null;
    validationErrors: Record<string, string>;
    baseInputStyles: string;
    errorInputStyles: string;
    normalInputStyles: string;
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
    const scheduleIdError = validationErrors && validationErrors['schedule_id'];
    const hasError = !!scheduleIdError;

    const handleValueChange = (value: string) => {
        if (value === "none") {
            onScheduleChange(null);
        } else {
            const id = parseInt(value, 10);
            onScheduleChange(isNaN(id) ? null : id);
        }
    };

    const selectValue = selectedScheduleId === null || selectedScheduleId === undefined
        ? "none"
        : selectedScheduleId.toString();

    const schedulesToDisplay = Array.isArray(availableSchedules) ? availableSchedules : [];

    return (
        <fieldset className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <legend className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
                Schedule (Optional)
            </legend>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Select a schedule to control when this rule is active. If "None" is selected, the rule is active whenever its main 'Active' toggle is on.
            </p>
            <div>
                <Label htmlFor="ruleSchedule" className="sr-only">Schedule</Label>
                <Select
                    onValueChange={handleValueChange}
                    value={selectValue}
                    disabled={isLoading || schedulesLoading}
                    required={false}
                    aria-invalid={hasError}
                >
                    <SelectTrigger
                        id="ruleSchedule"
                        className={`${baseInputStyles} ${hasError ? errorInputStyles : normalInputStyles} dark:bg-gray-700`}
                        aria-describedby={hasError ? "schedule-error" : undefined}
                    >
                        <SelectValue placeholder={
                            schedulesLoading ? "Loading schedules..." :
                            schedulesError ? "Error loading schedules" :
                            "Select a schedule..."
                        } />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">None (Always Active)</SelectItem>
                        {schedulesError ? (
                            <div className="px-2 py-1 text-sm text-red-600 italic">Error loading</div>
                        ) : schedulesLoading ? (
                            <div className="px-2 py-1 text-sm text-gray-500 italic">Loading...</div>
                        ) : schedulesToDisplay.length === 0 ? (
                            <div className="px-2 py-1 text-sm text-gray-500 italic">No schedules configured</div>
                        ) : (
                            schedulesToDisplay.map(schedule => (
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
