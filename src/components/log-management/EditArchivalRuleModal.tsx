import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { LogArchivalRule } from '@/schemas/logManagementSchema';

interface EditArchivalRuleModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    rule: LogArchivalRule;
}

interface ArchivalRuleForm {
    name: string;
    description?: string;
    service_pattern: string;
    age_threshold_days: number;
    storage_backend: string;
    storage_bucket: string;
    storage_path_prefix: string;
    compression: string;
    format_type: string;
    retention_days: number;
    delete_after_archive: boolean;
    is_active: boolean;
    cron_schedule: string;
}

export function EditArchivalRuleModal({ open, onOpenChange, rule }: EditArchivalRuleModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<ArchivalRuleForm>({
        defaultValues: {
            name: rule.name,
            description: rule.description || '',
            service_pattern: rule.service_pattern,
            age_threshold_days: rule.age_threshold_days,
            storage_backend: rule.storage_backend,
            storage_bucket: rule.storage_bucket,
            storage_path_prefix: rule.storage_path_prefix,
            compression: rule.compression,
            format_type: rule.format_type,
            retention_days: rule.retention_days,
            delete_after_archive: rule.delete_after_archive,
            is_active: rule.is_active,
            cron_schedule: rule.cron_schedule,
        },
    });

    const onSubmit = async (_data: ArchivalRuleForm) => {
        setIsSubmitting(true);
        try {
            // Mock API call - replace with actual implementation
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            toast.success('Archival rule updated successfully');
            onOpenChange(false);
        } catch (error) {
            toast.error('Failed to update archival rule');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl !w-[95vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Archival Rule</DialogTitle>
                    <DialogDescription>
                        Update the configuration for this log archival rule
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Basic Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Basic Information</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 xl:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="name">Rule Name</Label>
                                <Input
                                    id="name"
                                    {...form.register('name', { required: 'Name is required' })}
                                />
                                {form.formState.errors.name && (
                                    <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="service_pattern">Service Pattern</Label>
                                <Input
                                    id="service_pattern"
                                    placeholder="e.g., debug-*, test-*"
                                    {...form.register('service_pattern', { required: 'Service pattern is required' })}
                                />
                                {form.formState.errors.service_pattern && (
                                    <p className="text-sm text-red-500">{form.formState.errors.service_pattern.message}</p>
                                )}
                            </div>

                            <div className="space-y-2 xl:col-span-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Optional description of this archival rule"
                                    className="resize-none"
                                    rows={3}
                                    {...form.register('description')}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Archival Configuration */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Archival Configuration</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 xl:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="age_threshold_days">Age Threshold (Days)</Label>
                                <Input
                                    id="age_threshold_days"
                                    type="number"
                                    min="1"
                                    {...form.register('age_threshold_days', { 
                                        required: 'Age threshold is required',
                                        valueAsNumber: true,
                                        min: { value: 1, message: 'Must be at least 1 day' }
                                    })}
                                />
                                {form.formState.errors.age_threshold_days && (
                                    <p className="text-sm text-red-500">{form.formState.errors.age_threshold_days.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="retention_days">Retention Days</Label>
                                <Input
                                    id="retention_days"
                                    type="number"
                                    min="1"
                                    {...form.register('retention_days', { 
                                        required: 'Retention days is required',
                                        valueAsNumber: true,
                                        min: { value: 1, message: 'Must be at least 1 day' }
                                    })}
                                />
                                {form.formState.errors.retention_days && (
                                    <p className="text-sm text-red-500">{form.formState.errors.retention_days.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="cron_schedule">Cron Schedule</Label>
                                <Input
                                    id="cron_schedule"
                                    placeholder="e.g., 0 2 * * *"
                                    {...form.register('cron_schedule', { required: 'Cron schedule is required' })}
                                />
                                {form.formState.errors.cron_schedule && (
                                    <p className="text-sm text-red-500">{form.formState.errors.cron_schedule.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>Delete After Archive</Label>
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        checked={form.watch('delete_after_archive')}
                                        onCheckedChange={(checked) => form.setValue('delete_after_archive', checked)}
                                    />
                                    <span className="text-sm text-muted-foreground">
                                        Delete original logs after archival
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Storage Configuration */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Storage Configuration</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 xl:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="storage_backend">Storage Backend</Label>
                                <Select 
                                    value={form.watch('storage_backend')} 
                                    onValueChange={(value) => form.setValue('storage_backend', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select storage backend" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="s3">Amazon S3</SelectItem>
                                        <SelectItem value="gcs">Google Cloud Storage</SelectItem>
                                        <SelectItem value="azure">Azure Blob Storage</SelectItem>
                                        <SelectItem value="local">Local Storage</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="storage_bucket">Storage Bucket</Label>
                                <Input
                                    id="storage_bucket"
                                    placeholder="e.g., my-log-archive"
                                    {...form.register('storage_bucket', { required: 'Storage bucket is required' })}
                                />
                                {form.formState.errors.storage_bucket && (
                                    <p className="text-sm text-red-500">{form.formState.errors.storage_bucket.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="storage_path_prefix">Path Prefix</Label>
                                <Input
                                    id="storage_path_prefix"
                                    placeholder="e.g., logs/archived/"
                                    {...form.register('storage_path_prefix')}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="compression">Compression</Label>
                                <Select 
                                    value={form.watch('compression')} 
                                    onValueChange={(value) => form.setValue('compression', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select compression" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="gzip">GZip</SelectItem>
                                        <SelectItem value="lz4">LZ4</SelectItem>
                                        <SelectItem value="snappy">Snappy</SelectItem>
                                        <SelectItem value="none">None</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="format_type">Format Type</Label>
                                <Select 
                                    value={form.watch('format_type')} 
                                    onValueChange={(value) => form.setValue('format_type', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select format" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="json">JSON</SelectItem>
                                        <SelectItem value="parquet">Parquet</SelectItem>
                                        <SelectItem value="csv">CSV</SelectItem>
                                        <SelectItem value="raw">Raw</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Rule Status</Label>
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        checked={form.watch('is_active')}
                                        onCheckedChange={(checked) => form.setValue('is_active', checked)}
                                    />
                                    <span className="text-sm text-muted-foreground">
                                        Enable this archival rule
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Form Actions */}
                    <div className="flex justify-end gap-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Updating...' : 'Update Rule'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
