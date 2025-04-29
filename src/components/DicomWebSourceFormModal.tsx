// src/components/DicomWebSourceFormModal.tsx
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import json5 from 'json5'; // Use json5 for easier JSON editing

import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose,
} from '@/components/ui/dialog';
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
// import { Checkbox } from '@/components/ui/checkbox'; // REMOVED - Replaced with Switch
import { Switch } from '@/components/ui/switch';      // ADDED - Use Switch instead of Checkbox
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// --- Import API/General TYPES from main schemas index ---
import {
    DicomWebSourceConfigRead,
    DicomWebSourceConfigCreatePayload,
    DicomWebSourceConfigUpdatePayload,
    AuthType,
} from '@/schemas';
// --- END API/General TYPES ---

// --- Import Zod Schema and FORM DATA type DIRECTLY from its file ---
import {
    dicomWebSourceFormSchema, // The Zod Schema object
    DicomWebSourceFormData,   // The TypeScript type derived from the Zod schema
} from '@/schemas/dicomWebSourceSchema'; // Import from SPECIFIC file
// --- END Zod Schema Import ---

import { createDicomWebSource, updateDicomWebSource } from '@/services/api';

interface DicomWebSourceFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    source: DicomWebSourceConfigRead | null;
}

// Add is_active to defaults
const initialFormDefaults: DicomWebSourceFormData = {
    name: '', description: null, base_url: '', qido_prefix: 'qido-rs', wado_prefix: 'wado-rs',
    polling_interval_seconds: 300, is_enabled: true, is_active: true, auth_type: 'none', auth_config: null, search_filters: null,
};

const DicomWebSourceFormModal: React.FC<DicomWebSourceFormModalProps> = ({ isOpen, onClose, source }) => {
    const queryClient = useQueryClient();
    const isEditMode = !!source;

    const form = useForm<DicomWebSourceFormData>({
        resolver: zodResolver(dicomWebSourceFormSchema),
        defaultValues: initialFormDefaults,
    });

    const watchedAuthType = form.watch('auth_type');
    const watchedIsEnabled = form.watch('is_enabled'); // Watch is_enabled

    useEffect(() => {
        if (isOpen) {
            let resetValues;
            if (source) {
                 resetValues = {
                    // Prefer 'name' from schema if available, fallback to DB 'source_name'
                    name: source.name ?? source.source_name,
                    description: source.description ?? null,
                    base_url: source.base_url ?? '',
                    qido_prefix: source.qido_prefix ?? 'qido-rs',
                    wado_prefix: source.wado_prefix ?? 'wado-rs',
                    polling_interval_seconds: source.polling_interval_seconds ?? 300,
                    is_enabled: source.is_enabled ?? true,
                    is_active: source.is_active ?? true, // Set is_active on edit
                    auth_type: source.auth_type ?? 'none',
                    // Use json5 for stringifying (more forgiving)
                    auth_config: source.auth_config ? json5.stringify(source.auth_config, null, 2) : null,
                    search_filters: source.search_filters ? json5.stringify(source.search_filters, null, 2) : null,
                 };
            } else {
                 resetValues = {
                    ...initialFormDefaults,
                    is_active: true // Ensure active is true for create
                 };
            }
            form.reset(resetValues);
             console.log("Resetting DICOMweb form with:", resetValues);
        }
    }, [isOpen, source, form]);

    const createMutation = useMutation({
        mutationFn: createDicomWebSource,
        onSuccess: (data) => {
            toast.success(`DICOMweb Source "${data.name ?? data.source_name}" created successfully.`);
            queryClient.invalidateQueries({ queryKey: ['dicomWebSources'] });
            onClose();
        },
        onError: (error: any) => {
            let specificError = "Failed to create source.";
             if (error?.detail && Array.isArray(error.detail) && error.detail[0]) {
                 const errDetail = error.detail[0];
                 const field = errDetail.loc?.[1] || 'input';
                 specificError = `Validation Error on field '${field}': ${errDetail.msg}`;
            } else if (error?.detail){
                 specificError = typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail); // Use JSON.stringify as fallback
            } else {
                 specificError = error.message || specificError;
            }
            toast.error(`Creation failed: ${specificError}`);
            console.error("Create error:", error?.detail || error);
        },
    });

    const updateMutation = useMutation({
        mutationFn: (payload: { id: number, data: DicomWebSourceConfigUpdatePayload }) => updateDicomWebSource(payload.id, payload.data),
        onSuccess: (data) => {
            toast.success(`DICOMweb Source "${data.name ?? data.source_name}" updated successfully.`);
            queryClient.invalidateQueries({ queryKey: ['dicomWebSources'] });
            queryClient.invalidateQueries({ queryKey: ['dicomWebSource', data.id] });
            onClose();
        },
        onError: (error: any, variables) => {
            let specificError = "Failed to update source.";
             if (error?.detail && Array.isArray(error.detail) && error.detail[0]) {
                 const errDetail = error.detail[0];
                 const field = errDetail.loc?.[1] || 'input';
                 specificError = `Validation Error on field '${field}': ${errDetail.msg}`;
            } else if (error?.detail){
                 specificError = typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail); // Use JSON.stringify as fallback
            } else {
                 specificError = error.message || specificError;
            }
            toast.error(`Update failed for ID ${variables.id}: ${specificError}`);
            console.error(`Update error for ID ${variables.id}:`, error?.detail || error);
        },
    });

    const onSubmit = (values: DicomWebSourceFormData) => {
        // Use json5 for parsing user input allowing comments etc.
        const safeJson5Parse = (jsonString: string | null | undefined, fieldName: 'auth_config' | 'search_filters'): Record<string, any> | null => {
             if (!jsonString || !jsonString.trim()) return null;
             try {
                 const parsed = json5.parse(jsonString);
                 if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                     return parsed;
                 } else {
                     form.setError(fieldName, { type: 'manual', message: `${fieldName.replace('_',' ')} must be a valid JSON object.` });
                     throw new Error("Invalid JSON type");
                 }
             } catch (e) {
                 form.setError(fieldName, { type: 'manual', message: `${fieldName.replace('_',' ')} is not valid JSON: ${e instanceof Error ? e.message : String(e)}` });
                 throw e;
             }
        };

        let parsedAuthConfig: Record<string, any> | null = null;
        let parsedSearchFilters: Record<string, any> | null = null;

        try {
            parsedAuthConfig = safeJson5Parse(values.auth_config, 'auth_config');
            if (values.auth_type === 'none') {
                parsedAuthConfig = null;
            }
            parsedSearchFilters = safeJson5Parse(values.search_filters, 'search_filters');
        } catch (e) {
            console.error("JSON Parsing error in form", e);
            toast.error("Please fix the invalid JSON in the marked field(s)."); // Give user feedback
            return; // Stop submission
        }


        const apiPayload = {
             ...values,
             description: values.description?.trim() || null,
             auth_config: parsedAuthConfig,
             search_filters: parsedSearchFilters,
             // is_active is already included from 'values'
        };
        console.log("Submitting DICOMweb Values (API Payload):", apiPayload);

        if (isEditMode && source) {
             const updatePayload: DicomWebSourceConfigUpdatePayload = apiPayload;
            updateMutation.mutate({ id: source.id, data: updatePayload });
        } else {
             const createPayload: DicomWebSourceConfigCreatePayload = apiPayload;
            createMutation.mutate(createPayload);
        }
    };

    const isLoading = createMutation.isPending || updateMutation.isPending;

    const renderAuthConfigFields = () => {
        const placeholderBase = "// Enter JSON config, e.g.:\n{\n  ";
        const placeholderEnd = "\n}";
        let placeholder = "";
        let rows = 3;

        if (watchedAuthType === 'basic') {
            placeholder = placeholderBase + `"username": "your_username",\n  "password": "your_password"` + placeholderEnd;
            rows = 5;
        } else if (watchedAuthType === 'bearer') {
            placeholder = placeholderBase + `"token": "your_long_bearer_token"` + placeholderEnd;
            rows = 4;
        } else if (watchedAuthType === 'apikey') {
             placeholder = placeholderBase + `"header_name": "X-Api-Key",\n  "key": "your_secret_key_value"` + placeholderEnd;
             rows = 5;
        }

        if (watchedAuthType !== 'none') {
             return (
                 <>
                     <FormDescription>
                         Enter required credentials as a JSON object.
                     </FormDescription>
                     <FormControl>
                         <Textarea
                             placeholder={placeholder}
                             // Use the value from the form state directly
                             {...form.register("auth_config")}
                             rows={rows}
                             className="font-mono text-xs"
                             disabled={isLoading}
                         />
                     </FormControl>
                 </>
             );
        }
        return <FormDescription>No authentication configuration required.</FormDescription>;
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit DICOMweb Source' : 'Add DICOMweb Source'}</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? `Modify the configuration for "${source?.name ?? source?.source_name}".` : 'Configure a new source for DICOMweb polling.'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                     {/* No closing tag here on purpose - DO NOT COLLAPSE */}
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">

                        {/* --- Name --- */}
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name*</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Orthanc Main Poller" {...field} />
                                    </FormControl>
                                    <FormMessage></FormMessage> {/* Keep closing tag */}
                                </FormItem>
                            )}
                        />

                        {/* --- Description --- */}
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Optional description" {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormMessage></FormMessage> {/* Keep closing tag */}
                                </FormItem>
                            )}
                        />

                        {/* --- Base URL --- */}
                        <FormField
                            control={form.control}
                            name="base_url"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Base URL*</FormLabel>
                                     <FormDescription>Include schema and port (e.g., http://localhost:8042/dicom-web)</FormDescription>
                                    <FormControl>
                                        <Input placeholder="http://dicom-server.local:8042/dicom-web" {...field} />
                                    </FormControl>
                                    <FormMessage></FormMessage> {/* Keep closing tag */}
                                </FormItem>
                            )}
                        />

                        {/* --- QIDO Prefix --- */}
                        <FormField
                            control={form.control}
                            name="qido_prefix"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>QIDO Prefix</FormLabel>
                                     <FormDescription>Path segment for QIDO-RS service.</FormDescription>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage></FormMessage> {/* Keep closing tag */}
                                </FormItem>
                            )}
                        />

                        {/* --- WADO Prefix --- */}
                        <FormField
                            control={form.control}
                            name="wado_prefix"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>WADO Prefix</FormLabel>
                                     <FormDescription>Path segment for WADO-RS service.</FormDescription>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage></FormMessage> {/* Keep closing tag */}
                                </FormItem>
                            )}
                        />

                        {/* --- Interval --- */}
                        <FormField
                            control={form.control}
                            name="polling_interval_seconds"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Polling Interval (seconds)*</FormLabel>
                                    <FormControl>
                                        <Input type="number" min="1" step="1" {...field} />
                                    </FormControl>
                                    <FormMessage></FormMessage> {/* Keep closing tag */}
                                </FormItem>
                            )}
                        />

                        {/* --- Auth Type --- */}
                        <FormField
                            control={form.control}
                            name="auth_type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Authentication Type</FormLabel>
                                     <Select onValueChange={field.onChange} value={field.value}>
                                         <FormControl>
                                             <SelectTrigger>
                                                 <SelectValue placeholder="Select auth type" />
                                             </SelectTrigger>
                                         </FormControl>
                                         <SelectContent>
                                             <SelectItem value="none">None</SelectItem>
                                             <SelectItem value="basic">HTTP Basic</SelectItem>
                                             <SelectItem value="bearer">Bearer Token</SelectItem>
                                             <SelectItem value="apikey">API Key Header</SelectItem>
                                         </SelectContent>
                                     </Select>
                                    <FormMessage></FormMessage> {/* Keep closing tag */}
                                </FormItem>
                             )}
                        />

                        {/* --- Auth Config --- */}
                        <FormField
                            control={form.control}
                            name="auth_config"
                            // Use watchedAuthType to re-render this when auth_type changes
                            key={watchedAuthType}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Authentication Config</FormLabel>
                                    {renderAuthConfigFields()}
                                    {/* Render message directly below Textarea */}
                                     <FormMessage></FormMessage> {/* Keep closing tag */}
                                </FormItem>
                            )}
                        />

                        {/* --- Search Filters --- */}
                        <FormField
                            control={form.control}
                            name="search_filters"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Search Filters (QIDO)</FormLabel>
                                    <FormDescription>
                                        Enter QIDO-RS query parameters as JSON object (e.g., {`{"StudyDate": "-7d"}`}). Optional.
                                    </FormDescription>
                                    <FormControl>
                                        <Textarea
                                            placeholder={`// Example QIDO query params\n{\n  "ModalitiesInStudy": "CT",\n  "StudyDate": "-30d"\n}`}
                                            {...field}
                                            value={field.value ?? ''} // Ensure value is string for textarea
                                            rows={5}
                                            className="font-mono text-xs"
                                            disabled={isLoading}
                                         />
                                    </FormControl>
                                    <FormMessage></FormMessage> {/* Keep closing tag */}
                                </FormItem>
                            )}
                        />

                        {/* --- is_enabled Switch --- */}
                        <FormField
                            control={form.control}
                            name="is_enabled"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                                     <FormControl>
                                        <Switch // Use Switch component
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            id="dicomweb-enabled"
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                         <FormLabel htmlFor="dicomweb-enabled">
                                            Source Enabled
                                         </FormLabel>
                                         <FormDescription>
                                             Allow use in Data Browser and rules. Must be enabled for polling to be active.
                                         </FormDescription>
                                    </div>
                                    <FormMessage></FormMessage> {/* Keep closing tag */}
                                </FormItem>
                            )}
                        />

                         {/* --- is_active Switch --- */}
                        <FormField
                            control={form.control}
                            name="is_active"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                                    <FormControl>
                                        <Switch // Use Switch component
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            id="dicomweb-active" // Unique ID
                                            disabled={!watchedIsEnabled} // Use watched value
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel htmlFor="dicomweb-active">
                                            Automatic Polling Active
                                        </FormLabel>
                                        <FormDescription>
                                            If checked (and source is Enabled), the system will automatically poll this source on its schedule.
                                        </FormDescription>
                                    </div>
                                    <FormMessage></FormMessage> {/* Keep closing tag */}
                                </FormItem>
                            )}
                        />
                        {/* --- End is_active Switch --- */}

                        <DialogFooter className="pt-4">
                            <DialogClose asChild>
                                 <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                            </DialogClose>
                             <Button type="submit" disabled={isLoading}>
                                 {isLoading ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create Source')}
                             </Button>
                        </DialogFooter>
                    </form>
                     {/* Keep closing tag */}
                </Form>
                 {/* Keep closing tag */}
            </DialogContent>
             {/* Keep closing tag */}
        </Dialog>
         /* Keep closing tag */
    );
};

export default DicomWebSourceFormModal;
