// src/components/log-management/EditRetentionPolicyModal.tsx
import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { updateRetentionPolicy } from '@/services/api';
import { 
    LogRetentionPolicyUpdateSchema, 
    LogRetentionPolicyResponse,
    RetentionTier 
} from '@/schemas/logManagementSchema';

interface EditRetentionPolicyModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    policy: LogRetentionPolicyResponse | null;
}

// Form schema for editing (all fields optional except those we always require)
const FormSchema = LogRetentionPolicyUpdateSchema;
type FormData = z.infer<typeof FormSchema>;

export const EditRetentionPolicyModal: React.FC<EditRetentionPolicyModalProps> = ({
    open,
    onOpenChange,
    onSuccess,
    policy,
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<FormData>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            name: '',
            description: null,
            service_pattern: '',
            log_level_filter: null,
            tier: 'operational' as RetentionTier,
            hot_days: 30,
            warm_days: 90,
            cold_days: 365,
            delete_days: 2555,
            max_index_size_gb: 50,
            max_index_age_days: 30,
            storage_class_hot: 'hot',
            storage_class_warm: 'warm',
            storage_class_cold: 'cold',
            is_active: true,
        },
    });

    // Update form values when policy changes
    useEffect(() => {
        if (policy) {
            form.reset({
                name: policy.name,
                description: policy.description,
                service_pattern: policy.service_pattern,
                log_level_filter: policy.log_level_filter,
                tier: policy.tier,
                hot_days: policy.hot_days,
                warm_days: policy.warm_days,
                cold_days: policy.cold_days,
                delete_days: policy.delete_days,
                max_index_size_gb: policy.max_index_size_gb,
                max_index_age_days: policy.max_index_age_days,
                storage_class_hot: policy.storage_class_hot,
                storage_class_warm: policy.storage_class_warm,
                storage_class_cold: policy.storage_class_cold,
                is_active: policy.is_active,
            });
        }
    }, [policy, form]);

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: FormData }) =>
            updateRetentionPolicy(id, data),
        onSuccess: () => {
            toast.success('Retention policy updated successfully');
            onSuccess();
        },
        onError: (error: any) => {
            toast.error(`Failed to update policy: ${error.message || 'Unknown error'}`);
        },
    });

    const onSubmit = async (data: FormData) => {
        if (!policy) return;
        
        setIsSubmitting(true);
        try {
            // Only send fields that have actually changed
            const updates: Partial<FormData> = {};
            Object.keys(data).forEach((key) => {
                const formKey = key as keyof FormData;
                const currentValue = data[formKey];
                const originalValue = policy[formKey as keyof LogRetentionPolicyResponse];
                
                if (currentValue !== originalValue) {
                    (updates as any)[formKey] = currentValue;
                }
            });

            if (Object.keys(updates).length > 0) {
                await updateMutation.mutateAsync({ id: policy.id, data: updates });
            } else {
                toast.info('No changes detected');
                onSuccess();
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        if (policy) {
            form.reset();
        }
        onOpenChange(false);
    };

    if (!policy) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="!max-w-none !w-[95vw] max-h-[95vh] overflow-y-auto p-0 sm:!max-w-none" style={{maxWidth: '95vw !important', width: '95vw !important'}}>
                <div className="p-8">
                    <DialogHeader>
                        <DialogTitle>Edit Log Retention Policy</DialogTitle>
                        <DialogDescription>
                            Modify the log lifecycle management settings for "{policy.name}".
                        </DialogDescription>
                    </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                                            value={form.watch('tier') || policy.tier}
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
                                        placeholder="Describe the purpose and scope of this retention policy..."
                                        rows={3}
                                        value={form.watch('description') || ''}
                                        onChange={(e) => form.setValue('description', e.target.value || null)}
                                        className="w-full"
                                    />
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="is_active"
                                        checked={form.watch('is_active') ?? policy.is_active}
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
                                            Use wildcards (*) to match multiple services
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="log_level_filter" className="text-sm font-medium">Log Level Filter (Optional)</Label>
                                        <Select
                                            value={form.watch('log_level_filter') || 'all'}
                                            onValueChange={(value) => 
                                                form.setValue('log_level_filter', value === 'all' ? null : value)
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

                    {/* Second Row */}
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
                                Configure how long logs are kept in each storage tier.
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

                    {/* Actions */}
                    <Separator />
                    <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={handleCancel}>
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={isSubmitting || updateMutation.isPending}
                        >
                            {isSubmitting || updateMutation.isPending ? 'Updating...' : 'Update Policy'}
                        </Button>
                    </div>
                </form>
                </div>
            </DialogContent>
        </Dialog>
    );
};
