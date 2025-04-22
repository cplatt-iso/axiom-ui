// src/components/DicomWebSourceFormModal.tsx
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
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

// Use the Read schema for source prop, Create/Update for payloads
import { DicomWebSourceConfigRead, DicomWebSourceConfigCreatePayload, DicomWebSourceConfigUpdatePayload } from '@/schemas';
// Use the Zod schema and FormData type
import { dicomWebSourceFormSchema, DicomWebSourceFormData } from '@/schemas';
import { createDicomWebSource, updateDicomWebSource } from '@/services/api';

interface DicomWebSourceFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    source: DicomWebSourceConfigRead | null; // Source prop uses the Read schema (with 'name')
}

// Define sensible initial default values for the form
const initialFormDefaults: DicomWebSourceFormData = {
    name: '',
    description: null,
    base_url: '',
    qido_prefix: 'qido-rs',
    wado_prefix: 'wado-rs',
    polling_interval_seconds: 300,
    is_enabled: true,
    auth_type: 'none', // Includes 'apikey' via Zod schema enum
    auth_config: null,
    search_filters: null,
};


const DicomWebSourceFormModal: React.FC<DicomWebSourceFormModalProps> = ({ isOpen, onClose, source }) => {
    const queryClient = useQueryClient();
    const isEditMode = !!source;

    const form = useForm<DicomWebSourceFormData>({
        resolver: zodResolver(dicomWebSourceFormSchema),
        defaultValues: initialFormDefaults,
    });

    const watchedAuthType = form.watch('auth_type');

    useEffect(() => {
        if (isOpen) {
            let resetValues;
            if (source) { // EDIT MODE: Use data from source prop (which has 'name')
                 resetValues = {
                    name: source.name, // Use source.name here
                    description: source.description,
                    base_url: source.base_url,
                    qido_prefix: source.qido_prefix,
                    wado_prefix: source.wado_prefix,
                    polling_interval_seconds: source.polling_interval_seconds,
                    is_enabled: source.is_enabled,
                    auth_type: source.auth_type,
                    auth_config: source.auth_config ? JSON.stringify(source.auth_config, null, 2) : null,
                    search_filters: source.search_filters ? JSON.stringify(source.search_filters, null, 2) : null,
                 };
            } else { // CREATE MODE
                 resetValues = initialFormDefaults;
            }
            form.reset(resetValues);
        }
    }, [isOpen, source, form]);

    // --- Mutations ---
    const createMutation = useMutation({
        mutationFn: createDicomWebSource,
        onSuccess: (data) => {
            // Use 'name' from response data for toast message consistency
            toast.success(`DICOMweb Source "${data.name}" created successfully.`);
            queryClient.invalidateQueries({ queryKey: ['dicomWebSources'] });
            onClose();
        },
        onError: (error: any) => {
            // Error handling remains the same
            let specificError = "Failed to create source.";
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
        mutationFn: (payload: { id: number, data: DicomWebSourceConfigUpdatePayload }) =>
            updateDicomWebSource(payload.id, payload.data),
        onSuccess: (data) => {
            // Use 'name' from response data for toast message consistency
            toast.success(`DICOMweb Source "${data.name}" updated successfully.`);
            queryClient.invalidateQueries({ queryKey: ['dicomWebSources'] });
            queryClient.invalidateQueries({ queryKey: ['dicomWebSource', data.id] });
            onClose();
        },
        onError: (error: any, variables) => {
            // Error handling remains the same
            let specificError = "Failed to update source.";
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
    const onSubmit = (values: DicomWebSourceFormData) => {
        // JSON parsing logic remains the same
        let parsedAuthConfig: Record<string, any> | null = null;
        let parsedSearchFilters: Record<string, any> | null = null;

        const safeJsonParse = (jsonString: string | null | undefined, fieldName: 'auth_config' | 'search_filters'): Record<string, any> | null => {
            if (jsonString && typeof jsonString === 'string' && jsonString.trim()) {
                try {
                    const parsed = JSON.parse(jsonString);
                    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                         return parsed;
                    } else {
                         form.setError(fieldName, { type: 'manual', message: `${fieldName.replace('_',' ')} must be a valid JSON object.` });
                         throw new Error("Invalid JSON type");
                    }
                } catch (e) {
                    form.setError(fieldName, { type: 'manual', message: `${fieldName.replace('_',' ')} is not valid JSON.` });
                    throw e;
                }
            }
            return null;
        };

        try {
            parsedAuthConfig = safeJsonParse(values.auth_config, 'auth_config');
            if (values.auth_type === 'none') {
                parsedAuthConfig = null;
            }
            parsedSearchFilters = safeJsonParse(values.search_filters, 'search_filters');
        } catch (e) {
            console.error("JSON Parsing error in form", e);
            return;
        }

        const apiPayload = { ...values, auth_config: parsedAuthConfig, search_filters: parsedSearchFilters };

        // Payload construction logic remains the same
        if (isEditMode && source) {
             const updatePayload: DicomWebSourceConfigUpdatePayload = {
                 name: apiPayload.name,
                 description: apiPayload.description,
                 base_url: apiPayload.base_url,
                 qido_prefix: apiPayload.qido_prefix,
                 wado_prefix: apiPayload.wado_prefix,
                 polling_interval_seconds: apiPayload.polling_interval_seconds,
                 is_enabled: apiPayload.is_enabled,
                 auth_type: apiPayload.auth_type,
                 auth_config: apiPayload.auth_config,
                 search_filters: apiPayload.search_filters,
             };
            console.log("Submitting Update Payload:", updatePayload);
            updateMutation.mutate({ id: source.id, data: updatePayload });
        } else {
             const createPayload: DicomWebSourceConfigCreatePayload = {
                 name: apiPayload.name,
                 description: apiPayload.description,
                 base_url: apiPayload.base_url,
                 qido_prefix: apiPayload.qido_prefix,
                 wado_prefix: apiPayload.wado_prefix,
                 polling_interval_seconds: apiPayload.polling_interval_seconds,
                 is_enabled: apiPayload.is_enabled,
                 auth_type: apiPayload.auth_type,
                 auth_config: apiPayload.auth_config,
                 search_filters: apiPayload.search_filters,
             };
            console.log("Submitting Create Payload:", createPayload);
            createMutation.mutate(createPayload);
        }
    };

    const isLoading = createMutation.isPending || updateMutation.isPending;

    // --- Update renderAuthConfigFields to include 'apikey' ---
    const renderAuthConfigFields = () => {
        if (watchedAuthType === 'basic') {
            return (
                <>
                    <FormDescription>
                        Enter username and password as JSON object: {`{"username": "user", "password": "pwd"}`}
                    </FormDescription>
                    <FormControl>
                        <Textarea placeholder={`{\n  "username": "your_username",\n  "password": "your_password"\n}`} {...form.register("auth_config")} rows={4} />
                    </FormControl>
                </>
            );
        }
        if (watchedAuthType === 'bearer') {
            return (
                <>
                    <FormDescription>
                         Enter the bearer token as JSON object: {`{"token": "your_bearer_token"}`}
                    </FormDescription>
                    <FormControl>
                        <Textarea placeholder={`{\n  "token": "your_long_bearer_token"\n}`} {...form.register("auth_config")} rows={3} />
                    </FormControl>
                 </>
            );
        }
        // --- ADDED API Key Fields ---
        if (watchedAuthType === 'apikey') {
             return (
                 <>
                     <FormDescription>
                         Enter the header name and key value as JSON object: {`{"header_name": "X-Api-Key", "key": "your_api_key"}`}
                     </FormDescription>
                     <FormControl>
                         <Textarea placeholder={`{\n  "header_name": "X-Api-Key",\n  "key": "your_secret_key_value"\n}`} {...form.register("auth_config")} rows={4} />
                     </FormControl>
                 </>
             );
        }
        // --- END API Key Fields ---
        // Default case for 'none'
        return <FormDescription>No authentication configuration required.</FormDescription>;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit DICOMweb Source' : 'Add DICOMweb Source'}</DialogTitle>
                    {/* Updated description to use source.name if available */}
                    <DialogDescription>
                        {isEditMode ? `Modify the configuration for "${source?.name}".` : 'Configure a new source for DICOMweb polling.'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
                        {/* Name */}
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name*</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Orthanc Main Poller" {...field} />
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
                                        <Input placeholder="Optional description" {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {/* Base URL */}
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
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         {/* QIDO Prefix */}
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
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {/* WADO Prefix */}
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
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {/* Polling Interval */}
                        <FormField
                            control={form.control}
                            name="polling_interval_seconds"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Polling Interval (seconds)*</FormLabel>
                                    <FormControl>
                                        <Input type="number" min="1" step="1" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Auth Type Select - Add Item */}
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
                                             <SelectItem value="apikey">API Key Header</SelectItem> {/* <-- ADDED */}
                                         </SelectContent>
                                     </Select>
                                    <FormMessage />
                                </FormItem>
                             )}
                        />
                        {/* Auth Config Field (now handles apikey via renderAuthConfigFields) */}
                        <FormField
                            control={form.control}
                            name="auth_config"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Authentication Config</FormLabel>
                                    {renderAuthConfigFields()}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Search Filters */}
                         <FormField
                            control={form.control}
                            name="search_filters"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Search Filters (QIDO)</FormLabel>
                                    <FormDescription>
                                        Enter QIDO-RS query parameters as JSON object (e.g., {`{"StudyDate": "20240101-"}`}). Optional.
                                    </FormDescription>
                                    <FormControl>
                                        <Textarea placeholder={`{\n  "ModalitiesInStudy": "CT",\n  "StudyDate": "20240101-"\n}`} {...field} value={field.value ?? ''} rows={4} />
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
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                         <FormLabel>
                                            Enable Polling
                                         </FormLabel>
                                         <FormDescription>
                                             If checked, the system will actively poll this source.
                                         </FormDescription>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {/* --- Form Fields End --- */}

                        <DialogFooter className="pt-4">
                            <DialogClose asChild>
                                 <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                            </DialogClose>
                             <Button type="submit" disabled={isLoading}>
                                 {isLoading ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create Source')}
                             </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default DicomWebSourceFormModal;
