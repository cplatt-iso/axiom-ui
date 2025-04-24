// src/components/StorageBackendFormModal.tsx
import React, { useEffect, useState } from 'react';
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
// --- ADDED: Import Alert components and Icon ---
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// --- END ADDED ---
import { ClipboardCopyIcon } from 'lucide-react';

// Import Schemas and API functions
import {
    StorageBackendConfigRead,
    StorageBackendConfigCreatePayload,
    StorageBackendConfigUpdatePayload,
    storageBackendFormSchema,
    StorageBackendFormData,
    AllowedBackendType,
} from '@/schemas';
import {
    createStorageBackendConfig,
    updateStorageBackendConfig,
} from '@/services/api';

interface StorageBackendFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    backend: StorageBackendConfigRead | null;
}

const initialFormDefaults: StorageBackendFormData = {
    name: '',
    description: null,
    backend_type: 'filesystem',
    config: '{}',
    is_enabled: true,
};

const configExamples: Record<AllowedBackendType, Record<string, any>> = {
    filesystem: { path: "/dicom_data/processed/my_archive" }, // Example using common volume base
    cstore: { ae_title: "REMOTE_PACS_AE", host: "pacs.example.com", port: 104, calling_ae_title: "AXIOM_SCU" },
    gcs: { bucket_name: "your-gcs-bucket-name", path_prefix: "optional/folder/structure" },
    google_healthcare: { project_id: "your-gcp-project-id", location: "us-central1", dataset_id: "your-dataset", dicom_store_id: "your-dicom-store" },
    stow_rs: { stow_url: "https://dicom.server.com/dicom-web/studies", auth_type: "none", auth_config: null },
};

const configTooltips: Record<AllowedBackendType, string> = {
     filesystem: "Required: 'path' (string) - Absolute path *inside the container* where files will be stored (e.g., /dicom_data/processed/some_folder).", // Updated tooltip
     cstore: "Required: 'ae_title' (string), 'host' (string), 'port' (number). Optional: 'calling_ae_title' (string, default: AXIOM_SCU), timeouts (number).",
     gcs: "Required: 'bucket_name' (string). Optional: 'path_prefix' (string). Authentication uses ADC or GOOGLE_APPLICATION_CREDENTIALS env var.",
     google_healthcare: "Required: 'project_id', 'location', 'dataset_id', 'dicom_store_id' (all strings). Authentication uses ADC or GOOGLE_APPLICATION_CREDENTIALS env var.",
     stow_rs: "Required: 'stow_url' (string, full URL to /studies endpoint) OR 'base_url' (string, base DICOMweb URL). Optional: 'auth_type' ('none', 'basic', 'bearer', 'apikey'), 'auth_config' (object based on auth_type), 'timeout' (number).",
};


const StorageBackendFormModal: React.FC<StorageBackendFormModalProps> = ({ isOpen, onClose, backend }) => {
    const queryClient = useQueryClient();
    const isEditMode = !!backend;
    const [copiedTimeout, setCopiedTimeout] = useState<NodeJS.Timeout | null>(null);
    const [showCopied, setShowCopied] = useState(false);

    const form = useForm<StorageBackendFormData>({
        resolver: zodResolver(storageBackendFormSchema),
        defaultValues: initialFormDefaults,
    });

    const watchedBackendType = form.watch('backend_type');

    useEffect(() => {
        if (isOpen) {
            let resetValues: StorageBackendFormData;
            if (backend) {
                 resetValues = {
                    name: backend.name,
                    description: backend.description ?? null,
                    backend_type: backend.backend_type,
                    config: backend.config ? JSON.stringify(backend.config, null, 2) : '{}',
                    is_enabled: backend.is_enabled ?? true,
                 };
            } else {
                 resetValues = {
                     ...initialFormDefaults,
                     config: JSON.stringify(configExamples['filesystem'], null, 2)
                 };
            }
            form.reset(resetValues);
        }
    }, [isOpen, backend, form]);

    useEffect(() => {
        if (isOpen && !isEditMode) {
            const example = configExamples[watchedBackendType] || {};
            form.setValue('config', JSON.stringify(example, null, 2), { shouldValidate: true });
        }
    }, [watchedBackendType, isOpen, isEditMode, form]);

    const createMutation = useMutation({
        mutationFn: createStorageBackendConfig,
        onSuccess: (data) => {
            toast.success(`Storage Backend "${data.name}" created successfully.`);
            queryClient.invalidateQueries({ queryKey: ['storageBackendConfigs'] });
            onClose();
        },
        onError: (error: any) => {
            let specificError = "Failed to create backend config.";
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
        mutationFn: (payload: { id: number, data: StorageBackendConfigUpdatePayload }) =>
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
                 specificError = typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail);
            } else {
                 specificError = error.message || specificError;
            }
            toast.error(`Update failed for ID ${variables.id}: ${specificError}`);
            console.error(`Update error details for ID ${variables.id}:`, error?.detail || error);
        },
    });

    const onSubmit = (values: StorageBackendFormData) => {
        let parsedConfig: Record<string, any>;

        try {
            parsedConfig = JSON.parse(values.config);
            if (typeof parsedConfig !== 'object' || parsedConfig === null || Array.isArray(parsedConfig)) {
                 throw new Error("Config must be a valid JSON object.");
            }
        } catch (e: any) {
            form.setError('config', { type: 'manual', message: `Invalid JSON object: ${e.message}` });
            console.error("JSON Parsing error in form", e);
            return;
        }

        const apiPayload = {
            ...values,
            description: values.description?.trim() || null,
            config: parsedConfig,
        };
        console.log("Submitting Storage Backend Values:", apiPayload);

        if (isEditMode && backend) {
            const updatePayload: StorageBackendConfigUpdatePayload = apiPayload;
            updateMutation.mutate({ id: backend.id, data: updatePayload });
        } else {
             const createPayload: StorageBackendConfigCreatePayload = apiPayload;
            createMutation.mutate(createPayload);
        }
    };

    const handleCopyExample = () => {
        const exampleJson = JSON.stringify(configExamples[watchedBackendType] || {}, null, 2);
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

                        {/* Name */}
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

                        {/* Backend Type Select */}
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

                        {/* Description */}
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

                        {/* Config JSON */}
                         <FormField
                            control={form.control}
                            name="config"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Backend Configuration (JSON)*</FormLabel>
                                    <FormDescription>
                                        Enter backend-specific settings as a JSON object.
                                        <span className="block mt-1 text-xs text-muted-foreground italic">
                                            {configTooltips[watchedBackendType] || "Select a backend type to see required fields."}
                                        </span>
                                    </FormDescription>
                                    <div className="relative">
                                        <FormControl>
                                            <Textarea
                                                placeholder={`{\n  "key": "value"\n}`}
                                                className="font-mono text-xs min-h-[100px] resize-y"
                                                spellCheck="false"
                                                {...field}
                                                value={field.value ?? ''}
                                                rows={5}
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

                        {/* --- ADDED: Filesystem Path Warning --- */}
                        {watchedBackendType === 'filesystem' && (
                            <Alert variant="default" className="bg-amber-50 border-amber-300 dark:bg-amber-900/30 dark:border-amber-700">
                                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                <AlertTitle className="text-amber-700 dark:text-amber-300 text-sm">Container Path Required</AlertTitle>
                                <AlertDescription className="text-amber-600 dark:text-amber-400 text-xs">
                                    The 'path' specified in the JSON config must be the **absolute path inside the container** where the storage volume is mounted (e.g., `/dicom_data/processed/...`). This is likely different from the path on your host machine. Ensure the volume mapping is correctly set up in your `docker-compose.yml` or container runtime.
                                </AlertDescription>
                            </Alert>
                        )}
                        {/* --- END ADDED --- */}


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
                                            id="is_enabled_storage"
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                         <FormLabel htmlFor="is_enabled_storage">
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
