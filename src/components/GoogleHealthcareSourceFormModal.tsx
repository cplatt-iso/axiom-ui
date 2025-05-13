// src/components/GoogleHealthcareSourceFormModal.tsx
import React, { useEffect } from 'react';
import { useForm, Resolver, SubmitHandler } from 'react-hook-form';
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
    GoogleHealthcareSourceCreate,
    GoogleHealthcareSourceUpdate,
} from '@/schemas'; 
import {
    GoogleHealthcareSourceFormDataSchema,
    GoogleHealthcareSourceFormData,
    GoogleHealthcareSourceBaseSchema,
} from '@/schemas/googleHealthcareSourceSchema';

import {
    createGoogleHealthcareSource,
    updateGoogleHealthcareSource,
} from '@/services/api';

interface GoogleHealthcareSourceFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    source: GoogleHealthcareSourceRead | null;
}

// Default values for the form, matching GoogleHealthcareSourceFormData
const initialFormDefaults: GoogleHealthcareSourceFormData = {
    name: '',
    description: null, // string | null
    gcp_project_id: '',
    gcp_location: '',
    gcp_dataset_id: '',
    gcp_dicom_store_id: '',
    polling_interval_seconds: 300, // Default for the form, type is number | undefined
    is_enabled: true,
    is_active: true,
    query_filters: null, // string | null; textarea will use `field.value ?? ''`
};


const GoogleHealthcareSourceFormModal: React.FC<GoogleHealthcareSourceFormModalProps> = ({ isOpen, onClose, source }) => {
    const queryClient = useQueryClient();
    const isEditMode = !!source;

    // useForm is now typed with GoogleHealthcareSourceFormData (where query_filters is string | null, polling_interval_seconds is number | undefined)
    const form = useForm<GoogleHealthcareSourceFormData>({
        resolver: zodResolver(
            GoogleHealthcareSourceFormDataSchema
    ) as Resolver<GoogleHealthcareSourceFormData>,
    defaultValues: initialFormDefaults,
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
                    polling_interval_seconds: source.polling_interval_seconds ?? 300, // source.polling_interval_seconds is number
                    is_enabled: source.is_enabled ?? true,
                    is_active: source.is_active ?? true,
                    // query_filters in source is object|null. Stringify for the form.
                    query_filters: source.query_filters ? json5.stringify(source.query_filters, null, 2) : null,
                };
            } else {
                resetValues = { ...initialFormDefaults };
            }
            form.reset(resetValues); // resetValues matches GoogleHealthcareSourceFormData
            form.clearErrors();
        }
    }, [isOpen, source, isEditMode, form]);

    const createMutation = useMutation({
        // API function expects GoogleHealthcareSourceCreate (query_filters as object, polling_interval_seconds as number)
        mutationFn: (data: GoogleHealthcareSourceCreate) => createGoogleHealthcareSource(data),
        onSuccess: (data) => {
            toast.success(`Google Healthcare Source "${data.name}" created successfully.`);
            queryClient.invalidateQueries({ queryKey: ['googleHealthcareSources'] });
            onClose();
            form.reset(initialFormDefaults);
        },
        onError: (error: any) => {
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
        // API function expects ID and GoogleHealthcareSourceUpdate (query_filters as object, polling_interval_seconds as number)
        mutationFn: (payload: { id: number, data: GoogleHealthcareSourceUpdate }) =>
            updateGoogleHealthcareSource(payload.id, payload.data),
        onSuccess: (data) => {
            toast.success(`Google Healthcare Source "${data.name}" updated successfully.`);
            queryClient.invalidateQueries({ queryKey: ['googleHealthcareSources'] });
            queryClient.invalidateQueries({ queryKey: ['googleHealthcareSource', data.id] });
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

    // onSubmit receives GoogleHealthcareSourceFormData
    // (query_filters is string | null, polling_interval_seconds is number | undefined)
    const onSubmit: SubmitHandler<GoogleHealthcareSourceFormData> = (formData) => {
        // Transform query_filters from string to object/null for API
        let parsedQueryFilters: Record<string, any> | null = null;
        if (formData.query_filters && formData.query_filters.trim()) {
            try {
                parsedQueryFilters = json5.parse(formData.query_filters);
            } catch (e) {
                // Should not happen if refine worked, but as a safeguard
                form.setError('query_filters', { type: 'manual', message: 'Invalid JSON format.' });
                toast.error("Invalid JSON in Query Filters.");
                return;
            }
        }

        // Ensure polling_interval_seconds is a number for the API payload.
        // formData.polling_interval_seconds is now number | undefined.
        const finalApiPayload = {
            ...formData,
            polling_interval_seconds: formData.polling_interval_seconds ?? 300, // Default if undefined
            query_filters: parsedQueryFilters, // Replace string with parsed object/null
            description: formData.description, // Already string | null from schema transform
        };

        if (isEditMode && source) {
            const updatePayload: GoogleHealthcareSourceUpdate = {};            
            Object.keys(finalApiPayload).forEach(key => {
                const k = key as keyof typeof finalApiPayload;
                const validKeys = new Set(
                    Object.keys(GoogleHealthcareSourceBaseSchema.shape)
                );
                if (validKeys.has(k)) {
                    (updatePayload as any)[k] = finalApiPayload[k];
                }
            });
            const typedUpdatePayload: GoogleHealthcareSourceUpdate = {
                name: finalApiPayload.name,
                description: finalApiPayload.description,
                gcp_project_id: finalApiPayload.gcp_project_id,
                gcp_location: finalApiPayload.gcp_location,
                gcp_dataset_id: finalApiPayload.gcp_dataset_id,
                gcp_dicom_store_id: finalApiPayload.gcp_dicom_store_id,
                polling_interval_seconds: finalApiPayload.polling_interval_seconds, // This is now number
                query_filters: finalApiPayload.query_filters,
                is_enabled: finalApiPayload.is_enabled,
                is_active: finalApiPayload.is_active,
            };
            const finalUpdatePayloadToSend: GoogleHealthcareSourceUpdate = {};
            for (const key in typedUpdatePayload) {
                const castKey = key as keyof GoogleHealthcareSourceUpdate;
                if (typedUpdatePayload[castKey] !== undefined) { // Send if value is not undefined
                    (finalUpdatePayloadToSend as any)[castKey] = typedUpdatePayload[castKey];
                } else if (source && source[castKey as keyof GoogleHealthcareSourceRead] !== undefined && typedUpdatePayload[castKey] === undefined) {
                }
            }
            updateMutation.mutate({ id: source.id, data: typedUpdatePayload });

        } else {
            const createPayload: GoogleHealthcareSourceCreate = finalApiPayload;
            createMutation.mutate(createPayload);
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
                    {/* form.handleSubmit now correctly uses GoogleHealthcareSourceFormData */}
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">

                        {/* Name */}
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name*</FormLabel>
                                    <FormControl><Input placeholder="e.g., GHC Store West US" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* GCP Project ID */}
                        <FormField
                            control={form.control}
                            name="gcp_project_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>GCP Project ID*</FormLabel>
                                    <FormControl><Input placeholder="my-gcp-project-123" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* GCP Location */}
                        <FormField
                            control={form.control}
                            name="gcp_location"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>GCP Location*</FormLabel>
                                    <FormControl><Input placeholder="us-central1" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                         {/* Healthcare Dataset ID */}
                         <FormField
                            control={form.control}
                            name="gcp_dataset_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Healthcare Dataset ID*</FormLabel>
                                    <FormControl><Input placeholder="my-axiom-dataset" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* DICOM Store ID */}
                        <FormField
                            control={form.control}
                            name="gcp_dicom_store_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>DICOM Store ID*</FormLabel>
                                    <FormControl><Input placeholder="primary-dicom-store" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Description */}
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => ( // field.value is string | null
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Optional description of this source"
                                            {...field}
                                            value={field.value ?? ''} // Handles null for textarea
                                            rows={2}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Polling Interval */}
                        <FormField
                            control={form.control}
                            name="polling_interval_seconds" // field.value is number | undefined
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Polling Interval (seconds)*</FormLabel>
                                    <FormControl>
                                        {/* react-hook-form handles number conversion for type="number" */}
                                        {/* field.value is number | undefined */}
                                        <Input type="number" min="1" step="1" {...field} 
                                            onChange={event => {
                                                const numValue = event.target.valueAsNumber; // For <input type="number">, this is number or NaN
                                                if (isNaN(numValue)) { // Covers empty string ("" -> NaN) and invalid text input
                                                    field.onChange(undefined); // Set as undefined in form state
                                                } else {
                                                    field.onChange(numValue); // Store as number
                                                }
                                            }}
                                            value={field.value ?? ''} // Display purposes: if undefined, show empty string
                                        />
                                    </FormControl>
                                    {/* Form message will show if Zod validation (e.g. .positive()) fails */}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                         {/* Query Filters */}
                         <FormField
                            control={form.control}
                            name="query_filters" // field.value is string | null
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
                                            value={field.value ?? ''} // Handles null for textarea
                                            rows={4}
                                            className="font-mono text-xs"
                                        />
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
                                        <Switch
                                            id="is_enabled_ghc_main"
                                            checked={field.value ?? false} // Default to false if null/undefined, though schema default is true
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                         <FormLabel htmlFor="is_enabled_ghc_main">Source Enabled</FormLabel>
                                         <FormDescription>Allow use in Data Browser.</FormDescription>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Is Active */}
                        <FormField
                            control={form.control}
                            name="is_active"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                                    <FormControl>
                                        <Switch
                                            id="is_active_ghc_polling"
                                            checked={field.value ?? false} // Default to false if null/undefined
                                            onCheckedChange={field.onChange}
                                            disabled={!form.watch('is_enabled')}
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel htmlFor="is_active_ghc_polling">Automatic Polling Active</FormLabel>
                                        <FormDescription>If checked (and Source Enabled), poll automatically on schedule.</FormDescription>
                                    </div>
                                    <FormMessage />
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