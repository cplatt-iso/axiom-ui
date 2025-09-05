// src/components/system-config/RuntimeConfigurationManager.tsx
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
    Card, 
    CardContent, 
    CardDescription, 
    CardHeader, 
    CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { 
    Settings2Icon, 
    RefreshCwIcon, 
    RotateCcwIcon,
    SaveIcon,
    AlertTriangleIcon,
    CheckCircle2Icon,
    InfoIcon
} from 'lucide-react';

import {
    getSystemConfigCategories,
    getSystemConfigs,
    updateSystemConfig,
    resetSystemConfig,
    reloadSystemConfig,
} from '@/services/api';

import {
    SystemConfigRead,
} from '@/schemas';

interface ConfigItemProps {
    config: SystemConfigRead;
    onUpdate: (key: string, value: any) => void;
    onReset: (key: string) => void;
    isLoading?: boolean;
}

const ConfigItem: React.FC<ConfigItemProps> = ({ config, onUpdate, onReset, isLoading }) => {
    const [localValue, setLocalValue] = useState(config.value);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const handleValueChange = (newValue: any) => {
        setLocalValue(newValue);
        setHasUnsavedChanges(newValue !== config.value);
    };

    const handleSave = () => {
        onUpdate(config.key, localValue);
        setHasUnsavedChanges(false);
    };

    const handleReset = () => {
        onReset(config.key);
        setLocalValue(config.default);
        setHasUnsavedChanges(false);
    };

    const renderInput = () => {
        switch (config.type) {
            case 'boolean':
                return (
                    <div className="flex items-center space-x-2">
                        <Switch
                            checked={localValue}
                            onCheckedChange={handleValueChange}
                            disabled={isLoading}
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            {localValue ? 'Enabled' : 'Disabled'}
                        </span>
                    </div>
                );
            case 'integer':
                return (
                    <Input
                        type="number"
                        value={localValue || ''}
                        onChange={(e) => handleValueChange(parseInt(e.target.value, 10))}
                        min={config.min_value}
                        max={config.max_value}
                        disabled={isLoading}
                        className="max-w-xs"
                    />
                );
            case 'string':
                return (
                    <Input
                        type="text"
                        value={localValue || ''}
                        onChange={(e) => handleValueChange(e.target.value)}
                        disabled={isLoading}
                        className="max-w-md"
                    />
                );
            default:
                return (
                    <Input
                        type="text"
                        value={String(localValue)}
                        onChange={(e) => handleValueChange(e.target.value)}
                        disabled={isLoading}
                        className="max-w-md"
                    />
                );
        }
    };

    return (
        <Card className={`${config.is_modified ? 'border-orange-200 bg-orange-50 dark:border-orange-900/50 dark:bg-orange-950/20' : ''}`}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <CardTitle className="text-base">{config.key}</CardTitle>
                        {config.is_modified && (
                            <Badge variant="outline" className="text-orange-600 border-orange-300">
                                Modified
                            </Badge>
                        )}
                        {hasUnsavedChanges && (
                            <Badge variant="outline" className="text-blue-600 border-blue-300">
                                Unsaved
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center space-x-1">
                        {hasUnsavedChanges && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleSave}
                                disabled={isLoading}
                                className="h-8"
                            >
                                <SaveIcon className="h-3 w-3" />
                            </Button>
                        )}
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleReset}
                            disabled={isLoading}
                            className="h-8 text-gray-500 hover:text-red-600"
                        >
                            <RotateCcwIcon className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
                <CardDescription className="text-xs">
                    {config.description}
                    {(config.min_value !== undefined || config.max_value !== undefined) && (
                        <span className="ml-2 text-gray-500">
                            (Range: {config.min_value ?? '∞'} - {config.max_value ?? '∞'})
                        </span>
                    )}
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="space-y-3">
                    <div>
                        <Label className="text-sm font-medium">Current Value</Label>
                        <div className="mt-1">
                            {renderInput()}
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>Default: {String(config.default)}</span>
                        <span>Type: {config.type}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

const RuntimeConfigurationManager: React.FC = () => {
    const queryClient = useQueryClient();
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [isReloadDialogOpen, setIsReloadDialogOpen] = useState(false);

    // Fetch categories (excluding logging since it has its own dedicated page)
    const { data: allCategories = [], isLoading: categoriesLoading } = useQuery({
        queryKey: ['system-config-categories'],
        queryFn: getSystemConfigCategories,
    });

    // Filter out logging category since it has its own dedicated page
    const categories = useMemo(() => 
        allCategories.filter(category => category !== 'logging'), 
        [allCategories]
    );

    // Fetch configurations (excluding logging configs)
    const { data: allConfigs = [], isLoading: configsLoading, error } = useQuery({
        queryKey: ['system-configs', selectedCategory],
        queryFn: () => getSystemConfigs(selectedCategory === 'all' ? undefined : selectedCategory),
    });

    // Filter out logging configs since they have their own dedicated page
    const configs = useMemo(() => 
        allConfigs.filter(config => config.category !== 'logging'), 
        [allConfigs]
    );

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: ({ key, value }: { key: string; value: any }) =>
            updateSystemConfig(key, { value }),
        onSuccess: () => {
            toast.success('Configuration updated successfully');
            queryClient.invalidateQueries({ queryKey: ['system-configs'] });
        },
        onError: (error: any) => {
            toast.error(`Failed to update configuration: ${error.message || 'Unknown error'}`);
        },
    });

    // Reset mutation
    const resetMutation = useMutation({
        mutationFn: resetSystemConfig,
        onSuccess: () => {
            toast.success('Configuration reset to default');
            queryClient.invalidateQueries({ queryKey: ['system-configs'] });
        },
        onError: (error: any) => {
            toast.error(`Failed to reset configuration: ${error.message || 'Unknown error'}`);
        },
    });

    // Reload mutation
    const reloadMutation = useMutation({
        mutationFn: reloadSystemConfig,
        onSuccess: (response) => {
            toast.success(response.message);
            setIsReloadDialogOpen(false);
        },
        onError: (error: any) => {
            toast.error(`Failed to reload configuration: ${error.message || 'Unknown error'}`);
        },
    });

    // Group configs by category
    const configsByCategory = useMemo(() => {
        const grouped: Record<string, SystemConfigRead[]> = {};
        configs.forEach(config => {
            if (!grouped[config.category]) {
                grouped[config.category] = [];
            }
            grouped[config.category].push(config);
        });
        return grouped;
    }, [configs]);

    const handleConfigUpdate = (key: string, value: any) => {
        updateMutation.mutate({ key, value });
    };

    const handleConfigReset = (key: string) => {
        resetMutation.mutate(key);
    };

    const modifiedCount = configs.filter(c => c.is_modified).length;

    if (error) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="text-center space-y-4">
                        <AlertTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                Failed to load configuration
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                {(error as any)?.message || 'Unknown error occurred'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <Settings2Icon className="h-6 w-6 text-blue-600" />
                            <div>
                                <CardTitle>Runtime Configuration</CardTitle>
                                <CardDescription>
                                    Manage system settings that can be updated without restarting the application
                                </CardDescription>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            {modifiedCount > 0 && (
                                <Badge variant="outline" className="text-orange-600 border-orange-300">
                                    {modifiedCount} modified
                                </Badge>
                            )}
                            <Dialog open={isReloadDialogOpen} onOpenChange={setIsReloadDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <RefreshCwIcon className="h-4 w-4 mr-2" />
                                        Reload Config
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Reload Configuration</DialogTitle>
                                        <DialogDescription>
                                            This will reload the configuration from the database and apply any changes.
                                            Are you sure you want to continue?
                                        </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter>
                                        <Button
                                            variant="outline"
                                            onClick={() => setIsReloadDialogOpen(false)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={() => reloadMutation.mutate()}
                                            disabled={reloadMutation.isPending}
                                        >
                                            {reloadMutation.isPending ? (
                                                <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
                                            ) : (
                                                <CheckCircle2Icon className="h-4 w-4 mr-2" />
                                            )}
                                            Reload
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Category Tabs */}
            {!categoriesLoading && categories.length > 0 && (
                <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                    <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                        <TabsTrigger value="all">All Categories</TabsTrigger>
                        {categories.map(category => (
                            <TabsTrigger key={category} value={category} className="capitalize">
                                {category.replace(/_/g, ' ')}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <TabsContent value={selectedCategory} className="mt-6">
                        {configsLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <Card key={i} className="animate-pulse">
                                        <CardHeader>
                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : selectedCategory === 'all' ? (
                            <div className="space-y-8">
                                {Object.entries(configsByCategory).map(([category, categoryConfigs]) => (
                                    <div key={category}>
                                        <h3 className="text-lg font-semibold mb-4 capitalize flex items-center">
                                            <InfoIcon className="h-5 w-5 mr-2 text-gray-500" />
                                            {category.replace(/_/g, ' ')} Settings
                                            <Badge variant="secondary" className="ml-2">
                                                {categoryConfigs.length}
                                            </Badge>
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                            {categoryConfigs.map(config => (
                                                <ConfigItem
                                                    key={config.key}
                                                    config={config}
                                                    onUpdate={handleConfigUpdate}
                                                    onReset={handleConfigReset}
                                                    isLoading={updateMutation.isPending || resetMutation.isPending}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {configs.map(config => (
                                    <ConfigItem
                                        key={config.key}
                                        config={config}
                                        onUpdate={handleConfigUpdate}
                                        onReset={handleConfigReset}
                                        isLoading={updateMutation.isPending || resetMutation.isPending}
                                    />
                                ))}
                            </div>
                        )}

                        {!configsLoading && configs.length === 0 && (
                            <Card>
                                <CardContent className="p-8 text-center">
                                    <Settings2Icon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                        No configurations found
                                    </h3>
                                    <p className="text-gray-500 dark:text-gray-400">
                                        {selectedCategory === 'all' 
                                            ? 'No system configurations are available.'
                                            : `No configurations found for the ${selectedCategory} category.`
                                        }
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
};

export default RuntimeConfigurationManager;
