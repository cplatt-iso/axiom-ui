// src/pages/StowRsInfoPage.tsx
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Server, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const StowRsInfoPage: React.FC = () => {
    const endpointUrl = "/api/v1/dicomweb/studies"; // Define the endpoint path

    // Placeholder for potential future environment variable checks
    const tempDirConfigured = true; // Replace with actual check if possible, e.g., reading from context or a dedicated settings fetch
    const authEnabled = true; // Assume auth is always enabled via deps

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Server className="mr-2 h-5 w-5" /> DICOMweb STOW-RS Endpoint Information
                    </CardTitle>
                    <CardDescription>
                        Details about the built-in endpoint for receiving DICOM instances via STOW-RS (POST requests).
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Endpoint URL</h3>
                        <code className="text-sm bg-gray-100 dark:bg-gray-900 p-2 rounded font-mono block overflow-x-auto">
                            {endpointUrl}
                        </code>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            This is the relative path within the Axiom Flow API where clients should send STOW-RS requests.
                        </p>
                    </div>

                    <div>
                        <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Request Format</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Requires a POST request with <code className="text-xs bg-gray-100 dark:bg-gray-900 p-0.5 rounded">Content-Type</code> header set to <code className="text-xs bg-gray-100 dark:bg-gray-900 p-0.5 rounded">multipart/related; type="application/dicom"</code>. The body must contain one or more DICOM instances formatted according to the DICOM standard.
                        </p>
                    </div>

                    <div>
                        <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Authentication</h3>
                         <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                            {authEnabled ? <CheckCircle className="h-4 w-4 mr-1 text-green-500" /> : <AlertCircle className="h-4 w-4 mr-1 text-yellow-500" />}
                            <span>Required (API Key or User JWT).</span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Access is controlled via the standard API authentication mechanisms (Bearer token or Api-Key header). Ensure calling clients provide valid credentials.
                        </p>
                    </div>

                    <div>
                        <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Temporary Storage</h3>
                         <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                            {tempDirConfigured ? <CheckCircle className="h-4 w-4 mr-1 text-green-500" /> : <AlertCircle className="h-4 w-4 mr-1 text-yellow-500" />}
                            <span>Uses temporary directory.</span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                             Instances are temporarily saved to disk before being queued for processing. This location is configured via the <code className="text-xs bg-gray-100 dark:bg-gray-900 p-0.5 rounded">TEMP_DIR</code> environment variable or the system default temporary path. Ensure sufficient space and permissions.
                        </p>
                    </div>

                     <div>
                        <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Processing</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Received instances are passed to the rule engine asynchronously via Celery tasks. Rule matching uses a source identifier based on the client's IP address and authenticated user/key (e.g., <code className="text-xs bg-gray-100 dark:bg-gray-900 p-0.5 rounded">STOW_RS_FROM_192.168.1.5</code> or <code className="text-xs bg-gray-100 dark:bg-gray-900 p-0.5 rounded">STOW_RS_USER_1</code>).
                        </p>
                    </div>

                    <Alert variant="default" className="bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700">
                        <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <AlertTitle className="text-blue-700 dark:text-blue-300 text-sm">Note</AlertTitle>
                        <AlertDescription className="text-blue-600 dark:text-blue-400 text-xs">
                            There are currently no database-configurable settings specifically for this endpoint. Configuration relies on general API settings, authentication, and environment variables.
                        </AlertDescription>
                    </Alert>

                </CardContent>
            </Card>
        </div>
    );
};

export default StowRsInfoPage;
