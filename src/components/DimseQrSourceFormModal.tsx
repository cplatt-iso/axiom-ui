// src/components/DimseQrSourceFormModal.tsx
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
} from "@/components/ui/select";

// Import Schemas and API functions
import {
    DimseQueryRetrieveSourceRead,
    DimseQueryRetrieveSourceCreatePayload,
    DimseQueryRetrieveSourceUpdatePayload,
    dimseQrSourceFormSchema, // Use the form schema for validation
    DimseQrSourceFormData, // Type for form data
} from '@/schemas';
import {
    createDimseQrSource,
    updateDimseQrSource,
} from '@/services/api';

interface DimseQrSourceFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    source: DimseQueryRetrieveSourceRead | null; // Config object for editing, null for creating
}

// Define sensible initial default values for the form
const initialFormDefaults: DimseQrSourceFormData = {
    name: '',
    description: null,
    remote_ae_title: '',
    remote_host: '',
    remote_port: 104, // Common default DICOM port
    local_ae_title: 'AXIOM_QR_SCU',
    polling_interval_seconds: 300,
    is_enabled: true,
    query_level: 'STUDY',
    query_filters: null, // Start with null
    move_destination_ae_title: null, // Start with null
};


const DimseQrSourceFormModal: React.FC<DimseQrSourceFormModalProps> = ({ isOpen, onClose, source }) => {
    const queryClient = useQueryClient();
    const isEditMode = !!source;

    const form = useForm<DimseQrSourceFormData>({
        resolver: zodResolver(dimseQrSourceFormSchema),
        defaultValues: initialFormDefaults,
    });

    // Reset form when modal opens or source changes
    useEffect(() => {
        if (isOpen) {
            let resetValues: DimseQrSourceFormData;
            if (source) { // Edit mode
                 resetValues = {
                    name: source.name,
                    description: source.description ?? null,
                    remote_ae_title: source.remote_ae_title,
                    remote_host: source.remote_host,
                    remote_port: source.remote_port,
                    local_ae_title: source.local_ae_title ?? 'AXIOM_QR_SCU', // Fallback if somehow null
                    polling_interval_seconds: source.polling_interval_seconds ?? 300, // Fallback
                    is_enabled: source.is_enabled ?? true, // Fallback
                    query_level: source.query_level ?? 'STUDY', // Fallback
                    // Convert dict to JSON string for textarea, handle null
                    query_filters: source.query_filters ? JSON.stringify(source.query_filters, null, 2) : null,
                    move_destination_ae_title: source.move_destination_ae_title ?? null,
                 };
            } else { // Create mode
                 resetValues = initialFormDefaults;
            }
            form.reset(resetValues);
            console.log("Resetting DIMSE Q/R form with:", resetValues);
        }
    }, [isOpen, source, form]);

    // --- Mutations ---
    const createMutation = useMutation({
        mutationFn: createDimseQrSource,
        onSuccess: (data) => {
            toast.success(`DIMSE Q/R Source "${data.name}" created successfully.`);
            queryClient.invalidateQueries({ queryKey: ['dimseQrSources'] });
            onClose();
        },
        onError: (error: any) => {
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
        mutationFn: (payload: { id: number, data: DimseQueryRetrieveSourceUpdatePayload }) =>
            updateDimseQrSource(payload.id, payload.data),
        onSuccess: (data) => {
            toast.success(`DIMSE Q/R Source "${data.name}" updated successfully.`);
            queryClient.invalidateQueries({ queryKey: ['dimseQrSources'] });
            queryClient.invalidateQueries({ queryKey: ['dimseQrSource', data.id] }); // Optional invalidate single item
            onClose();
        },
        onError: (error: any, variables) => {
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
    const onSubmit = (values: DimseQrSourceFormData) => {
        let parsedQueryFilters: Record<string, any> | null = null;

        // Safely parse JSON string from textarea
        const safeJsonParse = (jsonString: string | null | undefined, fieldName: 'query_filters'): Record<string, any> | null => {
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
            return null; // Return null if input is empty/null/whitespace
        };

        try {
            parsedQueryFilters = safeJsonParse(values.query_filters, 'query_filters');
        } catch (e) {
            console.error("JSON Parsing error in form", e);
            return; // Stop submission if JSON is invalid
        }

        // Prepare payload, ensuring nulls for empty optional strings
        const apiPayload = {
            ...values,
            description: values.description?.trim() || null,
            query_filters: parsedQueryFilters,
            move_destination_ae_title: values.move_destination_ae_title?.trim() || null,
        };
        console.log("Submitting DIMSE Q/R Values:", apiPayload);

        if (isEditMode && source) {
            const updatePayload: DimseQueryRetrieveSourceUpdatePayload = apiPayload; // Direct assignment works if types match
            updateMutation.mutate({ id: source.id, data: updatePayload });
        } else {
             const createPayload: DimseQueryRetrieveSourceCreatePayload = apiPayload; // Direct assignment
            createMutation.mutate(createPayload);
        }
    };

    const isLoading = createMutation.isPending || updateMutation.isPending;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px]"> {/* Wider modal */}
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit DIMSE Q/R Source' : 'Add DIMSE Q/R Source'}</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? `Modify the configuration for "${source?.name}".` : 'Configure a new remote DIMSE peer for Query/Retrieve.'}
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
                                        <Input placeholder="e.g., Hospital PACS Query" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Remote AE Title */}
                         <FormField
                            control={form.control}
                            name="remote_ae_title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Remote AE Title*</FormLabel>
                                    <FormControl>
                                        <Input placeholder="REMOTE_PACS_AE" {...field} maxLength={16} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Remote Host & Port (Grid Layout) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="remote_host"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Remote Host*</FormLabel>
                                        <FormControl>
                                            <Input placeholder="pacs.hospital.com or IP" {...field} />
                                        </FormControl>
                                        <FormMessage />
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
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Local AE Title */}
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
                                        <Textarea
                                            placeholder="Optional description of this source"
                                            {...field}
                                            value={field.value ?? ''}
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

                        {/* Query Level Select */}
                        <FormField
                            control={form.control}
                            name="query_level"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Query Level</FormLabel>
                                     <Select onValueChange={field.onChange} value={field.value}>
                                         <FormControl>
                                             <SelectTrigger>
                                                 <SelectValue placeholder="Select C-FIND query level" />
                                             </SelectTrigger>
                                         </FormControl>
                                         <SelectContent>
                                             <SelectItem value="STUDY">STUDY</SelectItem>
                                             <SelectItem value="SERIES">SERIES</SelectItem>
                                             <SelectItem value="PATIENT">PATIENT</SelectItem>
                                         </SelectContent>
                                     </Select>
                                    <FormMessage />
                                </FormItem>
                             )}
                        />

                        {/* Query Filters */}
                         <FormField
                            control={form.control}
                            name="query_filters"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Query Filters (C-FIND)</FormLabel>
                                    <FormDescription>
                                        Enter C-FIND query keys/values as JSON object (e.g., {`{"StudyDate": "-7d", "ModalitiesInStudy": "CT"}`}). Optional.
                                    </FormDescription>
                                    <FormControl>
                                        <Textarea placeholder={`{\n  "StudyDate": "-30d",\n  "PatientName": "DOE^JOHN*"\n}`} {...field} value={field.value ?? ''} rows={4} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Move Destination AE Title */}
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
                                            id="is_enabled_qr"
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                         <FormLabel htmlFor="is_enabled_qr">
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

                        <DialogFooter className="pt-4">
                            <DialogClose asChild>
                                 <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                            </DialogClose>
                             <Button type="submit" disabled={isLoading}>
                                 {isLoading ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create Q/R Source')}
                             </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default DimseQrSourceFormModal;
