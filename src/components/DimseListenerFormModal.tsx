// src/components/DimseListenerFormModal.tsx
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from "@/components/ui/textarea"; // Use textarea for description

// Import Schemas and API functions
import {
    DimseListenerConfigRead,
    DimseListenerConfigCreatePayload,
    DimseListenerConfigUpdatePayload,
    dimseListenerFormSchema, // Use the form schema for validation
    DimseListenerFormData, // Type for form data
} from '@/schemas';
import {
    createDimseListenerConfig,
    updateDimseListenerConfig,
} from '@/services/api';

interface DimseListenerFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    listenerConfig: DimseListenerConfigRead | null; // Config object for editing, null for creating
}

// Define sensible initial default values for the form
const initialFormDefaults: DimseListenerFormData = {
    name: '',
    description: null,
    ae_title: '',
    port: 11112, // Common default DICOM port
    is_enabled: true,
    instance_id: null, // Default to null, user must assign if needed
};


const DimseListenerFormModal: React.FC<DimseListenerFormModalProps> = ({ isOpen, onClose, listenerConfig }) => {
    const queryClient = useQueryClient();
    const isEditMode = !!listenerConfig;

    const form = useForm<DimseListenerFormData>({
        resolver: zodResolver(dimseListenerFormSchema),
        defaultValues: initialFormDefaults,
    });

    // Reset form when modal opens or listenerConfig changes
    useEffect(() => {
        if (isOpen) {
            const resetValues = listenerConfig ? {
                ...listenerConfig, // Spread existing config
                description: listenerConfig.description ?? null, // Ensure null if missing
                instance_id: listenerConfig.instance_id ?? null, // Ensure null if missing
            } : initialFormDefaults;
            form.reset(resetValues);
            console.log("Resetting form with:", resetValues);
        }
    }, [isOpen, listenerConfig, form]);

    // --- Mutations ---
    const createMutation = useMutation({
        mutationFn: createDimseListenerConfig,
        onSuccess: (data) => {
            toast.success(`DIMSE Listener "${data.name}" created successfully.`);
            queryClient.invalidateQueries({ queryKey: ['dimseListenerConfigs'] });
            onClose(); // Close modal on success
        },
        onError: (error: any) => {
            // Use generic error handling from other modal
            let specificError = "Failed to create listener config.";
            if (error?.detail && Array.isArray(error.detail) && error.detail[0]) {
                 const errDetail = error.detail[0];
                 const field = errDetail.loc?.[1] || 'input';
                 specificError = `Validation Error on field '${field}': ${errDetail.msg}`;
            } else if (error?.detail){
                 specificError = typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail);
            } else {
                 specificError = error.message || specificError;
            }
            toast.error(`Creation failed: ${specificError}`);
            console.error("Create error details:", error?.detail || error);
        },
    });

    const updateMutation = useMutation({
        mutationFn: (payload: { id: number, data: DimseListenerConfigUpdatePayload }) =>
            updateDimseListenerConfig(payload.id, payload.data),
        onSuccess: (data) => {
            toast.success(`DIMSE Listener "${data.name}" updated successfully.`);
            queryClient.invalidateQueries({ queryKey: ['dimseListenerConfigs'] });
            queryClient.invalidateQueries({ queryKey: ['dimseListenerConfig', data.id] }); // Optional: invalidate single item
            onClose(); // Close modal on success
        },
        onError: (error: any, variables) => {
            // Use generic error handling from other modal
            let specificError = "Failed to update listener config.";
             if (error?.detail && Array.isArray(error.detail) && error.detail[0]) {
                 const errDetail = error.detail[0];
                 const field = errDetail.loc?.[1] || 'input';
                 specificError = `Validation Error on field '${field}': ${errDetail.msg}`;
            } else if (error?.detail){
                 specificError = typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail);
            } else {
                 specificError = error.message || specificError;
            }
            toast.error(`Update failed for ID ${variables.id}: ${specificError}`);
            console.error(`Update error details for ID ${variables.id}:`, error?.detail || error);
        },
    });

    // --- Form Submission ---
    const onSubmit = (values: DimseListenerFormData) => {
         // Ensure description and instance_id are null if empty strings
        const apiPayload = {
            ...values,
            description: values.description?.trim() || null,
            instance_id: values.instance_id?.trim() || null,
        };
        console.log("Submitting Values:", apiPayload);

        if (isEditMode && listenerConfig) {
            // Create the UpdatePayload type
            const updatePayload: DimseListenerConfigUpdatePayload = apiPayload;
            updateMutation.mutate({ id: listenerConfig.id, data: updatePayload });
        } else {
            // Create the CreatePayload type
             const createPayload: DimseListenerConfigCreatePayload = apiPayload;
            createMutation.mutate(createPayload);
        }
    };

    const isLoading = createMutation.isPending || updateMutation.isPending;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[550px]"> {/* Slightly wider modal */}
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit DIMSE Listener' : 'Add DIMSE Listener'}</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? `Modify the configuration for "${listenerConfig?.name}".` : 'Configure a new DIMSE C-STORE SCP listener.'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    {/* Use overflow-y-auto for scrollable content */}
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">

                        {/* Name */}
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name*</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Main Scanner Listener" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* AE Title */}
                         <FormField
                            control={form.control}
                            name="ae_title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>AE Title*</FormLabel>
                                     <FormDescription>Max 16 chars, no backslash/control chars, no leading/trailing spaces.</FormDescription>
                                    <FormControl>
                                        <Input placeholder="MY_SCP_AE" {...field} maxLength={16} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                         {/* Port */}
                         <FormField
                            control={form.control}
                            name="port"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Port*</FormLabel>
                                     <FormDescription>Network port number (1-65535).</FormDescription>
                                    <FormControl>
                                         {/* Input type=number handles browser validation; Zod handles ours */}
                                         <Input type="number" min="1" max="65535" step="1"
                                             {...field}
                                             onChange={event => field.onChange(+event.target.value)} // Convert to number
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Description */}
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        {/* Use Textarea for potentially longer descriptions */}
                                        <Textarea
                                            placeholder="Optional description of this listener"
                                            {...field}
                                            value={field.value ?? ''} // Handle null value for textarea
                                            rows={2}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                         {/* Assigned Instance ID */}
                         <FormField
                            control={form.control}
                            name="instance_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Assigned Instance ID</FormLabel>
                                     <FormDescription>
                                        Optional. Must match the <code className="text-xs bg-gray-200 dark:bg-gray-700 p-1 rounded">AXIOM_INSTANCE_ID</code> env var of the listener container that should use this config. Must be unique if set.
                                     </FormDescription>
                                    <FormControl>
                                        <Input placeholder="e.g., storescp_1" {...field} value={field.value ?? ''}/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Is Enabled */}
                        <FormField
                            control={form.control}
                            name="is_enabled"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                                     <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            id="is_enabled" // Add id for label association
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                         <FormLabel htmlFor="is_enabled"> {/* Associate label */}
                                            Enable Listener
                                         </FormLabel>
                                         <FormDescription>
                                             If checked, the listener process assigned this config will start.
                                         </FormDescription>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-4">
                            <DialogClose asChild>
                                 <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                            </DialogClose>
                             <Button type="submit" disabled={isLoading}>
                                 {isLoading ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create Listener Config')}
                             </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default DimseListenerFormModal;
