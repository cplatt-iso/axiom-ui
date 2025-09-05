// src/components/system-config/SysAdminActions.tsx
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
    Shield, 
    RefreshCw, 
    Database, 
    Trash2, 
    FileX, 
    AlertTriangle,
    CheckCircle,
    Loader2
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

const AdminActionCard: React.FC<{
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    action: () => void;
    variant?: 'default' | 'destructive' | 'warning';
    loading?: boolean;
}> = ({ title, description, icon: Icon, action, variant = 'default', loading = false }) => {
    const getVariantStyles = () => {
        switch (variant) {
            case 'destructive':
                return {
                    cardClass: 'border-red-200 hover:border-red-300 dark:border-red-800 dark:hover:border-red-700',
                    iconClass: 'text-red-600 dark:text-red-400',
                    buttonClass: 'bg-red-600 hover:bg-red-700 text-white'
                };
            case 'warning':
                return {
                    cardClass: 'border-yellow-200 hover:border-yellow-300 dark:border-yellow-800 dark:hover:border-yellow-700',
                    iconClass: 'text-yellow-600 dark:text-yellow-400',
                    buttonClass: 'bg-yellow-600 hover:bg-yellow-700 text-white'
                };
            default:
                return {
                    cardClass: 'border-blue-200 hover:border-blue-300 dark:border-blue-800 dark:hover:border-blue-700',
                    iconClass: 'text-blue-600 dark:text-blue-400',
                    buttonClass: 'bg-blue-600 hover:bg-blue-700 text-white'
                };
        }
    };

    const styles = getVariantStyles();

    return (
        <Card className={`transition-colors ${styles.cardClass}`}>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-base">
                    <Icon className={`mr-2 h-5 w-5 ${styles.iconClass}`} />
                    {title}
                </CardTitle>
                <CardDescription className="text-sm">
                    {description}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button 
                    onClick={action} 
                    disabled={loading}
                    className={styles.buttonClass}
                    size="sm"
                >
                    {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                        <Icon className="h-4 w-4 mr-2" />
                    )}
                    {loading ? 'Processing...' : title}
                </Button>
            </CardContent>
        </Card>
    );
};

const SysAdminActions: React.FC = () => {
    const [isReloadDialogOpen, setIsReloadDialogOpen] = useState(false);
    const [isCleanupDialogOpen, setIsCleanupDialogOpen] = useState(false);
    const [loading, setLoading] = useState<string | null>(null);

    const handleConfigReload = async () => {
        setLoading('reload');
        try {
            // This would call the reload API endpoint
            await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
            console.log('Configuration reloaded');
        } finally {
            setLoading(null);
            setIsReloadDialogOpen(false);
        }
    };

    const handleCacheCleanup = async () => {
        setLoading('cleanup');
        try {
            // This would call a cache cleanup endpoint
            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
            console.log('Cache cleaned up');
        } finally {
            setLoading(null);
            setIsCleanupDialogOpen(false);
        }
    };

    const handleDatabaseMaintenance = async () => {
        setLoading('maintenance');
        try {
            // This would call a database maintenance endpoint
            await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate API call
            console.log('Database maintenance completed');
        } finally {
            setLoading(null);
        }
    };

    const handleSystemHealthCheck = async () => {
        setLoading('health');
        try {
            // This would call a system health check endpoint
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
            console.log('System health check completed');
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Shield className="mr-2 h-5 w-5 text-purple-600" />
                        Administrative Actions
                    </CardTitle>
                    <CardDescription>
                        Critical system operations that require administrative privileges. Use with caution in production environments.
                    </CardDescription>
                </CardHeader>
            </Card>

            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                    These actions can affect system performance and user experience. Always coordinate with your team before executing in production.
                </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* Configuration Reload */}
                <Dialog open={isReloadDialogOpen} onOpenChange={setIsReloadDialogOpen}>
                    <DialogTrigger asChild>
                        <div>
                            <AdminActionCard
                                title="Reload Configuration"
                                description="Force reload of system configuration from database and environment variables"
                                icon={RefreshCw}
                                action={() => setIsReloadDialogOpen(true)}
                                variant="warning"
                                loading={loading === 'reload'}
                            />
                        </div>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Reload System Configuration</DialogTitle>
                            <DialogDescription>
                                This will reload all configuration settings from the database and restart configuration-dependent services. 
                                Active connections may be temporarily interrupted.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsReloadDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button 
                                onClick={handleConfigReload} 
                                disabled={loading === 'reload'}
                                className="bg-yellow-600 hover:bg-yellow-700"
                            >
                                {loading === 'reload' ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                )}
                                Reload Configuration
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* System Health Check */}
                <AdminActionCard
                    title="System Health Check"
                    description="Run comprehensive health checks on all system components and services"
                    icon={CheckCircle}
                    action={handleSystemHealthCheck}
                    loading={loading === 'health'}
                />

                {/* Database Maintenance */}
                <AdminActionCard
                    title="Database Maintenance"
                    description="Perform database optimization, vacuum, and maintenance tasks"
                    icon={Database}
                    action={handleDatabaseMaintenance}
                    variant="warning"
                    loading={loading === 'maintenance'}
                />

                {/* Cache Cleanup */}
                <Dialog open={isCleanupDialogOpen} onOpenChange={setIsCleanupDialogOpen}>
                    <DialogTrigger asChild>
                        <div>
                            <AdminActionCard
                                title="Clear System Cache"
                                description="Clear Redis cache, temporary files, and cached data"
                                icon={Trash2}
                                action={() => setIsCleanupDialogOpen(true)}
                                variant="destructive"
                                loading={loading === 'cleanup'}
                            />
                        </div>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Clear System Cache</DialogTitle>
                            <DialogDescription>
                                This will clear all cached data including Redis cache, temporary files, and application cache. 
                                This may temporarily impact performance while caches are rebuilt.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCleanupDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button 
                                onClick={handleCacheCleanup} 
                                disabled={loading === 'cleanup'}
                                variant="destructive"
                            >
                                {loading === 'cleanup' ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Trash2 className="h-4 w-4 mr-2" />
                                )}
                                Clear Cache
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </div>

            {/* Placeholder for future actions */}
            <Card className="border-dashed border-gray-300 dark:border-gray-700">
                <CardContent className="p-8">
                    <div className="text-center text-gray-500 dark:text-gray-400">
                        <FileX className="mx-auto h-12 w-12 mb-4 opacity-50" />
                        <h3 className="text-lg font-medium mb-2">More Actions Coming Soon</h3>
                        <p className="text-sm">
                            Additional administrative actions like log rotation, backup management, 
                            and system diagnostics will be available in future releases.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default SysAdminActions;

