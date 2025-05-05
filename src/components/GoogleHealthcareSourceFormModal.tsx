// src/components/GoogleHealthcareSourceFormModal.tsx
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import json5 from 'json5';

import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose,
} from '@/components/ui/dialog';
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from "@/components/ui/textarea";

import {
    GoogleHealthcareSourceRead,
    // Create/Update types are handled within the API functions now
} from '@/schemas';
import {
    googleHealthcareSourceFormSchema,
    GoogleHealthcareSourceFormData,
} from '@/schemas/googleHealthcareSourceSchema';

import {
    createGoogleHealthcareSource,
    updateGoogleHealthcareSource,
} from '@/services/api';

interface GoogleHealthcareSourceFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    source: GoogleHealthcareSourceRead | null; // Expect Google Healthcare type
}

// Adjusted initial defaults for Google Healthcare Source
const initialFormDefaults: GoogleHealthcareSourceFormData = {
    name: '',
    description: null,
    gcp_project_id: '',
    gcp_location: '',
    gcp_dataset_id: '',
    gcp_dicom_store_id: '',
    polling_interval_seconds: 300,
    is_enabled: true,
    is_active: true,
    query_filters: '', // Default to empty string for textarea
};


const GoogleHealthcareSourceFormModal: React.FC<GoogleHealthcareSourceFormModalProps> = ({ isOpen, onClose, source }) => {
    const queryClient = useQueryClient();
    const isEditMode = !!source;

    const form = useForm<GoogleHealthcareSourceFormData>({
        resolver: zodResolver(googleHealthcareSourceFormSchema),
        defaultValues: initialFormDefaults
    });

    useEffect(() => {
        if (isOpen) {
            let resetValues: GoogleHealthcareSourceFormData;

            if (isEditMode && source) {
                resetValues = {
                    name: source.name ?? '',
                    description: source.description ?? null,
                    gcp_project_id: source.gcp_project_id ?? '',
                    gcp_location: source.gcp_location ?? '',
                    gcp_dataset_id: source.gcp_dataset_id ?? '',
                    gcp_dicom_store_id: source.gcp_dicom_store_id ?? '',
                    polling_interval_seconds: source.polling_interval_seconds ?? 300,
                    is_enabled: source.is_enabled ?? true,
                    is_active: source.is_active ?? true,
                    // Stringify query_filters if they exist (they are Dict[str, Any] in Read schema)
                    query_filters: source.query_filters ? json5.stringify(source.query_filters, null, 2) : '',
                };
            } else {
                resetValues = { ...initialFormDefaults };
            }
            form.reset(resetValues);
            form.clearErrors(); // Clear errors on open/reset
        }
    }, [isOpen, source, isEditMode, form]);

    const createMutation = useMutation({
        mutationFn: createGoogleHealthcareSource, // Use the correct API function
        onSuccess: (data) => {
            toast.success(`Google Healthcare Source "${data.name}" created successfully.`);
            queryClient.invalidateQueries({ queryKey: ['googleHealthcareSources'] }); // Use correct query key
            onClose();
            form.reset(initialFormDefaults); // Reset form after successful creation
        },
        onError: (error: any) => {
            // Attempt to parse backend validation errors
            let errorMsg = "Failed to create source.";
            if (error?.response?.data?.detail) {
                 if (Array.isArray(error.response.data.detail)) {
                     const firstError = error.response.data.detail[0];
                     errorMsg = `Validation Error on ${firstError.loc?.slice(1).join('.') || 'field'}: ${firstError.msg}`;
                 } else if (typeof error.response.data.detail === 'string') {
                     errorMsg = error.response.data.detail;
                 }
            } else {
                errorMsg = error.message || errorMsg;
            }
            toast.error(`Creation failed: ${errorMsg}`);
            console.error("Create Google Healthcare Source error:", error);
        },
    });

    const updateMutation = useMutation({
        mutationFn: (payload: { id: number, data: Partial<GoogleHealthcareSourceFormData> }) => // Expect partial form data
            updateGoogleHealthcareSource(payload.id, payload.data), // Use correct API function
        onSuccess: (data) => {
            toast.success(`Google Healthcare Source "${data.name}" updated successfully.`);
            queryClient.invalidateQueries({ queryKey: ['googleHealthcareSources'] }); // Invalidate list
            queryClient.invalidateQueries({ queryKey: ['googleHealthcareSource', data.id] }); // Invalidate specific item if needed
            onClose();
        },
        onError: (error: any, variables) => {
            let errorMsg = "Failed to update source.";
             if (error?.response?.data?.detail) {
                 if (Array.isArray(error.response.data.detail)) {
                     const firstError = error.response.data.detail[0];
                     errorMsg = `Validation Error on ${firstError.loc?.slice(1).join('.') || 'field'}: ${firstError.msg}`;
                 } else if (typeof error.response.data.detail === 'string') {
                     errorMsg = error.response.data.detail;
                 }
            } else {
                 errorMsg = error.message || errorMsg;
            }
            toast.error(`Update failed for ID ${variables.id}: ${errorMsg}`);
            console.error(`Update Google Healthcare Source error for ID ${variables.id}:`, error);
        },
    });

    // Submit function takes validated form data
    const onSubmit = (values: GoogleHealthcareSourceFormData) => {
        // API functions now handle parsing query_filters and cleaning description
        if (isEditMode && source) {
            // For update, we pass the partial form data directly
             updateMutation.mutate({ id: source.id, data: values });
        } else {
            // For create, we pass the full form data
            createMutation.mutate(values);
        }
    };

    const isLoading = createMutation.isPending || updateMutation.isPending;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[650px]">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit Google Healthcare Source' : 'Add Google Healthcare Source'}</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? `Modify the configuration for "${source?.name}".` : 'Configure a new Google Healthcare DICOM Store poller.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">

                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name*</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., GHC Store West US" {...field}></Input>
                                    </FormControl>
                                    <FormMessage></FormMessage>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="gcp_project_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>GCP Project ID*</FormLabel>
                                    <FormControl>
                                        <Input placeholder="my-gcp-project-123" {...field}></Input>
                                    </FormControl>
                                    <FormMessage></FormMessage>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="gcp_location"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>GCP Location*</FormLabel>
                                    <FormControl>
                                        <Input placeholder="us-central1" {...field}></Input>
                                    </FormControl>
                                    <FormMessage></FormMessage>
                                </FormItem>
                            )}
                        />

                         <FormField
                            control={form.control}
                            name="gcp_dataset_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Healthcare Dataset ID*</FormLabel>
                                    <FormControl>
                                        <Input placeholder="my-axiom-dataset" {...field}></Input>
                                    </FormControl>
                                    <FormMessage></FormMessage>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="gcp_dicom_store_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>DICOM Store ID*</FormLabel>
                                    <FormControl>
                                        <Input placeholder="primary-dicom-store" {...field}></Input>
                                    </FormControl>
                                    <FormMessage></FormMessage>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Optional description of this source"
                                            {...field}
                                            value={field.value ?? ''}
                                            rows={2}
                                        ></Textarea>
                                    </FormControl>
                                    <FormMessage></FormMessage>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="polling_interval_seconds"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Polling Interval (seconds)*</FormLabel>
                                    <FormControl>
                                        <Input type="number" min="1" step="1" {...field} value={field.value ?? ''} onChange={event => field.onChange(event.target.value === '' ? null : +event.target.value)}></Input>
                                    </FormControl>
                                    <FormMessage></FormMessage>
                                </FormItem>
                            )}
                        />

                         <FormField
                            control={form.control}
                            name="query_filters"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Query Filters (QIDO)</FormLabel>
                                    <FormDescription>
                                        Enter QIDO query keys/values as JSON object (e.g., {`{"StudyDate": "20240101-"}`}). Optional.
                                    </FormDescription>
                                    <FormControl>
                                        <Textarea
                                            placeholder={`{\n  "StudyDate": "-7d",\n  "ModalitiesInStudy": "CT"\n}`}
                                            {...field}
                                            value={field.value ?? ''}
                                            rows={4}
                                            className="font-mono text-xs"
                                        ></Textarea>
                                    </FormControl>
                                    <FormMessage></FormMessage>
                                </FormItem>
                            )}
                        />

                         <FormField
                            control={form.control}
                            name="is_enabled"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                                    <FormControl>
                                        <Switch
                                            id="is_enabled_ghc_main"
                                            checked={!!field.value}
                                            onCheckedChange={field.onChange}
                                            ref={field.ref}
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                         <FormLabel htmlFor="is_enabled_ghc_main">Source Enabled</FormLabel>
                                         <FormDescription>Allow use in Data Browser.</FormDescription>
                                    </div>
                                    <FormMessage></FormMessage>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="is_active"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                                    <FormControl>
                                        <Switch
                                            id="is_active_ghc_polling"
                                            checked={!!field.value}
                                            onCheckedChange={field.onChange}
                                            ref={field.ref}
                                            disabled={!form.watch('is_enabled')} // Disable if source itself is disabled
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel htmlFor="is_active_ghc_polling">
                                            Automatic Polling Active
                                        </FormLabel>
                                        <FormDescription>
                                            If checked (and Source Enabled), poll automatically on schedule.
                                        </FormDescription>
                                    </div>
                                    <FormMessage></FormMessage>
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-4">
                            <DialogClose asChild={true}>
                                 <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                            </DialogClose>
                             <Button type="submit" disabled={isLoading}>
                                 {isLoading ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create GHC Source')}
                             </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default GoogleHealthcareSourceFormModal;
