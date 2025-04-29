// src/components/DimseListenerFormModal.tsx
import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form'; // Using Controller for consistency, though FormField might work here
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
import { Checkbox } from '@/components/ui/checkbox'; // Keep Checkbox for is_enabled
import { Textarea } from "@/components/ui/textarea";

// --- Import API/General TYPES ---
import {
    DimseListenerConfigRead,
    DimseListenerConfigCreatePayload,
    DimseListenerConfigUpdatePayload,
} from '@/schemas';
// --- END API/General TYPES ---

// --- Import Zod Schema and FORM DATA type ---
import {
    dimseListenerFormSchema,
    DimseListenerFormData,
} from '@/schemas/dimseListenerSchema';
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
                name: listenerConfig.name ?? '',
                description: listenerConfig.description ?? null,
                ae_title: listenerConfig.ae_title ?? '',
                port: listenerConfig.port ?? 11112,
                is_enabled: listenerConfig.is_enabled ?? true,
                instance_id: listenerConfig.instance_id ?? null,
            } : initialFormDefaults;
            form.reset(resetValues);
            console.log("Resetting DIMSE Listener form with:", resetValues);
        }
    }, [isOpen, listenerConfig, form]);

    // --- Mutations (Keep as is) ---
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
    // --- End Mutations ---

    // --- onSubmit (Keep as is) ---
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
    // --- End onSubmit ---

    const isLoading = createMutation.isPending || updateMutation.isPending;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            {/* Explicit closing tag */}
            <DialogContent className="sm:max-w-[550px]">
                {/* Explicit closing tag */}
                <DialogHeader>
                    {/* Explicit closing tag */}
                    <DialogTitle>{isEditMode ? 'Edit DIMSE Listener' : 'Add DIMSE Listener'}</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? `Modify the configuration for "${listenerConfig?.name}".` : 'Configure a new DIMSE C-STORE SCP listener.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    {/* Explicit closing tag */}
                    {/* Explicit closing tag */}
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">

                         {/* --- Use explicit closing tags for Inputs/Textarea/Checkbox --- */}

                         <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name*</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Main Scanner Listener" {...field}></Input>
                                        {/* Explicit closing tag */}
                                    </FormControl>
                                    <FormMessage></FormMessage>
                                    {/* Explicit closing tag */}
                                </FormItem>
                            )}
                         />

                         <FormField
                            control={form.control}
                            name="ae_title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>AE Title*</FormLabel>
                                    <FormDescription>Max 16 chars, no backslash/control chars, no leading/trailing spaces.</FormDescription>
                                    <FormControl>
                                        <Input placeholder="MY_SCP_AE" {...field} maxLength={16}></Input>
                                        {/* Explicit closing tag */}
                                    </FormControl>
                                    <FormMessage></FormMessage>
                                    {/* Explicit closing tag */}
                                </FormItem>
                            )}
                         />

                         <FormField
                            control={form.control}
                            name="port"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Port*</FormLabel>
                                    <FormDescription>Network port number (1-65535).</FormDescription>
                                    <FormControl>
                                        {/* Keep onChange logic for number conversion */}
                                        <Input type="number" min="1" max="65535" step="1" {...field} onChange={event => field.onChange(+event.target.value)}></Input>
                                        {/* Explicit closing tag */}
                                    </FormControl>
                                    <FormMessage></FormMessage>
                                    {/* Explicit closing tag */}
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
                                        <Textarea placeholder="Optional description of this listener" {...field} value={field.value ?? ''} rows={2}></Textarea>
                                        {/* Explicit closing tag */}
                                    </FormControl>
                                    <FormMessage></FormMessage>
                                    {/* Explicit closing tag */}
                                </FormItem>
                            )}
                         />

                         <FormField
                            control={form.control}
                            name="instance_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Assigned Instance ID</FormLabel>
                                    <FormDescription>Optional. Must match the <code className="text-xs bg-gray-200 dark:bg-gray-700 p-1 rounded">AXIOM_INSTANCE_ID</code> env var of the listener container. Must be unique if set.</FormDescription>
                                    <FormControl>
                                        <Input placeholder="e.g., storescp_1" {...field} value={field.value ?? ''}></Input>
                                        {/* Explicit closing tag */}
                                    </FormControl>
                                    <FormMessage></FormMessage>
                                    {/* Explicit closing tag */}
                                </FormItem>
                            )}
                         />

                         {/* Using Controller for checkbox just in case, though FormField should work */}
                         <Controller
                             name="is_enabled"
                             control={form.control}
                             render={({ field: { onChange, value, ref } }) => (
                                 <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                                     {/* Explicit closing tag */}
                                     <FormControl>
                                         {/* Explicitly closing FormControl */}
                                         <Checkbox
                                             checked={!!value}
                                             onCheckedChange={onChange}
                                             ref={ref}
                                             id="is_enabled_listener" // Use specific ID
                                         />
                                         {/* Explicit closing tag */}
                                         {/* </Checkbox> - Checkbox is self-closing in Shadcn source, cannot add explicit closing tag */}
                                     </FormControl>
                                     <div className="space-y-1 leading-none">
                                         {/* Explicitly closing div */}
                                         <FormLabel htmlFor="is_enabled_listener">Enable Listener</FormLabel>
                                         <FormDescription>If checked, the listener process assigned this config will start.</FormDescription>
                                     </div>
                                     <FormMessage></FormMessage>
                                     {/* Explicit closing tag */}
                                 </FormItem>
                             )}
                         />

                        <DialogFooter className="pt-4">
                            {/* Explicit closing tag */}
                            <DialogClose asChild={true}>
                                {/* Explicit closing tag */}
                                 <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                            </DialogClose>
                             <Button type="submit" disabled={isLoading}>
                                 {isLoading ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create Listener Config')}
                             </Button>
                             {/* Explicit closing tag */}
                        </DialogFooter>
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

export default DimseListenerFormModal;
