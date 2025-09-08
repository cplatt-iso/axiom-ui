import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Edit, Plus, Archive, Calendar, Database } from 'lucide-react';
import { toast } from 'sonner';
import { LogArchivalRule } from '@/schemas/logManagementSchema';
import { CreateArchivalRuleModal } from './CreateArchivalRuleModal';
import { EditArchivalRuleModal } from './EditArchivalRuleModal';

export function ArchivalRulesPage() {
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedRule, setSelectedRule] = useState<LogArchivalRule | null>(null);
    
    // Mock data for demonstration - using correct schema properties
    const rules: LogArchivalRule[] = [
        {
            id: 1,
            name: 'Archive Debug Logs',
            description: 'Compress old debug logs to save space',
            service_pattern: 'debug-*',
            age_threshold_days: 30,
            storage_backend: 's3',
            storage_bucket: 'axiom-debug-archive',
            storage_path_prefix: 'debug-logs/',
            compression: 'gzip',
            format_type: 'json',
            retention_days: 365,
            delete_after_archive: true,
            is_active: true,
            cron_schedule: '0 2 * * *',
            last_run: '2025-01-05T08:00:00Z',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-05T10:30:00Z'
        },
        {
            id: 2,
            name: 'Archive Old Test Logs',
            description: 'Move test logs to S3 after 60 days',
            service_pattern: 'test-*',
            age_threshold_days: 60,
            storage_backend: 's3',
            storage_bucket: 'axiom-test-archive',
            storage_path_prefix: 'test-logs/',
            compression: 'gzip',
            format_type: 'json',
            retention_days: 90,
            delete_after_archive: true,
            is_active: false,
            cron_schedule: '0 3 * * *',
            last_run: '2025-01-04T20:00:00Z',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-04T22:15:00Z'
        }
    ];

    const handleEdit = (rule: LogArchivalRule) => {
        setSelectedRule(rule);
        setEditModalOpen(true);
    };

    const handleDelete = (_id: number) => {
        if (window.confirm('Are you sure you want to delete this archival rule?')) {
            toast.success('Archival rule deleted successfully');
            // In real implementation, this would call the API
        }
    };

    const getStatusBadge = (isActive: boolean) => {
        return (
            <Badge variant={isActive ? 'default' : 'secondary'}>
                {isActive ? 'Active' : 'Inactive'}
            </Badge>
        );
    };

    const getCompressionBadge = (compression: string) => {
        const compressionMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
            'gzip': { variant: 'default', label: 'GZip' },
            'lz4': { variant: 'default', label: 'LZ4' },
            'snappy': { variant: 'secondary', label: 'Snappy' },
            'none': { variant: 'outline', label: 'None' }
        };
        
        const config = compressionMap[compression] || { variant: 'outline' as const, label: compression };
        
        return (
            <Badge variant={config.variant}>
                {config.label}
            </Badge>
        );
    };

    const getStorageBackendBadge = (backend: string) => {
        const backendMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
            's3': { variant: 'default', label: 'Amazon S3' },
            'gcs': { variant: 'secondary', label: 'Google Cloud' },
            'azure': { variant: 'outline', label: 'Azure Blob' },
            'local': { variant: 'destructive', label: 'Local Storage' }
        };
        
        const config = backendMap[backend] || { variant: 'outline' as const, label: backend };
        
        return (
            <Badge variant={config.variant}>
                {config.label}
            </Badge>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Archival Rules</h2>
                    <p className="text-muted-foreground">
                        Configure automatic archival of logs to external storage
                    </p>
                </div>
                <Button onClick={() => setCreateModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Rule
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
                        <Archive className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{rules.length}</div>
                        <p className="text-xs text-muted-foreground">
                            {rules.filter(r => r.is_active).length} active
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Storage Backends</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Set(rules.map(r => r.storage_backend)).size}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Configured backends
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Retention</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {Math.round(rules.reduce((sum, r) => sum + r.retention_days, 0) / rules.length)} days
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Average retention period
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Last Run</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {rules.filter(r => r.last_run).length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Rules executed recently
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Rules Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Archival Rules</CardTitle>
                    <CardDescription>
                        Manage automatic log archival configuration
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Service Pattern</TableHead>
                                    <TableHead>Age Threshold</TableHead>
                                    <TableHead>Storage Backend</TableHead>
                                    <TableHead>Compression</TableHead>
                                    <TableHead>Retention</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Last Run</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rules.map((rule) => (
                                    <TableRow key={rule.id}>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{rule.name}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {rule.description}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <code className="bg-muted px-2 py-1 rounded text-sm">
                                                {rule.service_pattern}
                                            </code>
                                        </TableCell>
                                        <TableCell>
                                            {rule.age_threshold_days} days
                                        </TableCell>
                                        <TableCell>
                                            {getStorageBackendBadge(rule.storage_backend)}
                                        </TableCell>
                                        <TableCell>
                                            {getCompressionBadge(rule.compression)}
                                        </TableCell>
                                        <TableCell>
                                            {rule.retention_days} days
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(rule.is_active)}
                                        </TableCell>
                                        <TableCell>
                                            {rule.last_run ? (
                                                <div className="text-sm">
                                                    {new Date(rule.last_run).toLocaleDateString()}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">Never</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEdit(rule)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(rule.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Modals */}
            <CreateArchivalRuleModal
                open={createModalOpen}
                onOpenChange={setCreateModalOpen}
            />

            {selectedRule && (
                <EditArchivalRuleModal
                    rule={selectedRule}
                    open={editModalOpen}
                    onOpenChange={(open) => {
                        setEditModalOpen(open);
                        if (!open) setSelectedRule(null);
                    }}
                />
            )}
        </div>
    );
}
