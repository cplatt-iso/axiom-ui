// src/components/CrosswalkMappingFormModal.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import json5 from 'json5';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
// Import useFormField again
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription, useFormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from 'lucide-react';

import {
    CrosswalkMapRead,
    CrosswalkDataSourceRead,
    CrosswalkMapCreatePayload,
    CrosswalkMapUpdatePayload,
} from '@/schemas';
import {
    crosswalkMapFormSchema,
    CrosswalkMapFormData,
} from '@/schemas/crosswalkMappingSchema';
import {
    createCrosswalkMap,
    updateCrosswalkMap,
    getCrosswalkDataSources,
} from '@/services/api';

interface CrosswalkMappingFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    existingMap: CrosswalkMapRead | null;
}

// --- Reintroduce Custom Input/Textarea Components ---
const FormInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => {
    const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
    return ( <Input ref={ref} id={formItemId} aria-describedby={!error ? `${formDescriptionId}` : `${formDescriptionId} ${formMessageId}`} aria-invalid={!!error} {...props} /> );
});
FormInput.displayName = "FormInput";

const FormTextarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>((props, ref) => {
    const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
    return ( <Textarea ref={ref} id={formItemId} aria-describedby={!error ? `${formDescriptionId}` : `${formDescriptionId} ${formMessageId}`} aria-invalid={!!error} {...props} /> );
});
FormTextarea.displayName = "FormTextarea";
// --- End Custom Input/Textarea ---


const initialFormDefaults = {
    name: '', description: null, data_source_id: undefined as number | undefined,
    is_enabled: true,
    match_columns: '[\n  {\n    "column_name": "source_mrn",\n    "dicom_tag": "0010,0020"\n  }\n]',
    cache_key_columns: '["source_mrn"]',
    replacement_mapping: '[\n  {\n    "source_column": "target_mrn",\n    "dicom_tag": "0010,0020",\n    "dicom_vr": "LO"\n  }\n]',
    cache_ttl_seconds: null, on_cache_miss: "fail" as "fail" | "query_db" | "log_only",
};

const CrosswalkMappingFormModal: React.FC<CrosswalkMappingFormModalProps> = ({ isOpen, onClose, existingMap }) => {
    const queryClient = useQueryClient();
    const isEditMode = !!existingMap;

    const form = useForm<CrosswalkMapFormData>({
        resolver: zodResolver(crosswalkMapFormSchema),
        defaultValues: initialFormDefaults,
        mode: 'onBlur',
    });

    const { data: dataSources, isLoading: sourcesLoading } = useQuery<CrosswalkDataSourceRead[], Error>({
        queryKey: ['crosswalkDataSourcesList'],
        queryFn: () => getCrosswalkDataSources(0, 500),
        enabled: isOpen, staleTime: 300000, gcTime: 600000, refetchOnWindowFocus: false,
    });

    // --- useEffect and Callbacks (remain the same, expanded format) ---
    useEffect(() => {
        if (isOpen) {
            let resetValues;
            if (existingMap) { resetValues = { name: existingMap.name, description: existingMap.description ?? null, data_source_id: existingMap.data_source_id, is_enabled: existingMap.is_enabled ?? true, match_columns: json5.stringify(existingMap.match_columns ?? [], null, 2), cache_key_columns: json5.stringify(existingMap.cache_key_columns ?? [], null, 2), replacement_mapping: json5.stringify(existingMap.replacement_mapping ?? [], null, 2), cache_ttl_seconds: existingMap.cache_ttl_seconds ?? null, on_cache_miss: existingMap.on_cache_miss ?? "fail" }; }
            else { resetValues = initialFormDefaults; }
            form.reset(resetValues); form.clearErrors();
        }
    }, [isOpen, existingMap, form]);

    const handleMutationSuccess = useCallback((data: CrosswalkMapRead) => { toast.success(`Mapping "${data.name}" ${isEditMode ? 'updated' : 'created'} successfully.`); queryClient.invalidateQueries({ queryKey: ['crosswalkMaps'] }); if (isEditMode) { queryClient.invalidateQueries({ queryKey: ['crosswalkMap', data.id] }); } onClose(); }, [isEditMode, queryClient, onClose]);
    const handleMutationError = useCallback((error: any, variables: any) => { const action = isEditMode ? 'update' : 'creation'; const id = isEditMode ? variables.id : ''; let specificError = `Failed to ${action} mapping.`; if (error?.response?.data?.detail) { const detail = error.response.data.detail; if (Array.isArray(detail) && detail[0]?.loc && detail[0]?.msg) { const field = detail[0].loc.slice(1).join('.') || 'input'; specificError = `Validation Error on field '${field}': ${detail[0].msg}`; } else if (typeof detail === 'string') { specificError = detail; } else { specificError = json5.stringify(detail); } } else if (error?.message) { specificError = error.message; } toast.error(`Mapping ${action} failed${id ? ` for ID ${id}` : ''}: ${specificError}`); console.error(`Mapping ${action} error details${id ? ` for ID ${id}` : ''}:`, error?.response?.data?.detail || error); }, [isEditMode]);
    const createMutation = useMutation({ mutationFn: createCrosswalkMap, onSuccess: handleMutationSuccess, onError: handleMutationError });
    const updateMutation = useMutation({ mutationFn: (payload: { id: number, data: CrosswalkMapUpdatePayload }) => updateCrosswalkMap(payload.id, payload.data), onSuccess: handleMutationSuccess, onError: handleMutationError });
    const onSubmit = useCallback((values: CrosswalkMapFormData) => { const apiPayload = { ...values, description: values.description?.trim() || null }; console.log("Submitting Crosswalk Mapping Values (API Payload):", apiPayload); if (isEditMode && existingMap) { const updatePayload: CrosswalkMapUpdatePayload = apiPayload; updateMutation.mutate({ id: existingMap.id, data: updatePayload }); } else { const createPayload: CrosswalkMapCreatePayload = apiPayload; createMutation.mutate(createPayload); } }, [isEditMode, existingMap, createMutation, updateMutation]);

    const isLoading = createMutation.isPending || updateMutation.isPending || sourcesLoading;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[750px]">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit Crosswalk Mapping' : 'Add Crosswalk Mapping'}</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? `Modify the mapping configuration for "${existingMap?.name}".` : 'Define a new mapping using a configured data source.'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form key={existingMap?.id ?? 'create'} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">

                        {/* Name using FormInput */}
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem> <FormLabel>Mapping Name*</FormLabel>
                                <FormInput placeholder="e.g., MRN to Patient ID Mapping" {...field} disabled={isLoading}/>
                                <FormMessage /> </FormItem>
                        )} />

                        {/* Description using FormTextarea */}
                        <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem> <FormLabel>Description</FormLabel>
                                <FormTextarea placeholder="Optional: Purpose of this mapping" {...field} value={field.value ?? ''} rows={2} disabled={isLoading}/>
                                <FormMessage /> </FormItem>
                        )} />

                        {/* Data Source Select (Modified Structure) */}
                        <FormField control={form.control} name="data_source_id" render={({ field }) => (
                            <FormItem> <FormLabel>Data Source*</FormLabel>
                                {/* Render Select directly, without FormControl */}
                                <Select
                                    onValueChange={(value) => field.onChange(parseInt(value, 10))}
                                    value={field.value?.toString()}
                                    disabled={isLoading || sourcesLoading}
                                >
                                    <SelectTrigger
                                        id={useFormField().formItemId}
                                        aria-invalid={!!useFormField().error}
                                        aria-describedby={useFormField().formDescriptionId}
                                    >
                                        <SelectValue placeholder={sourcesLoading ? "Loading sources..." : "Select Data Source"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {dataSources?.map(ds => ( <SelectItem key={ds.id} value={ds.id.toString()}>{ds.name} ({ds.db_type})</SelectItem> ))}
                                        {(!dataSources || dataSources.length === 0) && !sourcesLoading && <div className="px-2 py-1.5 text-sm text-muted-foreground">No data sources found.</div>}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                             </FormItem>
                        )} />

                         {/* Match Columns using FormTextarea */}
                        <FormField control={form.control} name="match_columns" render={({ field }) => (
                            <FormItem> <FormLabel>Match Columns (JSON)*</FormLabel>
                                <FormDescription>Array of objects mapping source table columns to incoming DICOM tags used for lookup. Example: <code className="text-xs bg-gray-200 dark:bg-gray-700 p-0.5 rounded">{`[{"column_name": "pat_mrn", "dicom_tag": "PatientID"}]`}</code></FormDescription>
                                <FormTextarea className="font-mono text-xs min-h-[80px] resize-y" spellCheck="false" {...field} value={field.value ?? ''} rows={4} disabled={isLoading}/>
                                <FormMessage /> </FormItem>
                        )} />

                        {/* Cache Key Columns using FormTextarea */}
                        <FormField control={form.control} name="cache_key_columns" render={({ field }) => (
                            <FormItem> <FormLabel>Cache Key Columns (JSON)*</FormLabel>
                                <FormDescription>Array of *source table column names* (from Match Columns) whose values uniquely identify a row for caching. Example: <code className="text-xs bg-gray-200 dark:bg-gray-700 p-0.5 rounded">{`["pat_mrn"]`}</code></FormDescription>
                                <FormTextarea className="font-mono text-xs min-h-[60px] resize-y" spellCheck="false" {...field} value={field.value ?? ''} rows={3} disabled={isLoading}/>
                                <FormMessage /> </FormItem>
                        )} />

                        {/* Replacement Mapping using FormTextarea */}
                        <FormField control={form.control} name="replacement_mapping" render={({ field }) => (
                            <FormItem> <FormLabel>Replacement Mapping (JSON)*</FormLabel>
                                <FormDescription>Array of objects mapping source table columns to target DICOM tags, optionally specifying the VR. Example: <code className="text-xs bg-gray-200 dark:bg-gray-700 p-0.5 rounded">{`[{"source_column": "site_patient_id", "dicom_tag": "0010,0020", "dicom_vr": "LO"}]`}</code></FormDescription>
                                <FormTextarea className="font-mono text-xs min-h-[100px] resize-y" spellCheck="false" {...field} value={field.value ?? ''} rows={5} disabled={isLoading}/>
                                <FormMessage /> </FormItem>
                        )} />

                        {/* Cache TTL using FormInput */}
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField control={form.control} name="cache_ttl_seconds" render={({ field }) => (
                                <FormItem> <FormLabel>Cache TTL (seconds)</FormLabel> <FormDescription>Optional: How long cache entries live.</FormDescription>
                                    <FormInput type="number" min="0" step="1" placeholder="e.g., 86400 for 1 day" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value, 10) || 0)} disabled={isLoading}/>
                                    <FormMessage /> </FormItem>
                            )} />

                            {/* On Cache Miss Select (Modified Structure) */}
                            <FormField control={form.control} name="on_cache_miss" render={({ field }) => (
                                <FormItem> <FormLabel>On Cache Miss*</FormLabel> <FormDescription>Action if lookup value not in cache.</FormDescription>
                                    {/* Render Select directly */}
                                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                                        <SelectTrigger id={useFormField().formItemId} aria-invalid={!!useFormField().error} aria-describedby={useFormField().formDescriptionId}>
                                            <SelectValue placeholder="Select action" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="fail">Fail (stop processing rule)</SelectItem>
                                            <SelectItem value="log_only">Log & Continue (skip replacement)</SelectItem>
                                            <SelectItem value="query_db">Query DB (If supported)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                 </FormItem>
                            )} />
                         </div>

                        {/* is_enabled Checkbox (Manual Structure) */}
                        <FormField control={form.control} name="is_enabled" render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                                <Checkbox id="map_is_enabled" checked={field.value} onCheckedChange={field.onChange} aria-describedby="map_is_enabled-description" disabled={isLoading}/>
                                <div className="space-y-1 leading-none">
                                    <FormLabel htmlFor="map_is_enabled" className="cursor-pointer"> Enable Mapping </FormLabel>
                                    <FormDescription id="map_is_enabled-description"> If checked, this mapping can be used in rules. </FormDescription>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )} />

                        {/* Footer buttons */}
                        <DialogFooter className="pt-4">
                            <DialogClose>
                                <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}> Cancel </Button>
                            </DialogClose>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isLoading ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create Mapping')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default CrosswalkMappingFormModal;
