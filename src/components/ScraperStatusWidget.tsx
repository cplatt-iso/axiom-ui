// src/components/ScraperStatusWidget.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle, PowerOff, PauseCircle, Link as LinkIcon, Inbox, FileCog, FileCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { formatNumber } from '@/utils/formatters'; // Assuming this exists and is correct now

// UI Components
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

// API/Schema/Type Imports
import { getDicomWebSources, getDimseQrSources } from '@/services/api';
import { DicomWebSourceConfigRead, DimseQueryRetrieveSourceRead } from '@/schemas';
import { UnifiedScraperStatus } from '@/types/scrapers'; // Make sure this path is correct
import { getScraperTypeStyle, ScraperType } from '@/utils/styleHelpers'; // Make sure this path is correct

// Helper function to format status/error info
const formatStatus = (scraper: UnifiedScraperStatus): { text: string; Icon: React.ElementType; variant: 'default' | 'destructive' | 'secondary' | 'outline'; tooltip?: string } => {
    const now = new Date();
    let errorTooltip: string | undefined = undefined;

    if (scraper.last_error_time) {
        const errorDate = new Date(scraper.last_error_time);
        let isErrorCurrent = true;
        if (scraper.last_successful_run) {
             const successDate = new Date(scraper.last_successful_run);
             if (successDate > errorDate) {
                 isErrorCurrent = false;
             }
        }
         if (isErrorCurrent) {
             errorTooltip = `Error at ${formatDistanceToNow(errorDate, { addSuffix: true })}: ${scraper.last_error_message || 'Unknown Error'}`;
             return { text: 'Error', Icon: AlertTriangle, variant: 'destructive', tooltip: errorTooltip };
         }
    }

    if (!scraper.is_enabled) {
        return { text: 'Disabled', Icon: PowerOff, variant: 'secondary', tooltip: 'Source is disabled globally.' };
    }
    if (!scraper.is_active) {
        return { text: 'Inactive', Icon: PauseCircle, variant: 'outline', tooltip: 'Source is enabled but automatic polling is inactive.' };
    }

    let successTooltip = 'Polling is active.';
     if (scraper.last_successful_run) {
        const successDate = new Date(scraper.last_successful_run);
         successTooltip += ` Last successful poll: ${formatDistanceToNow(successDate, { addSuffix: true })}`;
    } else {
         successTooltip += ' No successful poll recorded yet.';
     }

    return { text: 'Active', Icon: CheckCircle, variant: 'default', tooltip: successTooltip };
};

// Helper to format connection details
const formatConnectionDetails = (scraper: UnifiedScraperStatus): string => {
    if (scraper.scraperType === 'dicomweb') {
        return scraper.base_url ?? 'N/A';
    } else if (scraper.scraperType === 'dimse-qr') {
        const ae = scraper.remote_ae_title ?? '?AE?';
        const host = scraper.remote_host ?? '?HOST?';
        const port = scraper.remote_port ?? '?PORT?';
        return `${ae}@${host}:${port}`;
    }
    // Add future scraper types here
    return 'N/A';
};

// Helper for Counter Tooltips
const getCounterTooltip = (scraperType: ScraperType, counterType: 'found' | 'queued' | 'processed'): string => {
    switch(counterType) {
        case 'found':
            return scraperType === 'dimse-qr' ? 'Studies found via C-FIND' : 'Instances found via QIDO-RS';
        case 'queued':
            return scraperType === 'dimse-qr' ? 'Studies queued for C-MOVE' : 'Instances queued for metadata processing';
        case 'processed':
            return 'Instances successfully processed after retrieval/queueing';
        default:
            return '';
    }
};


const ScraperStatusWidget: React.FC = () => {

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['allScraperStatuses'],
        queryFn: async (): Promise<UnifiedScraperStatus[]> => {
            // Optional: Keep a log indicating the fetch starts if desired
            // console.log("Fetching all scraper statuses...");
            try {
                const skipVal = 0;
                const limitVal = 500; // Fetch a reasonable max

                // Removed specific debug logs about parameters
                const dicomWebResult = await getDicomWebSources(skipVal, limitVal);
                const dimseQrResult = await getDimseQrSources(skipVal, limitVal);

                // Transform DICOMweb sources
                const unifiedDicomWeb: UnifiedScraperStatus[] = (dicomWebResult || []).map((s: DicomWebSourceConfigRead) => ({
                    id: s.id,
                    name: s.name ?? s.source_name,
                    scraperType: 'dicomweb',
                    is_enabled: s.is_enabled,
                    is_active: s.is_active,
                    last_successful_run: s.last_successful_run,
                    last_error_time: s.last_error_run,
                    last_error_message: s.last_error_message,
                    description: s.description,
                    base_url: s.base_url,
                    count_found: s.found_instance_count ?? 0,
                    count_queued: s.queued_instance_count ?? 0,
                    count_processed: s.processed_instance_count ?? 0,
                }));

                // Transform DIMSE Q/R sources
                const unifiedDimseQr: UnifiedScraperStatus[] = (dimseQrResult || []).map((s: DimseQueryRetrieveSourceRead) => ({
                    id: s.id,
                    name: s.name,
                    scraperType: 'dimse-qr',
                    is_enabled: s.is_enabled,
                    is_active: s.is_active,
                    last_successful_run: s.last_successful_query ?? s.last_successful_move,
                    last_error_time: s.last_error_time,
                    last_error_message: s.last_error_message,
                    description: s.description,
                    remote_ae_title: s.remote_ae_title,
                    remote_host: s.remote_host,
                    remote_port: s.remote_port,
                    count_found: s.found_study_count ?? 0,
                    count_queued: s.move_queued_study_count ?? 0,
                    count_processed: s.processed_instance_count ?? 0,
                }));

                 const combined = [...unifiedDicomWeb, ...unifiedDimseQr];
                 combined.sort((a, b) => a.name.localeCompare(b.name));
                 // Optional: Keep log for combined results if useful during development
                 // console.log("Combined scraper statuses:", combined);
                 return combined;

            } catch (err) {
                 // Keep error logs
                 console.error("Failed to fetch scraper statuses:", err);
                 if (err instanceof Error) { console.error(`Error type: ${err.name}, message: ${err.message}`); }
                 else { console.error("Caught non-Error object:", err); }
                 throw err; // Re-throw error for React Query to handle properly
            }
        },
        refetchInterval: 60000, // Keep refetch interval
        refetchIntervalInBackground: false,
    });

    // --- Render Logic ---
    return (
        <Card className="col-span-1 md:col-span-2">
            {/* Explicit closing tag */}
            <CardHeader>
                {/* Explicit closing tag */}
                <CardTitle>Scraper Status</CardTitle>
                <CardDescription>Overview of DICOMweb and DIMSE Q/R polling sources.</CardDescription>
            </CardHeader>
            <CardContent>
                {/* Explicit closing tag */}
                {isLoading && (
                     <div className="space-y-2">
                        {/* Explicit closing tag */}
                        <Skeleton className="h-8 w-full"></Skeleton>
                        {/* Explicit closing tag */}
                        <Skeleton className="h-8 w-full"></Skeleton>
                        {/* Explicit closing tag */}
                        <Skeleton className="h-8 w-5/6"></Skeleton>
                        {/* Explicit closing tag */}
                    </div>
                )}
                 {isError && (
                     <div className="text-red-600 dark:text-red-400 flex items-center space-x-2">
                        {/* Explicit closing tag */}
                        <AlertTriangle className="h-5 w-5"></AlertTriangle>
                        {/* Explicit closing tag */}
                        <span>Error loading scraper statuses: {error?.message ?? 'Unknown error'}</span>
                    </div>
                 )}
                 {!isLoading && !isError && data && (
                     <TooltipProvider delayDuration={100}>
                        {/* Explicit closing tag */}
                        {/* Using table-fixed layout */}
                        <Table className="table-fixed w-full">
                            {/* Explicit closing tag */}
                            <TableHeader>
                                {/* Explicit closing tag */}
                                <TableRow>
                                    {/* Explicit closing tag */}
                                    <TableHead className="w-[50px] px-2 text-center">Type</TableHead>
                                    <TableHead className="w-[30%]">Name</TableHead>
                                    <TableHead className="w-[35%]">Connection Info</TableHead>
                                    <TableHead className="w-[60px] text-center">Found</TableHead>
                                    <TableHead className="w-[60px] text-center">Queued</TableHead>
                                    <TableHead className="w-[60px] text-center">Proc</TableHead>
                                    <TableHead className="w-[100px] text-center">Status</TableHead>
                                </TableRow>
                                {/* Explicit closing tag */}
                            </TableHeader>
                            <TableBody>
                                {/* Explicit closing tag */}
                                {data.length === 0 && (
                                    <TableRow>
                                        {/* Explicit closing tag */}
                                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                                            No scrapers configured.
                                        </TableCell>
                                        {/* Explicit closing tag */}
                                    </TableRow>
                                )}
                                {data.map((scraper) => {
                                     const style = getScraperTypeStyle(scraper.scraperType);
                                     const statusInfo = formatStatus(scraper);
                                     const connectionDetails = formatConnectionDetails(scraper);
                                     return (
                                        <TableRow key={`${scraper.scraperType}-${scraper.id}`}>
                                            {/* Explicit closing tag */}
                                            {/* Type Cell */}
                                            <TableCell className="px-2 text-center">
                                                {/* Explicit closing tag */}
                                                 <Tooltip>
                                                    {/* Explicit closing tag */}
                                                     <TooltipTrigger asChild={true}>
                                                        {/* Explicit closing tag */}
                                                         <div className="inline-block">
                                                            {/* Explicit closing tag */}
                                                            <style.Icon className={`h-5 w-5 ${style.textClass} `}></style.Icon>
                                                            {/* Explicit closing tag */}
                                                         </div>
                                                     </TooltipTrigger>
                                                     <TooltipContent>
                                                        {/* Explicit closing tag */}
                                                         <p>{scraper.scraperType.toUpperCase()}</p>
                                                     </TooltipContent>
                                                     {/* Explicit closing tag */}
                                                 </Tooltip>
                                                 {/* Explicit closing tag */}
                                            </TableCell>
                                            {/* Name Cell */}
                                            <TableCell className="font-medium truncate">
                                                {/* Explicit closing tag */}
                                                <Tooltip>
                                                    {/* Explicit closing tag */}
                                                    <TooltipTrigger className="cursor-default">{scraper.name}</TooltipTrigger>
                                                    <TooltipContent>{scraper.name}</TooltipContent>
                                                    {/* Explicit closing tag */}
                                                </Tooltip>
                                                {/* Explicit closing tag */}
                                            </TableCell>
                                            {/* Connection Cell */}
                                            <TableCell className="text-xs text-muted-foreground truncate">
                                                {/* Explicit closing tag */}
                                                <Tooltip>
                                                    {/* Explicit closing tag */}
                                                    <TooltipTrigger className="flex items-center space-x-1 cursor-default w-full">
                                                        {/* Explicit closing tag */}
                                                         <LinkIcon className="h-3 w-3 flex-shrink-0 text-muted-foreground"></LinkIcon>
                                                         {/* Explicit closing tag */}
                                                         <span className="truncate">{connectionDetails}</span>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="bottom" align="start">
                                                        {/* Explicit closing tag */}
                                                        <p className="max-w-md break-words">{connectionDetails}</p>
                                                    </TooltipContent>
                                                    {/* Explicit closing tag */}
                                                </Tooltip>
                                                {/* Explicit closing tag */}
                                            </TableCell>
                                            {/* Counter Cells */}
                                            <TableCell className="text-center text-sm">
                                                {/* Explicit closing tag */}
                                                 <Tooltip>
                                                    {/* Explicit closing tag */}
                                                     <TooltipTrigger className="cursor-default">{formatNumber(scraper.count_found ?? 0)}</TooltipTrigger>
                                                     <TooltipContent><p>{getCounterTooltip(scraper.scraperType, 'found')}</p></TooltipContent>
                                                     {/* Explicit closing tag */}
                                                 </Tooltip>
                                                 {/* Explicit closing tag */}
                                            </TableCell>
                                             <TableCell className="text-center text-sm">
                                                {/* Explicit closing tag */}
                                                 <Tooltip>
                                                    {/* Explicit closing tag */}
                                                     <TooltipTrigger className="cursor-default">{formatNumber(scraper.count_queued ?? 0)}</TooltipTrigger>
                                                     <TooltipContent><p>{getCounterTooltip(scraper.scraperType, 'queued')}</p></TooltipContent>
                                                     {/* Explicit closing tag */}
                                                 </Tooltip>
                                                 {/* Explicit closing tag */}
                                             </TableCell>
                                             <TableCell className="text-center text-sm">
                                                {/* Explicit closing tag */}
                                                 <Tooltip>
                                                    {/* Explicit closing tag */}
                                                     <TooltipTrigger className="cursor-default">{formatNumber(scraper.count_processed ?? 0)}</TooltipTrigger>
                                                     <TooltipContent><p>{getCounterTooltip(scraper.scraperType, 'processed')}</p></TooltipContent>
                                                     {/* Explicit closing tag */}
                                                 </Tooltip>
                                                 {/* Explicit closing tag */}
                                             </TableCell>
                                            {/* Status Cell */}
                                            <TableCell className="text-center">
                                                {/* Explicit closing tag */}
                                                 <Tooltip>
                                                    {/* Explicit closing tag */}
                                                     <TooltipTrigger asChild={true}>
                                                        {/* Explicit closing tag */}
                                                         <Badge variant={statusInfo.variant} className="cursor-default">
                                                            {/* Explicit closing tag */}
                                                             <statusInfo.Icon className="mr-1 h-3 w-3"></statusInfo.Icon>
                                                             {/* Explicit closing tag */}
                                                             {statusInfo.text}
                                                         </Badge>
                                                         {/* Explicit closing tag */}
                                                     </TooltipTrigger>
                                                     {statusInfo.tooltip && (
                                                         <TooltipContent side="left">
                                                            {/* Explicit closing tag */}
                                                             <p className="max-w-xs break-words">{statusInfo.tooltip}</p>
                                                         </TooltipContent>
                                                     )}
                                                 </Tooltip>
                                                 {/* Explicit closing tag */}
                                            </TableCell>
                                        </TableRow>
                                     );
                                })}
                            </TableBody>
                             {/* Explicit closing tag */}
                        </Table>
                         {/* Explicit closing tag */}
                    </TooltipProvider>
                     /* Explicit closing tag */
                 )}
            </CardContent>
             {/* Explicit closing tag */}
        </Card>
         /* Explicit closing tag */
    );
};

export default ScraperStatusWidget;
