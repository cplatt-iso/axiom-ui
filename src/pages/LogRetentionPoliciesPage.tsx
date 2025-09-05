// src/pages/LogRetentionPoliciesPage.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Clock, Database, Archive } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    getRetentionPolicies,
    deleteRetentionPolicy,
    syncPoliciesToElasticsearch,
} from '@/services/api';
import { LogRetentionPolicyResponse } from '@/schemas/logManagementSchema';
import { CreateRetentionPolicyModal, EditRetentionPolicyModal } from '@/components/log-management';

const LogRetentionPoliciesPage: React.FC = () => {
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState<LogRetentionPolicyResponse | null>(null);
    const queryClient = useQueryClient();

    // Fetch retention policies
    const { 
        data: policies = [], 
        isLoading, 
        error 
    } = useQuery({
        queryKey: ['retention-policies'],
        queryFn: () => getRetentionPolicies(),
        refetchInterval: 30000, // Refresh every 30 seconds
    });

    // Delete policy mutation
    const deletePolicyMutation = useMutation({
        mutationFn: deleteRetentionPolicy,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['retention-policies'] });
            toast.success('Retention policy deleted successfully');
        },
        onError: (error: any) => {
            toast.error(`Failed to delete policy: ${error.message || 'Unknown error'}`);
        },
    });

    // Sync policies mutation
    const syncPoliciesMutation = useMutation({
        mutationFn: syncPoliciesToElasticsearch,
        onSuccess: (result) => {
            toast.success(
                `Sync completed: ${result.successful_policies}/${result.total_policies} policies synced successfully`
            );
            if (result.failed_policies_count > 0) {
                toast.warning(`${result.failed_policies_count} policies failed to sync. Check logs for details.`);
            }
        },
        onError: (error: any) => {
            toast.error(`Failed to sync policies: ${error.message || 'Unknown error'}`);
        },
    });

    const handleDeletePolicy = (policy: LogRetentionPolicyResponse) => {
        if (window.confirm(`Are you sure you want to delete "${policy.name}"? This action cannot be undone.`)) {
            deletePolicyMutation.mutate(policy.id);
        }
    };

    const handleSyncPolicies = () => {
        if (window.confirm('This will sync all active retention policies to Elasticsearch. Continue?')) {
            syncPoliciesMutation.mutate();
        }
    };

    const getTierBadgeColor = (tier: string) => {
        switch (tier) {
            case 'critical':
                return 'bg-red-100 text-red-800 border-red-300';
            case 'operational':
                return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'debug':
                return 'bg-blue-100 text-blue-800 border-blue-300';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    const formatDays = (days: number) => {
        if (days >= 365) {
            const years = Math.floor(days / 365);
            const remainingDays = days % 365;
            return remainingDays > 0 ? `${years}y ${remainingDays}d` : `${years}y`;
        }
        return `${days}d`;
    };

    if (error) {
        return (
            <div className="p-6">
                <div className="text-center text-red-600 dark:text-red-400">
                    Error loading retention policies: {(error as any)?.message || 'Unknown error'}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <Clock className="h-6 w-6 text-blue-600" />
                            <div>
                                <CardTitle>Log Retention Policies</CardTitle>
                                <CardDescription>
                                    Manage automated log retention, tiering, and deletion policies for medical imaging audit trails
                                </CardDescription>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                onClick={handleSyncPolicies}
                                disabled={syncPoliciesMutation.isPending}
                            >
                                <Database className="h-4 w-4 mr-2" />
                                {syncPoliciesMutation.isPending ? 'Syncing...' : 'Sync to Elasticsearch'}
                            </Button>
                            <Button
                                onClick={() => setCreateModalOpen(true)}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Create Policy
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Policies Table */}
            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-2">Loading policies...</span>
                        </div>
                    ) : policies.length === 0 ? (
                        <div className="text-center py-12">
                            <Archive className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                                No retention policies found
                            </h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Create your first retention policy to manage log lifecycle and storage costs.
                            </p>
                            <div className="mt-6">
                                <Button onClick={() => setCreateModalOpen(true)}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Policy
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Service Pattern</TableHead>
                                    <TableHead>Tier</TableHead>
                                    <TableHead>Retention Schedule</TableHead>
                                    <TableHead>Index Limits</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {policies.map((policy) => (
                                    <TableRow key={policy.id}>
                                        <TableCell className="font-medium">
                                            <div>
                                                <div className="font-semibold">{policy.name}</div>
                                                {policy.description && (
                                                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                        {policy.description}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                                {policy.service_pattern}
                                            </code>
                                            {policy.log_level_filter && (
                                                <div className="text-xs text-gray-500 mt-1">
                                                    Level: {policy.log_level_filter}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={getTierBadgeColor(policy.tier)}>
                                                {policy.tier}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm space-y-1">
                                                <div>Hot: {formatDays(policy.hot_days)}</div>
                                                <div>Warm: {formatDays(policy.warm_days)}</div>
                                                <div>Cold: {formatDays(policy.cold_days)}</div>
                                                <div>Delete: {formatDays(policy.delete_days)}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm space-y-1">
                                                <div>Size: {policy.max_index_size_gb}GB</div>
                                                <div>Age: {formatDays(policy.max_index_age_days)}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={policy.is_active ? "default" : "secondary"}>
                                                {policy.is_active ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setEditingPolicy(policy)}
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeletePolicy(policy)}
                                                    disabled={deletePolicyMutation.isPending}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Modals */}
            <CreateRetentionPolicyModal
                open={createModalOpen}
                onOpenChange={setCreateModalOpen}
                onSuccess={() => {
                    setCreateModalOpen(false);
                    queryClient.invalidateQueries({ queryKey: ['retention-policies'] });
                }}
            />

            {editingPolicy && (
                <EditRetentionPolicyModal
                    open={true}
                    onOpenChange={() => setEditingPolicy(null)}
                    policy={editingPolicy}
                    onSuccess={() => {
                        setEditingPolicy(null);
                        queryClient.invalidateQueries({ queryKey: ['retention-policies'] });
                    }}
                />
            )}
        </div>
    );
};

export default LogRetentionPoliciesPage;
