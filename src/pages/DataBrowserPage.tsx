// frontend/src/pages/DataBrowserPage.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Database, Loader2 } from 'lucide-react';

import QuerySourceSelect from '@/components/QuerySourceSelect';
import QueryForm from '@/components/QueryForm';
import DataBrowserResultsTable from '@/components/DataBrowserResultsTable';
import { submitDataBrowserQuery } from '@/services/api';
import {
    DataBrowserQueryParam,
    DataBrowserQueryResponse,
    StudyResultItem,
    DataBrowserQueryRequest,
    AllowedQuerySourceType,
    QueryLevel
} from '@/schemas/data_browser';
import { toast } from 'sonner';


const parseCompositeId = (compositeId: string | null): { type: string | null, id: number | null } => {
    if (!compositeId) return { type: null, id: null };
    const parts: string[] = compositeId.split('-');
    const idStr: string | null = parts.length > 1 ? parts[parts.length - 1] : null;
    const id: number = idStr ? parseInt(idStr, 10) : NaN;
    const type: string | null = parts.length > 1 ? parts.slice(0, -1).join('-') : null; // Keep hyphen
    return { type: type || null, id: isNaN(id) ? null : id };
};


const DataBrowserPage: React.FC = () => {
    const [selectedCompositeIds, setSelectedCompositeIds] = useState<string[]>([]);
    const [queryResults, setQueryResults] = useState<StudyResultItem[]>([]);
    const [isQuerying, setIsQuerying] = useState<boolean>(false);
    const [queryErrors, setQueryErrors] = useState<string[]>([]);
    const [queryMessages, setQueryMessages] = useState<string[]>([]);
    const [queriedSourcesInfo, setQueriedSourcesInfo] = useState<string>("");


    const handleMultiQuerySubmit = useCallback(async (params: DataBrowserQueryParam[]): Promise<void> => {
        if (selectedCompositeIds.length === 0) {
             toast.error("Please select at least one data source before querying.");
             setQueryErrors(["Please select at least one data source before querying."]);
             setQueryMessages([]);
             setQueriedSourcesInfo("");
             setQueryResults([]); // Keep clearing here on SUBMIT
             return;
        }

        setIsQuerying(true);
        setQueryResults([]); // Clear results when query STARTS
        setQueryErrors([]);
        setQueryMessages([]);
        setQueriedSourcesInfo(`Querying ${selectedCompositeIds.length} source(s)...`);

        const queryPromises = selectedCompositeIds.map((compositeId) => {
            return new Promise<DataBrowserQueryResponse>(async (resolve, reject) => {
                let sourceName = `Source ID ${compositeId}`;
                try {
                    const { type: sourceType, id: sourceId } = parseCompositeId(compositeId);
                    sourceName = `Source ${sourceId} (${sourceType})`;

                    if (sourceId === null || sourceType === null) {
                        throw new Error(`Invalid source selection format (${compositeId})`);
                    }

                    const validatedSourceType = AllowedQuerySourceType.parse(sourceType);

                    const request: DataBrowserQueryRequest = {
                        source_id: sourceId,
                        source_type: validatedSourceType,
                        query_parameters: params,
                        query_level: QueryLevel.STUDY
                    };

                    console.log(`Submitting query for ${sourceName}:`, request);
                    const response = await submitDataBrowserQuery(request);
                    sourceName = response.source_name ?? sourceName;

                    if (response.query_status !== 'success' && response.message) {
                        throw new Error(`Source '${sourceName}': ${response.message}`);
                    }
                    resolve(response);

                } catch (error: any) {
                     const errorMessage = error?.message || `Query failed for ${sourceName}`;
                     console.error(`Query construction or submission failed for ${compositeId}:`, error);
                     reject({ sourceName: sourceName, message: errorMessage });
                }
            });
        });


        const results = await Promise.allSettled(queryPromises);

        const aggregatedResults: StudyResultItem[] = [];
        const errors: string[] = [];
        const infoMessages: string[] = [];
        let successfulSourcesCount = 0;
        let queriedSourceNames: string[] = [];

        results.forEach((result, index) => {
            const compositeId = selectedCompositeIds[index];
            const { id: sourceId, type: sourceType } = parseCompositeId(compositeId);
            let nameForResult = `Source ${sourceId} (${sourceType})`;

            if (result.status === 'fulfilled') {
                const response = result.value as DataBrowserQueryResponse;
                nameForResult = response.source_name ?? nameForResult;
                queriedSourceNames.push(nameForResult);
                aggregatedResults.push(...(response.results || []));
                if (response.message) {
                     infoMessages.push(`${nameForResult}: ${response.message}`);
                }
                successfulSourcesCount++;
            } else {
                const reason = result.reason as { sourceName?: string, message?: string } | Error;
                nameForResult = (reason && typeof reason === 'object' && reason.sourceName) ? reason.sourceName : nameForResult;
                const message = (reason && typeof reason === 'object' && reason.message) ? reason.message : String(reason);
                queriedSourceNames.push(nameForResult);
                errors.push(message);
                 console.error(`Settled Promise Error for ${nameForResult}:`, reason);
            }
        });

        setQueryResults(aggregatedResults);
        setQueryErrors(errors);
        setQueryMessages(infoMessages);
        setQueriedSourcesInfo(`Queried: ${queriedSourceNames.join(', ')} (${successfulSourcesCount}/${selectedCompositeIds.length} successful)`);
        setIsQuerying(false);

        if (errors.length > 0) {
             toast.error(`${errors.length} source(s) failed to query. Check results area for details.`);
        } else if (infoMessages.length > 0) {
            // Optional info toast
        } else {
            toast.success(`Query complete. Found ${aggregatedResults.length} total results across ${successfulSourcesCount} source(s).`);
        }

    }, [selectedCompositeIds]);


    // --- MODIFIED: Removed state clearing ---
    const handleSourceChange = useCallback((compositeIds: string[]): void => {
        setSelectedCompositeIds(compositeIds);
        // setQueryResults([]); // REMOVED
        // setQueryErrors([]); // REMOVED
        // setQueryMessages([]); // REMOVED
        // setQueriedSourcesInfo(""); // REMOVED
    }, []);
    // --- END MODIFIED ---

    const showResults: boolean = isQuerying || queryErrors.length > 0 || queryMessages.length > 0 || queryResults.length > 0 || !!queriedSourcesInfo;

    return (
        <div className="space-y-6">
             <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Data Browser</h1>
             <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                 Query configured and enabled scraper sources (DICOMweb, DIMSE Q/R, Google Healthcare) to view study information.
             </p>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Database className="mr-2 h-5 w-5" /> Query Interface
                    </CardTitle>
                    <CardDescription>
                        Select one or more enabled sources and enter parameters to search for studies. Date defaults to today if left blank.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <QuerySourceSelect
                        selectedCompositeIds={selectedCompositeIds}
                        onSourceChange={handleSourceChange}
                        disabled={isQuerying}
                    />

                    <QueryForm
                        onSubmit={handleMultiQuerySubmit}
                        isQuerying={isQuerying}
                        disabled={selectedCompositeIds.length === 0 || isQuerying}
                    />
                </CardContent>
            </Card>

            {showResults && (
                 <Card>
                     <CardHeader>
                         <CardTitle>Query Results</CardTitle>
                         <CardDescription>
                             {isQuerying ? (
                                <span className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" />{queriedSourcesInfo}</span>
                             ) : (
                                 queriedSourcesInfo || "Query results:"
                             )}
                         </CardDescription>
                     </CardHeader>
                     <CardContent>
                          {queryErrors.length > 0 && !isQuerying && (
                             <div className="mb-4 space-y-2">
                                 <Alert variant="destructive">
                                     <AlertCircle className="h-4 w-4" />
                                     <AlertTitle>Query Errors Encountered</AlertTitle>
                                     <AlertDescription>
                                         <ul className="list-disc pl-5">
                                             {queryErrors.map((error, index) => (
                                                <li key={index}>{error}</li>
                                             ))}
                                         </ul>
                                     </AlertDescription>
                                 </Alert>
                             </div>
                         )}
                          {queryMessages.length > 0 && !isQuerying && (
                             <div className="mb-4 space-y-2">
                                 <Alert variant="default" className="bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700">
                                    <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    <AlertTitle className="text-blue-700 dark:text-blue-300">Query Info</AlertTitle>
                                    <AlertDescription className="text-blue-600 dark:text-blue-400">
                                        <ul className="list-disc pl-5">
                                            {queryMessages.map((msg, index) => (
                                                <li key={index}>{msg}</li>
                                             ))}
                                        </ul>
                                    </AlertDescription>
                                 </Alert>
                             </div>
                          )}
                         <DataBrowserResultsTable
                             results={queryResults}
                             isLoading={isQuerying}
                         />
                     </CardContent>
                 </Card>
             )}
        </div>
    );
};

export default DataBrowserPage;
