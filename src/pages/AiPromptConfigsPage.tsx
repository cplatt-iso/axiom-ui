// frontend/src/pages/AiPromptConfigsPage.tsx
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
    // Row, // Not directly used
} from '@tanstack/react-table';
import { PlusCircle, MoreHorizontal, Edit, Trash2, AlertTriangle, TestTubeDiagonal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DicomTagCombobox } from '@/components/DicomTagCombobox';
import { DicomTagInfo } from '@/dicom/dictionary';
import apiClient, { // Default import if apiClient is default export
    getAiPromptConfigs,
    createAiPromptConfig,
    updateAiPromptConfig,
    deleteAiPromptConfig,
    AiPromptConfigRead,
    AiPromptConfigCreatePayload,
    AiPromptConfigUpdatePayload,
} from '@/services/api'; // Assuming these are correctly exported from api.ts
import {
    AiPromptConfigCreateFormDataSchema,
    AiPromptConfigCreateFormData,
    AiPromptConfigUpdateFormDataSchema,
    AiPromptConfigUpdateFormData,
    // modelParametersStringSchema, // Not directly used here, transformation is manual
} from '@/schemas/aiPromptConfigSchema'; // Your Zod schemas
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner'; // Assuming you use Sonner for toasts
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const QUERY_KEY_PROMPTS = 'aiPromptConfigs'; // More specific query key
const QUERY_KEY_VERTEX_MODELS = 'availableVertexModels';

interface VertexAiModel {
    id: string;
    display_name: string;
    description?: string;
}

type AiPromptConfigFormData = AiPromptConfigCreateFormData | AiPromptConfigUpdateFormData;


const AiPromptConfigsPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [selectedConfigForEditingOrDeleting, setSelectedConfigForEditingOrDeleting] = useState<AiPromptConfigRead | null>(null);

    const { data: promptConfigs = [], isLoading, isError, error } = useQuery<AiPromptConfigRead[], Error>({
        queryKey: [QUERY_KEY_PROMPTS],
        queryFn: () => getAiPromptConfigs(0, 200, true),
    });

    const { data: availableVertexModels = [], isLoading: isLoadingVertexModels } = useQuery<VertexAiModel[], Error>({
        queryKey: [QUERY_KEY_VERTEX_MODELS],
        queryFn: () => apiClient<VertexAiModel[]>('/config/ai-prompts/available-models/vertex-ai'), // Corrected URL
        staleTime: 1000 * 60 * 60, // Cache for 1 hour
    });

    const formMethods = useForm<AiPromptConfigFormData>({
        resolver: zodResolver(selectedConfigForEditingOrDeleting ? AiPromptConfigUpdateFormDataSchema : AiPromptConfigCreateFormDataSchema),
        defaultValues: {
            name: '',
            description: '',
            is_enabled: true,
            dicom_tag_keyword: '',
            prompt_template: '',
            model_identifier: 'gemini-1.5-flash-001',
            model_parameters: '',
        },
    });
    const { handleSubmit, control, reset, setError: setFormError, formState: { errors, isSubmitting } } = formMethods;

    const handleMutationSuccess = () => {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY_PROMPTS] });
        setIsFormModalOpen(false);
        reset();
        setSelectedConfigForEditingOrDeleting(null);
    };

    const handleMutationError = (err: Error) => {
        toast.error(`Operation failed: ${err.message || 'Unknown error'}`);
    };

    const createMutation = useMutation({
        mutationFn: createAiPromptConfig,
        onSuccess: (_data, _variables, _context) => {
            handleMutationSuccess();
            toast.success('AI Prompt Configuration created successfully!');
        },
        onError: handleMutationError,
    });

    const updateMutation = useMutation({
        mutationFn: (data: { id: number; payload: AiPromptConfigUpdatePayload }) =>
            updateAiPromptConfig(data.id, data.payload),
        onSuccess: (_data, _variables, _context) => {
            handleMutationSuccess();
            toast.success('AI Prompt Configuration updated successfully!');
        },
        onError: handleMutationError,
    });

    const deleteMutation = useMutation({
        mutationFn: deleteAiPromptConfig,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY_PROMPTS] });
            setIsDeleteConfirmOpen(false);
            setSelectedConfigForEditingOrDeleting(null);
            toast.success('AI Prompt Configuration deleted successfully!');
        },
        onError: (err: Error) => {
            toast.error(`Deletion failed: ${err.message || 'Unknown error'}`);
            setIsDeleteConfirmOpen(false);
        },
    });

    const handleOpenCreateModal = () => {
        setSelectedConfigForEditingOrDeleting(null);
        reset({
            name: '',
            description: '',
            is_enabled: true,
            dicom_tag_keyword: '',
            prompt_template: '',
            model_identifier: 'gemini-1.5-flash-001',
            model_parameters: '',
        });
        formMethods.clearErrors();
        setIsFormModalOpen(true);
    };

    const handleOpenEditModal = (config: AiPromptConfigRead) => {
        setSelectedConfigForEditingOrDeleting(config);
        reset({
            name: config.name,
            description: config.description || '',
            is_enabled: config.is_enabled,
            dicom_tag_keyword: config.dicom_tag_keyword,
            prompt_template: config.prompt_template,
            model_identifier: config.model_identifier,
            model_parameters: config.model_parameters ? JSON.stringify(config.model_parameters, null, 2) : '',
        });
        formMethods.clearErrors();
        setIsFormModalOpen(true);
    };

    const handleOpenDeleteConfirm = (config: AiPromptConfigRead) => {
        setSelectedConfigForEditingOrDeleting(config);
        setIsDeleteConfirmOpen(true);
    };



    const onSubmit: SubmitHandler<AiPromptConfigFormData> = (formData) => {
        let parsedModelParameters: Record<string, any> | null = null;

        if (typeof formData.model_parameters === 'string') {
            const txt = formData.model_parameters.trim();
            if (txt !== '') {
                try {
                    parsedModelParameters = JSON.parse(txt);
                } catch {
                    setFormError('model_parameters', {
                        type: 'manual',
                        message: 'Invalid JSON format.',
                    });
                    return;
                }
            }
        } else if (
            typeof formData.model_parameters === 'object' &&
            formData.model_parameters !== null
        ) {
            // We’re editing an existing row – it’s already an object
            parsedModelParameters = formData.model_parameters;
        }

        const payload = {
            ...formData,
            model_parameters: parsedModelParameters,
        };

        if (selectedConfigForEditingOrDeleting && selectedConfigForEditingOrDeleting.id) {
            updateMutation.mutate({ id: selectedConfigForEditingOrDeleting.id, payload: payload as AiPromptConfigUpdatePayload });
        } else {
            createMutation.mutate(payload as AiPromptConfigCreatePayload);
        }
    };

    const columns = useMemo<ColumnDef<AiPromptConfigRead>[]>(
        () => [
            { accessorKey: 'name', header: 'Name', cell: info => <span title={String(info.getValue())}>{String(info.getValue())}</span> },
            { accessorKey: 'dicom_tag_keyword', header: 'Target DICOM Tag', cell: info => info.getValue() },
            { accessorKey: 'model_identifier', header: 'Model ID', cell: info => info.getValue() },
            {
                accessorKey: 'is_enabled',
                header: 'Enabled',
                cell: ({ row }) => (
                    <Badge variant={row.original.is_enabled ? 'default' : 'outline'}
                        className={row.original.is_enabled ? 'bg-green-500 hover:bg-green-600 text-white dark:text-black' : 'border-gray-500 text-gray-500'}
                    >
                        {row.original.is_enabled ? 'Yes' : 'No'}
                    </Badge>
                ),
            },
            {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEditModal(row.original)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toast.info("Test feature coming soon!", { description: `For: ${row.original.name}` })} className="text-blue-600 hover:!text-blue-700 disabled:opacity-50" disabled>
                                <TestTubeDiagonal className="mr-2 h-4 w-4" /> Test (TODO)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenDeleteConfirm(row.original)} className="text-red-600 hover:!text-red-700">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ),
            },
        ],
        // Removed reset from deps, handleOpenEditModal and handleOpenDeleteConfirm are stable if defined outside or useCallback
        // Add deps if these functions are redefined on every render and cause issues.
        // For now, assuming they are stable enough.
        [] // Or add specific dependencies like `handleOpenEditModal`, `handleOpenDeleteConfirm` if they are memoized
    );

    const table = useReactTable({
        data: promptConfigs,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: {
            pagination: {
                pageSize: 10,
            },
        },
    });

    if (isLoading) return <div className="p-4">Loading AI Prompt Configurations...</div>;
    if (isError) return <div className="p-4 text-red-600">Error loading configurations: {error?.message}</div>;
    // const [selectedDicomTag, setSelectedDicomTag] = useState<DicomTagInfo | null>(null); // This state is no longer needed
    
    return (
        <div className="container mx-auto py-6 px-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold">AI Prompt Configurations</h1>
                <Button onClick={handleOpenCreateModal}>
                    <PlusCircle className="mr-2 h-5 w-5" /> Create New Configuration
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id} className="whitespace-nowrap">
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && 'selected'}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="py-2 px-3">
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    No AI Prompt Configurations found. Create one to get started.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                >
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                >
                    Next
                </Button>
            </div>

            <Dialog open={isFormModalOpen} onOpenChange={(isOpen) => {
                setIsFormModalOpen(isOpen);
                if (!isOpen) {
                    reset();
                    setSelectedConfigForEditingOrDeleting(null);
                }
            }}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>{selectedConfigForEditingOrDeleting ? 'Edit' : 'Create'} AI Prompt Configuration</DialogTitle>
                        <DialogDescription>
                            Define a prompt, target DICOM tag, model, and parameters for AI standardization.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
                        <div>
                            <Label htmlFor="name">Name</Label>
                            <Controller
                                name="name"
                                control={control}
                                render={({ field }) => <Input id="name" {...field} placeholder="e.g., Standardize BodyPartExamined (General)" />}
                            />
                            {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
                        </div>
                        <div>
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Controller
                                name="description"
                                control={control}
                                render={({ field }) => <Textarea id="description" {...field} value={field.value ?? ''} placeholder="Briefly explain what this configuration does." />}
                            />
                            {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>}
                        </div>
                        <div className="flex items-center space-x-2 pt-1">
                            <Controller
                                name="is_enabled"
                                control={control}
                                render={({ field }) => (
                                    <Switch
                                        id="is_enabled"
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                )}
                            />
                            <Label htmlFor="is_enabled" className="cursor-pointer">Enabled</Label>
                            {errors.is_enabled && <p className="text-sm text-red-500 mt-1">{errors.is_enabled.message}</p>}
                        </div>
                        <div>
                            <Label htmlFor="dicom_tag_keyword_prompt">Target DICOM Tag Keyword</Label>
                            <Controller
                                name="dicom_tag_keyword"
                                control={control}
                                render={({ field }) => ( // field.value is string
                                    <DicomTagCombobox
                                        inputId="dicom_tag_keyword_prompt"
                                        value={field.value} // Pass the string keyword from RHF
                                        onChange={(tag: DicomTagInfo | null) => { // DicomTagCombobox provides DicomTagInfo object
                                            field.onChange(tag ? tag.keyword : ''); // Update RHF with the keyword string
                                        }}
                                    />
                                )}
                            />
                            {errors.dicom_tag_keyword && <p className="text-sm text-red-500 mt-1">{errors.dicom_tag_keyword.message}</p>}
                        </div>
                        <div>
                            <Label htmlFor="prompt_template">Prompt Template</Label>
                            <Controller
                                name="prompt_template"
                                control={control}
                                render={({ field }) => <Textarea id="prompt_template" {...field} rows={5} placeholder="Example: Standardize the DICOM value '{value}' for the tag {dicom_tag_keyword} to a common medical term. Respond ONLY with the standardized term." />}
                            />
                            <p className="text-xs text-gray-500 mt-1">Must include <code>{'{value}'}</code>. Can also use <code>{'{dicom_tag_keyword}'}</code>.</p>
                            {errors.prompt_template && <p className="text-sm text-red-500 mt-1">{errors.prompt_template.message}</p>}
                        </div>
                        <div>
                            <Label htmlFor="model_identifier">Model Identifier</Label>
                            <Controller
                                name="model_identifier"
                                control={control}
                                render={({ field }) => (
                                    <Select
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        disabled={isLoadingVertexModels}
                                    >
                                        <SelectTrigger id="model_identifier" className={errors.model_identifier ? "border-red-500" : ""}>
                                            <SelectValue placeholder="Select a Vertex AI model..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {isLoadingVertexModels ? (
                                                <div className="p-2 text-sm">Loading models...</div>
                                            ) : availableVertexModels.length === 0 ? (
                                                <SelectItem value="gemini-1.5-flash-001" disabled>
                                                    (gemini-1.5-flash-001) - No models loaded from API
                                                </SelectItem>
                                            ) : (
                                                availableVertexModels.map(model => (
                                                    <SelectItem key={model.id} value={model.id} title={model.description}>
                                                        {model.display_name} ({model.id})
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {errors.model_identifier && <p className="text-sm text-red-500 mt-1">{errors.model_identifier.message}</p>}
                        </div>
                        <div>
                            <Label htmlFor="model_parameters">Model Parameters (JSON string)</Label>
                            <Controller
                                name="model_parameters"
                                control={control}
                                render={({ field }) => <Textarea id="model_parameters" {...field} value={field.value ?? ''} rows={3} placeholder='Example: {"temperature": 0.2, "max_output_tokens": 50}' />}
                            />
                            {errors.model_parameters && typeof errors.model_parameters.message === 'string' && (
                                <p className="text-sm text-red-500 mt-1" id="model_parameters-error">
                                    {errors.model_parameters.message}
                                </p>
                            )}
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => {
                                setIsFormModalOpen(false);
                                reset(); // Ensure form is reset on explicit cancel
                                setSelectedConfigForEditingOrDeleting(null);
                            }}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}>
                                {isSubmitting || createMutation.isPending || updateMutation.isPending ? 'Saving...' : (selectedConfigForEditingOrDeleting ? 'Save Changes' : 'Create Configuration')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            <div className="flex items-center">
                                <AlertTriangle className="text-red-500 mr-2 h-6 w-6" /> Are you absolutely sure?
                            </div>
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the AI Prompt Configuration
                            named "<strong>{selectedConfigForEditingOrDeleting?.name}</strong>".
                            Any rules referencing this configuration by ID will need to be updated.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (selectedConfigForEditingOrDeleting?.id) {
                                    deleteMutation.mutate(selectedConfigForEditingOrDeleting.id);
                                }
                            }}
                            disabled={deleteMutation.isPending}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deleteMutation.isPending ? 'Deleting...' : 'Yes, delete it'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default AiPromptConfigsPage;