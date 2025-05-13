// frontend/src/components/QuerySourceSelect.tsx
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Database, ChevronsUpDown } from 'lucide-react';

import { getDicomWebSources, getDimseQrSources, getGoogleHealthcareSources } from '@/services/api';
import { DicomWebSourceConfigRead, DimseQueryRetrieveSourceRead, GoogleHealthcareSourceRead } from '@/schemas';

interface QuerySourceSelectProps {
    selectedCompositeIds: string[];
    onSourceChange: (compositeIds: string[]) => void;
    disabled?: boolean;
}

interface SourceOption {
    value: string;
    label: string;
    type: 'dicomweb' | 'dimse-qr' | 'google_healthcare';
    id: number;
}

const QuerySourceSelect: React.FC<QuerySourceSelectProps> = ({ selectedCompositeIds, onSourceChange, disabled }) => {

    const { data: dicomWebSources, isLoading: isLoadingDicomWeb, error: errorDicomWeb } = useQuery<DicomWebSourceConfigRead[]>({
        queryKey: ['dicomWebSourcesEnabled'],
        queryFn: () => getDicomWebSources(),
        select: (data) => data.filter(source => source.is_enabled),
    });

    const { data: dimseQrSources, isLoading: isLoadingDimseQr, error: errorDimseQr } = useQuery<DimseQueryRetrieveSourceRead[]>({
        queryKey: ['dimseQrSourcesEnabled'],
        queryFn: () => getDimseQrSources(),
        select: (data) => data.filter(source => source.is_enabled),
    });

    const { data: ghcSources, isLoading: isLoadingGhc, error: errorGhc } = useQuery<GoogleHealthcareSourceRead[]>({
        queryKey: ['googleHealthcareSourcesEnabled'],
        queryFn: () => getGoogleHealthcareSources(),
        select: (data) => data.filter(source => source.is_enabled),
    });

    const isLoading = isLoadingDicomWeb || isLoadingDimseQr || isLoadingGhc;
    const hasError = !!errorDicomWeb || !!errorDimseQr || !!errorGhc;

    const sourceOptions = useMemo<SourceOption[]>(() => {
        const options: SourceOption[] = [];
        dicomWebSources?.forEach(source => options.push({
            value: `dicomweb-${source.id}`,
            label: `${source.name} [DICOMweb]`,
            type: 'dicomweb',
            id: source.id
        }));
        dimseQrSources?.forEach(source => options.push({
            value: `dimse-qr-${source.id}`,
            label: `${source.name} [DIMSE Q/R]`,
            type: 'dimse-qr',
            id: source.id
        }));
        ghcSources?.forEach(source => options.push({
            value: `google_healthcare-${source.id}`,
            label: `${source.name} [Google HC]`,
            type: 'google_healthcare',
            id: source.id
        }));
        options.sort((a, b) => a.label.localeCompare(b.label));
        return options;
    }, [dicomWebSources, dimseQrSources, ghcSources]);

    const handleCheckboxChange = (checked: boolean, compositeId: string): void => {
        let newSelectedIds: string[];
        if (checked) {
            newSelectedIds = [...selectedCompositeIds, compositeId];
        } else {
            newSelectedIds = selectedCompositeIds.filter(id => id !== compositeId);
        }
        onSourceChange(newSelectedIds);
    };

    const triggerText = useMemo<string>(() => {
        if (selectedCompositeIds.length === 0) {
            return "Select data sources...";
        }
        if (selectedCompositeIds.length === 1) {
            const selectedOption = sourceOptions.find(opt => opt.value === selectedCompositeIds[0]);
            return selectedOption?.label ?? "1 source selected";
        }
        return `${selectedCompositeIds.length} sources selected`;
    }, [selectedCompositeIds, sourceOptions]);

    if (isLoading) {
        return (
            <div className="space-y-2">
                <Label htmlFor="query-source-trigger">Select Data Sources</Label>
                <Skeleton className="h-10 w-full" />
                 <p className="text-xs text-muted-foreground">Loading available sources...</p>
            </div>
        );
    }

    if (hasError) {
        return (
             <div className="space-y-2">
                <Label htmlFor="query-source-trigger" className="text-destructive">Select Data Sources</Label>
                 <div className="flex items-center space-x-2 rounded-md border border-destructive p-2">
                     <AlertTriangle className="h-5 w-5 text-destructive" />
                     <span className="text-sm text-destructive">Error loading sources.</span>
                 </div>
                  <p className="text-xs text-destructive">
                    {errorDicomWeb?.message || errorDimseQr?.message || errorGhc?.message || 'Could not load sources.'}
                  </p>
             </div>
        );
    }

    return (
        <div className="space-y-2">
            <Label htmlFor="query-source-trigger" className="flex items-center">
                 <Database className="mr-2 h-4 w-4 text-muted-foreground"/> Select Data Sources*
            </Label>
            <DropdownMenu>
                <DropdownMenuTrigger asChild disabled={disabled || sourceOptions.length === 0}>
                    <Button
                        id="query-source-trigger"
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                     >
                         <span className="truncate">{triggerText}</span>
                         <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                {/* --- MODIFIED: Added align="start" and ensured width class --- */}
                <DropdownMenuContent
                    align="start" // Align dropdown to the start of the trigger
                    className="w-[--radix-dropdown-menu-trigger-width] max-h-[40vh] overflow-y-auto" // Ensure width matches trigger
                >
                {/* --- END MODIFIED --- */}
                    <DropdownMenuLabel>Available Sources</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {sourceOptions.length === 0 ? (
                         <p className="p-4 text-sm text-muted-foreground">No enabled sources found.</p>
                    ) : (
                        sourceOptions.map((option) => (
                            <DropdownMenuCheckboxItem
                                key={option.value}
                                checked={selectedCompositeIds.includes(option.value)}
                                onCheckedChange={(checked) => handleCheckboxChange(!!checked, option.value)}
                                onSelect={(e) => e.preventDefault()}
                            >
                                {option.label}
                            </DropdownMenuCheckboxItem>
                        ))
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
             <p className="text-xs text-muted-foreground">
                 Choose one or more sources to query simultaneously.
             </p>
        </div>
    );
};

export default QuerySourceSelect;
