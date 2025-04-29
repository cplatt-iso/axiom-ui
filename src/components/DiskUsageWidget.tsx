// src/components/DiskUsageWidget.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from "@/components/ui/progress"; // Shadcn progress bar
import { HardDrive, AlertTriangle, Loader2, FolderOutput, FolderSymlink, FolderX, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DiskUsageStats, DirectoryUsageStats } from '@/schemas';
import { getDiskUsage } from '@/services/api';
import { formatBytes } from '@/utils/formatters';

const DiskUsageWidget: React.FC = () => {
    const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

    const { data, isLoading, isError, error, isFetching } = useQuery<DiskUsageStats, Error>({
        queryKey: ['diskUsage', 'all'],
        queryFn: () => getDiskUsage(),
        enabled: !isAuthLoading && isAuthenticated,
        refetchInterval: 60000,
        staleTime: 45000,
    });

    const combinedIsLoading = isAuthLoading || (isAuthenticated && isLoading);

    const renderContent = () => {
        if (combinedIsLoading) {
             return <div className="text-center text-gray-500 dark:text-gray-400 py-4 px-2"><Loader2 className="inline w-4 h-4 mr-2 animate-spin" />Loading disk usage...</div>;
        }
        if (!isAuthenticated) {
             return <div className="text-center text-gray-500 dark:text-gray-400 py-4 px-2">Login required</div>;
        }
         if (isError || !data) {
            return (
                <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 py-4 px-2">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm">Error: {error?.message || 'Failed to load disk usage'}</span>
                </div>
            );
        }
        if (data.filesystem_total_bytes === -1 || data.filesystem_free_bytes === -1) {
             return (
                 <div className="flex items-center space-x-2 text-yellow-600 dark:text-yellow-400 py-4 px-2">
                     <Info className="h-5 w-5 flex-shrink-0" />
                     <span className="text-sm">Could not determine filesystem statistics.</span>
                 </div>
             );
        }

        const incomingDirData = data.directories.find(dir => dir.path.endsWith('/incoming'));
        const incomingDirSize = incomingDirData?.content_bytes ?? 0;
        const incomingDirFailed = incomingDirData?.content_bytes === -1;

        const total_bytes = data.filesystem_total_bytes;
        const free_bytes = data.filesystem_free_bytes;
        const formattedTotal = formatBytes(total_bytes);
        const formattedFree = formatBytes(free_bytes);

        let percent_used_incoming = 0;
        if (total_bytes > 0 && incomingDirSize > 0) {
            percent_used_incoming = Math.min(100, (incomingDirSize / total_bytes) * 100);
        }

        // Basic styling for progress bar (adjust colors if needed)
        const progressStyle = {
             '--progress-fill': percent_used_incoming > 90 ? 'hsl(var(--destructive))' : percent_used_incoming > 75 ? 'hsl(var(--warning))' : 'hsl(var(--primary))',
        } as React.CSSProperties;

        return (
            <TooltipProvider delayDuration={150}>
                <div className="space-y-4 px-4 pb-4">
                    {/* Path Display (Optional - could remove if widget title is clear) */}
                    {/* <p className="text-xs text-gray-500 dark:text-gray-400 font-mono break-all" title={path}>
                        Volume Path: {path}
                    </p> */}
                    {/* Progress Bar showing Incoming Dir Usage % of Total FS */}
                     <Tooltip>
                        <TooltipContent>
                            <p>{incomingDirFailed ? 'Error calculating directory size' : `Percentage of total volume used by incoming directory (${formatBytes(incomingDirSize)} / ${formattedTotal}).`}</p>
                        </TooltipContent>
                     </Tooltip>

                    {/* Detailed breakdown per directory */}
                    <div className="space-y-2">
                        {data.directories.map(dir => {
                            const formattedSize = dir.content_bytes === -1 ? 'Error' : formatBytes(dir.content_bytes);
                            const DirIcon = dir.path.endsWith('/incoming') ? FolderOutput
                                          : dir.path.endsWith('/processed') ? FolderSymlink
                                          : dir.path.endsWith('/errors') ? FolderX
                                          : FolderOutput; // Default icon
                            const displayPath = dir.path.replace('/dicom_data/', ''); // Make path relative for display
                            return (
                                <div key={dir.path} className="flex justify-between items-center text-xs border-b border-dashed border-gray-200 dark:border-gray-700 pb-1">
                                    <span className="flex items-center text-gray-600 dark:text-gray-400 font-mono truncate" title={dir.path}>
                                         <DirIcon className="h-3.5 w-3.5 mr-1.5 flex-shrink-0"/>
                                         {displayPath}
                                    </span>
                                    <span className={`font-medium ${dir.content_bytes === -1 ? 'text-red-500' : 'text-gray-800 dark:text-gray-200'}`}>
                                        {formattedSize}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Overall Filesystem Stats */}
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 pt-2">
                         <span title="Free space on the underlying volume/filesystem">
                            FS Free: {formattedFree}
                         </span>
                         <span title="Total capacity of the underlying volume/filesystem">
                            Volume Capacity: {formattedTotal}
                         </span>
                     </div>
                </div>
             </TooltipProvider>
        );
    };

    return (
        <Card className="dark:bg-gray-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b dark:border-gray-700">
                <CardTitle className="text-base font-semibold flex items-center">
                    <HardDrive className="mr-2 h-4 w-4" />
                    Volume Usage
                </CardTitle>
                 <span className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`}>
                     {isFetching && <Loader2 className="text-muted-foreground"/>}
                 </span>
            </CardHeader>
            <CardContent className="p-0">
                 {renderContent()}
            </CardContent>
        </Card>
    );
};

export default DiskUsageWidget;
