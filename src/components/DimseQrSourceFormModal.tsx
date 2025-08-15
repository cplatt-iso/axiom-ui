// src/components/DimseQrSourceFormModal.tsx

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
    DimseQueryRetrieveSourceRead,
    DimseQueryRetrieveSourceCreatePayload,
    DimseQueryRetrieveSourceUpdatePayload
} from '@/schemas';
import {
    dimseQrSourceFormSchema,
    DimseQrSourceFormData,
} from '@/schemas/dimseQrSourceSchema';

import {
    createDimseQrSource,
    updateDimseQrSource,
} from '@/services/api';

interface DimseQrSourceFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    source: DimseQueryRetrieveSourceRead | null;
}

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
    query_filters: '',
    move_destination_ae_title: null,
    tls_enabled: false,
    tls_ca_cert_secret_name: null,
    tls_client_cert_secret_name: null,
    tls_client_key_secret_name: null,
};


const DimseQrSourceFormModal: React.FC<DimseQrSourceFormModalProps> = ({ isOpen, onClose, source }) => {
    const queryClient = useQueryClient();
    const isEditMode = !!source;

    const form = useForm({
        resolver: zodResolver(dimseQrSourceFormSchema),
        defaultValues: initialFormDefaults
    });

    const tlsEnabled = form.watch('tls_enabled');

    useEffect(() => {
        if (isOpen) {
            let resetValues: Partial<DimseQrSourceFormData>;

            if (isEditMode && source) {
                const typedSource = source as DimseQueryRetrieveSourceRead;
                resetValues = {
                    name: typedSource.name ?? '',
                    description: typedSource.description ?? null,
                    remote_ae_title: typedSource.remote_ae_title ?? '',
                    remote_host: typedSource.remote_host ?? '',
                    remote_port: typedSource.remote_port ?? 104,
                    local_ae_title: typedSource.local_ae_title ?? 'AXIOM_QR_SCU',
                    polling_interval_seconds: typedSource.polling_interval_seconds ?? 300,
                    is_enabled: typedSource.is_enabled ?? true,
                    is_active: typedSource.is_active ?? true, // Now valid
                    // Use type assertion assuming backend validation holds
                    query_level: (typedSource.query_level as DimseQrSourceFormData['query_level']) ?? 'STUDY',
                    query_filters: typedSource.query_filters ? json5.stringify(typedSource.query_filters, null, 2) : '',
                    move_destination_ae_title: typedSource.move_destination_ae_title ?? null,
                    tls_enabled: typedSource.tls_enabled ?? false, // Now valid
                    tls_ca_cert_secret_name: typedSource.tls_ca_cert_secret_name ?? null, // Now valid
                    tls_client_cert_secret_name: typedSource.tls_client_cert_secret_name ?? null, // Now valid
                    tls_client_key_secret_name: typedSource.tls_client_key_secret_name ?? null, // Now valid
                };
            } else {
                resetValues = {
                    ...initialFormDefaults,
                    query_filters: ''
                };
            }
            form.reset(resetValues);
        }
    }, [isOpen, source, isEditMode, form]);

    const createMutation = useMutation({
        mutationFn: createDimseQrSource,
        onSuccess: (data) => {
            toast.success(`DIMSE Q/R Source "${data.name}" created successfully.`);
            queryClient.invalidateQueries({ queryKey: ['dimseQrSources'] });
            onClose();
        },
        onError: (error: unknown) => {
            const errorObj = error as { detail?: unknown; message?: string };
            const errorMsg = (Array.isArray(errorObj.detail) && errorObj.detail[0]?.msg) || (typeof errorObj.detail === 'string' ? errorObj.detail : null) || errorObj.message || "Failed to create source.";
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
        onError: (error: unknown, variables) => {
            const errorObj = error as { detail?: unknown; message?: string };
            const errorMsg = (Array.isArray(errorObj.detail) && errorObj.detail[0]?.msg) || (typeof errorObj.detail === 'string' ? errorObj.detail : null) || errorObj.message || "Failed to update source.";
            toast.error(`Update failed for ID ${variables.id}: ${errorMsg}`);
            console.error(`Update DIMSE Q/R Source error for ID ${variables.id}:`, error);
        },
    });

    const onSubmit = (values: DimseQrSourceFormData) => {
        let parsedQueryFilters: Record<string, unknown> | null = null;
        if (typeof values.query_filters === 'string' && values.query_filters.trim()) {
             try {
                 parsedQueryFilters = json5.parse(values.query_filters);
                 if (typeof parsedQueryFilters !== 'object' || parsedQueryFilters === null || Array.isArray(parsedQueryFilters)) {
                      throw new Error("Parsed value is not a valid object.");
                 }
             } catch(e) {
                 console.error("Error parsing query_filters in onSubmit:", e);
                 form.setError('query_filters', {type: 'manual', message: `Invalid JSON format: ${e instanceof Error ? e.message : String(e)}`});
                 toast.error("Please fix the invalid JSON in Query Filters.");
                 return;
             }
        } else {
             parsedQueryFilters = null;
        }

        const apiPayload = {
            name: values.name,
            description: values.description?.trim() || null,
            remote_ae_title: values.remote_ae_title,
            remote_host: values.remote_host,
            remote_port: values.remote_port,
            local_ae_title: values.local_ae_title,
            polling_interval_seconds: values.polling_interval_seconds,
            is_enabled: values.is_enabled,
            is_active: values.is_active,
            query_level: values.query_level,
            query_filters: parsedQueryFilters,
            move_destination_ae_title: values.move_destination_ae_title?.trim() || null,
            tls_enabled: values.tls_enabled,
            tls_ca_cert_secret_name: values.tls_enabled ? (values.tls_ca_cert_secret_name?.trim() || null) : null,
            tls_client_cert_secret_name: values.tls_enabled ? (values.tls_client_cert_secret_name?.trim() || null) : null,
            tls_client_key_secret_name: values.tls_enabled ? (values.tls_client_key_secret_name?.trim() || null) : null,
        };

        if (isEditMode && source) {
            updateMutation.mutate({ id: source.id, data: apiPayload as DimseQueryRetrieveSourceUpdatePayload });
        } else {
            createMutation.mutate(apiPayload as DimseQueryRetrieveSourceCreatePayload);
        }
    };

    const isLoading = createMutation.isPending || updateMutation.isPending;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit DIMSE Q/R Source' : 'Add DIMSE Q/R Source'}</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? `Modify the configuration for "${source?.name}".` : 'Configure a new remote DIMSE peer for Query/Retrieve.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">

                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name*</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Hospital PACS Query" {...field}></Input>
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
                                        <Input placeholder="REMOTE_PACS_AE" {...field} maxLength={16}></Input>
                                    </FormControl>
                                    <FormMessage></FormMessage>
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="remote_host"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Remote Host*</FormLabel>
                                        <FormControl>
                                            <Input placeholder="pacs.hospital.com or IP" {...field}></Input>
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
                                             <Input type="number" min="1" max="65535" step="1" {...field} value={field.value ?? ''} onChange={event => field.onChange(event.target.value === '' ? null : +event.target.value)}></Input>
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
                                        <Input {...field} maxLength={16}></Input>
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
                                        ></Textarea>
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
                                        <Input type="number" min="1" step="1" {...field} value={field.value ?? ''} onChange={event => field.onChange(event.target.value === '' ? null : +event.target.value)}></Input>
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
                                            value={field.value ?? ''}
                                            rows={4}
                                            className="font-mono text-xs"
                                        ></Textarea>
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
                                        <Input placeholder="e.g., AXIOM_SCP_1" {...field} value={field.value ?? ''} maxLength={16}></Input>
                                    </FormControl>
                                    <FormMessage></FormMessage>
                                </FormItem>
                            )}
                        />

                        <div className="space-y-4 rounded-md border p-4 shadow-sm">
                            <FormField
                                control={form.control}
                                name="tls_enabled"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                        <FormControl>
                                            <Switch
                                                id="tls_enabled_qr"
                                                checked={!!field.value}
                                                onCheckedChange={field.onChange}
                                                ref={field.ref}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel htmlFor="tls_enabled_qr">Enable TLS</FormLabel>
                                            <FormDescription>Use secure TLS for outgoing connections.</FormDescription>
                                        </div>
                                        <FormMessage></FormMessage>
                                    </FormItem>
                                )}
                            />

                            {tlsEnabled && (
                                <div className="space-y-4 pl-8 pt-2 border-l ml-2">
                                    <FormField
                                        control={form.control}
                                        name="tls_ca_cert_secret_name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>CA Certificate Secret Name*</FormLabel>
                                                <FormDescription>GCP Secret resource name for CA to verify remote server.</FormDescription>
                                                <FormControl>
                                                    <Input placeholder="projects/.../secrets/remote-ca/versions/latest" {...field} value={field.value ?? ''}></Input>
                                                </FormControl>
                                                <FormMessage></FormMessage>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="tls_client_cert_secret_name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Client Certificate Secret Name</FormLabel>
                                                <FormDescription>Optional (for mTLS): GCP Secret resource name for *our* client certificate.</FormDescription>
                                                <FormControl>
                                                    <Input placeholder="projects/.../secrets/axiom-client-cert/versions/latest" {...field} value={field.value ?? ''}></Input>
                                                </FormControl>
                                                <FormMessage></FormMessage>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="tls_client_key_secret_name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Client Private Key Secret Name</FormLabel>
                                                <FormDescription>Optional (for mTLS): GCP Secret resource name for *our* client private key.</FormDescription>
                                                <FormControl>
                                                    <Input placeholder="projects/.../secrets/axiom-client-key/versions/latest" {...field} value={field.value ?? ''}></Input>
                                                </FormControl>
                                                <FormMessage></FormMessage>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            )}
                        </div>

                         <FormField
                            control={form.control}
                            name="is_enabled"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                                    <FormControl>
                                        <Switch
                                            id="is_enabled_qr_main"
                                            checked={!!field.value}
                                            onCheckedChange={field.onChange}
                                            ref={field.ref}
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                         <FormLabel htmlFor="is_enabled_qr_main">Source Enabled</FormLabel>
                                         <FormDescription>Allow use in Data Browser and rules.</FormDescription>
                                    </div>
                                    <FormMessage></FormMessage>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="is_active"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                                    <FormControl>
                                        <Switch
                                            id="is_active_qr_polling"
                                            checked={!!field.value}
                                            onCheckedChange={field.onChange}
                                            ref={field.ref}
                                            disabled={!form.watch('is_enabled')}
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel htmlFor="is_active_qr_polling">
                                            Automatic Polling Active
                                        </FormLabel>
                                        <FormDescription>
                                            If checked (and Source Enabled), poll automatically on schedule.
                                        </FormDescription>
                                    </div>
                                    <FormMessage></FormMessage>
                                </FormItem>
                            )}
                        />


                        <DialogFooter className="pt-4">
                            <DialogClose asChild={true}>
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
