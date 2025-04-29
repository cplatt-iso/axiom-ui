// src/components/DimseQrSourceFormModal.tsx
import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form'; // Use Controller
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import json5 from 'json5'; // Use json5 for parsing/stringifying

// UI Components
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// API/Schema Types
import {
    DimseQueryRetrieveSourceRead,
    DimseQueryRetrieveSourceCreatePayload,
    DimseQueryRetrieveSourceUpdatePayload
} from '@/schemas'; // Assuming index export works for these payload types
import {
    dimseQrSourceFormSchema, // Use the simplified schema
    DimseQrSourceFormData,   // Type derived from simplified schema
} from '@/schemas/dimseQrSourceSchema'; // Ensure this path is correct

// API Functions
import {
    createDimseQrSource,
    updateDimseQrSource,
} from '@/services/api'; // Ensure this path is correct

interface DimseQrSourceFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    source: DimseQueryRetrieveSourceRead | null;
}

// Initial Defaults for CREATE mode - based on simplified schema
const initialFormDefaults: DimseQrSourceFormData = {
    name: '',
    description: null,
    remote_ae_title: '',
    remote_host: '',
    remote_port: 104,
    local_ae_title: 'AXIOM_QR_SCU',
    polling_interval_seconds: 300,
    is_enabled: true,
    is_active: true,
    query_level: 'STUDY',
    query_filters: '', // Start with empty string for textarea
    move_destination_ae_title: null,
};


const DimseQrSourceFormModal: React.FC<DimseQrSourceFormModalProps> = ({ isOpen, onClose, source }) => {
    const queryClient = useQueryClient();
    const isEditMode = !!source;

    const form = useForm<DimseQrSourceFormData>({
        // Use the simplified Zod schema
        resolver: zodResolver(dimseQrSourceFormSchema),
        defaultValues: initialFormDefaults
    });

    // Effect to reset form when modal opens or source changes
    useEffect(() => {
        if (isOpen) {
            let resetValues: Partial<DimseQrSourceFormData>; // Use Partial for reset if needed

            if (isEditMode && source) {
                console.log("useEffect [DimseQr]: EDIT mode, resetting from source:", source);
                resetValues = {
                    name: source.name ?? '',
                    description: source.description ?? null,
                    remote_ae_title: source.remote_ae_title ?? '',
                    remote_host: source.remote_host ?? '',
                    remote_port: source.remote_port ?? 104,
                    local_ae_title: source.local_ae_title ?? 'AXIOM_QR_SCU',
                    polling_interval_seconds: source.polling_interval_seconds ?? 300,
                    is_enabled: source.is_enabled ?? true,
                    is_active: source.is_active ?? true,
                    query_level: source.query_level ?? 'STUDY',
                    // Stringify object from source for textarea
                    query_filters: source.query_filters ? json5.stringify(source.query_filters, null, 2) : '',
                    move_destination_ae_title: source.move_destination_ae_title ?? null,
                };
            } else {
                console.log("useEffect [DimseQr]: CREATE mode, resetting to initial defaults.");
                resetValues = {
                    ...initialFormDefaults,
                    query_filters: '' // Ensure it's an empty string for create
                };
            }
            console.log("useEffect [DimseQr]: Calling form.reset() with:", resetValues);
            form.reset(resetValues);
        }
    }, [isOpen, source, isEditMode, form]);

    // --- Mutations ---
    const createMutation = useMutation({
        mutationFn: createDimseQrSource,
        onSuccess: (data) => {
            toast.success(`DIMSE Q/R Source "${data.name}" created successfully.`);
            queryClient.invalidateQueries({ queryKey: ['dimseQrSources'] });
            onClose();
        },
        onError: (error: any) => {
            const errorMsg = error?.detail?.[0]?.msg || error?.detail || error.message || "Failed to create source.";
            toast.error(`Creation failed: ${errorMsg}`);
            console.error("Create DIMSE Q/R Source error:", error);
        },
    });

    const updateMutation = useMutation({
        mutationFn: (payload: { id: number, data: DimseQueryRetrieveSourceUpdatePayload }) =>
            updateDimseQrSource(payload.id, payload.data),
        onSuccess: (data) => {
            toast.success(`DIMSE Q/R Source "${data.name}" updated successfully.`);
            queryClient.invalidateQueries({ queryKey: ['dimseQrSources'] });
            queryClient.invalidateQueries({ queryKey: ['dimseQrSource', data.id] });
            onClose();
        },
        onError: (error: any, variables) => {
            const errorMsg = error?.detail?.[0]?.msg || error?.detail || error.message || "Failed to update source.";
            toast.error(`Update failed for ID ${variables.id}: ${errorMsg}`);
            console.error(`Update DIMSE Q/R Source error for ID ${variables.id}:`, error);
        },
    });
    // --- End Mutations ---

    // --- Form Submit Handler (with parsing fix) ---
    const onSubmit = (values: DimseQrSourceFormData) => {
        // Log the raw values received from react-hook-form's handleSubmit
        // This should now reliably include is_active
        console.log(">>> DimseQrSourceFormModal - onSubmit received values:", JSON.stringify(values, null, 2));

        // Parse query_filters string back to object
        let parsedQueryFilters: Record<string, any> | null = null;
        // Check if it's a string and not empty before trying to parse
        if (typeof values.query_filters === 'string' && values.query_filters.trim()) {
             try {
                 // Use json5 which is more forgiving (allows comments, trailing commas etc.)
                 parsedQueryFilters = json5.parse(values.query_filters);
                 // Basic check if parse result is an object
                 if (typeof parsedQueryFilters !== 'object' || parsedQueryFilters === null || Array.isArray(parsedQueryFilters)) {
                      throw new Error("Parsed value is not a valid object.");
                 }
             } catch(e) {
                 console.error("Error parsing query_filters in onSubmit:", e);
                 form.setError('query_filters', {type: 'manual', message: `Invalid JSON format: ${e instanceof Error ? e.message : String(e)}`});
                 toast.error("Please fix the invalid JSON in Query Filters.");
                 return; // Stop submission
             }
        } else {
             // Treat empty string, null, or undefined as null for the API
             parsedQueryFilters = null;
        }

        // Construct the payload for the API
        const apiPayload = {
            // Spread other values that don't need transformation
            name: values.name,
            description: values.description?.trim() || null,
            remote_ae_title: values.remote_ae_title,
            remote_host: values.remote_host,
            remote_port: values.remote_port,
            local_ae_title: values.local_ae_title,
            polling_interval_seconds: values.polling_interval_seconds,
            is_enabled: values.is_enabled,
            is_active: values.is_active, // This should be correct now
            query_level: values.query_level,
            // Use the PARSED object (or null)
            query_filters: parsedQueryFilters,
            move_destination_ae_title: values.move_destination_ae_title?.trim() || null,
        };

        console.log(">>> DimseQrSourceFormModal - Submitting API Payload:", JSON.stringify(apiPayload, null, 2));

        if (isEditMode && source) {
            const updatePayload: DimseQueryRetrieveSourceUpdatePayload = apiPayload;
            console.log(">>> DimseQrSourceFormModal - Typed Update Payload:", JSON.stringify(updatePayload, null, 2));
            updateMutation.mutate({ id: source.id, data: updatePayload });
        } else {
            const createPayload: DimseQueryRetrieveSourceCreatePayload = apiPayload;
             console.log(">>> DimseQrSourceFormModal - Typed Create Payload:", JSON.stringify(createPayload, null, 2));
            createMutation.mutate(createPayload);
        }
    };
    // --- End Submit Handler ---

    const isLoading = createMutation.isPending || updateMutation.isPending;

    // --- Render ---
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            {/* Explicitly closing Dialog */}
            <DialogContent className="sm:max-w-[600px]">
                {/* Explicitly closing DialogContent */}
                <DialogHeader>
                    {/* Explicitly closing DialogHeader */}
                    <DialogTitle>{isEditMode ? 'Edit DIMSE Q/R Source' : 'Add DIMSE Q/R Source'}</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? `Modify the configuration for "${source?.name}".` : 'Configure a new remote DIMSE peer for Query/Retrieve.'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    {/* Explicitly closing Form */}
                    {/* Explicitly closing form */}
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">

                        {/* --- Standard Fields (No collapsed tags) --- */}
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name*</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Hospital PACS Query" {...field} />
                                    </FormControl>
                                    <FormMessage></FormMessage>
                                </FormItem>
                            )}
                        />

                         <FormField
                            control={form.control}
                            name="remote_ae_title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Remote AE Title*</FormLabel>
                                    <FormControl>
                                        <Input placeholder="REMOTE_PACS_AE" {...field} maxLength={16} />
                                    </FormControl>
                                    <FormMessage></FormMessage>
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Explicitly closing div */}
                            <FormField
                                control={form.control}
                                name="remote_host"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Remote Host*</FormLabel>
                                        <FormControl>
                                            <Input placeholder="pacs.hospital.com or IP" {...field} />
                                        </FormControl>
                                        <FormMessage></FormMessage>
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="remote_port"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Remote Port*</FormLabel>
                                        <FormControl>
                                             <Input type="number" min="1" max="65535" step="1" {...field} />
                                        </FormControl>
                                        <FormMessage></FormMessage>
                                    </FormItem>
                                )}
                            />
                        </div>

                         <FormField
                            control={form.control}
                            name="local_ae_title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Local AE Title*</FormLabel>
                                     <FormDescription>AE Title this system will use to connect.</FormDescription>
                                    <FormControl>
                                        <Input {...field} maxLength={16} />
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
                                        />
                                        {/* Explicitly closing Textarea */}
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
                                        <Input type="number" min="1" step="1" {...field} />
                                    </FormControl>
                                    <FormMessage></FormMessage>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="query_level"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Query Level</FormLabel>
                                     <Select onValueChange={field.onChange} value={field.value}>
                                         {/* Explicitly closing Select */}
                                         <FormControl>
                                             <SelectTrigger>
                                                 {/* Explicitly closing SelectTrigger */}
                                                 <SelectValue placeholder="Select C-FIND query level" />
                                             </SelectTrigger>
                                             {/* Explicitly closing SelectTrigger */}
                                         </FormControl>
                                         <SelectContent>
                                             {/* Explicitly closing SelectContent */}
                                             <SelectItem value="STUDY">STUDY</SelectItem>
                                             <SelectItem value="SERIES">SERIES</SelectItem>
                                             <SelectItem value="PATIENT">PATIENT</SelectItem>
                                         </SelectContent>
                                     </Select>
                                    <FormMessage></FormMessage>
                                </FormItem>
                             )}
                        />

                         <FormField
                            control={form.control}
                            name="query_filters"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Query Filters (C-FIND)</FormLabel>
                                    <FormDescription>
                                        Enter C-FIND query keys/values as JSON object (e.g., {`{"StudyDate": "-7d"}`}). Optional.
                                    </FormDescription>
                                    <FormControl>
                                        <Textarea
                                            placeholder={`{\n  // Example:\n  "StudyDate": "-30d",\n  "PatientName": "DOE^JOHN*"\n}`}
                                            {...field}
                                            value={(typeof field.value === 'object' && field.value !== null)
                                                      ? json5.stringify(field.value, null, 2)
                                                      : (field.value ?? '')}
                                            rows={4}
                                            className="font-mono text-xs"
                                        />
                                        {/* Explicitly closing Textarea */}
                                    </FormControl>
                                    <FormMessage></FormMessage>
                                </FormItem>
                            )}
                        />

                         <FormField
                            control={form.control}
                            name="move_destination_ae_title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Move Destination AE Title</FormLabel>
                                     <FormDescription>Optional: AE Title of *your* listener where retrieved studies should be sent via C-MOVE.</FormDescription>
                                    <FormControl>
                                        <Input placeholder="e.g., AXIOM_SCP_1" {...field} value={field.value ?? ''} maxLength={16} />
                                    </FormControl>
                                    <FormMessage></FormMessage>
                                </FormItem>
                            )}
                        />

                        {/* --- is_enabled Controller --- */}
                        <Controller
                            name="is_enabled"
                            control={form.control}
                            render={({ field: { onChange, value, ref }, fieldState: { error } }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                                    {/* Explicitly closing FormItem */}
                                    <FormControl>
                                        {/* Explicitly closing FormControl */}
                                        <Switch
                                            checked={!!value}
                                            onCheckedChange={onChange}
                                            ref={ref}
                                            id="is_enabled_qr"
                                        />
                                        {/* Explicitly closing Switch */}
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        {/* Explicitly closing div */}
                                         <FormLabel htmlFor="is_enabled_qr">Source Enabled</FormLabel>
                                         <FormDescription>Allow use in Data Browser and rules.</FormDescription>
                                    </div>
                                    {error && <FormMessage>{error.message}</FormMessage>}
                                    {/* <FormMessage /> Can be added if using FormField context */}
                                </FormItem>
                            )}
                        />
                        {/* --- End is_enabled Controller --- */}

                        {/* --- is_active Controller (using checkbox for testing) --- */}
                        <Controller
                            name="is_active"
                            control={form.control}
                            render={({ field: { onChange, onBlur, value, name, ref }, fieldState: { error } }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                                    {/* Explicitly closing FormItem */}
                                    <FormControl>
                                        {/* Explicitly closing FormControl */}
                                        {/* Using standard checkbox for robust RHF integration test */}
                                        <input
                                            type="checkbox"
                                            onChange={onChange}
                                            onBlur={onBlur}
                                            checked={!!value}
                                            name={name}
                                            ref={ref}
                                            id="is_active_qr_checkbox"
                                            disabled={!form.watch('is_enabled')}
                                            className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-indigo-600 dark:focus:ring-offset-gray-800"
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        {/* Explicitly closing div */}
                                        <FormLabel htmlFor="is_active_qr_checkbox">
                                            Automatic Polling Active (HTML CB)
                                        </FormLabel>
                                        <FormDescription>
                                            If checked (and Enabled), poll automatically.
                                        </FormDescription>
                                    </div>
                                    {error && <FormMessage>{error.message}</FormMessage>}
                                    {/* Explicitly closing FormMessage */}
                                </FormItem>
                            )}
                        />
                        {/* --- End is_active Controller --- */}

                        <DialogFooter className="pt-4">
                            {/* Explicitly closing DialogFooter */}
                            <DialogClose asChild={true}>
                                {/* Explicitly closing DialogClose */}
                                 <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                            </DialogClose>
                             <Button type="submit" disabled={isLoading}>
                                 {isLoading ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create Q/R Source')}
                             </Button>
                             {/* Explicitly closing Button */}
                        </DialogFooter>
                    </form>
                    {/* Explicitly closing form */}
                </Form>
                 {/* Explicitly closing Form */}
            </DialogContent>
             {/* Explicitly closing DialogContent */}
        </Dialog>
         /* Explicitly closing Dialog */
    );
};

export default DimseQrSourceFormModal;

