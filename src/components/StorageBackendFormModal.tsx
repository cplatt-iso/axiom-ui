// frontend/src/components/StorageBackendFormModal.tsx
import React, { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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
import { Switch } from '@/components/ui/switch';
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    StorageBackendConfigRead,
    AllowedBackendType,
    StorageBackendApiPayload,
} from '@/schemas';
import {
    storageBackendFormSchema,
    StorageBackendFormData,
    storageBackendApiPayloadSchema, // <-- ADD THIS FUCKING IMPORT
} from '@/schemas/storageBackendSchema';
import {
    createStorageBackendConfig,
    updateStorageBackendConfig,
} from '@/services/api';

interface StorageBackendFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    backend: StorageBackendConfigRead | null;
}


const initialFormDefaultsBase: Omit<StorageBackendFormData, AllowedBackendType> = {
    name: '',
    description: null,
    is_enabled: true,
    path: null,
    remote_ae_title: null,
    remote_host: null,
    remote_port: null,
    local_ae_title: null,
    tls_enabled: false,
    tls_ca_cert_secret_name: null,
    tls_client_cert_secret_name: null,
    tls_client_key_secret_name: null,
    bucket: null,
    prefix: null,
    gcp_project_id: null,
    gcp_location: null,
    gcp_dataset_id: null,
    gcp_dicom_store_id: null,
    base_url: null,
};

const getDefaultsForType = (type: AllowedBackendType): StorageBackendFormData => {
     const defaults = { ...initialFormDefaultsBase, backend_type: type };
     switch (type) {
         case 'filesystem':
             defaults.path = '/dicom_data/axiom_flow/default_fs';
             break;
         case 'cstore':
             defaults.remote_port = 104;
             defaults.local_ae_title = 'AXIOM_STORE_SCU';
             break;
         default:
             break;
     }

     Object.keys(initialFormDefaultsBase).forEach(key => {
         const fieldKey = key as keyof typeof initialFormDefaultsBase;
         if (fieldKey === 'name' || fieldKey === 'description' || fieldKey === 'is_enabled') return;

         let belongsToType = false;
         if (type === 'filesystem' && fieldKey === 'path') belongsToType = true;
         if (type === 'cstore' && ['remote_ae_title', 'remote_host', 'remote_port', 'local_ae_title', 'tls_enabled', 'tls_ca_cert_secret_name', 'tls_client_cert_secret_name', 'tls_client_key_secret_name'].includes(fieldKey)) belongsToType = true;
         if (type === 'gcs' && ['bucket', 'prefix'].includes(fieldKey)) belongsToType = true;
         if (type === 'google_healthcare' && ['gcp_project_id', 'gcp_location', 'gcp_dataset_id', 'gcp_dicom_store_id'].includes(fieldKey)) belongsToType = true;
         if (type === 'stow_rs' && fieldKey === 'base_url') belongsToType = true;

         if (!belongsToType && defaults[fieldKey] !== undefined && fieldKey !== 'tls_enabled') {
              (defaults as any)[fieldKey] = null;
         }
     });

     return defaults as StorageBackendFormData;
};


const StorageBackendFormModal: React.FC<StorageBackendFormModalProps> = ({ isOpen, onClose, backend }) => {
    const queryClient = useQueryClient();
    const isEditMode = !!backend;

    const form = useForm<StorageBackendFormData>({
        resolver: zodResolver(storageBackendFormSchema),
        defaultValues: getDefaultsForType('filesystem'),
        mode: 'onBlur',
    });

    const watchedBackendType = form.watch('backend_type');
    const watchedCStoreTlsEnabled = form.watch('tls_enabled', false);

    const defaultValuesForEdit = useMemo((): StorageBackendFormData => {
        if (isEditMode && backend) {
            const baseData = {
                 name: backend.name,
                 description: backend.description ?? null,
                 backend_type: backend.backend_type as AllowedBackendType,
                 is_enabled: backend.is_enabled ?? true,
            };
            let specificData: Partial<StorageBackendFormData> = {};

            switch (backend.backend_type) {
                 case 'filesystem':
                    specificData = { path: backend.path ?? null };
                    break;
                 case 'cstore':
                     specificData = {
                         remote_ae_title: backend.remote_ae_title ?? null,
                         remote_host: backend.remote_host ?? null,
                         remote_port: backend.remote_port ?? null,
                         local_ae_title: backend.local_ae_title ?? null,
                         tls_enabled: backend.tls_enabled ?? false,
                         tls_ca_cert_secret_name: backend.tls_ca_cert_secret_name ?? null,
                         tls_client_cert_secret_name: backend.tls_client_cert_secret_name ?? null,
                         tls_client_key_secret_name: backend.tls_client_key_secret_name ?? null,
                     };
                     break;
                 case 'gcs':
                     specificData = { bucket: backend.bucket ?? null, prefix: backend.prefix ?? null };
                     break;
                 case 'google_healthcare':
                      specificData = {
                         gcp_project_id: backend.gcp_project_id ?? null,
                         gcp_location: backend.gcp_location ?? null,
                         gcp_dataset_id: backend.gcp_dataset_id ?? null,
                         gcp_dicom_store_id: backend.gcp_dicom_store_id ?? null,
                      };
                      break;
                 case 'stow_rs':
                     specificData = { base_url: backend.base_url ?? null };
                     break;
                 default:
                     console.error("Unknown backend type in edit mode:", backend.backend_type);
             }
             const combined = { ...initialFormDefaultsBase, ...baseData, ...specificData };

             Object.keys(initialFormDefaultsBase).forEach(key => {
                 const fieldKey = key as keyof typeof initialFormDefaultsBase;
                 if (fieldKey === 'name' || fieldKey === 'description' || fieldKey === 'is_enabled') return;

                 let belongsToType = false;
                 if (backend.backend_type === 'filesystem' && fieldKey === 'path') belongsToType = true;
                 if (backend.backend_type === 'cstore' && ['remote_ae_title', 'remote_host', 'remote_port', 'local_ae_title', 'tls_enabled', 'tls_ca_cert_secret_name', 'tls_client_cert_secret_name', 'tls_client_key_secret_name'].includes(fieldKey)) belongsToType = true;
                 if (backend.backend_type === 'gcs' && ['bucket', 'prefix'].includes(fieldKey)) belongsToType = true;
                 if (backend.backend_type === 'google_healthcare' && ['gcp_project_id', 'gcp_location', 'gcp_dataset_id', 'gcp_dicom_store_id'].includes(fieldKey)) belongsToType = true;
                 if (backend.backend_type === 'stow_rs' && fieldKey === 'base_url') belongsToType = true;

                 if (!belongsToType && fieldKey !== 'tls_enabled' && !(fieldKey in specificData)) {
                      (combined as any)[fieldKey] = null;
                 }
             });

             return combined as StorageBackendFormData;

        } else {
            return getDefaultsForType('filesystem');
        }
    }, [backend, isEditMode]);

    useEffect(() => {
        if (isOpen) {
            const valuesToReset = isEditMode ? defaultValuesForEdit : getDefaultsForType('filesystem');
            console.log("Resetting storage backend form (null defaults mode) with:", valuesToReset);
            form.reset(valuesToReset);
            form.clearErrors();
        }
    }, [isOpen, form, isEditMode, defaultValuesForEdit]);

     useEffect(() => {
         if (isOpen && !isEditMode) {
             const currentValues = form.getValues();
             const commonData = {
                 name: currentValues.name,
                 description: currentValues.description,
                 is_enabled: currentValues.is_enabled,
             };

             const newDefaults = getDefaultsForType(watchedBackendType);

             form.reset({
                 ...newDefaults,
                 ...commonData,
             });
              form.clearErrors();
              console.log(`Backend type changed to ${watchedBackendType} in create mode, form reset with nulls.`);
         }
     }, [watchedBackendType, isOpen, isEditMode, form]);


    const createMutation = useMutation({
        mutationFn: (payload: StorageBackendApiPayload) => createStorageBackendConfig(payload),
        onSuccess: (data) => {
            toast.success(`Storage Backend "${data.name}" created successfully.`);
            queryClient.invalidateQueries({ queryKey: ['storageBackendConfigs'] });
            onClose();
            form.reset(getDefaultsForType('filesystem'));
        },
        onError: (error: any) => {
            let specificError = "Failed to create backend config.";
            if (error?.detail && Array.isArray(error.detail) && error.detail[0]) {
                 const errDetail = error.detail[0];
                 const fieldPath = errDetail.loc && Array.isArray(errDetail.loc) ? errDetail.loc.slice(1).join('.') : 'input';
                 specificError = `Validation Error on field '${fieldPath}': ${errDetail.msg}`;
                 if (fieldPath && typeof fieldPath === 'string' && form.control._fields[fieldPath]) {
                    form.setError(fieldPath as keyof StorageBackendFormData, { type: 'manual', message: errDetail.msg });
                 }
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
        mutationFn: (payload: { id: number, data: Partial<StorageBackendApiPayload> }) =>
            updateStorageBackendConfig(payload.id, payload.data),
        onSuccess: (data) => {
            toast.success(`Storage Backend "${data.name}" updated successfully.`);
            queryClient.invalidateQueries({ queryKey: ['storageBackendConfigs'] });
            queryClient.invalidateQueries({ queryKey: ['storageBackendConfig', data.id] });
            onClose();
        },
        onError: (error: any, variables) => {
            let specificError = "Failed to update backend config.";
             if (error?.detail && Array.isArray(error.detail) && error.detail[0]) {
                 const errDetail = error.detail[0];
                 const fieldPath = errDetail.loc && Array.isArray(errDetail.loc) ? errDetail.loc.slice(1).join('.') : 'input';
                 specificError = `Validation Error on field '${fieldPath}': ${errDetail.msg}`;
                  if (fieldPath && typeof fieldPath === 'string' && form.control._fields[fieldPath]) {
                     form.setError(fieldPath as keyof StorageBackendFormData, { type: 'manual', message: errDetail.msg });
                 }
            } else if (error?.detail){
                 specificError = typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail);
            } else {
                 specificError = error.message || specificError;
            }
            toast.error(`Update failed for ID ${variables.id}: ${specificError}`);
            console.error(`Update error details for ID ${variables.id}:`, error?.detail || error);
        },
    });

    const onSubmit = (values: StorageBackendFormData) => {
        console.log("Form submitted with validated values:", values);

        const apiPayload: Partial<StorageBackendApiPayload> = {
             name: values.name,
             description: values.description?.trim() || null,
             backend_type: values.backend_type,
             is_enabled: values.is_enabled,
        };

        switch(values.backend_type) {
             case 'filesystem':
                 apiPayload.path = values.path;
                 break;
             case 'cstore':
                 apiPayload.remote_ae_title = values.remote_ae_title;
                 apiPayload.remote_host = values.remote_host;
                 apiPayload.remote_port = values.remote_port;
                 apiPayload.local_ae_title = values.local_ae_title?.trim() || null;
                 apiPayload.tls_enabled = values.tls_enabled ?? false;
                 apiPayload.tls_ca_cert_secret_name = values.tls_enabled ? (values.tls_ca_cert_secret_name?.trim() || null) : null;
                 apiPayload.tls_client_cert_secret_name = values.tls_enabled ? (values.tls_client_cert_secret_name?.trim() || null) : null;
                 apiPayload.tls_client_key_secret_name = values.tls_enabled ? (values.tls_client_key_secret_name?.trim() || null) : null;
                 break;
             case 'gcs':
                 apiPayload.bucket = values.bucket;
                 apiPayload.prefix = values.prefix?.trim() || null;
                 break;
             case 'google_healthcare':
                 apiPayload.gcp_project_id = values.gcp_project_id;
                 apiPayload.gcp_location = values.gcp_location;
                 apiPayload.gcp_dataset_id = values.gcp_dataset_id;
                 apiPayload.gcp_dicom_store_id = values.gcp_dicom_store_id;
                 break;
             case 'stow_rs':
                 apiPayload.base_url = values.base_url;
                 break;
        }


        console.log("Submitting Filtered API Payload:", apiPayload);

        try {
             storageBackendApiPayloadSchema.parse(apiPayload);
             console.log("Final API payload shape validated by Zod union.");

             if (isEditMode && backend) {
                 updateMutation.mutate({ id: backend.id, data: apiPayload as StorageBackendApiPayload });
             } else {
                  createMutation.mutate(apiPayload as StorageBackendApiPayload);
             }
        } catch (e) {
             console.error("Final API Payload Validation Failed:", e);
             toast.error(`Internal Error: Failed to construct valid API payload. ${e instanceof Error ? e.message : ''}`);
        }
    };

     const onError = (errors: any) => {
         console.error("RHF Validation Errors:", errors);
         let firstErrorMsg = "Form validation failed!";
         const errorKeys = Object.keys(errors);
         if (errorKeys.length > 0) {
             const firstKey = errorKeys[0] as keyof StorageBackendFormData;
             if (errors[firstKey] && errors[firstKey].message) {
                 firstErrorMsg = `Error in field '${firstKey}': ${errors[firstKey].message}`;
             }
         }
         toast.error(firstErrorMsg + " Check console/fields.");
     };

    const isLoading = createMutation.isPending || updateMutation.isPending;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[750px]">
                 <DialogHeader>
                     <DialogTitle>{isEditMode ? 'Edit Storage Backend' : 'Add Storage Backend'}</DialogTitle>
                     <DialogDescription>
                         {isEditMode ? `Modify the configuration for "${backend?.name}".` : 'Configure a new storage destination.'}
                     </DialogDescription>
                 </DialogHeader>

                 <Form {...form}>
                     <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-4 py-4 max-h-[75vh] overflow-y-auto px-2 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">

                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name*</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Main Archive Filesystem" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="backend_type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Backend Type*</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        disabled={isEditMode}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select backend type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="filesystem">Filesystem</SelectItem>
                                            <SelectItem value="cstore">DICOM C-STORE</SelectItem>
                                            <SelectItem value="gcs">Google Cloud Storage (GCS)</SelectItem>
                                            <SelectItem value="google_healthcare">Google Healthcare DICOM Store</SelectItem>
                                            <SelectItem value="stow_rs">DICOMweb STOW-RS</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>Select the type of storage destination. Cannot be changed after creation.</FormDescription>
                                    <FormMessage />
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
                                        <Textarea placeholder="Optional description of this backend" {...field} value={field.value ?? ''} rows={2} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                         <div className="space-y-4 pt-4 border-t border-border mt-4">
                            <h3 className="text-sm font-medium text-muted-foreground">{watchedBackendType.toUpperCase()} Specific Configuration</h3>

                            {watchedBackendType === 'filesystem' && (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="path"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Filesystem Path*</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="/dicom_data/processed/my_archive" {...field} value={field.value ?? ''}/>
                                                </FormControl>
                                                <FormDescription>Absolute path *inside the container* where DICOM files will be stored.</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Alert variant="default" className="bg-amber-50 border-amber-300 dark:bg-amber-900/30 dark:border-amber-700">
                                        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                        <AlertTitle className="text-amber-700 dark:text-amber-300 text-sm">Container Path Required</AlertTitle>
                                        <AlertDescription className="text-amber-600 dark:text-amber-400 text-xs">
                                            Ensure this path exists within the container and you have appropriate volume mapping set up in your Docker configuration.
                                        </AlertDescription>
                                    </Alert>
                                </>
                            )}

                            {watchedBackendType === 'cstore' && (
                                <div className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="remote_ae_title"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Remote AE Title*</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="REMOTE_PACS_AE" {...field} value={field.value ?? ''} maxLength={16} />
                                                </FormControl>
                                                <FormMessage />
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
                                                        <Input placeholder="pacs.example.com or IP" {...field} value={field.value ?? ''} />
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
                                                        <Input type="number" min="1" max="65535" step="1" {...field} value={field.value ?? ''} onChange={event => field.onChange(event.target.value === '' ? null : +event.target.value)} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <FormField
                                        control={form.control}
                                        name="local_ae_title"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Local AE Title (Optional)</FormLabel>
                                                <FormDescription>AE Title this system will use to connect. Defaults if blank.</FormDescription>
                                                <FormControl>
                                                    <Input placeholder="AXIOM_STORE_SCU" {...field} value={field.value ?? ''} maxLength={16} />
                                                </FormControl>
                                                <FormMessage />
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
                                                        <Switch id="cstore_tls_enabled" checked={!!field.value} onCheckedChange={field.onChange} ref={field.ref} />
                                                    </FormControl>
                                                    <div className="space-y-1 leading-none">
                                                        <FormLabel htmlFor="cstore_tls_enabled">Enable TLS</FormLabel>
                                                        <FormDescription>Use secure TLS for the outgoing C-STORE connection.</FormDescription>
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        {watchedCStoreTlsEnabled && (
                                            <div className="space-y-4 pl-8 pt-2 border-l ml-2">
                                                <FormField
                                                    control={form.control}
                                                    name="tls_ca_cert_secret_name"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>CA Certificate Secret Name*</FormLabel>
                                                            <FormDescription>GCP Secret Manager resource name for the CA certificate needed to verify the remote server.</FormDescription>
                                                            <FormControl>
                                                                <Input placeholder="projects/.../secrets/remote-pacs-ca/versions/latest" {...field} value={field.value ?? ''} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="tls_client_cert_secret_name"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Client Certificate Secret Name (mTLS)</FormLabel>
                                                            <FormDescription>Optional (for mutual TLS): GCP Secret resource name for *this system's* client certificate.</FormDescription>
                                                            <FormControl>
                                                                <Input placeholder="projects/.../secrets/axiom-client-cert/versions/latest" {...field} value={field.value ?? ''} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="tls_client_key_secret_name"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Client Private Key Secret Name (mTLS)</FormLabel>
                                                            <FormDescription>Optional (for mutual TLS): GCP Secret resource name for *this system's* client private key.</FormDescription>
                                                            <FormControl>
                                                                <Input placeholder="projects/.../secrets/axiom-client-key/versions/latest" {...field} value={field.value ?? ''} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {watchedBackendType === 'gcs' && (
                                <div className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="bucket"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>GCS Bucket Name*</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="my-dicom-archive-bucket" {...field} value={field.value ?? ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="prefix"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Object Prefix (Optional)</FormLabel>
                                                <FormDescription>Path prefix within the bucket (e.g., `incoming/` or `site_a/processed/`). Do not start with `/`.</FormDescription>
                                                <FormControl>
                                                    <Input placeholder="optional/folder/structure/" {...field} value={field.value ?? ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            )}

                            {watchedBackendType === 'google_healthcare' && (
                                <div className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="gcp_project_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>GCP Project ID*</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="my-gcp-project-id" {...field} value={field.value ?? ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="gcp_location"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>GCP Location*</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="us-central1" {...field} value={field.value ?? ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="gcp_dataset_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Healthcare Dataset ID*</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="my-dicom-dataset" {...field} value={field.value ?? ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="gcp_dicom_store_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>DICOM Store ID*</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="my-dicom-store" {...field} value={field.value ?? ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            )}

                            {watchedBackendType === 'stow_rs' && (
                                <div className="space-y-4">
                                     <FormField
                                        control={form.control}
                                        name="base_url"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>DICOMweb Base URL*</FormLabel>
                                                <FormDescription>The base URL for the STOW-RS service (e.g., `https://dicom.server.com/dicom-web`).</FormDescription>
                                                <FormControl>
                                                    <Input type="url" placeholder="https://dicom.example.com/dicom-web" {...field} value={field.value ?? ''} />
                                                </FormControl>
                                                <FormMessage />
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
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm mt-6">
                                    <FormControl>
                                        <Switch id={`is_enabled_${backend?.id || 'new'}`} checked={!!field.value} onCheckedChange={field.onChange} ref={field.ref} />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel htmlFor={`is_enabled_${backend?.id || 'new'}`}>Enable Backend</FormLabel>
                                        <FormDescription>If checked, this backend can be used in rule destinations.</FormDescription>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                         <DialogFooter className="pt-4">
                             <DialogClose asChild={true}>
                                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                            </DialogClose>
                             <Button type="submit" disabled={isLoading}>
                                {isLoading ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create Backend')}
                             </Button>
                         </DialogFooter>
                     </form>
                 </Form>
             </DialogContent>
         </Dialog>
     );
 };

 export default StorageBackendFormModal;
