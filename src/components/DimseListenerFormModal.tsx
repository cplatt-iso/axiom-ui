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
import { Switch } from '@/components/ui/switch'; // Import Switch
import { Textarea } from "@/components/ui/textarea";

import {
    DimseListenerConfigRead,
    DimseListenerConfigCreatePayload,
    DimseListenerConfigUpdatePayload,
} from '@/schemas'; // Assuming combined schema export exists

import {
    dimseListenerFormSchema,
    DimseListenerFormData,
} from '@/schemas/dimseListenerSchema';

import {
    createDimseListenerConfig,
    updateDimseListenerConfig,
} from '@/services/api';

interface DimseListenerFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    listenerConfig: DimseListenerConfigRead | null;
}

// Include TLS fields in defaults
const initialFormDefaults: DimseListenerFormData = {
    name: '',
    description: null,
    ae_title: '',
    port: 11112,
    is_enabled: true,
    instance_id: null,
    tls_enabled: false,
    tls_cert_secret_name: null,
    tls_key_secret_name: null,
    tls_ca_cert_secret_name: null,
};

const DimseListenerFormModal: React.FC<DimseListenerFormModalProps> = ({ isOpen, onClose, listenerConfig }) => {
    const queryClient = useQueryClient();
    const isEditMode = !!listenerConfig;

    const form = useForm<DimseListenerFormData>({
        resolver: zodResolver(dimseListenerFormSchema),
        defaultValues: {
        name: "",
        ae_title: "",
        port: 104,
        is_enabled: true,
        tls_enabled: false, 
        description: null,
        instance_id: null,
        tls_cert_secret_name: null,
        tls_key_secret_name: null,
        tls_ca_cert_secret_name: null,
        },
    });

    // Watch the tls_enabled field to conditionally render other fields
    const tlsEnabled = form.watch('tls_enabled');

    useEffect(() => {
        if (isOpen) {
            const resetValues = listenerConfig ? {
                name: listenerConfig.name ?? '',
                description: listenerConfig.description ?? null,
                ae_title: listenerConfig.ae_title ?? '',
                port: listenerConfig.port ?? 11112,
                is_enabled: listenerConfig.is_enabled ?? true,
                instance_id: listenerConfig.instance_id ?? null,
                tls_enabled: listenerConfig.tls_enabled ?? false,
                tls_cert_secret_name: listenerConfig.tls_cert_secret_name ?? null,
                tls_key_secret_name: listenerConfig.tls_key_secret_name ?? null,
                tls_ca_cert_secret_name: listenerConfig.tls_ca_cert_secret_name ?? null,
            } : initialFormDefaults;
            form.reset(resetValues);
            // console.log("Resetting DIMSE Listener form with:", resetValues);
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
            name: values.name,
            description: values.description?.trim() || null,
            ae_title: values.ae_title,
            port: values.port,
            is_enabled: values.is_enabled,
            instance_id: values.instance_id?.trim() || null,
            // Add TLS fields to payload
            tls_enabled: values.tls_enabled,
            tls_cert_secret_name: values.tls_enabled ? (values.tls_cert_secret_name?.trim() || null) : null,
            tls_key_secret_name: values.tls_enabled ? (values.tls_key_secret_name?.trim() || null) : null,
            tls_ca_cert_secret_name: values.tls_enabled ? (values.tls_ca_cert_secret_name?.trim() || null) : null,
        };
        // console.log("Submitting DIMSE Listener Values:", apiPayload);
        if (isEditMode && listenerConfig) {
            updateMutation.mutate({ id: listenerConfig.id, data: apiPayload as DimseListenerConfigUpdatePayload });
        } else {
            createMutation.mutate(apiPayload as DimseListenerConfigCreatePayload);
        }
    };

    const isLoading = createMutation.isPending || updateMutation.isPending;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit DIMSE Listener' : 'Add DIMSE Listener'}</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? `Modify the configuration for "${listenerConfig?.name}".` : 'Configure a new DIMSE C-STORE SCP listener.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">

                        {/* --- Standard Fields --- */}
                        <FormField
                           control={form.control}
                           name="name"
                           render={({ field }) => (
                               <FormItem>
                                   <FormLabel>Name*</FormLabel>
                                   <FormControl>
                                       <Input placeholder="e.g., Main Scanner Listener" {...field}></Input>
                                   </FormControl>
                                   <FormMessage></FormMessage>
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
                                   </FormControl>
                                   <FormMessage></FormMessage>
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
                                       <Input type="number" min="1" max="65535" step="1" {...field} onChange={event => field.onChange(+event.target.value)}></Input>
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
                                       <Textarea placeholder="Optional description of this listener" {...field} value={field.value ?? ''} rows={2}></Textarea>
                                   </FormControl>
                                   <FormMessage></FormMessage>
                               </FormItem>
                           )}
                        />
                        <FormField
                           control={form.control}
                           name="instance_id"
                           render={({ field }) => (
                               <FormItem>
                                   <FormLabel>Assigned Instance ID</FormLabel>
                                   <FormDescription>Optional. Must match <code className="text-xs bg-muted px-1 rounded">AXIOM_INSTANCE_ID</code> env var of the listener container. Must be unique if set.</FormDescription>
                                   <FormControl>
                                       <Input placeholder="e.g., storescp_1" {...field} value={field.value ?? ''}></Input>
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
                                       {/* Note: Shadcn Switch is self-closing in source */}
                                       <Switch
                                          id="is_enabled_listener"
                                          checked={!!field.value}
                                          onCheckedChange={field.onChange}
                                          ref={field.ref}
                                        />
                                   </FormControl>
                                   <div className="space-y-1 leading-none">
                                       <FormLabel htmlFor="is_enabled_listener">Enable Listener</FormLabel>
                                       <FormDescription>If checked, the listener process assigned this config will start.</FormDescription>
                                   </div>
                                   <FormMessage></FormMessage>
                               </FormItem>
                           )}
                        />

                        {/* --- TLS Section --- */}
                        <div className="space-y-4 rounded-md border p-4 shadow-sm">
                            <FormField
                                control={form.control}
                                name="tls_enabled"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                        <FormControl>
                                             {/* Note: Shadcn Switch is self-closing in source */}
                                            <Switch
                                                id="tls_enabled_listener"
                                                checked={!!field.value}
                                                onCheckedChange={field.onChange}
                                                ref={field.ref}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel htmlFor="tls_enabled_listener">Enable TLS</FormLabel>
                                            <FormDescription>Require secure TLS connections.</FormDescription>
                                        </div>
                                        <FormMessage></FormMessage>
                                    </FormItem>
                                )}
                            />

                            {/* Conditionally render TLS secret fields */}
                            {tlsEnabled && (
                                <div className="space-y-4 pl-8 pt-2 border-l ml-2">
                                    <FormField
                                        control={form.control}
                                        name="tls_cert_secret_name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Server Certificate Secret Name*</FormLabel>
                                                <FormDescription>Full GCP Secret Manager resource name (e.g., projects/.../versions/latest).</FormDescription>
                                                <FormControl>
                                                    <Input placeholder="projects/your-proj/secrets/listener-cert/versions/latest" {...field} value={field.value ?? ''}></Input>
                                                </FormControl>
                                                <FormMessage></FormMessage>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="tls_key_secret_name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Server Private Key Secret Name*</FormLabel>
                                                 <FormDescription>Full GCP Secret Manager resource name.</FormDescription>
                                                <FormControl>
                                                    <Input placeholder="projects/your-proj/secrets/listener-key/versions/latest" {...field} value={field.value ?? ''}></Input>
                                                </FormControl>
                                                <FormMessage></FormMessage>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="tls_ca_cert_secret_name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Client Verification CA Secret Name</FormLabel>
                                                 <FormDescription>Optional: For mTLS. Full GCP Secret Manager resource name of the CA used to sign client certificates.</FormDescription>
                                                <FormControl>
                                                    <Input placeholder="projects/your-proj/secrets/client-ca/versions/latest" {...field} value={field.value ?? ''}></Input>
                                                </FormControl>
                                                <FormMessage></FormMessage>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            )}
                        </div>
                        {/* --- End TLS Section --- */}


                        <DialogFooter className="pt-4">
                            <DialogClose asChild={true}>
                                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                            </DialogClose>
                             <Button type="submit" disabled={isLoading}>
                                 {isLoading ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create Listener Config')}
                             </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default DimseListenerFormModal;
