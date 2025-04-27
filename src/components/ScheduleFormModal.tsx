// src/components/ScheduleFormModal.tsx
import React, { useState, useEffect, Fragment, FormEvent, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'; // Keep icons
import { AlertCircle, Loader2 } from 'lucide-react'; // Use this if you switched all others
import { useMutation, useQueryClient } from '@tanstack/react-query'; // Keep useQueryClient
import { toast } from 'sonner';

import { createSchedule, updateSchedule } from '../services/api';
import { Schedule, ScheduleCreate, ScheduleUpdate, TimeRange as TimeRangeSchema } from '@/schemas';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ScheduleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Remove onSuccess prop - modal will handle invalidation directly
  // onSuccess: (schedule: Schedule) => void;
  existingSchedule: Schedule | null;
}

type TimeRangeState = Omit<TimeRangeSchema, 'days'> & { days: Set<string> };

const defaultTimeRange: TimeRangeState = {
    days: new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']),
    start_time: '00:00',
    end_time: '23:59',
};

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const ScheduleFormModal: React.FC<ScheduleFormModalProps> = ({
  isOpen,
  onClose,
  // onSuccess prop removed
  existingSchedule,
}) => {
  const queryClient = useQueryClient(); // Get query client instance
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [timeRanges, setTimeRanges] = useState<TimeRangeState[]>([defaultTimeRange]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const isEditMode = !!existingSchedule;

  // useEffect remains the same
  useEffect(() => {
    if (isOpen) {
      setValidationErrors({});
      if (existingSchedule) {
        setName(existingSchedule.name);
        setDescription(existingSchedule.description ?? '');
        setIsEnabled(existingSchedule.is_enabled ?? true);
        setTimeRanges(
          (existingSchedule.time_ranges ?? [defaultTimeRange]).map(range => ({
            ...range,
            days: new Set(range.days ?? []),
          }))
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

  // handleTimeRangeChange remains the same
  const handleTimeRangeChange = (index: number, field: keyof TimeRangeState, value: any) => {
    setTimeRanges(prevRanges => {
      // Create a new array immutably
       const newRanges = prevRanges.map((range, i) => {
            if (i === index) {
                // Create a new object for the changed range
                const updatedRange = { ...range };
                if (field === 'days' && typeof value === 'function') {
                    // Apply the updater function to the *existing* Set to get the *new* Set
                    updatedRange.days = value(range.days); // Pass the original Set to the updater
                } else {
                    // Standard field update
                    (updatedRange as any)[field] = value;
                }
                return updatedRange;
            }
            return range; // Return unchanged ranges
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

   // handleDayToggle remains the same
   const handleDayToggle = (rangeIndex: number, day: string, checked: boolean) => {
        handleTimeRangeChange(rangeIndex, 'days', (prevDays: Set<string>) => {
            const newDays = new Set(prevDays);
            if (checked) {
                newDays.add(day);
            } else {
                newDays.delete(day);
            }
            return newDays;
        });
   };

  // addTimeRange remains the same
  const addTimeRange = () => {
    setTimeRanges(prev => [...prev, deepCloneTimeRange(defaultTimeRange)]);
  };

  // removeTimeRange remains the same
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

   // --- UPDATED Mutations with onSuccess invalidation ---
   const createMutation = useMutation({
       mutationFn: createSchedule,
       onSuccess: (data) => {
           // Call external onSuccess if needed later, but handle invalidation here
           // onSuccess(data);
           toast.success(`Schedule "${data.name}" created successfully.`);
           queryClient.invalidateQueries({ queryKey: ['schedules'] }); // Invalidate the list query
           onClose(); // Close modal
       },
       // onError handling can remain the same or be extracted
   });
   const updateMutation = useMutation({
       mutationFn: (payload: { id: number; data: ScheduleUpdate }) => updateSchedule(payload.id, payload.data),
       onSuccess: (data) => {
           // onSuccess(data);
           toast.success(`Schedule "${data.name}" updated successfully.`);
           queryClient.invalidateQueries({ queryKey: ['schedules'] }); // Invalidate the list
           queryClient.invalidateQueries({ queryKey: ['schedule', data.id] }); // Invalidate specific schedule if needed elsewhere
           onClose();
       },
       // onError handling can remain the same or be extracted
   });
  // --- END UPDATED ---

  // handleSubmit remains largely the same, just calls mutations
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setValidationErrors({});
    setIsLoading(true);

    const rangesForApi = timeRanges.map(range => ({
        ...range,
        days: Array.from(range.days).sort((a, b) => ALL_DAYS.indexOf(a) - ALL_DAYS.indexOf(b))
    }));

    // Frontend validation remains
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
        time_ranges: rangesForApi,
    };

    try {
        if (isEditMode && existingSchedule) {
            const updatePayload: ScheduleUpdate = commonPayload;
            // Use mutateAsync if you need to await, otherwise just mutate
            await updateMutation.mutateAsync({ id: existingSchedule.id, data: updatePayload });
        } else {
            const createPayload: ScheduleCreate = commonPayload;
            await createMutation.mutateAsync(createPayload);
        }
        // onSuccess/onClose now handled within mutation's onSuccess
    } catch (err: any) {
        console.error(`Failed to ${isEditMode ? 'update' : 'create'} schedule:`, err);
        // Error handling remains the same
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

  // --- JSX Rendering (remains the same) ---
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-30" onClose={onClose}>
        <Transition.Child as={Fragment} /* backdrop */ >
             <div className="fixed inset-0 bg-black bg-opacity-30 dark:bg-opacity-60" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child as={Fragment} /* panel */ >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-0 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <span>{isEditMode ? 'Edit Schedule' : 'Create New Schedule'}</span>
                    <button onClick={onClose} disabled={isLoading} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none disabled:opacity-50">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </Dialog.Title>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto p-6">
                     {error && ( <Alert variant="destructive" className="mb-4"> <AlertCircle className="h-4 w-4" /> <AlertTitle>Error</AlertTitle> <AlertDescription>{error}</AlertDescription> </Alert> )}
                     {validationErrors['general'] && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{validationErrors['general']}</p>}

                     {/* Basic Fields */}
                     <div>
                        <Label htmlFor="scheduleName">Name <span className="text-red-500">*</span></Label>
                        <Input id="scheduleName" value={name} onChange={(e) => {setName(e.target.value); setValidationErrors(p=>({...p,name:undefined}))}} required disabled={isLoading} aria-invalid={!!validationErrors['name']} aria-describedby="scheduleName-error" className={`mt-1 ${validationErrors['name'] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} dark:bg-gray-700`} />
                        {validationErrors['name'] && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id="scheduleName-error">{validationErrors['name']}</p>}
                     </div>
                     <div>
                        <Label htmlFor="scheduleDescription">Description</Label>
                        <Textarea id="scheduleDescription" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} disabled={isLoading} className="mt-1 border-gray-300 dark:border-gray-600 dark:bg-gray-700" />
                     </div>
                     <div className="flex items-center">
                         <Checkbox id="scheduleEnabled" checked={isEnabled} onCheckedChange={setIsEnabled} disabled={isLoading} className="mr-2"/>
                         <Label htmlFor="scheduleEnabled" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">Enabled</Label>
                     </div>

                     {/* Time Ranges */}
                     <fieldset className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                        <legend className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">Active Time Ranges <span className="text-red-500">*</span></legend>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Define one or more time windows when this schedule is active (times are UTC).</p>
                         {validationErrors['time_ranges'] && <p className="mt-1 text-xs text-red-600 dark:text-red-400 mb-2" id="time_ranges-error">{validationErrors['time_ranges']}</p>}
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2 scrollbar-thin">
                             {timeRanges.map((range, index) => (
                                 <div key={index} className="p-3 border border-gray-200 dark:border-gray-600 rounded-md space-y-3 relative bg-gray-50 dark:bg-gray-700/50">
                                     {/* Days Checkboxes */}
                                     <div>
                                         <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1.5">Days of Week*</Label>
                                         <div className="grid grid-cols-4 sm:grid-cols-7 gap-x-2 gap-y-1">
                                             {ALL_DAYS.map(day => (
                                                 <div key={day} className="flex items-center">
                                                     <Checkbox
                                                        id={`day-${index}-${day}`}
                                                        checked={range.days.has(day)}
                                                        onCheckedChange={(checked) => handleDayToggle(index, day, !!checked)}
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
                                     {/* Start/End Times */}
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
                                     {/* Remove Button */}
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

                    {/* Footer Buttons */}
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
