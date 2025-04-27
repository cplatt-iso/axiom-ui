// src/pages/JsonApiInfoPage.tsx
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Server, CheckCircle, Code } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const JsonApiInfoPage: React.FC = () => {
    const endpointUrl = "/api/v1/rules-engine/process-json"; // Define the endpoint path
    const authEnabled = true; // Assume auth is always enabled via deps

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Code className="mr-2 h-5 w-5" /> JSON Processing API Endpoint Information
                    </CardTitle>
                    <CardDescription>
                        Details about the endpoint for processing DICOM JSON headers directly against the rule engine.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Endpoint URL</h3>
                        <code className="text-sm bg-gray-100 dark:bg-gray-900 p-2 rounded font-mono block overflow-x-auto">
                            {endpointUrl}
                        </code>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            This is the relative path within the Axiom Flow API where clients should send JSON processing requests.
                        </p>
                    </div>

                    <div>
                        <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Request Format</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Requires a POST request with <code className="text-xs bg-gray-100 dark:bg-gray-900 p-0.5 rounded">Content-Type</code> header set to <code className="text-xs bg-gray-100 dark:bg-gray-900 p-0.5 rounded">application/json</code>. The request body should contain a JSON object with the following keys:
                        </p>
                        <ul className="list-disc pl-5 mt-1 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                            <li><code className="text-xs bg-gray-100 dark:bg-gray-900 p-0.5 rounded">dicom_json</code> (object, required): The DICOM header data as a JSON object (compatible with pydicom's <code className="text-xs bg-gray-100 dark:bg-gray-900 p-0.5 rounded">to_json_dict()</code>).</li>
                            <li><code className="text-xs bg-gray-100 dark:bg-gray-900 p-0.5 rounded">ruleset_id</code> (integer, optional): The specific ID of a ruleset to apply. If omitted, all active rulesets are evaluated based on priority and execution mode.</li>
                            <li><code className="text-xs bg-gray-100 dark:bg-gray-900 p-0.5 rounded">source_identifier</code> (string, optional): A string identifying the source for rule matching purposes (defaults to <code className="text-xs bg-gray-100 dark:bg-gray-900 p-0.5 rounded">api_json</code>).</li>
                        </ul>
                    </div>

                     <div>
                        <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Authentication</h3>
                         <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                            {authEnabled ? <CheckCircle className="h-4 w-4 mr-1 text-green-500" /> : <AlertCircle className="h-4 w-4 mr-1 text-yellow-500" />}
                            <span>Required (API Key or User JWT).</span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Access is controlled via the standard API authentication mechanisms.
                        </p>
                    </div>

                    <div>
                        <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Processing</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            The endpoint directly applies the rule engine logic (matching and modifications) to the provided JSON data synchronously and returns the original and potentially morphed JSON header. Destinations are ignored in this process. This is primarily intended for testing and debugging rules.
                        </p>
                    </div>

                    <Alert variant="default" className="bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700">
                        <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <AlertTitle className="text-blue-700 dark:text-blue-300 text-sm">Note</AlertTitle>
                        <AlertDescription className="text-blue-600 dark:text-blue-400 text-xs">
                            There are no database-configurable settings specifically for this endpoint. It functions as a utility for the rule engine.
                        </AlertDescription>
                    </Alert>

                </CardContent>
            </Card>
        </div>
    );
};

export default JsonApiInfoPage;
