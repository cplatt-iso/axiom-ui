// src/components/system-config/SysInfoDisplay.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2, InfoIcon, CheckCircle, XCircle } from 'lucide-react';
import { getSystemInfo } from '@/services/api'; // Import the API function
import { SystemInfo } from '@/schemas'; // Import the type

// Helper component for displaying a setting row
const InfoRow: React.FC<{ label: string; value: React.ReactNode; tooltip?: string }> = ({ label, value, tooltip }) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
        <dt className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
            {label}
            <span title={tooltip}>
                <InfoIcon className="h-3 w-3 ml-1 text-gray-400 dark:text-gray-500" />
            </span>
        </dt>
        <dd className="text-sm text-gray-900 dark:text-gray-100 text-right font-mono">{value}</dd>
    </div>
);

// Helper for boolean display
const BoolDisplay: React.FC<{ value: boolean }> = ({ value }) => (
    value
        ? <span className="flex items-center justify-end text-green-600 dark:text-green-400"><CheckCircle className="h-4 w-4 mr-1" /> True</span>
        : <span className="flex items-center justify-end text-red-600 dark:text-red-400"><XCircle className="h-4 w-4 mr-1" /> False</span>
);


const SysInfoDisplay: React.FC = () => {
    const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

    const { data: systemInfo, isLoading, isError, error } = useQuery<SystemInfo, Error>({
        queryKey: ['systemInfo'],
        queryFn: getSystemInfo,
        enabled: !isAuthLoading && isAuthenticated,
        staleTime: 5 * 60 * 1000, // Cache for 5 mins
    });

    const combinedIsLoading = isAuthLoading || (isAuthenticated && isLoading);

    if (combinedIsLoading) {
        return <div className="text-center text-gray-500 dark:text-gray-400 py-10"><Loader2 className="inline w-5 h-5 mr-2 animate-spin" />Loading System Information...</div>;
    }

    if (!isAuthenticated) {
        return <div className="text-center text-gray-500 dark:text-gray-400 py-10">Login required</div>;
    }

    if (isError) {
        return (
            <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error Loading System Info</AlertTitle>
                <AlertDescription>{error.message || 'Unknown error'}</AlertDescription>
            </Alert>
        );
    }

    if (!systemInfo) {
         return <div className="text-center text-gray-500 dark:text-gray-400 py-10">No system information available.</div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Application Information</CardTitle>
                <CardDescription>Key configuration parameters and application details (read-only).</CardDescription>
            </CardHeader>
            <CardContent>
                <dl className="space-y-1">
                    <InfoRow label="Project Name" value={systemInfo.project_name} />
                    <InfoRow label="Version" value={systemInfo.project_version} />
                    <InfoRow label="Environment" value={systemInfo.environment} />
                    <InfoRow label="Debug Mode" value={<BoolDisplay value={systemInfo.debug_mode} />} />
                    <InfoRow label="Incoming Path" value={systemInfo.dicom_storage_path} />
                    <InfoRow label="Error Path" value={systemInfo.dicom_error_path} />
                    <InfoRow label="Processed Path (Filesystem)" value={systemInfo.filesystem_storage_path} />
                    <InfoRow label="Temp Dir Path" value={systemInfo.temp_dir || <span className="italic text-gray-500">System Default</span>} />
                    <InfoRow label="Log Original Attributes" value={<BoolDisplay value={systemInfo.log_original_attributes} />} />
                    <InfoRow label="Delete on Success" value={<BoolDisplay value={systemInfo.delete_on_success} />} />
                    <InfoRow label="Delete Unmatched" value={<BoolDisplay value={systemInfo.delete_unmatched_files} />} />
                    <InfoRow label="Delete on No Destination" value={<BoolDisplay value={systemInfo.delete_on_no_destination} />} />
                    <InfoRow label="Error on Partial Failure" value={<BoolDisplay value={systemInfo.move_to_error_on_partial_failure} />} />
                    <InfoRow label="OpenAI Configured" value={<BoolDisplay value={systemInfo.openai_configured} />} />
                </dl>
            </CardContent>
        </Card>
    );
};

export default SysInfoDisplay;
