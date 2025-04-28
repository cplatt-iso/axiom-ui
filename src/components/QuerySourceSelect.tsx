// src/components/QuerySourceSelect.tsx
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getDicomWebSources, getDimseQrSources } from '@/services/api';
import { DicomWebSourceConfigRead, DimseQueryRetrieveSourceRead } from '@/schemas'; // Import necessary types

interface QuerySourceSelectProps {
    selectedSourceId: number | null | undefined;
    onSourceChange: (sourceId: number | null) => void;
    disabled?: boolean;
}

interface CombinedSourceOption {
    id: number;
    name: string;
    type: 'dicomweb' | 'dimse-qr'; // Distinguish source types
}

const QuerySourceSelect: React.FC<QuerySourceSelectProps> = ({
    selectedSourceId,
    onSourceChange,
    disabled = false
}) => {
    // Fetch DICOMweb sources
    const { data: dicomWebSources, isLoading: isLoadingWeb, error: errorWeb } = useQuery<DicomWebSourceConfigRead[], Error>({
        queryKey: ['dicomWebSourcesListForBrowser'], // Use a distinct query key
        queryFn: () => getDicomWebSources(0, 500),
        staleTime: 300000, // Cache for 5 minutes
        gcTime: 600000,
        refetchOnWindowFocus: false,
    });

    // Fetch DIMSE Q/R sources
    const { data: dimseQrSources, isLoading: isLoadingDimse, error: errorDimse } = useQuery<DimseQueryRetrieveSourceRead[], Error>({
        queryKey: ['dimseQrSourcesListForBrowser'], // Use a distinct query key
        queryFn: () => getDimseQrSources(0, 500),
        staleTime: 300000,
        gcTime: 600000,
        refetchOnWindowFocus: false,
    });

    const isLoading = isLoadingWeb || isLoadingDimse;
    const error = errorWeb || errorDimse;

    // Combine and format sources for the dropdown
    const combinedSources = useMemo(() => {
        const options: CombinedSourceOption[] = [];
        if (dicomWebSources) {
            options.push(...dicomWebSources
                .filter(s => s.is_enabled) // Only show enabled sources
                .map(s => ({ id: s.id, name: s.name, type: 'dicomweb' as const }))
            );
        }
        if (dimseQrSources) {
            options.push(...dimseQrSources
                .filter(s => s.is_enabled) // Only show enabled sources
                .map(s => ({ id: s.id, name: s.name, type: 'dimse-qr' as const }))
            );
        }
        options.sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
        return options;
    }, [dicomWebSources, dimseQrSources]);

    const handleValueChange = (value: string) => {
        const id = parseInt(value, 10);
        onSourceChange(isNaN(id) ? null : id);
    };

    const selectValue = selectedSourceId ? selectedSourceId.toString() : "";

    return (
        <div className="space-y-1">
            <Label htmlFor="query-source-select">Select Source*</Label>
            <Select
                onValueChange={handleValueChange}
                value={selectValue}
                disabled={disabled || isLoading || !!error || combinedSources.length === 0}
                required
            >
                <SelectTrigger id="query-source-select" className="w-full md:w-[300px]">
                    <SelectValue placeholder={
                        isLoading ? "Loading sources..." :
                        error ? "Error loading sources" :
                        combinedSources.length === 0 ? "No enabled sources found" :
                        "Select a query source"
                    } />
                </SelectTrigger>
                <SelectContent>
                    {isLoading ? (
                        <div className="px-2 py-1 text-sm text-gray-500 italic">Loading...</div>
                    ) : error ? (
                        <div className="px-2 py-1 text-sm text-red-600 italic">Error loading</div>
                    ) : combinedSources.length === 0 ? (
                        <div className="px-2 py-1 text-sm text-gray-500 italic">No enabled sources</div>
                    ) : (
                        combinedSources.map(source => (
                            <SelectItem key={`${source.type}-${source.id}`} value={source.id.toString()}>
                                {source.name} ({source.type === 'dicomweb' ? 'Web' : 'DIMSE'})
                            </SelectItem>
                        ))
                    )}
                </SelectContent>
            </Select>
            {error && <p className="text-xs text-red-500 mt-1">Failed to load sources: {error.message}</p>}
        </div>
    );
};

export default QuerySourceSelect;
