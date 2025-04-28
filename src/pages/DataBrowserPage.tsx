// src/pages/DataBrowserPage.tsx
import React, { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Database, Loader2 } from 'lucide-react'; // Added Loader2

import QuerySourceSelect from '@/components/QuerySourceSelect';
import QueryForm from '@/components/QueryForm';
import DataBrowserResultsTable from '@/components/DataBrowserResultsTable';
import { submitDataBrowserQuery } from '@/services/api';
import { DataBrowserQueryParam, DataBrowserQueryResponse, StudyResultItem } from '@/schemas/data_browser'; // Use specific import

const DataBrowserPage: React.FC = () => {
    const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null);
    const [queryResults, setQueryResults] = useState<StudyResultItem[]>([]);
    // Store the full response to access status/message easily
    const [lastQueryResponse, setLastQueryResponse] = useState<DataBrowserQueryResponse | null>(null);
    // Removed generalError, rely on mutation state and lastQueryResponse.message
    // const [generalError, setGeneralError] = useState<string | null>(null);

    const queryMutation = useMutation<DataBrowserQueryResponse, Error, DataBrowserQueryParam[]>({
        mutationFn: async (params: DataBrowserQueryParam[]) => {
            if (selectedSourceId === null) {
                // This shouldn't happen if button is disabled, but belt-and-suspenders
                throw new Error("No source selected for query.");
            }
            const request: DataBrowserQueryRequest = {
                source_id: selectedSourceId,
                query_parameters: params,
            };
            console.log("Submitting data browser query:", request);
            return submitDataBrowserQuery(request);
        },
        onSuccess: (data) => {
            console.log("Data Browser Query Success:", data);
            setQueryResults(data.results || []);
            setLastQueryResponse(data); // Store the whole response
            if(data.query_status !== 'success' && data.message) {
                // Optionally show non-fatal errors/messages via toast or keep in alert
                console.warn(`Query completed with status ${data.query_status}: ${data.message}`);
            }
        },
        onError: (error) => {
            console.error("Data Browser Query Error:", error);
            setQueryResults([]); // Clear results on error
            // Create a synthetic error response for display
            setLastQueryResponse({
                query_status: 'error',
                message: error.message || "An unknown error occurred during the query.",
                source_id: selectedSourceId ?? -1, // Use selected ID or placeholder
                source_name: 'Error',
                source_type: 'Error',
                results: []
            });
        },
    });

    const handleQuerySubmit = useCallback((params: DataBrowserQueryParam[]) => {
        if (selectedSourceId === null) {
             // Update lastQueryResponse to show the error state
             setLastQueryResponse({
                query_status: 'error',
                message: "Please select a data source before querying.",
                source_id: -1, source_name: 'N/A', source_type: 'N/A', results: []
             });
             return;
        }
        // Reset response state before new query
        setLastQueryResponse(null);
        setQueryResults([]);
        queryMutation.mutate(params);
    }, [selectedSourceId, queryMutation]);

    const handleSourceChange = useCallback((sourceId: number | null) => {
        setSelectedSourceId(sourceId);
        setQueryResults([]); // Clear results when source changes
        setLastQueryResponse(null); // Clear previous response state
    }, []);

    // Determine if we should show the results section
    const showResults = queryMutation.isPending || lastQueryResponse !== null;
    // Extract potential error message from the stored response
    const queryErrorMessage = lastQueryResponse?.query_status === 'error' ? lastQueryResponse.message : null;

    return (
        <div className="space-y-6">
             <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Data Browser</h1>
             <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                 Query configured and enabled scraper sources (DICOMweb, DIMSE Q/R) to view study information.
             </p>

            {/* Query Setup Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Database className="mr-2 h-5 w-5" /> Query Interface
                    </CardTitle>
                    <CardDescription>
                        Select an enabled source and enter parameters to search for studies. Date defaults to today if left blank.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Source Selection */}
                    <QuerySourceSelect
                        selectedSourceId={selectedSourceId}
                        onSourceChange={handleSourceChange}
                        disabled={queryMutation.isPending}
                    />
                    {/* Query Form */}
                    <QueryForm
                        onSubmit={handleQuerySubmit}
                        isQuerying={queryMutation.isPending}
                        disabled={!selectedSourceId || queryMutation.isPending} // Disable if no source or querying
                    />
                </CardContent>
            </Card>

            {/* Results Section - Conditional Rendering */}
            {showResults && (
                 <Card>
                     <CardHeader>
                         <CardTitle>Query Results</CardTitle>
                         <CardDescription>
                             {queryMutation.isPending
                                ? `Querying source ID ${selectedSourceId}...`
                                : `Showing results from: ${lastQueryResponse?.source_name ?? 'N/A'} (${lastQueryResponse?.source_type ?? 'N/A'})`
                             }
                         </CardDescription>
                     </CardHeader>
                     <CardContent>
                          {/* Display Error Alert if query failed */}
                         {queryErrorMessage && !queryMutation.isPending && (
                              <Alert variant="destructive" className="mb-4">
                                 <AlertCircle className="h-4 w-4" />
                                 <AlertTitle>Query Error</AlertTitle>
                                 <AlertDescription>{queryErrorMessage}</AlertDescription>
                              </Alert>
                         )}
                         {/* Display message from successful but potentially partial query */}
                         {lastQueryResponse?.query_status === 'success' && lastQueryResponse.message && !queryMutation.isPending && (
                             <Alert variant="default" className="mb-4 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700">
                                 <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                 <AlertTitle className="text-blue-700 dark:text-blue-300">Info</AlertTitle>
                                 <AlertDescription className="text-blue-600 dark:text-blue-400">{lastQueryResponse.message}</AlertDescription>
                             </Alert>
                         )}
                         {/* Results Table */}
                         <DataBrowserResultsTable
                             results={queryResults}
                             isLoading={queryMutation.isPending}
                         />
                     </CardContent>
                 </Card>
             )}
        </div>
    );
};

export default DataBrowserPage;
