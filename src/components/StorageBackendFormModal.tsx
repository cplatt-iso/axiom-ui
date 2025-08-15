// frontend/src/components/StorageBackendFormModal.tsx
import React, { useEffect } from 'react';
import { useForm, SubmitHandler, SubmitErrorHandler, FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
// import { z } from "zod";

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
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import {
    StorageBackendConfigRead,
    AllowedBackendType,
    StowRsAuthType,
    StorageBackendConfigCreatePayload,
    StorageBackendConfigCreatePayloadSchema, // Assuming this is your Zod discriminated union for create
    StorageBackendConfigUpdateApiPayload,   // Assuming this is your Zod flat partial schema for update
    StorageBackendConfigUpdateApiPayloadSchema, // And its schema
    storageBackendFormSchema,               // Flat Zod schema for RHF
    StorageBackendFormData,                 // Type for RHF
} from '@/schemas/storageBackendSchema';

import {
    createStorageBackendConfig,
    updateStorageBackendConfig,
} from '@/services/api';
import { buildZodDefaults } from '@/utils/zodDefaults';

interface StorageBackendFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    backend: StorageBackendConfigRead | null;
}

// Helper to prepare clean form data based on types
const getCleanedFormDataForType = (
    currentData: Partial<StorageBackendFormData>,
    newBackendType: AllowedBackendType,
    newStowAuthType?: StowRsAuthType | null
): StorageBackendFormData => {
    const baseDefaults = buildZodDefaults(storageBackendFormSchema, {
        backend_type: newBackendType,
        stow_auth_type: newBackendType === 'stow_rs' ? (newStowAuthType || 'none') : 'none',
    });

    const cleanedData: StorageBackendFormData = {
        ...baseDefaults,
        name: currentData.name || baseDefaults.name,
        description: currentData.description !== undefined ? currentData.description : baseDefaults.description,
        is_enabled: currentData.is_enabled !== undefined ? currentData.is_enabled : baseDefaults.is_enabled,
        backend_type: newBackendType,
    };

    switch (newBackendType) {
        case 'filesystem':
            cleanedData.path = currentData.path !== undefined ? currentData.path : baseDefaults.path;
            break;
        case 'cstore':
            cleanedData.remote_ae_title = currentData.remote_ae_title !== undefined ? currentData.remote_ae_title : baseDefaults.remote_ae_title;
            cleanedData.remote_host = currentData.remote_host !== undefined ? currentData.remote_host : baseDefaults.remote_host;
            cleanedData.remote_port = currentData.remote_port !== undefined ? currentData.remote_port : baseDefaults.remote_port;
            cleanedData.local_ae_title = currentData.local_ae_title !== undefined ? currentData.local_ae_title : baseDefaults.local_ae_title;
            cleanedData.sender_type = currentData.sender_type !== undefined ? currentData.sender_type : baseDefaults.sender_type;
            cleanedData.tls_enabled = currentData.tls_enabled !== undefined ? currentData.tls_enabled : baseDefaults.tls_enabled;
            cleanedData.tls_ca_cert_secret_name = currentData.tls_ca_cert_secret_name !== undefined ? currentData.tls_ca_cert_secret_name : baseDefaults.tls_ca_cert_secret_name;
            cleanedData.tls_client_cert_secret_name = currentData.tls_client_cert_secret_name !== undefined ? currentData.tls_client_cert_secret_name : baseDefaults.tls_client_cert_secret_name;
            cleanedData.tls_client_key_secret_name = currentData.tls_client_key_secret_name !== undefined ? currentData.tls_client_key_secret_name : baseDefaults.tls_client_key_secret_name;
            break;
        case 'gcs':
            cleanedData.bucket = currentData.bucket !== undefined ? currentData.bucket : baseDefaults.bucket;
            cleanedData.prefix = currentData.prefix !== undefined ? currentData.prefix : baseDefaults.prefix;
            break;
        case 'google_healthcare':
            cleanedData.gcp_project_id = currentData.gcp_project_id !== undefined ? currentData.gcp_project_id : baseDefaults.gcp_project_id;
            cleanedData.gcp_location = currentData.gcp_location !== undefined ? currentData.gcp_location : baseDefaults.gcp_location;
            cleanedData.gcp_dataset_id = currentData.gcp_dataset_id !== undefined ? currentData.gcp_dataset_id : baseDefaults.gcp_dataset_id;
            cleanedData.gcp_dicom_store_id = currentData.gcp_dicom_store_id !== undefined ? currentData.gcp_dicom_store_id : baseDefaults.gcp_dicom_store_id;
            break;
        case 'stow_rs':
            cleanedData.base_url = currentData.base_url !== undefined ? currentData.base_url : baseDefaults.base_url;
            cleanedData.stow_auth_type = newStowAuthType || (currentData.stow_auth_type !== undefined ? currentData.stow_auth_type : baseDefaults.stow_auth_type);
            cleanedData.tls_ca_cert_secret_name = currentData.tls_ca_cert_secret_name !== undefined ? currentData.tls_ca_cert_secret_name : baseDefaults.tls_ca_cert_secret_name;

            if (cleanedData.stow_auth_type === 'basic') {
                cleanedData.stow_basic_auth_username_secret_name = currentData.stow_basic_auth_username_secret_name !== undefined ? currentData.stow_basic_auth_username_secret_name : baseDefaults.stow_basic_auth_username_secret_name;
                cleanedData.stow_basic_auth_password_secret_name = currentData.stow_basic_auth_password_secret_name !== undefined ? currentData.stow_basic_auth_password_secret_name : baseDefaults.stow_basic_auth_password_secret_name;
            } else if (cleanedData.stow_auth_type === 'bearer') {
                cleanedData.stow_bearer_token_secret_name = currentData.stow_bearer_token_secret_name !== undefined ? currentData.stow_bearer_token_secret_name : baseDefaults.stow_bearer_token_secret_name;
            } else if (cleanedData.stow_auth_type === 'apikey') {
                cleanedData.stow_api_key_secret_name = currentData.stow_api_key_secret_name !== undefined ? currentData.stow_api_key_secret_name : baseDefaults.stow_api_key_secret_name;
                cleanedData.stow_api_key_header_name_override = currentData.stow_api_key_header_name_override !== undefined ? currentData.stow_api_key_header_name_override : baseDefaults.stow_api_key_header_name_override;
            }
            break;
        default:
            // Optional: handle exhaustive check for type safety if new types are added
            // const _exhaustiveCheck: never = newBackendType;
            break;
    }
    return cleanedData;
};

const StorageBackendFormModal: React.FC<StorageBackendFormModalProps> = ({ isOpen, onClose, backend }) => {
    const queryClient = useQueryClient();
    const isEditMode = !!backend;

    const form = useForm<StorageBackendFormData>({
        resolver: zodResolver(storageBackendFormSchema),
        mode: 'onBlur',
        defaultValues: { // BE SUPER DUPER EXPLICIT HERE:
            name: "", // Must have a value
            backend_type: "filesystem", // Must have a value
            is_enabled: true, // Must have a value, can't be undefined
            description: null,
            path: null,
            remote_ae_title: null,
            remote_host: null,
            remote_port: null, // Or a default number if your schema demands it, but null for optional number
            local_ae_title: null,
            sender_type: "pynetdicom",
            tls_enabled: false, // Explicitly false, matching Zod default
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
            stow_auth_type: "none", // Must have a value, matching Zod default
            stow_basic_auth_username_secret_name: null,
            stow_basic_auth_password_secret_name: null,
            stow_bearer_token_secret_name: null,
            stow_api_key_secret_name: null,
            stow_api_key_header_name_override: null,
        } satisfies StorageBackendFormData,
    });

    const watchedBackendType = form.watch('backend_type');
    const watchedStowAuthType = form.watch('stow_auth_type');
    const watchedCStoreTlsEnabled = form.watch('tls_enabled');

    // Effect to reset form when opening or for edit mode
    useEffect(() => {
        if (isOpen) {
            if (isEditMode && backend) {
                let initialFormData: Partial<StorageBackendFormData> = {
                    name: backend.name,
                    description: backend.description,
                    is_enabled: backend.is_enabled,
                    backend_type: backend.backend_type,
                };
                switch (backend.backend_type) {
                    case "filesystem": initialFormData.path = backend.path; break;
                    case "cstore": // CStore fields are flat on StorageBackendConfigRead_CStore
                        initialFormData = { ...initialFormData, ...backend }; break;
                    case "gcs":
                        initialFormData.bucket = backend.bucket;
                        initialFormData.prefix = backend.prefix;
                        break;
                    case "google_healthcare": // GHC fields are flat on StorageBackendConfigRead_GoogleHealthcare
                        initialFormData = { ...initialFormData, ...backend }; break;
                    case "stow_rs": // STOW-RS fields are flat on StorageBackendConfigRead_StowRs
                        initialFormData = {
                            ...initialFormData,
                            base_url: backend.base_url,
                            stow_auth_type: backend.auth_type, // map API 'auth_type' to form 'stow_auth_type'
                            stow_basic_auth_username_secret_name: backend.basic_auth_username_secret_name,
                            stow_basic_auth_password_secret_name: backend.basic_auth_password_secret_name,
                            stow_bearer_token_secret_name: backend.bearer_token_secret_name,
                            stow_api_key_secret_name: backend.api_key_secret_name,
                            stow_api_key_header_name_override: backend.api_key_header_name_override,
                            tls_ca_cert_secret_name: backend.tls_ca_cert_secret_name,
                        };
                        break;
                }
                const cleanedEditData = getCleanedFormDataForType(initialFormData, backend.backend_type, backend.backend_type === 'stow_rs' ? backend.auth_type : undefined);
                console.log("[EFFECT Init/Edit] Resetting form for EDIT with:", cleanedEditData);
                form.reset(cleanedEditData);
            } else if (!isEditMode) { // Only for CREATE mode
                const createDefaults = getCleanedFormDataForType({}, 'filesystem');
                console.log("[EFFECT Init/Create] Resetting form for CREATE (filesystem) with:", createDefaults);
                form.reset(createDefaults);
            }
            form.clearErrors();
        }
    }, [isOpen, isEditMode, backend, form]); // form added to dependency array


    // Effect to handle changing backend_type or stow_auth_type
    useEffect(() => {
        if (!isOpen) return;

        const currentValues = form.getValues();
        let newStowAuthTypeForReset: StowRsAuthType | null | undefined = currentValues.stow_auth_type;

        // If backend_type field itself was changed by the user
        if (form.formState.dirtyFields.backend_type) {
            newStowAuthTypeForReset = 'none'; // When main type changes, reset sub-type
            const cleanedValues = getCleanedFormDataForType(currentValues, watchedBackendType, newStowAuthTypeForReset);
            console.log(`[EFFECT TypeChange] Backend_type changed to ${watchedBackendType}. Resetting with:`, cleanedValues);
            form.reset(cleanedValues, { keepDirtyValues: true, keepErrors: false });
            form.clearErrors();
        }
        // Else if backend_type is STOW-RS AND stow_auth_type field was changed
        else if (watchedBackendType === 'stow_rs' && form.formState.dirtyFields.stow_auth_type) {
            const cleanedValues = getCleanedFormDataForType(currentValues, 'stow_rs', watchedStowAuthType);
            console.log(`[EFFECT TypeChange] STOW-RS auth_type changed to ${watchedStowAuthType}. Resetting STOW-RS fields with:`, cleanedValues);
            form.reset(cleanedValues, { keepDirtyValues: true, keepErrors: false });
            form.clearErrors();
        }
    }, [watchedBackendType, watchedStowAuthType, isOpen, form, isEditMode]); // isEditMode added
    const mutationConfig = {
        onSuccess: (data: StorageBackendConfigRead) => {
            toast.success(`Storage Backend "${data.name}" ${isEditMode ? 'updated' : 'created'} successfully.`);
            queryClient.invalidateQueries({ queryKey: ['storageBackendConfigs'] });
            if (isEditMode && data.id) {
                queryClient.invalidateQueries({ queryKey: ['storageBackendConfig', data.id] });
            }
            onClose();
            if (!isEditMode) {
                form.reset(getCleanedFormDataForType({}, 'filesystem'));
            }
        },
        onError: (error: unknown, variables: unknown) => {
            const operation = isEditMode ? 'update' : 'creation';
            const idContext = isEditMode && variables && typeof variables === 'object' && 'id' in variables 
                ? `for ID ${(variables as { id: number }).id}` 
                : '';

            let specificError = `Failed to ${operation} backend config ${idContext}.`;
            const errorObj = error as { response?: { data?: { detail?: unknown } }; detail?: unknown };
            const errorDetailSource = errorObj?.response?.data?.detail || errorObj?.detail;

            if (errorDetailSource) {
                if (Array.isArray(errorDetailSource) && errorDetailSource[0]) {
                    const errDetail = errorDetailSource[0];
                    const fieldPath = errDetail.loc && Array.isArray(errDetail.loc) ? errDetail.loc.slice(1).join('.') as FieldPath<StorageBackendFormData> : 'root.serverError';
                    specificError = `Validation Error on field '${fieldPath}': ${errDetail.msg}`;
                    form.setError(fieldPath, { type: 'manual', message: errDetail.msg });
                } else if (typeof errorDetailSource === 'string') {
                    specificError = errorDetailSource;
                    form.setError("root.serverError", { type: "manual", message: specificError });
                }
            } else if (errorObj && typeof errorObj === 'object' && 'message' in errorObj && typeof errorObj.message === 'string') {
                specificError = errorObj.message;
                form.setError("root.serverError", { type: "manual", message: specificError });
            }
            toast.error(`${operation.charAt(0).toUpperCase() + operation.slice(1)} failed: ${specificError}`);
            console.error(`${operation} error details ${idContext}:`, errorDetailSource || error);
        },
    };

    const createMutation = useMutation({
        mutationFn: (payload: StorageBackendConfigCreatePayload) => createStorageBackendConfig(payload),
        ...mutationConfig,
    });

    const updateMutation = useMutation({
        mutationFn: (payload: { id: number, data: StorageBackendConfigUpdateApiPayload }) =>
            updateStorageBackendConfig(payload.id, payload.data),
        ...mutationConfig,
    });

    const onSubmit: SubmitHandler<StorageBackendFormData> = (formData) => {
        console.log("Form submitted with RHF validated values (StorageBackendFormData):", formData);

        const commonApiData = {
            name: formData.name,
            description: formData.description || null,
            is_enabled: formData.is_enabled,
        };

        let apiPayloadToSend: StorageBackendConfigCreatePayload | StorageBackendConfigUpdateApiPayload;

        try {
            switch (formData.backend_type) {
                case "filesystem":
                    apiPayloadToSend = { ...commonApiData, backend_type: formData.backend_type, path: formData.path! };
                    break;
                case "cstore":
                    apiPayloadToSend = {
                        ...commonApiData, backend_type: formData.backend_type,
                        remote_ae_title: formData.remote_ae_title!,
                        remote_host: formData.remote_host!,
                        remote_port: formData.remote_port!,
                        local_ae_title: formData.local_ae_title || null,
                        sender_type: formData.sender_type || "pynetdicom",
                        tls_enabled: formData.tls_enabled ?? false,
                        tls_ca_cert_secret_name: (formData.tls_enabled && formData.tls_ca_cert_secret_name?.trim()) ? formData.tls_ca_cert_secret_name.trim() : null,
                        tls_client_cert_secret_name: (formData.tls_enabled && formData.tls_client_cert_secret_name?.trim()) ? formData.tls_client_cert_secret_name.trim() : null,
                        tls_client_key_secret_name: (formData.tls_enabled && formData.tls_client_key_secret_name?.trim()) ? formData.tls_client_key_secret_name.trim() : null,
                    };
                    break;
                case "gcs":
                    apiPayloadToSend = { ...commonApiData, backend_type: formData.backend_type, bucket: formData.bucket!, prefix: formData.prefix || null };
                    break;
                case "google_healthcare":
                    apiPayloadToSend = {
                        ...commonApiData, backend_type: formData.backend_type,
                        gcp_project_id: formData.gcp_project_id!,
                        gcp_location: formData.gcp_location!,
                        gcp_dataset_id: formData.gcp_dataset_id!,
                        gcp_dicom_store_id: formData.gcp_dicom_store_id!,
                    };
                    break;
                case "stow_rs":
                    apiPayloadToSend = {
                        ...commonApiData, backend_type: formData.backend_type,
                        base_url: formData.base_url!,
                        auth_type: formData.stow_auth_type || "none",
                        basic_auth_username_secret_name: formData.stow_auth_type === 'basic' ? formData.stow_basic_auth_username_secret_name?.trim() || null : null,
                        basic_auth_password_secret_name: formData.stow_auth_type === 'basic' ? formData.stow_basic_auth_password_secret_name?.trim() || null : null,
                        bearer_token_secret_name: formData.stow_auth_type === 'bearer' ? formData.stow_bearer_token_secret_name?.trim() || null : null,
                        api_key_secret_name: formData.stow_auth_type === 'apikey' ? formData.stow_api_key_secret_name?.trim() || null : null,
                        api_key_header_name_override: formData.stow_auth_type === 'apikey' ? formData.stow_api_key_header_name_override?.trim() || null : null,
                        tls_ca_cert_secret_name: formData.tls_ca_cert_secret_name?.trim() || null,
                    };
                    break;
                default: {
                    const _exhaustiveCheck: never = formData.backend_type;
                    toast.error("Internal Error: Unhandled backend type during payload construction.");
                    console.error("Unhandled backend type in onSubmit:", formData.backend_type, _exhaustiveCheck);
                    return;
                }
            }

            if (isEditMode && backend) {
                // Construct a truly partial payload for PATCH
                const patchData: Partial<StorageBackendConfigUpdateApiPayload> = {};
                const dirtyFields = form.formState.dirtyFields;

                (Object.keys(dirtyFields) as Array<keyof StorageBackendFormData>).forEach(dirtyFieldKey => {
                    // Map form field names to API payload field names if they differ
                    // For now, assuming they are mostly the same or handled by the spread
                    if (dirtyFieldKey in apiPayloadToSend) { // Check if the dirty field is part of the constructed full payload for this type
                        (patchData as Record<string, unknown>)[dirtyFieldKey] = (apiPayloadToSend as Record<string, unknown>)[dirtyFieldKey];
                    }
                });

                // Always include name if it was dirty, or if no other fields are dirty (to allow name-only update)
                if (dirtyFields.name || Object.keys(patchData).length === 0) {
                    patchData.name = formData.name;
                }
                // Ensure essential identifiers/discriminators are part of the patch if needed,
                // though backend_type shouldn't be changed.
                // The backend CRUD's update method should handle not changing backend_type.

                console.log("Submitting UPDATE API payload (PATCH data):", patchData);
                StorageBackendConfigUpdateApiPayloadSchema.parse(patchData); // Validate partial payload
                updateMutation.mutate({ id: backend.id, data: patchData });
            } else {
                console.log("Submitting CREATE API payload:", apiPayloadToSend);
                StorageBackendConfigCreatePayloadSchema.parse(apiPayloadToSend as StorageBackendConfigCreatePayload);
                createMutation.mutate(apiPayloadToSend as StorageBackendConfigCreatePayload);
            }

        } catch (validationError: unknown) {
            console.error("Zod validation error for API payload construction or submission:", validationError);
            const errorObj = validationError as { errors?: Array<{ message?: string }>; message?: string };
            toast.error(`Data submission error: ${errorObj.errors?.[0]?.message || errorObj.message || "Invalid data"}`);
        }
    };

    const onErrorRHF: SubmitErrorHandler<StorageBackendFormData> = (errors) => {
        console.error("React Hook Form validation errors:", errors);
        const firstErrorField = Object.keys(errors)[0] as FieldPath<StorageBackendFormData> | undefined;
        let errorMessage = "Form validation failed. Please check the highlighted fields.";
        if (firstErrorField && errors[firstErrorField]?.message) {
            const fieldLabel = firstErrorField.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); // Basic formatting
            errorMessage = `Error in '${fieldLabel}': ${errors[firstErrorField]!.message}`;
        }
        toast.error(errorMessage);
    };

    const isLoading = createMutation.isPending || updateMutation.isPending;
    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isLoading) onClose(); }}>
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
                                <AlertDescription>{form.formState.errors.root.serverError.message}</AlertDescription>
                            </Alert>
                        )}
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name*</FormLabel>
                                    <FormControl><Input placeholder="e.g., Main Archive Filesystem" {...field} /></FormControl>
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
                                    <Select onValueChange={field.onChange} value={field.value} disabled={isEditMode || isLoading}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select backend type" /></SelectTrigger></FormControl>
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
                                    <FormControl><Textarea placeholder="Optional description" {...field} value={field.value ?? ''} rows={2} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="space-y-4 pt-4 border-t border-border mt-4">
                            <h3 className="text-sm font-medium text-muted-foreground">
                                {watchedBackendType?.toUpperCase().replace("_", " ")} Specific Configuration
                            </h3>

                            {/* Filesystem Fields */}
                            {watchedBackendType === 'filesystem' && (
                                <>
                                    <FormField control={form.control} name="path" render={({ field }) => (<FormItem> <FormLabel>Filesystem Path*</FormLabel> <FormControl><Input placeholder="/dicom_data/processed/my_archive" {...field} value={field.value ?? ''} /></FormControl> <FormDescription>Absolute path *inside the container* where DICOM files will be stored.</FormDescription> <FormMessage /> </FormItem>)} />
                                    <Alert variant="default" className="bg-amber-50 border-amber-300 dark:bg-amber-900/30 dark:border-amber-700">
                                        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                        <AlertTitle className="text-amber-700 dark:text-amber-300 text-sm">Container Path Required</AlertTitle>
                                        <AlertDescription className="text-amber-600 dark:text-amber-400 text-xs">Ensure this path exists within the container and you have appropriate volume mapping set up in your Docker configuration.</AlertDescription>
                                    </Alert>
                                </>
                            )}

                            {/* CStore Fields */}
                            {watchedBackendType === 'cstore' && (
                                <div className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="sender_type"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>DICOM Engine</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value || 'pynetdicom'}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select DICOM Engine" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="pynetdicom">pynetdicom</SelectItem>
                                                        <SelectItem value="dcm4che">dcm4che</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormDescription>
                                                    Select the underlying DICOM engine to use for sending files.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField control={form.control} name="remote_ae_title" render={({ field }) => (<FormItem> <FormLabel>Remote AE Title*</FormLabel> <FormControl><Input placeholder="REMOTE_PACS_AE" {...field} value={field.value ?? ''} maxLength={16} /></FormControl> <FormMessage /> </FormItem>)} />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FormField control={form.control} name="remote_host" render={({ field }) => (<FormItem> <FormLabel>Remote Host*</FormLabel> <FormControl><Input placeholder="pacs.example.com or IP" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem>)} />
                                        <FormField control={form.control} name="remote_port" render={({ field }) => (<FormItem> <FormLabel>Remote Port*</FormLabel> <FormControl><Input type="number" min="1" max="65535" step="1" {...field} value={field.value ?? ''} onChange={event => field.onChange(event.target.value === '' ? null : +event.target.value)} /></FormControl> <FormMessage /> </FormItem>)} />
                                    </div>
                                    <FormField control={form.control} name="local_ae_title" render={({ field }) => (<FormItem> <FormLabel>Calling AE Title</FormLabel> <FormDescription>AE Title this system will use to connect. Defaults if blank.</FormDescription> <FormControl><Input placeholder="AXIOM_STORE_SCU" {...field} value={field.value ?? ''} maxLength={16} /></FormControl> <FormMessage /> </FormItem>)} />
                                    <div className="space-y-4 rounded-md border p-4 shadow-sm">
                                        <FormField control={form.control} name="tls_enabled" render={({ field }) => (<FormItem className="flex flex-row items-center space-x-3 space-y-0"> <FormControl><Switch id="cstore_tls_enabled" checked={!!field.value} onCheckedChange={field.onChange} ref={field.ref} /></FormControl> <div className="space-y-1 leading-none"> <FormLabel htmlFor="cstore_tls_enabled">Enable TLS</FormLabel> <FormDescription>Use secure TLS for the outgoing C-STORE connection.</FormDescription> </div> <FormMessage /> </FormItem>)} />
                                        {watchedCStoreTlsEnabled && (
                                            <div className="space-y-4 pl-8 pt-2 border-l ml-2">
                                                <FormField control={form.control} name="tls_ca_cert_secret_name" render={({ field }) => (<FormItem> <FormLabel>CA Certificate Secret Name*</FormLabel> <FormDescription>GCP Secret ID for CA cert to verify remote server.</FormDescription> <FormControl><Input placeholder="gcp-secret-for-remote-ca" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem>)} />
                                                <FormField control={form.control} name="tls_client_cert_secret_name" render={({ field }) => (<FormItem> <FormLabel>Client Certificate Secret Name (mTLS)</FormLabel> <FormDescription>Optional: GCP Secret ID for *this system's* client cert.</FormDescription> <FormControl><Input placeholder="gcp-secret-for-axiom-client-cert" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem>)} />
                                                <FormField control={form.control} name="tls_client_key_secret_name" render={({ field }) => (<FormItem> <FormLabel>Client Private Key Secret Name (mTLS)</FormLabel> <FormDescription>Optional: GCP Secret ID for *this system's* client key.</FormDescription> <FormControl><Input placeholder="gcp-secret-for-axiom-client-key" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem>)} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* GCS Fields */}
                            {watchedBackendType === 'gcs' && (
                                <div className="space-y-4">
                                    <FormField control={form.control} name="bucket" render={({ field }) => (<FormItem> <FormLabel>GCS Bucket Name*</FormLabel> <FormControl><Input placeholder="my-dicom-archive-bucket" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem>)} />
                                    <FormField control={form.control} name="prefix" render={({ field }) => (<FormItem> <FormLabel>Object Prefix (Optional)</FormLabel> <FormDescription>Path prefix in bucket (e.g., `incoming/`). No leading `/`.</FormDescription> <FormControl><Input placeholder="optional/folder/structure/" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem>)} />
                                </div>
                            )}

                            {/* Google Healthcare Fields */}
                            {watchedBackendType === 'google_healthcare' && (
                                <div className="space-y-4">
                                    <FormField control={form.control} name="gcp_project_id" render={({ field }) => (<FormItem> <FormLabel>GCP Project ID*</FormLabel> <FormControl><Input placeholder="my-gcp-project-id" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem>)} />
                                    <FormField control={form.control} name="gcp_location" render={({ field }) => (<FormItem> <FormLabel>GCP Location*</FormLabel> <FormControl><Input placeholder="us-central1" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem>)} />
                                    <FormField control={form.control} name="gcp_dataset_id" render={({ field }) => (<FormItem> <FormLabel>Healthcare Dataset ID*</FormLabel> <FormControl><Input placeholder="my-dicom-dataset" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem>)} />
                                    <FormField control={form.control} name="gcp_dicom_store_id" render={({ field }) => (<FormItem> <FormLabel>DICOM Store ID*</FormLabel> <FormControl><Input placeholder="my-dicom-store" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem>)} />
                                </div>
                            )}
                            {/* --- STOW-RS Specific Fields --- */}
                            {watchedBackendType === 'stow_rs' && (
                                <div className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="base_url"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>DICOMweb Base URL*</FormLabel>
                                                <FormDescription>The base URL for the STOW-RS service (e.g., `https://dicom.server.com/dicom-web`).</FormDescription>
                                                <FormControl><Input type="url" placeholder="https://host/path/dicom-web" {...field} value={field.value ?? ''} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="space-y-2 rounded-md border p-4 shadow-sm">
                                        <h4 className="text-xs font-semibold text-muted-foreground mb-2">STOW-RS Authentication</h4>
                                        <FormField
                                            control={form.control}
                                            name="stow_auth_type" // Form field for STOW-RS auth type
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Authentication Type</FormLabel>
                                                    <Select
                                                        onValueChange={field.onChange}
                                                        value={field.value ?? 'none'} // Default to 'none' in UI if undefined
                                                    >
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Select auth type" /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="none">None</SelectItem>
                                                            <SelectItem value="basic">Basic Authentication</SelectItem>
                                                            <SelectItem value="bearer">Bearer Token</SelectItem>
                                                            <SelectItem value="apikey">API Key (Header)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {watchedStowAuthType === 'basic' && (
                                            <div className="space-y-4 pl-4 pt-2 border-l ml-2 mt-2">
                                                <FormField control={form.control} name="stow_basic_auth_username_secret_name" render={({ field }) => (<FormItem> <FormLabel>Username Secret Name*</FormLabel> <FormDescription>GCP Secret ID for Basic Auth username.</FormDescription> <FormControl><Input placeholder="gcp-secret-id-for-username" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem>)} />
                                                <FormField control={form.control} name="stow_basic_auth_password_secret_name" render={({ field }) => (<FormItem> <FormLabel>Password Secret Name*</FormLabel> <FormDescription>GCP Secret ID for Basic Auth password.</FormDescription> <FormControl><Input placeholder="gcp-secret-id-for-password" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem>)} />
                                            </div>
                                        )}
                                        {watchedStowAuthType === 'bearer' && (
                                            <div className="space-y-4 pl-4 pt-2 border-l ml-2 mt-2">
                                                <FormField control={form.control} name="stow_bearer_token_secret_name" render={({ field }) => (<FormItem> <FormLabel>Bearer Token Secret Name*</FormLabel> <FormDescription>GCP Secret ID for the Bearer token.</FormDescription> <FormControl><Input placeholder="gcp-secret-id-for-bearer-token" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem>)} />
                                            </div>
                                        )}
                                        {watchedStowAuthType === 'apikey' && (
                                            <div className="space-y-4 pl-4 pt-2 border-l ml-2 mt-2">
                                                <FormField control={form.control} name="stow_api_key_secret_name" render={({ field }) => (<FormItem> <FormLabel>API Key Secret Name*</FormLabel> <FormDescription>GCP Secret ID for the API key value.</FormDescription> <FormControl><Input placeholder="gcp-secret-id-for-api-key" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem>)} />
                                                <FormField control={form.control} name="stow_api_key_header_name_override" render={({ field }) => (<FormItem> <FormLabel>API Key Header Name*</FormLabel> <FormDescription>HTTP header for the API key (e.g., X-API-Key).</FormDescription> <FormControl><Input placeholder="X-API-Key" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem>)} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2 rounded-md border p-4 shadow-sm">
                                        <h4 className="text-xs font-semibold text-muted-foreground mb-2">STOW-RS TLS Configuration</h4>
                                        <FormField
                                            control={form.control}
                                            name="tls_ca_cert_secret_name" // Shared field, used by STOW-RS for its custom CA
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Custom CA Certificate Secret Name (Optional)</FormLabel>
                                                    <FormDescription>GCP Secret ID for a custom CA certificate (PEM) to verify the STOW-RS server.</FormDescription>
                                                    <FormControl><Input placeholder="gcp-secret-id-for-custom-ca" {...field} value={field.value ?? ''} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            )}
                        </div> {/* End of type-specific configuration section */}

                        <FormField
                            control={form.control}
                            name="is_enabled"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm mt-6">
                                    <FormControl><Switch id="is_enabled_switch" checked={!!field.value} onCheckedChange={field.onChange} ref={field.ref} /></FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel htmlFor="is_enabled_switch">Enable Backend</FormLabel>
                                        <FormDescription>If checked, this backend can be used in rule destinations.</FormDescription>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-4">
                            <DialogClose asChild><Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button></DialogClose>
                            <Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create Backend')}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default StorageBackendFormModal;