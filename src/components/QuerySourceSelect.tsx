// src/components/QuerySourceSelect.tsx
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getDicomWebSources, getDimseQrSources } from '@/services/api';
import { DicomWebSourceConfigRead, DimseQueryRetrieveSourceRead } from '@/schemas';

interface QuerySourceSelectProps {
    // --- MODIFIED Props ---
    selectedCompositeId: string | null | undefined; // Expects "{type}-{id}" or null
    onSourceChange: (compositeId: string | null) => void; // Sends back "{type}-{id}" or null
    // --- END MODIFIED ---
    disabled?: boolean;
}

interface CombinedSourceOption {
    id: number; // Original ID
    name: string;
    type: 'dicomweb' | 'dimse-qr';
    compositeId: string; // "{type}-{id}"
}

const QuerySourceSelect: React.FC<QuerySourceSelectProps> = ({
    // --- MODIFIED Props ---
    selectedCompositeId,
    onSourceChange,
    // --- END MODIFIED ---
    disabled = false
}) => {
    // Fetch DICOMweb sources
    const { data: dicomWebSources, isLoading: isLoadingWeb, error: errorWeb } = useQuery<DicomWebSourceConfigRead[], Error>({
        queryKey: ['dicomWebSourcesListForBrowser'],
        queryFn: () => getDicomWebSources(0, 500),
        staleTime: 300000, gcTime: 600000, refetchOnWindowFocus: false,
    });

    // Fetch DIMSE Q/R sources
    const { data: dimseQrSources, isLoading: isLoadingDimse, error: errorDimse } = useQuery<DimseQueryRetrieveSourceRead[], Error>({
        queryKey: ['dimseQrSourcesListForBrowser'],
        queryFn: () => getDimseQrSources(0, 500),
        staleTime: 300000, gcTime: 600000, refetchOnWindowFocus: false,
    });

    const isLoading = isLoadingWeb || isLoadingDimse;
    const error = errorWeb || errorDimse;

    // Combine sources and create composite IDs (no change here needed)
    const combinedSources = useMemo(() => {
        const options: CombinedSourceOption[] = [];
        if (dicomWebSources) {
            options.push(...dicomWebSources
                .filter(s => s.is_enabled)
                .map(s => ({ id: s.id, name: s.name, type: 'dicomweb' as const, compositeId: `dicomweb-${s.id}` }))
            );
        }
        if (dimseQrSources) {
            options.push(...dimseQrSources
                .filter(s => s.is_enabled)
                .map(s => ({ id: s.id, name: s.name, type: 'dimse-qr' as const, compositeId: `dimse-qr-${s.id}` }))
            );
        }
        options.sort((a, b) => a.name.localeCompare(b.name));
        return options;
    }, [dicomWebSources, dimseQrSources]);

    // --- MODIFIED: Simplified handler ---
    // Directly pass the composite value string (or null if placeholder selected)
    const handleValueChange = (compositeValue: string) => {
        onSourceChange(compositeValue || null); // Pass the selected composite ID string, or null if empty
    };
    // --- END MODIFIED ---

    // --- REMOVED: selectedCompositeId calculation memo is gone, use prop directly ---

    return (
        <div className="space-y-1">
            <Label htmlFor="query-source-select">Select Source*</Label>
            <Select
                onValueChange={handleValueChange}
                // --- MODIFIED: Use prop directly ---
                value={selectedCompositeId ?? ""} // Use the composite ID string from props
                // --- END MODIFIED ---
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
                        // Use compositeId for key and value (no change here)
                        combinedSources.map(source => (
                            <SelectItem key={source.compositeId} value={source.compositeId}>
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
