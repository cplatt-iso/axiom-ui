// frontend/src/components/StorageBackendFormModal.tsx
import React, { useEffect, useMemo } from 'react';
import { useForm, SubmitHandler, SubmitErrorHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from "zod";
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
    StorageBackendApiPayload, // This is used for submission, not directly for form defaults
} from '@/schemas'; // Assuming index.ts re-exports from storageBackendSchema
import {
    storageBackendFormSchema,
    StorageBackendFormData,
    StorageBackendConfigCreatePayload,
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

type StorageBackendFormInput = z.input<typeof storageBackendFormSchema>;
// type StorageBackendFormOutput = z.output<typeof storageBackendFormSchema>;

// This helper function creates a fully-typed default object
// that Zod itself would produce if parsing an empty object (after applying all .default() calls).
// This ensures maximum compatibility with the resolver.
const getZodDefaults = (
    schema: typeof storageBackendFormSchema,
    initialValues?: Partial<StorageBackendFormData>
): StorageBackendFormData => {
    // For Zod to apply defaults, it needs to parse.
    // We provide a minimal object that would pass initial required checks if any,
    // or an empty object if all fields are optional or have defaults.
    // `name` and `backend_type` are crucial.
    const baseForParsing: Partial<StorageBackendFormData> = {
        name: '', // required by schema
        backend_type: 'filesystem', // required by schema
        ...initialValues,
    };
    const parseResult = schema.safeParse(baseForParsing);
    if (parseResult.success) {
        return parseResult.data;
    }
    // Fallback if something unexpected happens (should be rare with a good base)
    console.error("Error generating Zod defaults:", parseResult.error.flatten().fieldErrors);
    // Construct a manual default that matches StorageBackendFormData structure explicitly
    return {
        name: initialValues?.name || '',
        backend_type: initialValues?.backend_type || 'filesystem',
        is_enabled: initialValues?.is_enabled === undefined ? true : initialValues.is_enabled,
        description: initialValues?.description === undefined ? null : initialValues.description,
        path: initialValues?.path === undefined ? null : initialValues.path,
        remote_ae_title: initialValues?.remote_ae_title === undefined ? null : initialValues.remote_ae_title,
        remote_host: initialValues?.remote_host === undefined ? null : initialValues.remote_host,
        remote_port: initialValues?.remote_port === undefined ? null : initialValues.remote_port,
        local_ae_title: initialValues?.local_ae_title === undefined ? null : initialValues.local_ae_title,
        tls_enabled: initialValues?.tls_enabled === undefined ? false : initialValues.tls_enabled,
        tls_ca_cert_secret_name: initialValues?.tls_ca_cert_secret_name === undefined ? null : initialValues.tls_ca_cert_secret_name,
        tls_client_cert_secret_name: initialValues?.tls_client_cert_secret_name === undefined ? null : initialValues.tls_client_cert_secret_name,
        tls_client_key_secret_name: initialValues?.tls_client_key_secret_name === undefined ? null : initialValues.tls_client_key_secret_name,
        bucket: initialValues?.bucket === undefined ? null : initialValues.bucket,
        prefix: initialValues?.prefix === undefined ? null : initialValues.prefix,
        gcp_project_id: initialValues?.gcp_project_id === undefined ? null : initialValues.gcp_project_id,
        gcp_location: initialValues?.gcp_location === undefined ? null : initialValues.gcp_location,
        gcp_dataset_id: initialValues?.gcp_dataset_id === undefined ? null : initialValues.gcp_dataset_id,
        gcp_dicom_store_id: initialValues?.gcp_dicom_store_id === undefined ? null : initialValues.gcp_dicom_store_id,
        base_url: initialValues?.base_url === undefined ? null : initialValues.base_url,
    };
};

// Helper to null out fields not relevant to the current backend type
const nullOutIrrelevantFields = (
    data: StorageBackendFormData,
    type: AllowedBackendType
): StorageBackendFormData => {
    const relevantData = { ...data }; // Make a copy

    const allPossibleConfigFields: Array<keyof StorageBackendFormData> = [
        'path', 'remote_ae_title', 'remote_host', 'remote_port', 'local_ae_title',
        'tls_enabled', 'tls_ca_cert_secret_name', 'tls_client_cert_secret_name',
        'tls_client_key_secret_name', 'bucket', 'prefix', 'gcp_project_id',
        'gcp_location', 'gcp_dataset_id', 'gcp_dicom_store_id', 'base_url'
    ];

    let relevantToType: Array<keyof StorageBackendFormData> = [];
    switch (type) {
        case 'filesystem': relevantToType = ['path']; break;
        case 'cstore': relevantToType = ['remote_ae_title', 'remote_host', 'remote_port', 'local_ae_title', 'tls_enabled', 'tls_ca_cert_secret_name', 'tls_client_cert_secret_name', 'tls_client_key_secret_name']; break;
        case 'gcs': relevantToType = ['bucket', 'prefix']; break;
        case 'google_healthcare': relevantToType = ['gcp_project_id', 'gcp_location', 'gcp_dataset_id', 'gcp_dicom_store_id']; break;
        case 'stow_rs': relevantToType = ['base_url']; break;
    }

    allPossibleConfigFields.forEach(fieldKey => {
        if (!relevantToType.includes(fieldKey)) {
            // If the field is tls_enabled and not relevant, Zod default (false) should apply.
            // Other fields are mostly nullable in the schema.
            if (fieldKey === 'tls_enabled') {
                (relevantData as any)[fieldKey] = false; // Reset to its Zod default if not relevant
            } else {
                (relevantData as any)[fieldKey] = null; // Null out if schema allows (most do)
            }
        }
    });
    return relevantData;
};


const StorageBackendFormModal: React.FC<StorageBackendFormModalProps> = ({ isOpen, onClose, backend }) => {
    const queryClient = useQueryClient();
    const isEditMode = !!backend;

    // Initialize form with Zod-derived defaults for a base type.
    // This ensures all fields RHF knows about have values consistent with Zod's .default()
    const form = useForm<StorageBackendFormInput>({
        resolver: zodResolver(storageBackendFormSchema),
        defaultValues: getZodDefaults(storageBackendFormSchema, { backend_type: 'filesystem' }),
        mode: 'onBlur', // Consider 'onChange' for more immediate feedback or 'onSubmit'
    });

    const watchedBackendType = form.watch('backend_type');
    const watchedCStoreTlsEnabled = form.watch('tls_enabled'); // `false` default from schema is fine

    // Memoize the generation of default values for edit mode
    const initialEditData = useMemo((): StorageBackendFormData | null => {
        if (isEditMode && backend) {
            // Start with Zod defaults for the specific backend type
            let base = getZodDefaults(storageBackendFormSchema, { backend_type: backend.backend_type as AllowedBackendType });

            // Override with actual values from the backend record
            base.name = backend.name;
            base.description = backend.description ?? null; // Already a Zod default
            base.is_enabled = backend.is_enabled; // Already a Zod default

            // Populate type-specific fields
            switch (backend.backend_type as AllowedBackendType) {
                case 'filesystem':
                    base.path = backend.config.path ?? null;
                    break;
                case 'cstore':
                    base.remote_ae_title = backend.config.remote_ae_title ?? null;
                    base.remote_host = backend.config.remote_host ?? null;
                    base.remote_port = backend.config.remote_port ?? null;
                    base.local_ae_title = backend.config.local_ae_title ?? null;
                    base.tls_enabled = backend.config.tls_enabled ?? false;
                    base.tls_ca_cert_secret_name = backend.config.tls_ca_cert_secret_name ?? null;
                    base.tls_client_cert_secret_name = backend.config.tls_client_cert_secret_name ?? null;
                    base.tls_client_key_secret_name = backend.config.tls_client_key_secret_name ?? null;
                    break;
                case 'gcs':
                    base.bucket = backend.config.bucket ?? null;
                    base.prefix = backend.config.prefix ?? null;
                    break;
                case 'google_healthcare':
                    base.gcp_project_id = backend.config.gcp_project_id ?? null;
                    base.gcp_location = backend.config.gcp_location ?? null;
                    base.gcp_dataset_id = backend.config.gcp_dataset_id ?? null;
                    base.gcp_dicom_store_id = backend.config.gcp_dicom_store_id ?? null;
                    break;
                case 'stow_rs':
                    base.base_url = backend.config.base_url ?? null;
                    break;
            }
            // Null out fields not relevant to this specific backend type
            return nullOutIrrelevantFields(base, backend.backend_type as AllowedBackendType);
        }
        return null;
    }, [backend, isEditMode]);


    useEffect(() => {
        if (isOpen) {
            if (isEditMode && initialEditData) {
                console.log("Resetting form for EDIT with:", initialEditData);
                form.reset(initialEditData);
            } else {
                // For CREATE mode, start with Zod defaults for 'filesystem'
                // then null out fields not relevant to 'filesystem'.
                const createDefaults = nullOutIrrelevantFields(
                    getZodDefaults(storageBackendFormSchema, { backend_type: 'filesystem' }),
                    'filesystem'
                );
                console.log("Resetting form for CREATE (filesystem) with:", createDefaults);
                form.reset(createDefaults);
            }
            form.clearErrors();
        }
    }, [isOpen, form, isEditMode, initialEditData]);


    useEffect(() => {
        // This effect handles changing the backend_type in CREATE mode
        if (isOpen && !isEditMode) {
            const currentCommonValues = {
                name: form.getValues('name'),
                description: form.getValues('description'),
                is_enabled: form.getValues('is_enabled'),
            };

            // Get Zod defaults for the new type
            let newTypeBaseDefaults = getZodDefaults(storageBackendFormSchema, { backend_type: watchedBackendType });
            // Null out fields not relevant for this new type
            newTypeBaseDefaults = nullOutIrrelevantFields(newTypeBaseDefaults, watchedBackendType);

            const newValues = {
                ...newTypeBaseDefaults,
                name: currentCommonValues.name, // Preserve user input for common fields
                description: currentCommonValues.description,
                is_enabled: currentCommonValues.is_enabled,
            };
            console.log(`Backend type changed to ${watchedBackendType} in CREATE mode. Resetting with:`, newValues);
            form.reset(newValues);
            form.clearErrors(); // Clear errors after type change
        }
    }, [watchedBackendType, isOpen, isEditMode, form]);


    const createMutation = useMutation({
        mutationFn: (payload: StorageBackendConfigCreatePayload) => createStorageBackendConfig(payload),
        onSuccess: (data) => {
            toast.success(`Storage Backend "${data.name}" created successfully.`);
            queryClient.invalidateQueries({ queryKey: ['storageBackendConfigs'] });
            onClose();
            // Reset to clean 'filesystem' state for next potential create
            const resetValues = nullOutIrrelevantFields(getZodDefaults(storageBackendFormSchema, { backend_type: 'filesystem' }), 'filesystem');
            form.reset(resetValues);
        },
        onError: (error: any) => {
            let specificError = "Failed to create backend config.";
            if (error?.detail && Array.isArray(error.detail) && error.detail[0]) {
                const errDetail = error.detail[0];
                const fieldPath = errDetail.loc && Array.isArray(errDetail.loc) ? errDetail.loc.slice(1).join('.') : 'input';
                specificError = `Validation Error on field '${fieldPath}': ${errDetail.msg}`;
                if (fieldPath && typeof fieldPath === 'string' && (form.control as any)._fields[fieldPath]) { // Check if field exists
                    form.setError(fieldPath as keyof StorageBackendFormData, { type: 'manual', message: errDetail.msg });
                } else {
                    form.setError("root.serverError", { type: "manual", message: specificError });
                }
            } else if (error?.detail) {
                specificError = typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail);
                form.setError("root.serverError", { type: "manual", message: specificError });
            } else {
                specificError = error.message || specificError;
                form.setError("root.serverError", { type: "manual", message: specificError });
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
            queryClient.invalidateQueries({ queryKey: ['storageBackendConfig', data.id] }); // If you fetch individual ones
            onClose();
        },
        onError: (error: any, variables) => {
            let specificError = "Failed to update backend config.";
            if (error?.detail && Array.isArray(error.detail) && error.detail[0]) {
                const errDetail = error.detail[0];
                const fieldPath = errDetail.loc && Array.isArray(errDetail.loc) ? errDetail.loc.slice(1).join('.') : 'input';
                specificError = `Validation Error on field '${fieldPath}': ${errDetail.msg}`;
                if (fieldPath && typeof fieldPath === 'string' && (form.control as any)._fields[fieldPath]) { // Check if field exists
                    form.setError(fieldPath as keyof StorageBackendFormData, { type: 'manual', message: errDetail.msg });
                } else {
                    form.setError("root.serverError", { type: "manual", message: specificError });
                }
            } else if (error?.detail) {
                specificError = typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail);
                form.setError("root.serverError", { type: "manual", message: specificError });
            } else {
                specificError = error.message || specificError;
                form.setError("root.serverError", { type: "manual", message: specificError });
            }
            toast.error(`Update failed for ID ${variables.id}: ${specificError}`);
            console.error(`Update error details for ID ${variables.id}:`, error?.detail || error);
        },
    });

    const onSubmit: SubmitHandler<StorageBackendFormInput> = (raw) => {
        const values = storageBackendFormSchema.parse(raw);
        console.log("Form submitted with validated values:", values);

        // ─── 1. Common fields ────────────────────────────────────────────────────────
        const common: Omit<StorageBackendConfigCreatePayload, "config"> = {
            name: values.name,
            description: values.description?.trim() || null,
            backend_type: values.backend_type,
            is_enabled: values.is_enabled,
        };

        // ─── 2. backend-specific `config` blob ───────────────────────────────────────
        let config: Record<string, any>;

        switch (values.backend_type) {
            case "filesystem":
                config = { path: values.path! };
                break;

            case "cstore":
                config = {
                    remote_ae_title: values.remote_ae_title!,
                    remote_host: values.remote_host!,
                    remote_port: values.remote_port!,
                    local_ae_title: values.local_ae_title?.trim() || null,
                    tls_enabled: values.tls_enabled ?? false,
                    tls_ca_cert_secret_name: values.tls_enabled && values.tls_ca_cert_secret_name?.trim() ? values.tls_ca_cert_secret_name.trim() : null,
                    tls_client_cert_secret_name: values.tls_enabled && values.tls_client_cert_secret_name?.trim() ? values.tls_client_cert_secret_name.trim() : null,
                    tls_client_key_secret_name: values.tls_enabled && values.tls_client_key_secret_name?.trim() ? values.tls_client_key_secret_name.trim() : null,
                };
                break;

            case "gcs":
                config = {
                    bucket: values.bucket!,
                    prefix: values.prefix?.trim() || null,
                };
                break;

            case "google_healthcare":
                config = {
                    gcp_project_id: values.gcp_project_id!,
                    gcp_location: values.gcp_location!,
                    gcp_dataset_id: values.gcp_dataset_id!,
                    gcp_dicom_store_id: values.gcp_dicom_store_id!,
                };
                break;

            case "stow_rs":
                config = { base_url: values.base_url! };
                break;

            default:
                toast.error("Internal Error: Unknown backend type.");
                console.error("Unknown backend type:", values.backend_type);
                return;
        }

        // ─── 3. Final payload ────────────────────────────────────────────────────────
        const finalPayload: StorageBackendConfigCreatePayload = { ...common, config };

        console.log("Submitting API payload:", finalPayload);

        try {
            // Optional: validate against Zod before send
            // StorageBackendConfigCreatePayloadSchema.parse(finalPayload);

            if (isEditMode && backend) {
                updateMutation.mutate({ id: backend.id, data: finalPayload });
            } else {
                createMutation.mutate(finalPayload);
            }
        } catch (e: any) {
            console.error("Payload validation failed:", e);
            toast.error(`Internal Error: API payload construction failed. ${e.message || ""}`);
        }
    };

    const isLoading = createMutation.isPending || updateMutation.isPending;

    const onErrorRHF: SubmitErrorHandler<StorageBackendFormInput> = (errors) => {
        console.error("React Hook Form validation errors:", errors);
        const firstField = Object.keys(errors)[0] as keyof typeof errors | undefined;
        const msg = firstField && errors[firstField]?.message
            ? `Error in '${String(firstField)}': ${errors[firstField]!.message}`
            : "Form validation failed!";
        toast.error(msg);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="sm:max-w-[750px]">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit Storage Backend' : 'Add Storage Backend'}</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? `Modify the configuration for "${backend?.name}".` : 'Configure a new storage destination.'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit, onErrorRHF)} className="space-y-4 py-4 max-h-[75vh] overflow-y-auto px-2 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
                        {form.formState.errors.root?.serverError && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Server Error</AlertTitle>
                                <AlertDescription>
                                    {form.formState.errors.root.serverError.message}
                                </AlertDescription>
                            </Alert>
                        )}
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
                                        disabled={isEditMode || isLoading} // Disable while loading too
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
                            <h3 className="text-sm font-medium text-muted-foreground">{watchedBackendType?.toUpperCase()} Specific Configuration</h3>

                            {watchedBackendType === 'filesystem' && (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="path"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Filesystem Path*</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="/dicom_data/processed/my_archive" {...field} value={field.value ?? ''} />
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
                                        {watchedCStoreTlsEnabled && ( // Use the watched value here
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
                                        <Switch id={`is_enabled_switch`} checked={!!field.value} onCheckedChange={field.onChange} ref={field.ref} />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel htmlFor={`is_enabled_switch`}>Enable Backend</FormLabel>
                                        <FormDescription>If checked, this backend can be used in rule destinations.</FormDescription>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-4">
                            <DialogClose asChild>
                                <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
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