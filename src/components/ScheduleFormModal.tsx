// src/components/ScheduleFormModal.tsx
// --- MODIFIED: Removed useCallback ---
import React, { useState, useEffect, Fragment, FormEvent } from 'react';
// --- END MODIFIED ---
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createSchedule, updateSchedule } from '../services/api';
// --- MODIFIED: Updated imports from schemas ---
import {
    Schedule, // Use the renamed Schedule type for existingSchedule
    ScheduleCreate,
    ScheduleUpdate,
    type TimeRange as APITimeRange, // Type for a time range object from API
    ALLOWED_DAYS_FRONTEND // Constant for allowed day strings
} from '@/schemas';
// --- END MODIFIED ---

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { CheckedState } from '@radix-ui/react-checkbox';


interface ScheduleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingSchedule: Schedule | null;
}

// --- MODIFIED: Define DayOfWeek and update TimeRangeState ---
type DayOfWeek = typeof ALLOWED_DAYS_FRONTEND[number];
type TimeRangeState = Omit<APITimeRange, 'days'> & { days: Set<DayOfWeek> };
// --- END MODIFIED ---

// --- MODIFIED: Update defaultTimeRange with DayOfWeek type ---
const defaultTimeRange: TimeRangeState = {
    days: new Set<DayOfWeek>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']),
    start_time: '00:00',
    end_time: '23:59',
};
// --- END MODIFIED ---

// const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]; // Replaced by ALLOWED_DAYS_FRONTEND

const ScheduleFormModal: React.FC<ScheduleFormModalProps> = ({
  isOpen,
  onClose,
  existingSchedule,
}) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [timeRanges, setTimeRanges] = useState<TimeRangeState[]>([defaultTimeRange]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const isEditMode = !!existingSchedule;

  useEffect(() => {
    if (isOpen) {
      setValidationErrors({});
      if (existingSchedule) {
        setName(existingSchedule.name);
        setDescription(existingSchedule.description ?? '');
        setIsEnabled(existingSchedule.is_enabled ?? true);
        setTimeRanges(
          // --- MODIFIED: Explicitly type 'range' and ensure correct Set initialization ---
          (existingSchedule.time_ranges ?? [deepCloneTimeRange(defaultTimeRange)]).map(
            (range: APITimeRange | TimeRangeState) => ({ // Explicit type for range
            ...range,
            // range.days is DayOfWeek[] from APITimeRange or Set<DayOfWeek> from TimeRangeState
            // new Set() handles both iterables correctly.
            days: new Set(range.days), 
          }))
          // --- END MODIFIED ---
        );
      } else {
        setName('');
        setDescription('');
        setIsEnabled(true);
        setTimeRanges([deepCloneTimeRange(defaultTimeRange)]);
      }
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen, existingSchedule]);

  const deepCloneTimeRange = (range: TimeRangeState): TimeRangeState => ({
      ...range,
      days: new Set(range.days),
  });

  const handleTimeRangeChange = (index: number, field: keyof TimeRangeState, value: any) => {
    setTimeRanges(prevRanges => {
       const newRanges = prevRanges.map((range, i) => {
            if (i === index) {
                const updatedRange = { ...range };
                if (field === 'days' && typeof value === 'function') {
                    updatedRange.days = value(range.days); 
                } else {
                    (updatedRange as any)[field] = value;
                }
                return updatedRange;
            }
            return range;
        });
        return newRanges;
    });
    setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`time_ranges[${index}].${field}`];
        delete newErrors['time_ranges'];
        return newErrors;
    });
  };

   // --- MODIFIED: Update day parameter type ---
   const handleDayToggle = (rangeIndex: number, day: DayOfWeek, checked: boolean) => {
   // --- END MODIFIED ---
        handleTimeRangeChange(rangeIndex, 'days', (prevDays: Set<DayOfWeek>) => {
            const newDays = new Set(prevDays);
            if (checked) {
                newDays.add(day);
            } else {
                newDays.delete(day);
            }
            return newDays;
        });
   };

  const addTimeRange = () => {
    setTimeRanges(prev => [...prev, deepCloneTimeRange(defaultTimeRange)]);
  };

  const removeTimeRange = (index: number) => {
    setTimeRanges(prev => prev.filter((_, i) => i !== index));
     setValidationErrors(prev => {
         const newErrors: Record<string, string> = {};
         Object.entries(prev).forEach(([key, message]) => {
             const match = key.match(/^time_ranges\[(\d+)\]\.(.+)$/);
             if (match) {
                 const errorIndex = parseInt(match[1], 10);
                 const fieldName = match[2];
                 if (errorIndex > index) {
                     newErrors[`time_ranges[${errorIndex - 1}].${fieldName}`] = message;
                 } else if (errorIndex < index) {
                     newErrors[key] = message;
                 }
             } else {
                  newErrors[key] = message;
             }
         });
         delete newErrors['time_ranges'];
         return newErrors;
     });
  };

   const createMutation = useMutation({
       mutationFn: createSchedule,
       onSuccess: (data) => {
           toast.success(`Schedule "${data.name}" created successfully.`);
           queryClient.invalidateQueries({ queryKey: ['schedules'] });
           onClose();
       },
   });
   const updateMutation = useMutation({
       mutationFn: (payload: { id: number; data: ScheduleUpdate }) => updateSchedule(payload.id, payload.data),
       onSuccess: (data) => {
           toast.success(`Schedule "${data.name}" updated successfully.`);
           queryClient.invalidateQueries({ queryKey: ['schedules'] });
           queryClient.invalidateQueries({ queryKey: ['schedule', data.id] });
           onClose();
       },
   });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setValidationErrors({});
    setIsLoading(true);

    // --- MODIFIED: Use ALLOWED_DAYS_FRONTEND for sorting ---
    const rangesForApi = timeRanges.map(range => ({
        ...range,
        // Array.from(range.days) will be DayOfWeek[]
        days: Array.from(range.days).sort((a, b) => ALLOWED_DAYS_FRONTEND.indexOf(a) - ALLOWED_DAYS_FRONTEND.indexOf(b))
    }));
    // --- END MODIFIED ---

    if (!name.trim()) {
        setValidationErrors(prev => ({...prev, name: 'Schedule name is required.'}));
        setError("Please fix validation errors.");
        setIsLoading(false);
        return;
    }
     if (rangesForApi.length === 0) {
        setValidationErrors(prev => ({...prev, time_ranges: 'At least one time range is required.'}));
        setError("Please fix validation errors.");
        setIsLoading(false);
        return;
     }
     let rangeErrors: Record<string, string> = {};
     rangesForApi.forEach((range, index) => {
         if (range.days.length === 0) rangeErrors[`time_ranges[${index}].days`] = 'Select at least one day.';
         if (!range.start_time.match(/^([01]\d|2[0-3]):([0-5]\d)$/)) rangeErrors[`time_ranges[${index}].start_time`] = 'Invalid HH:MM format.';
         if (!range.end_time.match(/^([01]\d|2[0-3]):([0-5]\d)$/)) rangeErrors[`time_ranges[${index}].end_time`] = 'Invalid HH:MM format.';
     });
     if (Object.keys(rangeErrors).length > 0) {
         setValidationErrors(prev => ({...prev, ...rangeErrors}));
         setError("Please fix validation errors in time ranges.");
         setIsLoading(false);
         return;
     }

    const commonPayload = {
        name: name.trim(),
        description: description.trim() || null,
        is_enabled: isEnabled,
        time_ranges: rangesForApi, // This is now correctly DayOfWeek[][]
    };

    try {
        if (isEditMode && existingSchedule) {
            // commonPayload is assignable to ScheduleUpdate because rangesForApi.days is DayOfWeek[]
            const updatePayload: ScheduleUpdate = commonPayload; 
            await updateMutation.mutateAsync({ id: existingSchedule.id, data: updatePayload });
        } else {
            // commonPayload is assignable to ScheduleCreate
            const createPayload: ScheduleCreate = commonPayload;
            await createMutation.mutateAsync(createPayload);
        }
    } catch (err: any) {
        console.error(`Failed to ${isEditMode ? 'update' : 'create'} schedule:`, err);
        if (err?.status === 422 && err?.detail) {
             const backendErrors: Record<string, string> = {};
             if (Array.isArray(err.detail)) {
                 err.detail.forEach((validationError: any) => {
                     const key = (validationError.loc || []).slice(1).map((item: string | number) => typeof item === 'number' ? `[${item}]` : `${item}`).join('.').replace(/\.\[/g, '[');
                     backendErrors[key || 'general'] = validationError.msg || 'Invalid input.';
                 });
             } else if (typeof err.detail === 'string') {
                  backendErrors['general'] = err.detail;
             } else {
                  backendErrors['general'] = 'Unknown validation error from server.';
             }
             setValidationErrors(backendErrors);
             setError("Please fix validation errors from the server.");
             toast.error("Validation Error", { description: "Server rejected the input." });
         } else {
            const message = err?.detail || err?.message || `Failed to ${isEditMode ? 'update' : 'create'} schedule.`;
            setError(message);
            toast.error("Save Failed", { description: message });
         }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-30" onClose={onClose}>
        <Transition.Child as={Fragment} >
             <div className="fixed inset-0 bg-black bg-opacity-30 dark:bg-opacity-60" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child as={Fragment} >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-0 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <span>{isEditMode ? 'Edit Schedule' : 'Create New Schedule'}</span>
                    <button onClick={onClose} disabled={isLoading} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none disabled:opacity-50">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </Dialog.Title>

                <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto p-6">
                     {error && ( <Alert variant="destructive" className="mb-4"> <AlertCircle className="h-4 w-4" /> <AlertTitle>Error</AlertTitle> <AlertDescription>{error}</AlertDescription> </Alert> )}
                     {validationErrors['general'] && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{validationErrors['general']}</p>}

                     <div>
                        <Label htmlFor="scheduleName">Name <span className="text-red-500">*</span></Label>
                        {/* --- MODIFIED: Corrected setValidationErrors call for name --- */}
                        <Input id="scheduleName" value={name} onChange={(e) => {setName(e.target.value); setValidationErrors(p => { const newErr = {...p}; delete newErr.name; return newErr; })}} required disabled={isLoading} aria-invalid={!!validationErrors['name']} aria-describedby="scheduleName-error" className={`mt-1 ${validationErrors['name'] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} dark:bg-gray-700`} />
                        {/* --- END MODIFIED --- */}
                        {validationErrors['name'] && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id="scheduleName-error">{validationErrors['name']}</p>}
                     </div>
                     <div>
                        <Label htmlFor="scheduleDescription">Description</Label>
                        <Textarea id="scheduleDescription" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} disabled={isLoading} className="mt-1 border-gray-300 dark:border-gray-600 dark:bg-gray-700" />
                     </div>
                     <div className="flex items-center">
                         {/* --- MODIFIED: Corrected onCheckedChange for isEnabled Checkbox --- */}
                         <Checkbox id="scheduleEnabled" checked={isEnabled} onCheckedChange={(checked: CheckedState) => { if(typeof checked === 'boolean') setIsEnabled(checked);}} disabled={isLoading} className="mr-2"/>
                         {/* --- END MODIFIED --- */}
                         <Label htmlFor="scheduleEnabled" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">Enabled</Label>
                     </div>

                     <fieldset className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                        <legend className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">Active Time Ranges <span className="text-red-500">*</span></legend>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Define one or more time windows when this schedule is active (times are UTC).</p>
                         {validationErrors['time_ranges'] && <p className="mt-1 text-xs text-red-600 dark:text-red-400 mb-2" id="time_ranges-error">{validationErrors['time_ranges']}</p>}
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2 scrollbar-thin">
                             {timeRanges.map((range, index) => (
                                 <div key={index} className="p-3 border border-gray-200 dark:border-gray-600 rounded-md space-y-3 relative bg-gray-50 dark:bg-gray-700/50">
                                     <div>
                                         <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1.5">Days of Week*</Label>
                                         <div className="grid grid-cols-4 sm:grid-cols-7 gap-x-2 gap-y-1">
                                             {/* --- MODIFIED: Use ALLOWED_DAYS_FRONTEND for iteration --- */}
                                             {ALLOWED_DAYS_FRONTEND.map(day => (
                                             // --- END MODIFIED ---
                                                 <div key={day} className="flex items-center">
                                                     <Checkbox
                                                        id={`day-${index}-${day}`}
                                                        checked={range.days.has(day)}
                                                        // The !!checked is okay here as handleDayToggle expects boolean
                                                        onCheckedChange={(checked: CheckedState) => handleDayToggle(index, day, !!checked)}
                                                        disabled={isLoading}
                                                        className="mr-1.5 h-3.5 w-3.5"
                                                        aria-invalid={!!validationErrors[`time_ranges[${index}].days`]}
                                                    />
                                                     <Label htmlFor={`day-${index}-${day}`} className="text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer">{day}</Label>
                                                 </div>
                                             ))}
                                         </div>
                                         {validationErrors[`time_ranges[${index}].days`] && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validationErrors[`time_ranges[${index}].days`]}</p>}
                                     </div>
                                     <div className="grid grid-cols-2 gap-3">
                                         <div>
                                             <Label htmlFor={`start-${index}`} className="text-xs font-medium text-gray-700 dark:text-gray-300">Start Time (UTC)*</Label>
                                             <Input type="time" id={`start-${index}`} value={range.start_time} onChange={(e) => handleTimeRangeChange(index, 'start_time', e.target.value)} required disabled={isLoading} aria-invalid={!!validationErrors[`time_ranges[${index}].start_time`]} className={`mt-1 text-xs p-1 ${validationErrors[`time_ranges[${index}].start_time`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} dark:bg-gray-900/80`} />
                                             {validationErrors[`time_ranges[${index}].start_time`] && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validationErrors[`time_ranges[${index}].start_time`]}</p>}
                                         </div>
                                         <div>
                                             <Label htmlFor={`end-${index}`} className="text-xs font-medium text-gray-700 dark:text-gray-300">End Time (UTC)*</Label>
                                             <Input type="time" id={`end-${index}`} value={range.end_time} onChange={(e) => handleTimeRangeChange(index, 'end_time', e.target.value)} required disabled={isLoading} aria-invalid={!!validationErrors[`time_ranges[${index}].end_time`]} className={`mt-1 text-xs p-1 ${validationErrors[`time_ranges[${index}].end_time`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} dark:bg-gray-900/80`} />
                                              {validationErrors[`time_ranges[${index}].end_time`] && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validationErrors[`time_ranges[${index}].end_time`]}</p>}
                                         </div>
                                     </div>
                                     {timeRanges.length > 1 && (
                                        <button type="button" onClick={() => removeTimeRange(index)} disabled={isLoading} className="absolute top-1 right-1 text-red-500 hover:text-red-700 p-0.5 disabled:opacity-50 disabled:cursor-not-allowed" title="Remove Time Range">
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                     )}
                                 </div>
                             ))}
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={addTimeRange} disabled={isLoading} className="mt-2">
                            <PlusIcon className="h-4 w-4 mr-1"/> Add Time Range
                        </Button>
                     </fieldset>

                     <div className="flex justify-end space-x-3 border-t border-gray-200 dark:border-gray-700 pt-4 mt-6">
                         <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}> Cancel </Button>
                         <Button type="submit" disabled={isLoading || timeRanges.length === 0}>
                             {isLoading && ( <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"/> )}
                             {isLoading ? 'Saving...' : (isEditMode ? 'Update Schedule' : 'Create Schedule')}
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

export default ScheduleFormModal;