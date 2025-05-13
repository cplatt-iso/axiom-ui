// src/components/DicomWebSourceFormModal.tsx
import React, { useEffect } from 'react';
import { z } from "zod";
import { useForm, Controller } from 'react-hook-form'; // Use Controller
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import json5 from 'json5'; // Keep json5

// UI Components
import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose,
} from '@/components/ui/dialog';
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch'; // Keep Switch
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// API/Schema Types
import {
    DicomWebSourceConfigRead,
    DicomWebSourceConfigCreatePayload,
    DicomWebSourceConfigUpdatePayload,
} from '@/schemas'; // Ensure this path is correct
import {
    dicomWebSourceFormSchema, // Use the corrected schema
    DicomWebSourceFormData,   // Type derived from corrected schema    
} from '@/schemas/dicomWebSourceSchema'; // Ensure this path is correct

// API Functions
import { createDicomWebSource, updateDicomWebSource } from '@/services/api'; // Ensure this path is correct

interface DicomWebSourceFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    source: DicomWebSourceConfigRead | null; // Source being edited, or null for create
}

// Initial Defaults for CREATE mode - includes is_active
const initialFormDefaults: DicomWebSourceFormData = {
    name: '',
    description: null,
    base_url: '',
    qido_prefix: 'qido-rs',
    wado_prefix: 'wado-rs',
    polling_interval_seconds: 300,
    is_enabled: true,
    is_active: true, // Default active to true
    auth_type: 'none',
    auth_config: '', // Start with empty string for textarea
    search_filters: '', // Start with empty string for textarea
};

const DicomWebSourceFormModal: React.FC<DicomWebSourceFormModalProps> = ({ isOpen, onClose, source }) => {
    const queryClient = useQueryClient();
    const isEditMode = !!source;

    const form = useForm<z.infer<typeof dicomWebSourceFormSchema>>({
        resolver: zodResolver(dicomWebSourceFormSchema),
        defaultValues: initialFormDefaults,
        mode: 'onBlur',
    });

    const watchedAuthType = form.watch('auth_type');
    // We need to watch is_enabled to disable the is_active switch
    const watchedIsEnabled = form.watch('is_enabled');

    // Effect to reset form when modal opens or source changes
    useEffect(() => {
        if (isOpen) {
            let resetValues: Partial<DicomWebSourceFormData>;

            if (isEditMode && source) {
                // EDIT MODE: Build values from the source prop
                // Optional: Keep log for debugging resets if needed
                // console.log("useEffect [DicomWeb]: EDIT mode, resetting from source:", source);
                resetValues = {
                    // Use 'name' from schema, fallback to DB 'source_name'
                    name: source.name ?? source.source_name,
                    description: source.description ?? null,
                    base_url: source.base_url ?? '',
                    qido_prefix: source.qido_prefix ?? 'qido-rs',
                    wado_prefix: source.wado_prefix ?? 'wado-rs',
                    polling_interval_seconds: source.polling_interval_seconds ?? 300,
                    is_enabled: source.is_enabled ?? true,
                    // is_active: source.is_active ?? true, // Reset is_active from source
                    auth_type: source.auth_type ?? 'none',
                    // Stringify objects for textareas
                    auth_config: source.auth_config ? json5.stringify(source.auth_config, null, 2) : '',
                    search_filters: source.search_filters ? json5.stringify(source.search_filters, null, 2) : '',
                 };
            } else {
                 // CREATE MODE: Use the predefined defaults
                 // Optional: Keep log for debugging resets if needed
                 // console.log("useEffect [DicomWeb]: CREATE mode, resetting to initial defaults.");
                 resetValues = {
                    ...initialFormDefaults,
                    auth_config: '', // Ensure textareas start empty
                    search_filters: ''
                 };
            }
             // Optional: Keep log for debugging resets if needed
             // console.log("useEffect [DicomWeb]: Calling form.reset() with:", resetValues);
             form.reset(resetValues);
        }
    }, [isOpen, source, isEditMode, form]); // Dependencies for the effect

    // --- Mutations (Keep as is) ---
    const createMutation = useMutation({
        mutationFn: createDicomWebSource,
        onSuccess: (data) => {
            toast.success(`DICOMweb Source "${data.name ?? data.source_name}" created successfully.`);
            queryClient.invalidateQueries({ queryKey: ['dicomWebSources'] });
            onClose();
        },
        onError: (error: any) => {
            let specificError = error?.detail || error.message || "Failed to create source.";
            if (error?.detail && Array.isArray(error.detail) && error.detail[0]) { const errDetail = error.detail[0]; const field = errDetail.loc?.[1] || 'input'; specificError = `Validation Error on field '${field}': ${errDetail.msg}`; }
            toast.error(`Creation failed: ${specificError}`);
            console.error("Create DICOMweb error:", error?.detail || error); // Keep error log
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
            let specificError = error?.detail || error.message || "Failed to update source.";
            if (error?.detail && Array.isArray(error.detail) && error.detail[0]) { const errDetail = error.detail[0]; const field = errDetail.loc?.[1] || 'input'; specificError = `Validation Error on field '${field}': ${errDetail.msg}`; }
            toast.error(`Update failed for ID ${variables.id}: ${specificError}`);
            console.error(`Update DICOMweb error for ID ${variables.id}:`, error?.detail || error); // Keep error log
        },
    });
    // --- End Mutations ---

    // --- Form Submit Handler (with parsing fix) ---
    const onSubmit: Parameters<typeof form.handleSubmit>[0] = (values) => {
        // Optional: Keep log for debugging if needed
        // console.log(">>> DicomWebSourceFormModal - onSubmit received values:", JSON.stringify(values, null, 2));

        // Parse JSON strings from textareas back into objects or null
        const safeJson5Parse = (jsonString: string | null | undefined | object, fieldName: 'auth_config' | 'search_filters'): Record<string, any> | null => {
             // If it's already an object (from schema?), return it directly (might happen depending on RHF state)
             if (typeof jsonString === 'object' && jsonString !== null) {
                 return jsonString as Record<string, any>;
             }
             // If it's not a string or empty, return null
             if (typeof jsonString !== 'string' || !jsonString.trim()) {
                 return null;
             }
             // Try parsing the string
             try {
                 const parsed = json5.parse(jsonString);
                 if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                     return parsed;
                 } else {
                     form.setError(fieldName, { type: 'manual', message: `${fieldName.replace('_',' ')} must be a valid JSON object string.` });
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
            // Use the helper to parse both fields
            parsedAuthConfig = safeJson5Parse(values.auth_config, 'auth_config');
            if (values.auth_type === 'none') {
                parsedAuthConfig = null; // Ensure null if auth type is none
            }
            parsedSearchFilters = safeJson5Parse(values.search_filters, 'search_filters');
        } catch (e) {
            console.error("JSON Parsing error during submit:", e); // Keep error log
            toast.error("Please fix the invalid JSON in the marked field(s).");
            return; // Stop submission
        }

        // Construct the payload for the API
        const apiPayload = {
             name: values.name, // Send 'name' from form
             description: values.description?.trim() || null,
             base_url: values.base_url,
             qido_prefix: values.qido_prefix,
             wado_prefix: values.wado_prefix,
             polling_interval_seconds: values.polling_interval_seconds,
             is_enabled: values.is_enabled,
             is_active: values.is_active, // Send is_active
             auth_type: values.auth_type,
             // Send parsed objects
             auth_config: parsedAuthConfig,
             search_filters: parsedSearchFilters
        };
        // Optional: Keep log for debugging if needed
        // console.log(">>> DicomWebSourceFormModal - Submitting API Payload:", JSON.stringify(apiPayload, null, 2));

        if (isEditMode && source) {
             // For update, send only changed fields potentially, but current backend expects full object?
             // Sending the full apiPayload should work with the PUT endpoint structure.
             const updatePayload: DicomWebSourceConfigUpdatePayload = apiPayload;
             // console.log(">>> DicomWebSourceFormModal - Typed Update Payload:", JSON.stringify(updatePayload, null, 2));
            updateMutation.mutate({ id: source.id, data: updatePayload });
        } else {
             // Create expects all required fields
             const createPayload: DicomWebSourceConfigCreatePayload = apiPayload;
             // console.log(">>> DicomWebSourceFormModal - Typed Create Payload:", JSON.stringify(createPayload, null, 2));
            createMutation.mutate(createPayload);
        }
    };
    // --- End Submit Handler ---

    const isLoading = createMutation.isPending || updateMutation.isPending;

    // --- Helper to render Auth Config Textarea ---
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
                 <React.Fragment>
                     {/* Explicit closing tag */}
                     <FormDescription>
                         Enter required credentials as a JSON object.
                     </FormDescription>
                     <FormControl>
                         {/* Explicit closing tag */}
                         {/* Bind using Controller render prop directly */}
                         <Controller
                             name="auth_config"
                             control={form.control}
                             render={({ field }) => (
                                <Textarea
                                    placeholder={placeholder}
                                    // RHF value could be string | object | null from schema
                                    // Ensure Textarea receives a string
                                    value={(typeof field.value === 'object' && field.value !== null)
                                             ? json5.stringify(field.value, null, 2)
                                             : (field.value ?? '')}
                                    onChange={field.onChange} // Let RHF handle change
                                    onBlur={field.onBlur}
                                    ref={field.ref}
                                    rows={rows}
                                    className="font-mono text-xs"
                                    disabled={isLoading}
                                ></Textarea>
                                // Explicit closing tag
                             )}
                        />
                        {/* Explicit closing tag */}
                     </FormControl>
                 </React.Fragment>
             );
        }
        return <FormDescription>No authentication configuration required.</FormDescription>;
    };
    // --- End Auth Config Helper ---

    // --- Render ---
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            {/* Explicit closing tag */}
            <DialogContent className="sm:max-w-[600px]">
                {/* Explicit closing tag */}
                <DialogHeader>
                    {/* Explicit closing tag */}
                    <DialogTitle>{isEditMode ? 'Edit DICOMweb Source' : 'Add DICOMweb Source'}</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? `Modify the configuration for "${source?.name ?? source?.source_name}".` : 'Configure a new source for DICOMweb polling.'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                     {/* Explicit closing tag */}
                    {/* Explicit closing tag */}
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">

                        {/* --- Fields with explicit closing tags --- */}
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name*</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Orthanc Main Poller" {...field}></Input>
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
                                        <Input placeholder="Optional description" {...field} value={field.value ?? ''}></Input>
                                    </FormControl>
                                    <FormMessage></FormMessage>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="base_url"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Base URL*</FormLabel>
                                     <FormDescription>Include schema and port (e.g., http://localhost:8042/dicom-web)</FormDescription>
                                    <FormControl>
                                        <Input placeholder="http://dicom-server.local:8042/dicom-web" {...field}></Input>
                                    </FormControl>
                                    <FormMessage></FormMessage>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="qido_prefix"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>QIDO Prefix</FormLabel>
                                     <FormDescription>Path segment for QIDO-RS service.</FormDescription>
                                    <FormControl>
                                        <Input {...field}></Input>
                                    </FormControl>
                                    <FormMessage></FormMessage>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="wado_prefix"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>WADO Prefix</FormLabel>
                                     <FormDescription>Path segment for WADO-RS service.</FormDescription>
                                    <FormControl>
                                        <Input {...field}></Input>
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
                                        <Input type="number" min="1" step="1" {...field}></Input>
                                    </FormControl>
                                    <FormMessage></FormMessage>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="auth_type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Authentication Type</FormLabel>
                                     <Select onValueChange={field.onChange} value={field.value}>
                                        {/* Explicit closing tag */}
                                         <FormControl>
                                             <SelectTrigger>
                                                {/* Explicit closing tag */}
                                                 <SelectValue placeholder="Select auth type" />
                                             </SelectTrigger>
                                             {/* Explicit closing tag */}
                                         </FormControl>
                                         <SelectContent>
                                            {/* Explicit closing tag */}
                                             <SelectItem value="none">None</SelectItem>
                                             <SelectItem value="basic">HTTP Basic</SelectItem>
                                             <SelectItem value="bearer">Bearer Token</SelectItem>
                                             <SelectItem value="apikey">API Key Header</SelectItem>
                                         </SelectContent>
                                         {/* Explicit closing tag */}
                                     </Select>
                                    <FormMessage></FormMessage>
                                </FormItem>
                             )}
                        />

                        {/* Auth Config - uses Controller internally now via renderAuthConfigFields */}
                        <FormItem>
                            {/* Explicit closing tag */}
                            <FormLabel>Authentication Config</FormLabel>
                            {renderAuthConfigFields()}
                            {/* Render message directly if using Controller */}
                             <FormMessage>{form.formState.errors.auth_config?.message}</FormMessage>
                             {/* Explicit closing tag */}
                        </FormItem>

                        {/* Search Filters - Use Controller for Textarea consistency */}
                        <Controller
                             name="search_filters"
                             control={form.control}
                             render={({ field, fieldState: { error } }) => (
                                <FormItem>
                                    <FormLabel>Search Filters (QIDO)</FormLabel>
                                    <FormDescription>
                                        Enter QIDO-RS query parameters as JSON object (e.g., {`{"StudyDate": "-7d"}`}). Optional.
                                    </FormDescription>
                                    <FormControl>
                                        <Textarea
                                            placeholder={`// Example QIDO query params\n{\n  "ModalitiesInStudy": "CT",\n  "StudyDate": "-30d"\n}`}
                                            value={(typeof field.value === 'object' && field.value !== null)
                                                     ? json5.stringify(field.value, null, 2)
                                                     : (field.value ?? '')}
                                            onChange={field.onChange}
                                            onBlur={field.onBlur}
                                            ref={field.ref}
                                            rows={5}
                                            className="font-mono text-xs"
                                            disabled={isLoading}
                                         ></Textarea>
                                         {/* Explicit closing tag */}
                                    </FormControl>
                                    {/* Display error message */}
                                    {error && <FormMessage>{error.message}</FormMessage>}
                                    {/* Explicit closing tag */}
                                </FormItem>
                             )}
                         />
                         {/* End Search Filters */}

                        {/* --- is_enabled Switch (Using Controller) --- */}
                        <Controller
                            name="is_enabled"
                            control={form.control}
                            render={({ field: { onChange, value, ref }, fieldState: { error } }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                                    {/* Explicit closing tag */}
                                    <FormControl>
                                        {/* Explicit closing tag */}
                                        <Switch
                                            checked={!!value}
                                            onCheckedChange={onChange}
                                            ref={ref}
                                            id="dicomweb-enabled"
                                        />
                                        {/* Explicit closing tag - Switch is self-closing */}
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        {/* Explicit closing tag */}
                                         <FormLabel htmlFor="dicomweb-enabled">
                                            Source Enabled
                                         </FormLabel>
                                         <FormDescription>
                                             Allow use in Data Browser and rules. Must be enabled for polling to be active.
                                         </FormDescription>
                                    </div>
                                     {error && <FormMessage>{error.message}</FormMessage>}
                                     {/* Explicit closing tag */}
                                </FormItem>
                            )}
                        />
                        {/* --- End is_enabled Switch --- */}

                         {/* --- is_active Switch (Using Controller) --- */}
                        <Controller
                            name="is_active"
                            control={form.control}
                            render={({ field: { onChange, value, ref }, fieldState: { error } }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                                    {/* Explicit closing tag */}
                                    <FormControl>
                                        {/* Explicit closing tag */}
                                        <Switch
                                            checked={!!value}
                                            onCheckedChange={onChange}
                                            ref={ref}
                                            id="dicomweb-active" // Unique ID
                                            disabled={!watchedIsEnabled} // Use watched value
                                        />
                                        {/* Explicit closing tag - Switch is self-closing */}
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        {/* Explicit closing tag */}
                                        <FormLabel htmlFor="dicomweb-active">
                                            Automatic Polling Active
                                        </FormLabel>
                                        <FormDescription>
                                            If checked (and source is Enabled), the system will automatically poll this source on its schedule.
                                        </FormDescription>
                                    </div>
                                     {error && <FormMessage>{error.message}</FormMessage>}
                                     {/* Explicit closing tag */}
                                </FormItem>
                            )}
                        />
                        {/* --- End is_active Switch --- */}

                        <DialogFooter className="pt-4">
                            {/* Explicit closing tag */}
                            <DialogClose asChild={true}>
                                {/* Explicit closing tag */}
                                 <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                                 {/* Explicit closing tag */}
                            </DialogClose>
                             <Button type="submit" disabled={isLoading}>
                                 {isLoading ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create Source')}
                             </Button>
                             {/* Explicit closing tag */}
                        </DialogFooter>
                        {/* Explicit closing tag */}
                    </form>
                     {/* Explicit closing tag */}
                </Form>
                 {/* Explicit closing tag */}
            </DialogContent>
             {/* Explicit closing tag */}
        </Dialog>
         /* Explicit closing tag */
    );
};

export default DicomWebSourceFormModal;
