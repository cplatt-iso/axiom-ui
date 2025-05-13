// src/components/CrosswalkDataSourceFormModal.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
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
 //   FormControl, // Keep FormControl for Select wrapper if needed, but not direct child
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
    useFormField // Keep useFormField
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
import {
    AlertCircle,
    ClipboardCopyIcon,
    DatabaseZap,
//   Loader2
} from 'lucide-react';
import {
    Alert,
    AlertDescription,
    AlertTitle
} from "@/components/ui/alert";

import {
    CrosswalkDataSourceRead,
//    CrosswalkDataSourceCreatePayload,
    CrosswalkDataSourceUpdatePayload
} from '@/schemas';
import {
    crosswalkDataSourceFormSchema,
    CrosswalkDataSourceRawFormData
} from '@/schemas/crosswalkDataSourceSchema';
import {
    createCrosswalkDataSource,
    updateCrosswalkDataSource,
    testCrosswalkDataSourceConnection
} from '@/services/api';

interface CrosswalkDataSourceFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    dataSource: CrosswalkDataSourceRead | null;
}

// --- Initial Defaults, Placeholders, Examples remain the same ---
const initialFormDefaults: {
    name: string; description: string | null; db_type: "POSTGRES" | "MYSQL" | "MSSQL";
    connection_details: string; target_table: string; sync_interval_seconds: number; is_enabled: boolean;
} = {
    name: '', description: null, db_type: 'POSTGRES',
    connection_details: '{\n  "host": "",\n  "port": 5432,\n  "user": "",\n  "password_secret": "",\n  "dbname": ""\n}',
    target_table: '', sync_interval_seconds: 3600, is_enabled: true,
};
const dbTypePlaceholders: Record<string, number> = { POSTGRES: 5432, MYSQL: 3306, MSSQL: 1433 };
const configExamples: Record<string, Record<string, any>> = {
    POSTGRES: { host: "postgres.example.com", port: 5432, user: "reader", password_secret: "db_password", dbname: "emr_data" },
    MYSQL: { host: "mysql.example.com", port: 3306, user: "reader", password_secret: "db_password", dbname: "emr_data" },
    MSSQL: { host: "sqlserver.example.com", port: 1433, user: "reader", password_secret: "db_password", dbname: "EMR_Data", odbc_driver: "ODBC Driver 17 for SQL Server" },
};

// --- Custom Form Components remain the same ---
const FormInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => {
    const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
    return (
        <Input
            ref={ref}
            id={formItemId}
            aria-describedby={!error ? `${formDescriptionId}` : `${formDescriptionId} ${formMessageId}`}
            aria-invalid={!!error}
            {...props}
        />
    );
});
FormInput.displayName = "FormInput";

const FormTextarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>((props, ref) => {
    const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
    return (
        <Textarea
            ref={ref}
            id={formItemId}
            aria-describedby={!error ? `${formDescriptionId}` : `${formDescriptionId} ${formMessageId}`}
            aria-invalid={!!error}
            {...props}
        />
    );
});
FormTextarea.displayName = "FormTextarea";


const CrosswalkDataSourceFormModal: React.FC<CrosswalkDataSourceFormModalProps> = ({ isOpen, onClose, dataSource }) => {
    const queryClient = useQueryClient();
    const isEditMode = !!dataSource;
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [isTesting, setIsTesting] = useState(false);
    const [copiedTimeout, setCopiedTimeout] = useState<NodeJS.Timeout | null>(null);
    const [showCopied, setShowCopied] = useState(false);

    const form = useForm<CrosswalkDataSourceRawFormData>({
        resolver: zodResolver(crosswalkDataSourceFormSchema),
        defaultValues: {
             ...initialFormDefaults,
             connection_details: json5.stringify({ host: "", port: dbTypePlaceholders['POSTGRES'], user: "", password_secret: "", dbname: "" }, null, 2),
        },
        mode: 'onBlur',
    });

    const watchedDbType = form.watch('db_type');

    // --- useEffect Hooks remain the same ---
    useEffect(() => {
        if (isOpen) {
            setTestResult(null);
            let resetValues;
            if (dataSource) {
                resetValues = {
                    name: dataSource.name,
                    description: dataSource.description ?? null,
                    db_type: dataSource.db_type,
                    connection_details: dataSource.connection_details ? json5.stringify(dataSource.connection_details, null, 2) : '{}',
                    target_table: dataSource.target_table,
                    sync_interval_seconds: dataSource.sync_interval_seconds ?? 3600,
                    is_enabled: dataSource.is_enabled ?? true,
                };
            } else {
                const defaultPort = dbTypePlaceholders[initialFormDefaults.db_type] ?? 5432;
                resetValues = {
                    ...initialFormDefaults,
                    connection_details: json5.stringify({ host: "", port: defaultPort, user: "", password_secret: "", dbname: "" }, null, 2)
                };
            }
            form.reset(resetValues);
            form.clearErrors();
        }
    }, [isOpen, dataSource, form]);

    useEffect(() => {
        if (isOpen && !isEditMode) {
            const currentConfigStr = form.getValues('connection_details');
            let newConfigStr = '';
            try {
                const currentConfig = json5.parse(currentConfigStr || '{}');
                currentConfig.port = dbTypePlaceholders[watchedDbType] ?? 5432;
                newConfigStr = json5.stringify(currentConfig, null, 2);
            } catch {
                newConfigStr = json5.stringify({ host: "", port: dbTypePlaceholders[watchedDbType] ?? 5432, user: "", password_secret: "", dbname: "" }, null, 2);
            }
            form.setValue('connection_details', newConfigStr, { shouldValidate: false, shouldDirty: false });
        }
    }, [watchedDbType, isOpen, isEditMode, form]);

    useEffect(() => {
        return () => {
            if (copiedTimeout) {
                clearTimeout(copiedTimeout);
            }
        };
    }, [copiedTimeout]);

    // --- Callbacks and Mutations (Expanded definitions) ---
    const handleMutationSuccess = useCallback((data: CrosswalkDataSourceRead) => {
        toast.success(`Data Source "${data.name}" ${isEditMode ? 'updated' : 'created'} successfully.`);
        queryClient.invalidateQueries({ queryKey: ['crosswalkDataSources'] });
        if (isEditMode) {
            queryClient.invalidateQueries({ queryKey: ['crosswalkDataSource', data.id] });
        }
        onClose();
    }, [isEditMode, queryClient, onClose]);

    const handleMutationError = useCallback((error: any, variables: any) => {
        const action = isEditMode ? 'update' : 'creation';
        const id = isEditMode ? variables.id : '';
        let specificError = `Failed to ${action} data source.`;

        if (error?.response?.data?.detail) {
            const detail = error.response.data.detail;
            if (Array.isArray(detail) && detail[0]?.loc && detail[0]?.msg) {
                const field = detail[0].loc[1] || 'input';
                specificError = `Validation Error on field '${field}': ${detail[0].msg}`;
            } else if (typeof detail === 'string') {
                specificError = detail;
            } else {
                specificError = json5.stringify(detail);
            }
        } else if (error?.message) {
            specificError = error.message;
        }

        toast.error(`Source ${action} failed${id ? ` for ID ${id}` : ''}: ${specificError}`);
        console.error(`Source ${action} error details${id ? ` for ID ${id}` : ''}:`, error?.response?.data?.detail || error);
    }, [isEditMode]);

    const createMutation = useMutation({
        mutationFn: createCrosswalkDataSource,
        onSuccess: handleMutationSuccess,
        onError: handleMutationError,
    });

    const updateMutation = useMutation({
        mutationFn: (payload: { id: number, data: CrosswalkDataSourceUpdatePayload }) => updateCrosswalkDataSource(payload.id, payload.data),
        onSuccess: handleMutationSuccess,
        onError: handleMutationError,
    });

    const handleTestConnection = useCallback(async () => {
        if (!isEditMode || !dataSource) {
            toast.info("Please save the data source configuration before testing the connection.");
            return;
        }
        setIsTesting(true);
        setTestResult(null);
        try {
            const result = await testCrosswalkDataSourceConnection(dataSource.id);
            setTestResult(result);
            if(result.success) {
                toast.success("Connection Test Successful!");
            } else {
                toast.error("Connection Test Failed", { description: result.message });
            }
        } catch (error: any) {
            const message = error.message || "An unknown error occurred during connection test.";
            setTestResult({ success: false, message });
            toast.error("Connection Test Error", { description: message });
        } finally {
            setIsTesting(false);
        }
    }, [isEditMode, dataSource]);

    const onSubmit: SubmitHandler<CrosswalkDataSourceRawFormData> = useCallback((rawValues) => {
        try {
            const parsed = crosswalkDataSourceFormSchema.parse(rawValues);

            const payload = {
                ...parsed,
                description: parsed.description?.trim() || null,
            };

            console.log("Submitting Data Source Values (API Payload):", payload);

            if (isEditMode && dataSource) {
                updateMutation.mutate({ id: dataSource.id, data: payload });
            } else {
                createMutation.mutate(payload);
            }
        } catch (error: any) {
            console.error("Validation failed:", error);
            toast.error("Invalid input", {
                description: error.message || "Please check the form inputs.",
            });
        }
}, [isEditMode, dataSource, createMutation, updateMutation]);


     const handleCopyExample = useCallback(() => {
         const exampleJson = json5.stringify(configExamples[watchedDbType] || {}, null, 2);
         navigator.clipboard.writeText(exampleJson).then(() => {
             setShowCopied(true);
             if (copiedTimeout) { clearTimeout(copiedTimeout); }
             const timeoutId = setTimeout(() => setShowCopied(false), 1500);
             setCopiedTimeout(timeoutId);
             toast.success(`Default JSON for '${watchedDbType}' copied!`);
         }).catch(err => {
             toast.error('Failed to copy JSON to clipboard.');
             console.error('Clipboard copy failed:', err);
         });
     }, [watchedDbType, copiedTimeout]);

    const isLoading = createMutation.isPending || updateMutation.isPending;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[650px]">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit Crosswalk Data Source' : 'Add Crosswalk Data Source'}</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? `Modify the configuration for "${dataSource?.name}".` : 'Configure a new external database for crosswalking.'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">

                        {/* Name field using custom FormInput */}
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name*</FormLabel>
                                    <FormInput
                                        placeholder="e.g., Hospital MRN Lookup"
                                        {...field}
                                    />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* === Modified DB Type Select === */}
                        <FormField
                            control={form.control}
                            name="db_type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Database Type*</FormLabel>
                                    {/* Select component itself, not wrapped by FormControl */}
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        disabled={isLoading} // Apply disabled state
                                    >
                                        {/* Trigger uses useFormField implicitly via FormItem context? Maybe not. */}
                                        {/* Let's try adding necessary props manually */}
                                        <SelectTrigger
                                            id={useFormField().formItemId} // Get ID from context
                                            aria-invalid={!!useFormField().error}
                                            aria-describedby={useFormField().formDescriptionId}
                                        >
                                            <SelectValue placeholder="Select DB type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="POSTGRES">PostgreSQL</SelectItem>
                                            <SelectItem value="MYSQL">MySQL</SelectItem>
                                            <SelectItem value="MSSQL">SQL Server</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         {/* === End Modified DB Type Select === */}

                        {/* Description using custom FormTextarea */}
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormTextarea
                                        placeholder="Optional: Purpose of this data source"
                                        {...field}
                                        value={field.value ?? ''}
                                        rows={2}
                                    />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Connection Details using custom FormTextarea */}
                        <FormField
                            control={form.control}
                            name="connection_details"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Connection Details (JSON)*</FormLabel>
                                    <FormDescription>
                                        Provide connection parameters as a JSON object. Use "password_secret" for the password.
                                        {watchedDbType === 'MSSQL' && " You may need to add an 'odbc_driver' key if the default isn't correct."}
                                    </FormDescription>
                                    <div className="relative">
                                        <FormTextarea
                                            placeholder={`{\n  "host": "db.example.com",\n  "port": ${dbTypePlaceholders[watchedDbType] ?? 5432},\n  "user": "readonly_user",\n  "password_secret": "your_password",\n  "dbname": "crosswalk_db"\n}`}
                                            className="font-mono text-xs min-h-[120px] resize-y"
                                            spellCheck="false"
                                            {...field}
                                            value={field.value ?? ''}
                                            rows={6}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute top-1 right-1 h-6 px-2 text-xs"
                                            onClick={handleCopyExample}
                                            title={`Copy default JSON for ${watchedDbType}`}
                                        >
                                            <ClipboardCopyIcon className="h-3 w-3 mr-1" />
                                            {showCopied ? 'Copied!' : 'Copy Example'}
                                        </Button>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                         {/* Target Table using custom FormInput */}
                        <FormField
                            control={form.control}
                            name="target_table"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Target Table/View*</FormLabel>
                                    <FormDescription>Exact name of the table or view containing the data.</FormDescription>
                                    <FormInput
                                        placeholder="e.g., patient_identifiers or vw_dicom_mapping"
                                        {...field}
                                    />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                         {/* Sync Interval using custom FormInput */}
                        <FormField
                            control={form.control}
                            name="sync_interval_seconds"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sync Interval (seconds)*</FormLabel>
                                    <FormDescription>How often to refresh the cache from the source database.</FormDescription>
                                    <FormInput
                                        type="number"
                                        min="60"
                                        step="60"
                                        {...field}
                                        onChange={e => field.onChange(parseInt(e.target.value, 10) || 60)}
                                    />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Test Connection Section */}
                        {isEditMode && (
                            <div className="space-y-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleTestConnection}
                                    disabled={isLoading || isTesting}
                                >
                                    <DatabaseZap className={`mr-2 h-4 w-4 ${isTesting ? 'animate-spin' : ''}`} />
                                    {isTesting ? 'Testing...' : 'Test Connection'}
                                </Button>
                                {testResult && (
                                    <Alert variant={testResult.success ? "default" : "destructive"} className={testResult.success ? "bg-green-50 border-green-300 dark:bg-green-900/30 dark:border-green-700" : ""}>
                                        <AlertCircle className={`h-4 w-4 ${testResult.success ? 'text-green-600 dark:text-green-400' : ''}`} />
                                        <AlertTitle className={`text-sm ${testResult.success ? 'text-green-700 dark:text-green-300' : ''}`}>Connection Test</AlertTitle>
                                        <AlertDescription className={`text-xs ${testResult.success ? 'text-green-600 dark:text-green-400' : ''}`}>{testResult.message}</AlertDescription>
                                    </Alert>
                                )}
                            </div>
                        )}

                        {/* is_enabled Checkbox - Manual Structure */}
                        <FormField
                            control={form.control}
                            name="is_enabled"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                                    {/* Direct Checkbox rendering */}
                                    <Checkbox
                                        id="ds_is_enabled"
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        aria-describedby="ds_is_enabled-description"
                                        disabled={isLoading}
                                    />
                                    <div className="space-y-1 leading-none">
                                        <FormLabel htmlFor="ds_is_enabled" className="cursor-pointer">
                                            Enable Syncing
                                        </FormLabel>
                                        <FormDescription id="ds_is_enabled-description">
                                            If checked, the system will periodically sync data from this source.
                                        </FormDescription>
                                    </div>
                                    <FormMessage /> {/* RHF Message will be associated */}
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-4">
                             <DialogClose>
                                 <Button
                                     type="button"
                                     variant="outline"
                                     onClick={onClose}
                                     disabled={isLoading}
                                 >
                                     Cancel
                                 </Button>
                             </DialogClose>
                             <Button
                                 type="submit"
                                 disabled={isLoading || isTesting}
                             >
                                {isLoading ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create Data Source')}
                             </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default CrosswalkDataSourceFormModal;
