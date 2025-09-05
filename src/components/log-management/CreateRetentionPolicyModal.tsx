// src/components/log-management/CreateRetentionPolicyModal.tsx
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { createRetentionPolicy } from '@/services/api';
import { RetentionTier } from '@/schemas/logManagementSchema';

interface CreateRetentionPolicyModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export const CreateRetentionPolicyModal: React.FC<CreateRetentionPolicyModalProps> = ({
    open,
    onOpenChange,
    onSuccess,
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm({
        defaultValues: {
            name: '',
            description: '',
            service_pattern: '*',
            log_level_filter: '',
            tier: 'operational' as RetentionTier,
            hot_days: 30,
            warm_days: 90,
            cold_days: 365,
            delete_days: 2555, // ~7 years for healthcare compliance
            max_index_size_gb: 50,
            max_index_age_days: 30,
            storage_class_hot: 'hot',
            storage_class_warm: 'warm',
            storage_class_cold: 'cold',
            is_active: true,
        },
    });

    const createMutation = useMutation({
        mutationFn: createRetentionPolicy,
        onSuccess: () => {
            toast.success('Retention policy created successfully');
            onSuccess();
            form.reset();
        },
        onError: (error: any) => {
            toast.error(`Failed to create policy: ${error.message || 'Unknown error'}`);
        },
    });

    const onSubmit = async (data: any) => {
        setIsSubmitting(true);
        try {
            // Convert empty strings to null for nullable fields
            const payload = {
                ...data,
                description: data.description || null,
                log_level_filter: data.log_level_filter || null,
            };
            await createMutation.mutateAsync(payload);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        form.reset();
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="!max-w-none !w-[95vw] max-h-[95vh] overflow-y-auto p-0 sm:!max-w-none" style={{maxWidth: '95vw !important', width: '95vw !important'}}>
                <div className="p-8">
                    <DialogHeader>
                        <DialogTitle>Create Log Retention Policy</DialogTitle>
                        <DialogDescription>
                            Configure automated log lifecycle management to optimize storage costs while maintaining healthcare compliance.
                        </DialogDescription>
                    </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* First Row - Basic Information and Log Filtering */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {/* Basic Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Basic Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="text-sm font-medium">Policy Name</Label>
                                        <Input
                                            id="name"
                                            {...form.register('name')}
                                            placeholder="e.g., Critical Medical Logs"
                                            className="w-full"
                                        />
                                        {form.formState.errors.name && (
                                            <p className="text-sm text-red-600">
                                                {form.formState.errors.name.message}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="tier" className="text-sm font-medium">Retention Tier</Label>
                                        <Select
                                            value={form.watch('tier')}
                                            onValueChange={(value: RetentionTier) => form.setValue('tier', value)}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="critical">
                                                    Critical - Patient safety & regulatory
                                                </SelectItem>
                                                <SelectItem value="operational">
                                                    Operational - System & workflow
                                                </SelectItem>
                                                <SelectItem value="debug">
                                                    Debug - Development & troubleshooting
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description" className="text-sm font-medium">Description (Optional)</Label>
                                    <Textarea
                                        id="description"
                                        {...form.register('description')}
                                        placeholder="Describe the purpose and scope of this retention policy..."
                                        rows={3}
                                        className="w-full"
                                    />
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="is_active"
                                        checked={form.watch('is_active')}
                                        onCheckedChange={(checked) => form.setValue('is_active', checked)}
                                    />
                                    <Label htmlFor="is_active">Active Policy</Label>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Log Filtering */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Log Filtering</CardTitle>
                                <CardDescription>
                                    Define which logs this policy applies to using service patterns and log levels.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="service_pattern" className="text-sm font-medium">Service Pattern</Label>
                                        <Input
                                            id="service_pattern"
                                            {...form.register('service_pattern')}
                                            placeholder="e.g., axiom-*, dicom-*, *"
                                            className="w-full"
                                        />
                                        <p className="text-xs text-gray-500">
                                            Use wildcards (*) to match multiple services. Examples: axiom-*, dicom-web-*, *
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="log_level_filter" className="text-sm font-medium">Log Level Filter (Optional)</Label>
                                        <Select
                                            value={form.watch('log_level_filter') || 'all'}
                                            onValueChange={(value) => 
                                                form.setValue('log_level_filter', value === 'all' ? '' : value)
                                            }
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Levels</SelectItem>
                                                <SelectItem value="DEBUG">DEBUG</SelectItem>
                                                <SelectItem value="INFO">INFO</SelectItem>
                                                <SelectItem value="WARNING">WARNING</SelectItem>
                                                <SelectItem value="ERROR">ERROR</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Second Row - Index Management and Storage Classes */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {/* Index Management */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Index Management</CardTitle>
                                <CardDescription>
                                    Control when indices are rotated based on size and age.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <Label htmlFor="max_index_size_gb" className="text-sm font-medium">Max Index Size (GB)</Label>
                                        <Input
                                            id="max_index_size_gb"
                                            type="number"
                                            {...form.register('max_index_size_gb', { valueAsNumber: true })}
                                            min={1}
                                            max={10000}
                                            className="w-full"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="max_index_age_days" className="text-sm font-medium">Max Index Age (Days)</Label>
                                        <Input
                                            id="max_index_age_days"
                                            type="number"
                                            {...form.register('max_index_age_days', { valueAsNumber: true })}
                                            min={1}
                                            max={3650}
                                            className="w-full"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Storage Classes */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Storage Classes</CardTitle>
                                <CardDescription>
                                    Configure Elasticsearch storage class assignments for each tier.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="storage_class_hot" className="text-sm font-medium">Hot Storage Class</Label>
                                        <Input
                                            id="storage_class_hot"
                                            {...form.register('storage_class_hot')}
                                            placeholder="hot"
                                            className="w-full"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="storage_class_warm" className="text-sm font-medium">Warm Storage Class</Label>
                                        <Input
                                            id="storage_class_warm"
                                            {...form.register('storage_class_warm')}
                                            placeholder="warm"
                                            className="w-full"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="storage_class_cold" className="text-sm font-medium">Cold Storage Class</Label>
                                        <Input
                                            id="storage_class_cold"
                                            {...form.register('storage_class_cold')}
                                            placeholder="cold"
                                            className="w-full"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Retention Schedule - Full Width */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Retention Schedule</CardTitle>
                            <CardDescription>
                                Configure how long logs are kept in each storage tier. Critical medical data typically requires 7+ years retention.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-4 gap-8">
                                <div className="space-y-2">
                                    <Label htmlFor="hot_days" className="text-sm font-medium">Hot Tier (Days)</Label>
                                    <Input
                                        id="hot_days"
                                        type="number"
                                        {...form.register('hot_days', { valueAsNumber: true })}
                                        min={1}
                                        max={365}
                                        className="w-full"
                                    />
                                    <p className="text-xs text-gray-500">Fast access</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="warm_days" className="text-sm font-medium">Warm Tier (Days)</Label>
                                    <Input
                                        id="warm_days"
                                        type="number"
                                        {...form.register('warm_days', { valueAsNumber: true })}
                                        min={1}
                                        max={1095}
                                        className="w-full"
                                    />
                                    <p className="text-xs text-gray-500">Moderate access</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="cold_days" className="text-sm font-medium">Cold Tier (Days)</Label>
                                    <Input
                                        id="cold_days"
                                        type="number"
                                        {...form.register('cold_days', { valueAsNumber: true })}
                                        min={1}
                                        max={2555}
                                        className="w-full"
                                    />
                                    <p className="text-xs text-gray-500">Archival access</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="delete_days" className="text-sm font-medium">Delete After (Days)</Label>
                                    <Input
                                        id="delete_days"
                                        type="number"
                                        {...form.register('delete_days', { valueAsNumber: true })}
                                        min={1}
                                        max={3650}
                                        className="w-full"
                                    />
                                    <p className="text-xs text-gray-500">Permanent deletion</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Index Management */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Index Management</CardTitle>
                            <CardDescription>
                                Control when indices are rotated based on size and age to optimize performance.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <Label htmlFor="max_index_size_gb" className="text-sm font-medium">Max Index Size (GB)</Label>
                                    <Input
                                        id="max_index_size_gb"
                                        type="number"
                                        {...form.register('max_index_size_gb', { valueAsNumber: true })}
                                        min={1}
                                        max={10000}
                                        className="w-full"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="max_index_age_days" className="text-sm font-medium">Max Index Age (Days)</Label>
                                    <Input
                                        id="max_index_age_days"
                                        type="number"
                                        {...form.register('max_index_age_days', { valueAsNumber: true })}
                                        min={1}
                                        max={3650}
                                        className="w-full"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Storage Classes */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Storage Classes</CardTitle>
                            <CardDescription>
                                Configure Elasticsearch storage class assignments for each tier.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-3 gap-8">
                                <div className="space-y-2">
                                    <Label htmlFor="storage_class_hot" className="text-sm font-medium">Hot Storage Class</Label>
                                    <Input
                                        id="storage_class_hot"
                                        {...form.register('storage_class_hot')}
                                        placeholder="hot"
                                        className="w-full"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="storage_class_warm" className="text-sm font-medium">Warm Storage Class</Label>
                                    <Input
                                        id="storage_class_warm"
                                        {...form.register('storage_class_warm')}
                                        placeholder="warm"
                                        className="w-full"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="storage_class_cold" className="text-sm font-medium">Cold Storage Class</Label>
                                    <Input
                                        id="storage_class_cold"
                                        {...form.register('storage_class_cold')}
                                        placeholder="cold"
                                        className="w-full"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <Separator />
                    <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={handleCancel}>
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={isSubmitting || createMutation.isPending}
                        >
                            {isSubmitting || createMutation.isPending ? 'Creating...' : 'Create Policy'}
                        </Button>
                    </div>
                </form>
                </div>
            </DialogContent>
        </Dialog>
    );
};
