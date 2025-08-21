// src/components/DataBrowserResultsTable.tsx
import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, Loader2, Database, Layers, Image } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDicomDateTime } from '../utils/dicom';
import { 
    StudyResultItem, 
    SeriesResultItem, 
    InstanceResultItem,
    DataBrowserQueryRequest,
    DataBrowserQueryResponse,
    QueryLevel,
    AllowedQuerySourceType
} from '@/schemas/data_browser';
import { submitDataBrowserQuery } from '@/services/api';
import { toast } from 'sonner';

interface DataBrowserResultsTableProps {
    data: StudyResultItem[];
    isFetching: boolean;
    error: Error | null;
    sourceName: string;
    sourceType: string;
}

interface SeriesState {
    expanded: boolean;
    instances?: InstanceResultItem[];
    loading?: boolean;
}

interface StudyState {
    expanded: boolean;
    series?: SeriesResultItem[];
    loading?: boolean;
    seriesExpanded?: Record<string, SeriesState>;
}

interface ExpandedState {
    [studyUID: string]: StudyState;
}

const DataBrowserResultsTable: React.FC<DataBrowserResultsTableProps> = ({
    data,
    isFetching,
    error,
    sourceName,
    sourceType
}) => {
    const [expandedState, setExpandedState] = useState<ExpandedState>({});

    const fetchSeriesData = useCallback(async (study: StudyResultItem) => {
        const studyUID = study.StudyInstanceUID || study["0020000D"] as string;
        
        if (!studyUID) {
            toast.error('Study Instance UID is missing');
            return;
        }
        
        setExpandedState(prev => ({
            ...prev,
            [studyUID]: { 
                ...prev[studyUID], 
                loading: true,
                expanded: prev[studyUID]?.expanded ?? false
            }
        }));

        try {
            const request: DataBrowserQueryRequest = {
                source_id: study.source_id,
                source_type: study.source_type as AllowedQuerySourceType,
                query_parameters: [
                    { field: "StudyInstanceUID", value: studyUID }
                ],
                query_level: QueryLevel.SERIES
            };

            const response: DataBrowserQueryResponse = await submitDataBrowserQuery(request);
            const seriesData = response.results as unknown as SeriesResultItem[];

            // Check for conversion errors in the response
            const hasConversionErrors = seriesData.some(series => 
                series["00100010"] === "Error^Converting^Result" || 
                series["00100020"] === "CONVERSION_ERROR"
            );

            if (hasConversionErrors) {
                console.warn('Series query returned conversion errors:', response);
                toast.error('Some series data could not be properly converted from the source');
            }

            setExpandedState(prev => ({
                ...prev,
                [studyUID]: {
                    ...prev[studyUID],
                    series: seriesData,
                    loading: false,
                    expanded: true
                }
            }));
        } catch (error) {
            console.error('Failed to fetch series data:', error);
            toast.error('Failed to load series data');
            setExpandedState(prev => ({
                ...prev,
                [studyUID]: {
                    ...prev[studyUID],
                    loading: false,
                    expanded: false
                }
            }));
        }
    }, []);

    const fetchInstanceData = useCallback(async (study: StudyResultItem, series: SeriesResultItem) => {
        const studyUID = study.StudyInstanceUID || study["0020000D"] as string;
        const seriesUID = series.SeriesInstanceUID || series["0020000E"] as string;
        
        if (!studyUID || !seriesUID) {
            toast.error('Study or Series Instance UID is missing');
            return;
        }
        
        setExpandedState(prev => ({
            ...prev,
            [studyUID]: {
                ...prev[studyUID],
                seriesExpanded: {
                    ...prev[studyUID]?.seriesExpanded,
                    [seriesUID]: {
                        expanded: prev[studyUID]?.seriesExpanded?.[seriesUID]?.expanded ?? false,
                        instances: prev[studyUID]?.seriesExpanded?.[seriesUID]?.instances,
                        loading: true
                    }
                }
            }
        }));

        try {
            const request: DataBrowserQueryRequest = {
                source_id: study.source_id,
                source_type: study.source_type as AllowedQuerySourceType,
                query_parameters: [
                    { field: "StudyInstanceUID", value: studyUID },
                    { field: "SeriesInstanceUID", value: seriesUID }
                ],
                query_level: QueryLevel.INSTANCE
            };

            const response: DataBrowserQueryResponse = await submitDataBrowserQuery(request);
            const instanceData = response.results as unknown as InstanceResultItem[];

            setExpandedState(prev => ({
                ...prev,
                [studyUID]: {
                    ...prev[studyUID],
                    seriesExpanded: {
                        ...prev[studyUID]?.seriesExpanded,
                        [seriesUID]: {
                            expanded: true,
                            instances: instanceData,
                            loading: false
                        }
                    }
                }
            }));
        } catch (error) {
            console.error('Failed to fetch instance data:', error);
            toast.error('Failed to load instance data');
            setExpandedState(prev => ({
                ...prev,
                [studyUID]: {
                    ...prev[studyUID],
                    seriesExpanded: {
                        ...prev[studyUID]?.seriesExpanded,
                        [seriesUID]: {
                            expanded: false,
                            instances: prev[studyUID]?.seriesExpanded?.[seriesUID]?.instances,
                            loading: false
                        }
                    }
                }
            }));
        }
    }, []);

    const toggleStudyExpansion = useCallback((study: StudyResultItem) => {
        const studyUID = study.StudyInstanceUID || study["0020000D"] as string;
        
        if (!studyUID) {
            toast.error('Study Instance UID is missing');
            return;
        }
        
        const currentState = expandedState[studyUID];

        if (!currentState?.expanded && !currentState?.series) {
            // First time expanding - fetch series data
            fetchSeriesData(study);
        } else {
            // Toggle expansion
            setExpandedState(prev => ({
                ...prev,
                [studyUID]: {
                    ...prev[studyUID],
                    expanded: !prev[studyUID]?.expanded
                }
            }));
        }
    }, [expandedState, fetchSeriesData]);

    const toggleSeriesExpansion = useCallback((study: StudyResultItem, series: SeriesResultItem) => {
        const studyUID = study.StudyInstanceUID || study["0020000D"] as string;
        const seriesUID = series.SeriesInstanceUID || series["0020000E"] as string;
        
        if (!studyUID || !seriesUID) {
            toast.error('Study or Series Instance UID is missing');
            return;
        }
        
        const currentState = expandedState[studyUID]?.seriesExpanded?.[seriesUID];

        if (!currentState?.expanded && !currentState?.instances) {
            // First time expanding - fetch instance data
            fetchInstanceData(study, series);
        } else {
            // Toggle expansion
            setExpandedState(prev => ({
                ...prev,
                [studyUID]: {
                    ...prev[studyUID],
                    seriesExpanded: {
                        ...prev[studyUID]?.seriesExpanded,
                        [seriesUID]: {
                            expanded: !prev[studyUID]?.seriesExpanded?.[seriesUID]?.expanded,
                            instances: prev[studyUID]?.seriesExpanded?.[seriesUID]?.instances,
                            loading: prev[studyUID]?.seriesExpanded?.[seriesUID]?.loading
                        }
                    }
                }
            }));
        }
    }, [expandedState, fetchInstanceData]);

    if (isFetching) {
        return <div className="text-center p-4">Loading results...</div>;
    }

    if (error) {
        return <div className="text-center p-4 text-red-500">Error fetching results: {error.message}</div>;
    }

    if (data.length === 0) {
        return <div className="text-center p-4">No results found.</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold">Query Results</h3>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <Badge variant="outline" className="text-xs">
                                {sourceType}: {sourceName}
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Results from {sourceType} source: {sourceName}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
            
            <div className="space-y-2">
                {data.map((study) => {
                    const studyUID = study.StudyInstanceUID || study["0020000D"] as string;
                    const studyState = expandedState[studyUID];
                    const isStudyExpanded = studyState?.expanded || false;
                    
                    return (
                        <div key={studyUID} className="border rounded-lg">
                            {/* Study Level Row */}
                            <div
                                className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                                onClick={() => toggleStudyExpansion(study)}
                            >
                                <div className="flex items-center space-x-2 flex-1">
                                    {studyState?.loading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        isStudyExpanded ? (
                                            <ChevronDown className="h-4 w-4" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4" />
                                        )
                                    )}
                                    <Database className="h-4 w-4 text-blue-600" />
                                    <div className="grid grid-cols-8 gap-4 flex-1 items-center text-xs font-mono">
                                        <div className="truncate">
                                            <div className="font-semibold">{study["00100010"] as string || 'UNKNOWN'}</div>
                                            <div className="text-gray-500">{study["00100020"] as string || 'N/A'}</div>
                                        </div>
                                        <div>{formatDicomDateTime(study["00100030"] as string | null, null)}</div>
                                        <div>{formatDicomDateTime(study["00080020"] as string | null, study["00080030"] as string | null)}</div>
                                        <div className="truncate">{study["00080050"] as string || 'N/A'}</div>
                                        <div className="truncate">{study["00081030"] as string || 'N/A'}</div>
                                        <div>{Array.isArray(study["00080061"]) ? (study["00080061"] as string[]).join(', ') : String(study["00080061"] ?? 'N/A')}</div>
                                        <div className="flex space-x-2">
                                            <span className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded text-xs">
                                                {study["00201206"] as string || 'N/A'} Ser
                                            </span>
                                            <span className="bg-green-100 text-green-800 px-1 py-0.5 rounded text-xs">
                                                {study["00201208"] as string || 'N/A'} Img
                                            </span>
                                        </div>
                                        <div className="truncate text-xs">{study["0020000D"] as string || 'N/A'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Series Level Rows */}
                            {isStudyExpanded && studyState?.series && (
                                <div className="border-t bg-gray-50 dark:bg-gray-900">
                                    {studyState.series.map((series) => {
                                        const seriesUID = series.SeriesInstanceUID || series["0020000E"] as string;
                                        const seriesState = studyState.seriesExpanded?.[seriesUID];
                                        const isSeriesExpanded = seriesState?.expanded || false;
                                        
                                        return (
                                            <div key={seriesUID || `series-${Math.random()}`}>
                                                {/* Series Row */}
                                                <div
                                                    className="flex items-center p-3 pl-8 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                                                    onClick={() => toggleSeriesExpansion(study, series)}
                                                >
                                                    <div className="flex items-center space-x-2 flex-1">
                                                        {seriesState?.loading ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            isSeriesExpanded ? (
                                                                <ChevronDown className="h-4 w-4" />
                                                            ) : (
                                                                <ChevronRight className="h-4 w-4" />
                                                            )
                                                        )}
                                                        <Layers className="h-4 w-4 text-green-600" />
                                                        <div className="grid grid-cols-6 gap-4 flex-1 items-center text-xs font-mono">
                                                            <div className="truncate">
                                                                {series["00100010"] === "Error^Converting^Result" ? (
                                                                    <div className="text-red-500">
                                                                        <div className="font-semibold">Conversion Error</div>
                                                                        <div>Series data unavailable</div>
                                                                    </div>
                                                                ) : (
                                                                    <div>
                                                                        <div className="font-semibold">Series #{series["00200011"] as string || 'N/A'}</div>
                                                                        <div className="text-gray-600">{series["00080060"] as string || 'N/A'}</div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div>{formatDicomDateTime(series["00080021"] as string | null, series["00080031"] as string | null)}</div>
                                                            <div className="truncate">{series["0008103E"] as string || series["00081030"] as string || 'N/A'}</div>
                                                            <div>{series["00180015"] as string || 'N/A'}</div>
                                                            <div>
                                                                <span className="bg-purple-100 text-purple-800 px-1 py-0.5 rounded text-xs">
                                                                    {series["00201209"] as string || 'N/A'} Images
                                                                </span>
                                                            </div>
                                                            <div className="truncate text-xs">{series["0020000E"] as string || series["0020000D"] as string || 'N/A'}</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Instance Level Rows */}
                                                {isSeriesExpanded && seriesState?.instances && (
                                                    <div className="border-t bg-gray-100 dark:bg-gray-800">
                                                        {seriesState.instances.map((instance) => (
                                                            <div key={instance["00080018"] as string || instance.SOPInstanceUID || `instance-${Math.random()}`} className="flex items-center p-2 pl-16">
                                                                <div className="flex items-center space-x-2 flex-1">
                                                                    <Image className="h-4 w-4 text-orange-600" />
                                                                    <div className="grid grid-cols-6 gap-4 flex-1 items-center text-xs font-mono">
                                                                        <div>
                                                                            <div className="font-semibold">Instance #{instance["00200013"] as string || 'N/A'}</div>
                                                                            <div className="text-gray-600">{instance["00080060"] as string || 'Unknown'}</div>
                                                                        </div>
                                                                        <div className="truncate">
                                                                            <div className="font-medium">SOP Class</div>
                                                                            <div className="text-xs text-gray-500">{instance["00080016"] as string || 'N/A'}</div>
                                                                        </div>
                                                                        <div className="truncate">
                                                                            <div className="font-medium">Content Date/Time</div>
                                                                            <div className="text-xs">{formatDicomDateTime(instance["00080023"] as string | null, instance["00080033"] as string | null) || formatDicomDateTime(instance["00080020"] as string | null, instance["00080030"] as string | null) || 'N/A'}</div>
                                                                        </div>
                                                                        <div className="truncate">
                                                                            <div className="font-medium">Study/Series ID</div>
                                                                            <div className="text-xs text-gray-500">St:{instance["00200010"] as string || 'N/A'} Sr:{instance["00200011"] as string || 'N/A'}</div>
                                                                        </div>
                                                                        <div className="truncate">
                                                                            <div className="font-medium">SOP Instance UID</div>
                                                                            <div className="text-xs text-gray-500 truncate">{instance["00080018"] as string || instance.SOPInstanceUID || 'N/A'}</div>
                                                                        </div>
                                                                        <div className="text-xs text-gray-500">
                                                                            <div className="font-medium">Source</div>
                                                                            <div>{instance.source_name}</div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default DataBrowserResultsTable;
