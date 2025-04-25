// src/components/DimseListenerFormModal.tsx
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose,
} from '@/components/ui/dialog';
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from "@/components/ui/textarea";

// --- Import API/General TYPES from main schemas index ---
import {
    DimseListenerConfigRead,
    DimseListenerConfigCreatePayload,
    DimseListenerConfigUpdatePayload,
} from '@/schemas';
// --- END API/General TYPES ---

// --- Import Zod Schema and FORM DATA type DIRECTLY from its file ---
import {
    dimseListenerFormSchema, // The Zod Schema object
    DimseListenerFormData,   // The TypeScript type derived from the Zod schema
} from '@/schemas/dimseListenerSchema'; // Import from SPECIFIC file
// --- END Zod Schema Import ---

import {
    createDimseListenerConfig,
    updateDimseListenerConfig,
} from '@/services/api';

interface DimseListenerFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    listenerConfig: DimseListenerConfigRead | null;
}

const initialFormDefaults: DimseListenerFormData = {
    name: '', description: null, ae_title: '', port: 11112, is_enabled: true, instance_id: null,
};

const DimseListenerFormModal: React.FC<DimseListenerFormModalProps> = ({ isOpen, onClose, listenerConfig }) => {
    const queryClient = useQueryClient();
    const isEditMode = !!listenerConfig;

    const form = useForm<DimseListenerFormData>({
        resolver: zodResolver(dimseListenerFormSchema),
        defaultValues: initialFormDefaults,
    });

    useEffect(() => {
        if (isOpen) {
            const resetValues = listenerConfig ? {
                ...listenerConfig,
                description: listenerConfig.description ?? null,
                instance_id: listenerConfig.instance_id ?? null,
            } : initialFormDefaults;
            form.reset(resetValues);
            console.log("Resetting DIMSE Listener form with:", resetValues);
        }
    }, [isOpen, listenerConfig, form]);

    const createMutation = useMutation({
        mutationFn: createDimseListenerConfig,
        onSuccess: (data) => {
            toast.success(`DIMSE Listener "${data.name}" created successfully.`);
            queryClient.invalidateQueries({ queryKey: ['dimseListenerConfigs'] });
            onClose();
        },
        onError: (error: any) => {
            let specificError = error?.detail || error.message || "Failed to create listener config.";
             if (error?.detail && Array.isArray(error.detail) && error.detail[0]) { const errDetail = error.detail[0]; const field = errDetail.loc?.[1] || 'input'; specificError = `Validation Error on field '${field}': ${errDetail.msg}`; }
             toast.error(`Creation failed: ${specificError}`); console.error("Create error:", error?.detail || error);
         },
    });
    const updateMutation = useMutation({
        mutationFn: (payload: { id: number, data: DimseListenerConfigUpdatePayload }) => updateDimseListenerConfig(payload.id, payload.data),
        onSuccess: (data) => {
            toast.success(`DIMSE Listener "${data.name}" updated successfully.`);
            queryClient.invalidateQueries({ queryKey: ['dimseListenerConfigs'] });
            queryClient.invalidateQueries({ queryKey: ['dimseListenerConfig', data.id] });
            onClose();
        },
        onError: (error: any, variables) => {
            let specificError = error?.detail || error.message || "Failed to update listener config.";
            if (error?.detail && Array.isArray(error.detail) && error.detail[0]) { const errDetail = error.detail[0]; const field = errDetail.loc?.[1] || 'input'; specificError = `Validation Error on field '${field}': ${errDetail.msg}`; }
            toast.error(`Update failed for ID ${variables.id}: ${specificError}`); console.error(`Update error for ID ${variables.id}:`, error?.detail || error);
         },
    });

    const onSubmit = (values: DimseListenerFormData) => {
        const apiPayload = {
            ...values,
            description: values.description?.trim() || null,
            instance_id: values.instance_id?.trim() || null,
        };
        console.log("Submitting DIMSE Listener Values:", apiPayload);
        if (isEditMode && listenerConfig) {
            const updatePayload: DimseListenerConfigUpdatePayload = apiPayload;
            updateMutation.mutate({ id: listenerConfig.id, data: updatePayload });
        } else {
             const createPayload: DimseListenerConfigCreatePayload = apiPayload;
            createMutation.mutate(createPayload);
        }
    };

    const isLoading = createMutation.isPending || updateMutation.isPending;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit DIMSE Listener' : 'Add DIMSE Listener'}</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? `Modify the configuration for "${listenerConfig?.name}".` : 'Configure a new DIMSE C-STORE SCP listener.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">

                         <FormField control={form.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Name*</FormLabel> <FormControl> <Input placeholder="e.g., Main Scanner Listener" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                         <FormField control={form.control} name="ae_title" render={({ field }) => ( <FormItem> <FormLabel>AE Title*</FormLabel> <FormDescription>Max 16 chars, no backslash/control chars, no leading/trailing spaces.</FormDescription> <FormControl> <Input placeholder="MY_SCP_AE" {...field} maxLength={16} /> </FormControl> <FormMessage /> </FormItem> )} />
                         <FormField control={form.control} name="port" render={({ field }) => ( <FormItem> <FormLabel>Port*</FormLabel> <FormDescription>Network port number (1-65535).</FormDescription> <FormControl> <Input type="number" min="1" max="65535" step="1" {...field} onChange={event => field.onChange(+event.target.value)} /> </FormControl> <FormMessage /> </FormItem> )} />
                         <FormField control={form.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description</FormLabel> <FormControl> <Textarea placeholder="Optional description of this listener" {...field} value={field.value ?? ''} rows={2} /> </FormControl> <FormMessage /> </FormItem> )} />
                         <FormField control={form.control} name="instance_id" render={({ field }) => ( <FormItem> <FormLabel>Assigned Instance ID</FormLabel> <FormDescription>Optional. Must match the <code className="text-xs bg-gray-200 dark:bg-gray-700 p-1 rounded">AXIOM_INSTANCE_ID</code> env var of the listener container. Must be unique if set.</FormDescription> <FormControl> <Input placeholder="e.g., storescp_1" {...field} value={field.value ?? ''}/> </FormControl> <FormMessage /> </FormItem> )} />
                         <FormField control={form.control} name="is_enabled" render={({ field }) => ( <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm"> <FormControl> <Checkbox checked={field.value} onCheckedChange={field.onChange} id="is_enabled" /> </FormControl> <div className="space-y-1 leading-none"> <FormLabel htmlFor="is_enabled">Enable Listener</FormLabel> <FormDescription>If checked, the listener process assigned this config will start.</FormDescription> </div> <FormMessage /> </FormItem> )} />

                        <DialogFooter className="pt-4">
                            <DialogClose asChild><Button type="button" variant="outline" onClick={onClose}>Cancel</Button></DialogClose>
                            <Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create Listener Config')}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default DimseListenerFormModal;
