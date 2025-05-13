// frontend/src/components/CrosswalkMappingFormModal.tsx
import { useEffect } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import json5 from 'json5';

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast as sonnerToast } from "sonner"; // Assuming you use shadcn toast

import {
    crosswalkMapFormSchema,
    CrosswalkMapFormData, // OUTPUT type (post-transform)
    CrosswalkMapRawFormData // INPUT type (pre-transform for defaultValues)
} from '@/schemas/crosswalkMappingSchema';
import { CrosswalkMapRead } from '@/schemas/crosswalkMappingSchema'; // For existingMap prop
import { CrosswalkDataSourceRead } from '@/schemas/crosswalkDataSourceSchema'; // For data sources prop

// Helper to get default raw form data (JSON strings)
const getDefaultCrosswalkMapRawFormData = (): CrosswalkMapRawFormData => ({
    name: "",
    description: null,
    data_source_id: 0, // Or handle undefined if 0 is a valid ID
    is_enabled: true,
    match_columns: "[]",
    cache_key_columns: "[]",
    replacement_mapping: "[]",
    cache_ttl_seconds: null, // Or a default like 3600
    on_cache_miss: "fail",
});


interface CrosswalkMappingFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmitSuccess: (data: CrosswalkMapRead) => void; // Callback on successful API call
    existingMap?: CrosswalkMapRead | null;
    dataSources: CrosswalkDataSourceRead[]; // For the select dropdown
    // Assuming you have API functions for create/update
    createApiFn: (data: CrosswalkMapFormData) => Promise<CrosswalkMapRead>;
    updateApiFn: (id: number, data: Partial<CrosswalkMapFormData>) => Promise<CrosswalkMapRead>;
}

export function CrosswalkMappingFormModal({
    isOpen,
    onClose,
    onSubmitSuccess,
    existingMap,
    dataSources,
    createApiFn,
    updateApiFn,
}: CrosswalkMappingFormModalProps) {
    const form = useForm<CrosswalkMapRawFormData>({ // TFieldValues is the OUTPUT/TRANSFORMED type
        resolver: zodResolver(crosswalkMapFormSchema),
        defaultValues: existingMap
            ? { // Map from CrosswalkMapRead (which has objects/arrays) to CrosswalkMapRawFormData (JSON strings)
                name: existingMap.name,
                description: existingMap.description,
                data_source_id: existingMap.data_source_id,
                is_enabled: existingMap.is_enabled,
                match_columns: json5.stringify(existingMap.match_columns || [], null, 2),
                cache_key_columns: json5.stringify(existingMap.cache_key_columns || [], null, 2),
                replacement_mapping: json5.stringify(existingMap.replacement_mapping || [], null, 2),
                cache_ttl_seconds: existingMap.cache_ttl_seconds ?? null,
                on_cache_miss: existingMap.on_cache_miss,
              }
            : getDefaultCrosswalkMapRawFormData(),
        mode: "onChange", // Or "onBlur"
    });

    useEffect(() => {
        if (isOpen) {
            form.reset(
                existingMap
                    ? {
                        name: existingMap.name,
                        description: existingMap.description,
                        data_source_id: existingMap.data_source_id,
                        is_enabled: existingMap.is_enabled,
                        match_columns: json5.stringify(existingMap.match_columns || [], null, 2),
                        cache_key_columns: json5.stringify(existingMap.cache_key_columns || [], null, 2),
                        replacement_mapping: json5.stringify(existingMap.replacement_mapping || [], null, 2),
                        cache_ttl_seconds: existingMap.cache_ttl_seconds ?? null,
                        on_cache_miss: existingMap.on_cache_miss,
                      }
                    : getDefaultCrosswalkMapRawFormData()
            );
        }
    }, [isOpen, existingMap, form]);

    const onSubmit: SubmitHandler<CrosswalkMapRawFormData> = async (rawData) => {
        try {
            const parsedData = crosswalkMapFormSchema.parse(rawData);

            let result: CrosswalkMapRead;
            if (existingMap && existingMap.id) {
                result = await updateApiFn(existingMap.id, parsedData);
                sonnerToast.success("Success", { description: "Crosswalk map updated." });
            } else {
                result = await createApiFn(parsedData);
                sonnerToast("Success", { description: "Crosswalk map created." });
            }

            onSubmitSuccess(result);
            onClose();
        } catch (error: any) {
            console.error("Failed to save crosswalk map:", error);
            sonnerToast.error("Error", {
                description: error.message || "Failed to save crosswalk map.",
            });
        }
    };

    const isLoading = form.formState.isSubmitting;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{existingMap ? 'Edit' : 'Create'} Crosswalk Map</DialogTitle>
                    <DialogDescription>
                        Configure the details for the crosswalk mapping.
                        JSON fields expect valid JSON arrays.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
                    {/* Name */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Controller
                            name="name"
                            control={form.control}
                            render={({ field }) => <Input id="name" {...field} className="col-span-3" />}
                        />
                        {form.formState.errors.name && <p className="col-span-4 text-red-500 text-sm">{form.formState.errors.name.message}</p>}
                    </div>

                    {/* Description */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">Description</Label>
                        <Controller
                            name="description"
                            control={form.control}
                            render={({ field }) => <Textarea id="description" {...field} value={field.value ?? ''} className="col-span-3" />}
                        />
                    </div>

                    {/* Data Source ID */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="data_source_id" className="text-right">Data Source</Label>
                        <Controller
                            name="data_source_id"
                            control={form.control}
                            render={({ field }) => (
                                <Select
                                    onValueChange={(value) => field.onChange(Number(value))}
                                    value={String(field.value || 0)}
                                    disabled={isLoading || dataSources.length === 0}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select a data source" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {dataSources.map(ds => (
                                            <SelectItem key={ds.id} value={String(ds.id)}>
                                                {ds.name} (ID: {ds.id})
                                            </SelectItem>
                                        ))}
                                        {dataSources.length === 0 && <SelectItem value="0" disabled>No data sources available</SelectItem>}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {form.formState.errors.data_source_id && <p className="col-span-4 text-red-500 text-sm">{form.formState.errors.data_source_id.message}</p>}
                    </div>

                    {/* Match Columns (JSON String Textarea) */}
                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label htmlFor="match_columns" className="text-right pt-2">Match Columns (JSON)</Label>
                        <Controller
                            name="match_columns"
                            control={form.control}
                            render={({ field }) => <Textarea id="match_columns" {...field} className="col-span-3 min-h-[100px] font-mono" placeholder='[{"column_name": "mrn", "dicom_tag": "0010,0020"}]' />}
                        />
                        {form.formState.errors.match_columns && <p className="col-span-4 text-red-500 text-sm">{form.formState.errors.match_columns.message}</p>}
                    </div>

                    {/* Cache Key Columns (JSON String Textarea) */}
                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label htmlFor="cache_key_columns" className="text-right pt-2">Cache Key Columns (JSON)</Label>
                        <Controller
                            name="cache_key_columns"
                            control={form.control}
                            render={({ field }) => <Textarea id="cache_key_columns" {...field} className="col-span-3 min-h-[60px] font-mono" placeholder='["mrn", "accession_number"]'/>}
                        />
                        {form.formState.errors.cache_key_columns && <p className="col-span-4 text-red-500 text-sm">{form.formState.errors.cache_key_columns.message}</p>}
                    </div>

                    {/* Replacement Mapping (JSON String Textarea) */}
                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label htmlFor="replacement_mapping" className="text-right pt-2">Replacement Mapping (JSON)</Label>
                        <Controller
                            name="replacement_mapping"
                            control={form.control}
                            render={({ field }) => <Textarea id="replacement_mapping" {...field} className="col-span-3 min-h-[100px] font-mono" placeholder='[{"source_column": "new_mrn", "dicom_tag": "0010,0020", "dicom_vr": "LO"}]'/>}
                        />
                        {form.formState.errors.replacement_mapping && <p className="col-span-4 text-red-500 text-sm">{form.formState.errors.replacement_mapping.message}</p>}
                    </div>

                    {/* Cache TTL Seconds */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="cache_ttl_seconds" className="text-right">Cache TTL (secs)</Label>
                        <Controller
                            name="cache_ttl_seconds"
                            control={form.control}
                            render={({ field }) => (
                                <Input
                                    id="cache_ttl_seconds"
                                    type="number"
                                    {...field}
                                    value={field.value === null || field.value === undefined ? '' : field.value}
                                    onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                                    className="col-span-3"
                                    placeholder="e.g., 3600 (0 for no cache, empty for indefinite/system default)"
                                />
                            )}
                        />
                        {form.formState.errors.cache_ttl_seconds && <p className="col-span-4 text-red-500 text-sm">{form.formState.errors.cache_ttl_seconds.message}</p>}
                    </div>

                    {/* On Cache Miss */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="on_cache_miss" className="text-right">On Cache Miss</Label>
                        <Controller
                            name="on_cache_miss"
                            control={form.control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select behavior" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="fail">Fail</SelectItem>
                                        <SelectItem value="query_db">Query Database</SelectItem>
                                        <SelectItem value="log_only">Log Only</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                         {form.formState.errors.on_cache_miss && <p className="col-span-4 text-red-500 text-sm">{form.formState.errors.on_cache_miss.message}</p>}
                    </div>

                    {/* Is Enabled */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="is_enabled" className="text-right">Enabled</Label>
                        <Controller
                            name="is_enabled"
                            control={form.control}
                            render={({ field }) => <Switch id="is_enabled" checked={field.value} onCheckedChange={field.onChange} className="col-span-3 justify-self-start" />}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
                        <Button type="submit" disabled={isLoading || !form.formState.isValid}>
                            {isLoading ? (existingMap ? "Saving..." : "Creating...") : (existingMap ? 'Save Changes' : 'Create Map')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}