// src/pages/DataBrowserPage.tsx
import React, { useState, useCallback, useMemo } from 'react'; // Added useMemo
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Database } from 'lucide-react'; // Removed Loader2 unless used elsewhere

import QuerySourceSelect from '@/components/QuerySourceSelect';
import QueryForm from '@/components/QueryForm';
import DataBrowserResultsTable from '@/components/DataBrowserResultsTable';
import { submitDataBrowserQuery } from '@/services/api';
import { DataBrowserQueryParam, DataBrowserQueryResponse, StudyResultItem } from '@/schemas/data_browser'; // Use specific import
// --- ADDED: Import DataBrowserQueryRequest ---
import { DataBrowserQueryRequest } from '@/schemas/data_browser'; // Assuming this schema exists for the request

// Helper function to parse composite ID (could be moved to utils)
const parseCompositeId = (compositeId: string | null): { type: string | null, id: number | null } => {
    if (!compositeId) return { type: null, id: null };
    const parts = compositeId.split('-');
    const idStr = parts.length > 1 ? parts[parts.length - 1] : null;
    const id = idStr ? parseInt(idStr, 10) : NaN;
    const type = parts.length > 1 ? parts.slice(0, -1).join('-') : null; // Join potential hyphens in type name back
    return { type: type || null, id: isNaN(id) ? null : id };
};


const DataBrowserPage: React.FC = () => {
    // --- MODIFIED: Store composite ID string ---
    const [selectedCompositeId, setSelectedCompositeId] = useState<string | null>(null);
    // --- END MODIFIED ---

    const [queryResults, setQueryResults] = useState<StudyResultItem[]>([]);
    const [lastQueryResponse, setLastQueryResponse] = useState<DataBrowserQueryResponse | null>(null);

    // --- UseMemo to get numeric ID for dependencies/display ---
    const selectedNumericId = useMemo(() => {
        return parseCompositeId(selectedCompositeId).id;
    }, [selectedCompositeId]);
    // --- END ADDED ---

    const queryMutation = useMutation<DataBrowserQueryResponse, Error, DataBrowserQueryParam[]>({
        mutationFn: async (params: DataBrowserQueryParam[]) => {
            // --- MODIFIED: Parse ID just before sending ---
	    const { type: sourceType, id: sourceId } = parseCompositeId(selectedCompositeId);
            if (sourceId === null || sourceType === null) { // Check both now
                throw new Error("No source selected or invalid source selection.");
            }
            // --- Assuming backend still expects only numeric source_id ---
            // --- !! If backend needs type, API call/schema needs update !! ---
            const request: DataBrowserQueryRequest = {
                source_id: sourceId, // Send numeric ID
		source_type: sourceType as 'dicomweb' | 'dimse-qr',
                query_parameters: params,
            };
            console.log("Submitting data browser query:", request);
            return submitDataBrowserQuery(request);
            // --- END MODIFIED ---
        },
        onSuccess: (data) => {
            console.log("Data Browser Query Success:", data);
            setQueryResults(data.results || []);
            setLastQueryResponse(data);
            if(data.query_status !== 'success' && data.message) {
                console.warn(`Query completed with status ${data.query_status}: ${data.message}`);
            }
        },
        onError: (error) => {
            console.error("Data Browser Query Error:", error);
            setQueryResults([]);
            // --- MODIFIED: Use selectedNumericId for error reporting ---
            setLastQueryResponse({
                query_status: 'error',
                message: error.message || "An unknown error occurred during the query.",
                source_id: selectedNumericId ?? -1, // Use parsed ID or placeholder
                source_name: 'Error',
                source_type: 'Error',
                results: []
            });
            // --- END MODIFIED ---
        },
    });

    const handleQuerySubmit = useCallback((params: DataBrowserQueryParam[]) => {
        // --- MODIFIED: Check composite ID ---
        if (selectedCompositeId === null) {
             setLastQueryResponse({
                query_status: 'error',
                message: "Please select a data source before querying.",
                source_id: -1, source_name: 'N/A', source_type: 'N/A', results: []
             });
             return;
        }
        // --- END MODIFIED ---
        setLastQueryResponse(null);
        setQueryResults([]);
        queryMutation.mutate(params);
    // --- MODIFIED: Dependency is now composite ID ---
    }, [selectedCompositeId, queryMutation]);

    // --- MODIFIED: handleSourceChange accepts and sets composite ID ---
    const handleSourceChange = useCallback((compositeId: string | null) => {
        setSelectedCompositeId(compositeId);
        setQueryResults([]);
        setLastQueryResponse(null);
    }, []);
    // --- END MODIFIED ---

    const showResults = queryMutation.isPending || lastQueryResponse !== null;
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
                    {/* --- MODIFIED: Pass composite ID state --- */}
                    <QuerySourceSelect
                        selectedCompositeId={selectedCompositeId} // Pass composite string
                        onSourceChange={handleSourceChange}      // Expects composite string back
                        disabled={queryMutation.isPending}
                    />
                    {/* --- END MODIFIED --- */}

                    {/* Query Form */}
                    {/* --- MODIFIED: Disable based on composite ID --- */}
                    <QueryForm
                        onSubmit={handleQuerySubmit}
                        isQuerying={queryMutation.isPending}
                        disabled={!selectedCompositeId || queryMutation.isPending} // Disable if no composite ID
                    />
                    {/* --- END MODIFIED --- */}
                </CardContent>
            </Card>

            {/* Results Section */}
            {showResults && (
                 <Card>
                     <CardHeader>
                         <CardTitle>Query Results</CardTitle>
                         <CardDescription>
                             {queryMutation.isPending
                                // --- MODIFIED: Display logic might need adjusting if source name/type lookup needed here ---
                                ? `Querying source...` // Simpler message while loading
                                : `Showing results from: ${lastQueryResponse?.source_name ?? 'N/A'} (${lastQueryResponse?.source_type ?? 'N/A'})`
                             }
                         </CardDescription>
                     </CardHeader>
                     <CardContent>
                          {queryErrorMessage && !queryMutation.isPending && (
                              <Alert variant="destructive" className="mb-4">
                                 <AlertCircle className="h-4 w-4" />
                                 <AlertTitle>Query Error</AlertTitle>
                                 <AlertDescription>{queryErrorMessage}</AlertDescription>
                              </Alert>
                         )}
                         {lastQueryResponse?.query_status === 'success' && lastQueryResponse.message && !queryMutation.isPending && (
                             <Alert variant="default" className="mb-4 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700">
                                 <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                 <AlertTitle className="text-blue-700 dark:text-blue-300">Info</AlertTitle>
                                 <AlertDescription className="text-blue-600 dark:text-blue-400">{lastQueryResponse.message}</AlertDescription>
                             </Alert>
                         )}
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
