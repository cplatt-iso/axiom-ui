import React, { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import json5 from 'json5';
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
    SelectValue
} from "@/components/ui/select";
import { AlertCircle, ClipboardCopyIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    StorageBackendConfigRead,
    AllowedBackendType,
} from '@/schemas';
import {
    storageBackendFormSchema,
    StorageBackendFormData,
    StorageBackendApiPayload,
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

const configJsonExamples: Record<AllowedBackendType, Record<string, any>> = {
    filesystem: { path: "/dicom_data/processed/my_archive" },
    cstore: { remote_ae_title: "REMOTE_AE", remote_host: "pacs.example.com", remote_port: 104, local_ae_title: "AXIOM_QSCU", tls_enabled: false, tls_ca_cert_secret_name: null, tls_client_cert_secret_name: null, tls_client_key_secret_name: null },
    gcs: { bucket: "axiom-flow-test-0001", prefix: "optional/folder/" },
    google_healthcare: { gcp_project_id: "axiom-flow", gcp_location: "us-central1", gcp_dataset_id: "axiom-dataset-test-0001", gcp_dicom_store_id: "axiom-dicom-store-0001" },
    stow_rs: { base_url: "https://dicom.server.com/dicom-web" },
};

const configJsonTooltips: Record<AllowedBackendType, string> = {
     filesystem: "JSON requires: 'path' (string).",
     cstore: "JSON requires: 'remote_ae_title', 'remote_host', 'remote_port'. Optional: 'local_ae_title', 'tls_enabled' (bool), 'tls_ca_cert_secret_name', 'tls_client_cert_secret_name', 'tls_client_key_secret_name'.",
     gcs: "JSON requires: 'bucket' (string). Optional: 'prefix' (string).",
     google_healthcare: "JSON requires: 'gcp_project_id', 'gcp_location', 'gcp_dataset_id', 'gcp_dicom_store_id'.",
     stow_rs: "JSON requires: 'base_url' (string).",
};

const initialFormDefaults: StorageBackendFormData = {
    name: '',
    description: null,
    backend_type: 'filesystem',
    config_string: json5.stringify(configJsonExamples['filesystem'], null, 2),
    is_enabled: true,
};

const StorageBackendFormModal: React.FC<StorageBackendFormModalProps> = ({ isOpen, onClose, backend }) => {
    const queryClient = useQueryClient();
    const isEditMode = !!backend;
    const [copiedTimeout, setCopiedTimeout] = useState<NodeJS.Timeout | null>(null);
    const [showCopied, setShowCopied] = useState(false);

    const form = useForm<StorageBackendFormData>({
        resolver: zodResolver(storageBackendFormSchema),
        defaultValues: initialFormDefaults,
        mode: 'onBlur',
    });

    const watchedBackendType = form.watch('backend_type');

    const defaultValues = useMemo(() => {
        if (backend) {
            const {
                id, created_at, updated_at,
                name, description, backend_type, is_enabled,
                ...specificConfigFields
            } = backend;

            const configToStringify: Record<string, any> = {};
            Object.entries(specificConfigFields).forEach(([key, value]) => {
                const commonKeys = ['name', 'description', 'backend_type', 'is_enabled'];
                if (value !== undefined && value !== null && !commonKeys.includes(key)) {
                    configToStringify[key] = value;
                }
            });

            return {
                name: name,
                description: description ?? null,
                backend_type: backend_type as AllowedBackendType,
                is_enabled: is_enabled ?? true,
                config_string: json5.stringify(configToStringify, null, 2) || '{}',
            };
        } else {
            return {
                ...initialFormDefaults,
                config_string: json5.stringify(configJsonExamples[initialFormDefaults.backend_type] || {}, null, 2)
            };
        }
    }, [backend]);

    useEffect(() => {
        if (isOpen) {
            form.reset(defaultValues);
            form.clearErrors();
        }
    }, [isOpen, form, defaultValues]);

    useEffect(() => {
        if (isOpen && !isEditMode) {
            const example = configJsonExamples[watchedBackendType] || {};
            form.setValue('config_string', json5.stringify(example, null, 2), {
                shouldValidate: true,
                shouldDirty: true,
            });
	    form.trigger('config_string');
        }
    }, [watchedBackendType, isOpen, isEditMode, form]);

    const createMutation = useMutation({
        mutationFn: (payload: StorageBackendApiPayload) => createStorageBackendConfig(payload),
        onSuccess: (data) => {
            toast.success(`Storage Backend "${data.name}" created successfully.`);
            queryClient.invalidateQueries({ queryKey: ['storageBackendConfigs'] });
            onClose();
            form.reset(initialFormDefaults);
        },
        onError: (error: any) => {
            let specificError = "Failed to create backend config.";
            if (error?.detail && Array.isArray(error.detail) && error.detail[0]) {
                 const errDetail = error.detail[0];
                 const field = errDetail.loc?.[1] || 'input';
                 specificError = `Validation Error on field '${field}': ${errDetail.msg}`;
            } else if (error?.detail){
                 specificError = typeof error.detail === 'string' ? error.detail : json5.stringify(error.detail);
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
                 const field = errDetail.loc?.[1] || 'input';
                 specificError = `Validation Error on field '${field}': ${errDetail.msg}`;
            } else if (error?.detail){
                 specificError = typeof error.detail === 'string' ? error.detail : json5.stringify(error.detail);
            } else {
                 specificError = error.message || specificError;
            }
            toast.error(`Update failed for ID ${variables.id}: ${specificError}`);
            console.error(`Update error details for ID ${variables.id}:`, error?.detail || error);
        },
    });

    const onSubmit = (values: StorageBackendFormData) => {
        console.log("Form submitted with values:", values);
        let parsedConfig: Record<string, any> = {};
        try {
            const jsonString = values.config_string;
            if (jsonString === null || jsonString === undefined || jsonString.trim() === '') {
                parsedConfig = {};
            } else {
                const parsed = json5.parse(jsonString);
                if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                    parsedConfig = parsed;
                } else {
                    throw new Error("Parsed JSON config is not a valid object.");
                }
            }
            console.log("Parsed config string:", parsedConfig);
        } catch (e) {
            const errorMsg = `Invalid JSON in configuration: ${e instanceof Error ? e.message : String(e)}`;
            toast.error(errorMsg);
            form.setError("config_string", { type: "manual", message: errorMsg });
            console.error("Error parsing config_string in onSubmit:", e);
            return;
        }

        const apiPayload: Partial<StorageBackendApiPayload> = {
            name: values.name,
            description: values.description?.trim() || null,
            backend_type: values.backend_type,
            is_enabled: values.is_enabled,
            ...parsedConfig
        };

        console.log("Submitting Flattened API Payload:", apiPayload);

        if (isEditMode && backend) {
            updateMutation.mutate({ id: backend.id, data: apiPayload as Partial<StorageBackendApiPayload> });
        } else {
             createMutation.mutate(apiPayload as StorageBackendApiPayload);
        }
    };

    const handleCopyExample = () => {
        const exampleJson = json5.stringify(configJsonExamples[watchedBackendType] || {}, null, 2);
        navigator.clipboard.writeText(exampleJson).then(() => {
            setShowCopied(true);
            if (copiedTimeout) clearTimeout(copiedTimeout);
            const timeoutId = setTimeout(() => setShowCopied(false), 1500);
            setCopiedTimeout(timeoutId);
            toast.success(`Default JSON for '${watchedBackendType}' copied!`);
        }).catch(err => {
            toast.error('Failed to copy JSON to clipboard.');
            console.error('Clipboard copy failed:', err);
        });
    };

    useEffect(() => {
        return () => {
            if (copiedTimeout) clearTimeout(copiedTimeout);
        };
    }, [copiedTimeout]);

    const isLoading = createMutation.isPending || updateMutation.isPending;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[650px]">
                 <DialogHeader>
                     <DialogTitle>{isEditMode ? 'Edit Storage Backend' : 'Add Storage Backend'}</DialogTitle>
                     <DialogDescription>
                         {isEditMode ? `Modify the configuration for "${backend?.name}".` : 'Configure a new storage destination.'}
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
                                         <FormControl>
                                             <SelectTrigger>
                                                 <SelectValue placeholder="Select backend type" />
                                             </SelectTrigger>
                                         </FormControl>
                                         <SelectContent>
                                             <SelectItem value="filesystem">Filesystem</SelectItem>
                                             <SelectItem value="cstore">DICOM C-STORE</SelectItem>
                                             <SelectItem value="gcs">Google Cloud Storage (GCS)</SelectItem>
                                             <SelectItem value="google_healthcare">Google Healthcare DICOM Store</SelectItem>
                                             <SelectItem value="stow_rs">DICOMweb STOW-RS</SelectItem>
                                         </SelectContent>
                                     </Select>
                                     <FormDescription>
                                         Select the type of storage destination. Cannot be changed after creation.
                                     </FormDescription>
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
                                         <Textarea
                                             placeholder="Optional description of this backend"
                                             {...field}
                                             value={field.value ?? ''}
                                             rows={2}
                                         />
                                     </FormControl>
                                     <FormMessage />
                                 </FormItem>
                             )}
                         />

                          <FormField
                             control={form.control}
                             name="config_string"
                             render={({ field }) => (
                                 <FormItem>
                                     <FormLabel>Backend Configuration (JSON)*</FormLabel>
                                     <FormDescription>
                                         Enter backend-specific settings as a JSON object.
                                         <span className="block mt-1 text-xs text-muted-foreground italic">
                                             {configJsonTooltips[watchedBackendType] || "Select a backend type..."}
                                         </span>
                                     </FormDescription>
                                     <div className="relative">
                                         <FormControl>
                                             <Textarea
                                                 placeholder={`{\n  // Example keys for ${watchedBackendType}...\n}`}
                                                 className="font-mono text-xs min-h-[150px] resize-y"
                                                 spellCheck="false"
                                                 {...field}
                                                 value={field.value ?? ''}
                                                 rows={8}
                                             />
                                         </FormControl>
                                         <Button
                                             type="button"
                                             variant="ghost"
                                             size="sm"
                                             className="absolute top-1 right-1 h-6 px-2 text-xs"
                                             onClick={handleCopyExample}
                                             title={`Copy default JSON for ${watchedBackendType}`}
                                         >
                                             <ClipboardCopyIcon className="h-3 w-3 mr-1" />
                                             {showCopied ? 'Copied!' : 'Copy Example'}
                                         </Button>
                                     </div>
                                     <FormMessage />
                                 </FormItem>
                             )}
                         />

                         {watchedBackendType === 'filesystem' && (
                             <Alert variant="default" className="bg-amber-50 border-amber-300 dark:bg-amber-900/30 dark:border-amber-700">
                                 <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                 <AlertTitle className="text-amber-700 dark:text-amber-300 text-sm">Container Path Required</AlertTitle>
                                 <AlertDescription className="text-amber-600 dark:text-amber-400 text-xs">
                                     The 'path' in the JSON must be the absolute path *inside the container* (e.g., `/dicom_data/processed/...`). Ensure volume mapping is correct.
                                 </AlertDescription>
                             </Alert>
                         )}

                         <FormField
                             control={form.control}
                             name="is_enabled"
                             render={({ field }) => (
                                 <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                                      <FormControl>
                                         <Checkbox
                                             checked={field.value}
                                             onCheckedChange={field.onChange}
                                             id={`is_enabled_${backend?.id || 'new'}`}
                                         />
                                     </FormControl>
                                     <div className="space-y-1 leading-none">
                                          <FormLabel htmlFor={`is_enabled_${backend?.id || 'new'}`}>
                                             Enable Backend
                                          </FormLabel>
                                          <FormDescription>
                                              If checked, this backend can be used in rule destinations.
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
