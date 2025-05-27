// frontend/src/components/exceptions/ExceptionsTable.tsx
import React, { useMemo } from 'react';
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getExpandedRowModel,
    Row,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from '@/components/ui/badge';
import {
    ChevronDown,
    ChevronRight,
    Eye,
    RefreshCw,      // SOP Re-queue
    Edit3,
    Info,
    ListChecks,
    AlertTriangle,
    Loader2,
    Archive,        // For Bulk Archive (Example)
    RefreshCcwDot,  // For Bulk Re-queue (Example)
    Settings2       // Generic cog for more actions dropdown
} from 'lucide-react';
// Assuming QuickUpdateStatusPopover is in the same directory or adjust path
import QuickUpdateStatusPopover from '@/components/QuickUpdateStatusPopover';
import {
    HierarchicalExceptionData,
    StudyLevelExceptionItem,
    SeriesLevelExceptionItem,
    SopLevelExceptionItem
} from '@/types/exceptions';
import { ExceptionStatus, ExceptionStatusEnum } from '@/schemas/dicomExceptionEnums';
import { format } from 'date-fns';
import { // Import DropdownMenu components from Shadcn
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


interface ExceptionsTableProps {
    data: HierarchicalExceptionData;
    isLoading: boolean;
    onViewDetails: (exceptionUuid: string) => void;
    onRequeueForRetry: (exceptionUuid: string) => void;
    onUpdateStatus: (exceptionUuid: string, status: ExceptionStatus, notes?: string) => void;
    // For individual SOP row updates (passed to QuickUpdateStatusPopover)
    isSopInstanceUpdating?: (uuid: string) => boolean;
    // For bulk actions (to disable buttons, show loading on parent, etc.)
    onBulkAction: (identifier: string, level: 'study' | 'series', action: 'ARCHIVE' | 'REQUEUE_RETRYABLE' | 'SET_STATUS_MANUAL_REVIEW', newStatus?: ExceptionStatus, notes?: string) => void;
    isBulkUpdating?: boolean; // General flag if any bulk update is happening
}

const formatDate = (date?: Date | string): string => {
    if (!date) return 'N/A';
    try {
        const parsedDate = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(parsedDate.getTime())) return 'Invalid Date';
        return format(parsedDate, 'MMM d, yyyy HH:mm');
    } catch (e) {
        return 'Invalid Date';
    }
};

type TableDisplayItem = StudyLevelExceptionItem | SeriesLevelExceptionItem | SopLevelExceptionItem;

const getColumns = (
    props: Omit<ExceptionsTableProps, 'data' | 'isLoading'> // Pass all action handlers and flags
): ColumnDef<TableDisplayItem>[] => [
        {
            id: 'expander',
            header: () => null,
            cell: ({ row }: { row: Row<TableDisplayItem> }) => { /* ... no change ... */
                const canExpand = row.getCanExpand();
                return canExpand ? (
                    <Button variant="ghost" size="sm" onClick={row.getToggleExpandedHandler()} className="px-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-sm">
                        {row.getIsExpanded() ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </Button>
                ) : (
                    <span className="px-1 w-[28px] inline-block"></span>
                );
            },
            size: 45,
        },
        {
            accessorFn: (row: TableDisplayItem): string => { /* ... no change ... */
                if (row.itemType === 'study') return row.studyInstanceUid;
                if (row.itemType === 'series') return row.seriesInstanceUid;
                if (row.itemType === 'sop') return row.sop_instance_uid || row.id;
                return (row as any).id || "unknown-id";
            },
            id: 'identifier',
            header: 'Study UID / Series UID / SOP UID',
            cell: ({ row }) => { /* ... no change ... */
                const original = row.original as TableDisplayItem;
                const depth = row.depth;
                if (depth === 0) { return <span className="font-semibold text-sky-700 dark:text-sky-400">{(original as StudyLevelExceptionItem).studyInstanceUid}</span>; }
                if (depth === 1) { return <span className="pl-4 text-indigo-600 dark:text-indigo-400">{(original as SeriesLevelExceptionItem).seriesInstanceUid}</span>; }
                if (depth === 2) { return <span className="pl-8 text-slate-500 dark:text-slate-400">{(original as SopLevelExceptionItem).sop_instance_uid}</span>; }
                return null;
            },
            size: 350,
        },
        { /* ... patientInfo column - no change ... */
            id: 'patientInfo',
            header: 'Patient (ID / Name)',
            accessorFn: (row: TableDisplayItem) => {
                if (row.itemType === 'study') return { patientId: row.patientId, patientName: row.patientName };
                return null;
            },
            cell: ({ row }) => {
                const original = row.original as TableDisplayItem;
                if (original.itemType === 'study') {
                    return (
                        <div className="text-xs">
                            <div>ID: {original.patientId || 'N/A'}</div>
                            <div>Name: {original.patientName || 'N/A'}</div>
                        </div>
                    );
                }
                return null;
            },
            size: 200,
        },
        { /* ... accessionNumber column - no change ... */
            id: 'accessionNumber',
            header: 'Accession #',
            accessorFn: (row: TableDisplayItem) => (row.itemType === 'study' ? row.accessionNumber : undefined),
            cell: ({ row, getValue }) => {
                const original = row.original as TableDisplayItem;
                if (original.itemType === 'study') {
                    return getValue<string>() || 'N/A';
                }
                return null;
            },
            size: 120,
        },
        { /* ... detailsAndCounts column - no change ... */
            id: 'detailsAndCounts',
            header: 'Details',
            cell: ({ row }) => {
                const original = row.original as TableDisplayItem;
                if (original.itemType === 'study') {
                    return (
                        <div className='flex flex-col text-xs'>
                            <span><ListChecks className="inline h-3 w-3 mr-1 text-blue-500" /> {original.seriesCount} Series</span>
                            <span><Info className="inline h-3 w-3 mr-1 text-gray-500" /> {original.totalSopInstanceCount} Total SOPs</span>
                        </div>
                    );
                }
                if (original.itemType === 'series') {
                    return <div className="pl-4 text-xs">Mod: {original.modality || 'N/A'} ({original.sopInstanceCount} SOPs)</div>
                }
                return null;
            },
            size: 150,
        },
        {
            id: 'statusAndTimestamps',
            header: 'Status / Timestamps',
            cell: ({ row }) => {
                const original = row.original as TableDisplayItem;

                // Study Level Display - UPDATED BADGE LOGIC
                if (original.itemType === 'study') {
                    const study = original as StudyLevelExceptionItem;
                    let studyBadgeVariant: "default" | "destructive" | "secondary" | "outline" = "outline";
                    let studyTextColorClass = "";
                    let studyIcon = null;

                    if (study.statusSummary.includes("All Resolved/Archived")) {
                        studyBadgeVariant = "default"; // Or a custom 'success' variant
                        // Use Tailwind classes for a success green, or your theme's success color
                        studyTextColorClass = "bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-300";
                        // studyIcon = <CheckCircle2 className="inline h-3 w-3 mr-1"/>; // Example success icon
                    } else if (study.statusSummary.includes("Failed")) {
                        studyBadgeVariant = "destructive";
                        studyIcon = <AlertTriangle className="inline h-3 w-3 mr-1" />;
                    } else if (study.statusSummary.includes("New") || study.statusSummary.includes("Review") || study.statusSummary.includes("Retry")) {
                        studyBadgeVariant = "secondary"; // Or "default" if it provides better contrast for problem states
                        // Could make this yellow-ish if "Review" or "Retry" are dominant
                        if (study.statusSummary.includes("Review") || study.statusSummary.includes("Retry")) {
                            studyTextColorClass = "dark:text-yellow-300"; // Example
                        }
                    } else if (study.statusSummary === "0 Total SOPs") {
                        studyBadgeVariant = "outline";
                        studyTextColorClass = "text-slate-500 dark:text-slate-400";
                    }
                    // For "Mixed Status", default 'outline' is fine or a generic info color

                    return (
                        <div className="text-xs">
                            <Badge variant={studyBadgeVariant} className={`mb-1 text-xxs break-all whitespace-normal ${studyTextColorClass}`}>
                                {studyIcon}
                                {study.statusSummary || "No SOPs"}
                            </Badge>
                            <div>First Err: {formatDate(study.earliestFailure)}</div>
                            <div>Last Err: {formatDate(study.latestFailure)}</div>
                        </div>
                    );
                }

                // Series Level Display - UPDATED BADGE LOGIC
                if (original.itemType === 'series') {
                    const series = original as SeriesLevelExceptionItem;
                    let seriesBadgeVariant: "default" | "destructive" | "secondary" | "outline" = "outline";
                    let seriesTextColorClass = "";
                    let seriesIcon = null;

                    if (series.statusSummary.includes("All Resolved/Archived")) {
                        seriesBadgeVariant = "default";
                        seriesTextColorClass = "bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-300";
                        // seriesIcon = <CheckCircle2 className="inline h-3 w-3 mr-1"/>;
                    } else if (series.statusSummary.includes("Failed")) {
                        seriesBadgeVariant = "destructive";
                        seriesIcon = <AlertTriangle className="inline h-3 w-3 mr-1" />;
                    } else if (series.statusSummary.includes("New") || series.statusSummary.includes("Review") || series.statusSummary.includes("Retry")) {
                        seriesBadgeVariant = "secondary";
                        if (series.statusSummary.includes("Review") || series.statusSummary.includes("Retry")) {
                            seriesTextColorClass = "dark:text-yellow-300";
                        }
                    } else if (series.statusSummary === "0 SOPs") {
                        seriesBadgeVariant = "outline";
                        seriesTextColorClass = "text-slate-500 dark:text-slate-400";
                    }
                    return (
                        <div className="pl-4 text-xs">
                            <Badge variant={seriesBadgeVariant} className={`text-xxs break-all whitespace-normal ${seriesTextColorClass}`}>
                                {seriesIcon}
                                {series.statusSummary}
                            </Badge>
                        </div>
                    );
                }

                // SOP Instance Level Display - (This part was already detailed and correct from previous step)
                if (original.itemType === 'sop') {
                    const sop = original as SopLevelExceptionItem;
                    let badgeVariant: "default" | "destructive" | "secondary" | "outline" = "default";
                    let textColorClass = "";
                    switch (sop.status) {
                        case ExceptionStatusEnum.Enum.FAILED_PERMANENTLY: badgeVariant = "destructive"; break;
                        case ExceptionStatusEnum.Enum.NEW: badgeVariant = "secondary"; break;
                        case ExceptionStatusEnum.Enum.MANUAL_REVIEW_REQUIRED: badgeVariant = "outline"; textColorClass = "text-yellow-600 border-yellow-500 dark:text-yellow-400 dark:border-yellow-600"; break;
                        case ExceptionStatusEnum.Enum.RESOLVED_BY_RETRY: case ExceptionStatusEnum.Enum.RESOLVED_MANUALLY: badgeVariant = "outline"; textColorClass = "text-green-600 border-green-500 dark:text-green-400 dark:border-green-600"; break;
                        case ExceptionStatusEnum.Enum.RETRY_PENDING: case ExceptionStatusEnum.Enum.RETRY_IN_PROGRESS: badgeVariant = "default"; textColorClass = "text-blue-600 border-blue-500 dark:text-blue-400 dark:border-blue-600"; if (badgeVariant === "default") { textColorClass += " text-primary-foreground dark:text-primary-foreground"; } break;
                        case ExceptionStatusEnum.Enum.ARCHIVED: badgeVariant = "outline"; textColorClass = "text-slate-500 border-slate-400 dark:text-slate-400 dark:border-slate-500"; break;
                        default: badgeVariant = "default"; textColorClass = "text-primary-foreground dark:text-primary-foreground";
                    }
                    return (
                        <div className="pl-8 text-xs">
                            <Badge
                                variant={badgeVariant}
                                className={`text-xxs whitespace-nowrap px-1.5 py-0.5 ${textColorClass}`}
                            >
                                {sop.status.replace(/_/g, ' ')}
                            </Badge>
                            <div className="text-gray-500 dark:text-gray-400 pt-0.5">{formatDate(sop.failure_timestamp)}</div>
                        </div>
                    );
                }
                return null;
            },
            size: 220,
        },
        {
            id: 'actions',
            header: () => <div className="text-right">Actions</div>,
            cell: ({ row }) => {
                const original = row.original as TableDisplayItem;
                const isBulkUpdating = props.isBulkUpdating; // Use the general bulk updating flag

                // Study Level Actions
                if (original.itemType === 'study') {
                    const study = original as StudyLevelExceptionItem;
                    return (
                        <div className="flex space-x-1 justify-end">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" disabled={isBulkUpdating} className="h-8 w-8 p-0 data-[state=open]:bg-muted">
                                        <Settings2 size={14} />
                                        <span className="sr-only">Study Actions</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel className="text-xs">Study: ...{study.studyInstanceUid.slice(-12)}</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        className="text-xs"
                                        onClick={() => props.onBulkAction(study.id, 'study', 'REQUEUE_RETRYABLE')}
                                        disabled={isBulkUpdating}
                                    >
                                        <RefreshCcwDot size={14} className="mr-2" /> Re-queue All Retryable
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="text-xs"
                                        onClick={() => props.onBulkAction(study.id, 'study', 'ARCHIVE', ExceptionStatusEnum.Enum.ARCHIVED, 'Bulk archived (study level)')}
                                        disabled={isBulkUpdating}
                                    >
                                        <Archive size={14} className="mr-2" /> Archive All
                                    </DropdownMenuItem>
                                    {/* Add more actions like "Set all to Manual Review" */}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    );
                }
                // Series Level Actions
                if (original.itemType === 'series') {
                    const series = original as SeriesLevelExceptionItem;
                    return (
                        <div className="flex space-x-1 justify-end pl-4">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" disabled={isBulkUpdating} className="h-8 w-8 p-0 data-[state=open]:bg-muted">
                                        <Settings2 size={14} />
                                        <span className="sr-only">Series Actions</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel className="text-xs">Series: ...{series.seriesInstanceUid.slice(-12)}</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        className="text-xs"
                                        onClick={() => props.onBulkAction(series.id, 'series', 'REQUEUE_RETRYABLE')}
                                        disabled={isBulkUpdating}
                                    >
                                        <RefreshCcwDot size={14} className="mr-2" /> Re-queue All Retryable
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="text-xs"
                                        onClick={() => props.onBulkAction(series.id, 'series', 'ARCHIVE', ExceptionStatusEnum.Enum.ARCHIVED, 'Bulk archived (series level)')}
                                        disabled={isBulkUpdating}
                                    >
                                        <Archive size={14} className="mr-2" /> Archive All
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    );
                }
                // SOP Level Actions
                if (original.itemType === 'sop') {
                    const sop = original as SopLevelExceptionItem;
                    // Use the more specific isSopInstanceUpdating if available, otherwise fallback to general isBulkUpdating
                    const currentlyUpdatingThisSop = props.isSopInstanceUpdating ? props.isSopInstanceUpdating(sop.exception_uuid) : isBulkUpdating;
                    return (
                        <div className="flex space-x-1 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => props.onViewDetails(sop.exception_uuid)} title="View Details" disabled={currentlyUpdatingThisSop}>
                                <Eye size={14} />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => props.onRequeueForRetry(sop.exception_uuid)} title="Re-queue for Retry" disabled={currentlyUpdatingThisSop}>
                                <RefreshCw size={14} />
                            </Button>
                            <QuickUpdateStatusPopover
                                exceptionLog={sop}
                                onUpdateStatus={props.onUpdateStatus}
                                isUpdating={currentlyUpdatingThisSop}
                            >
                                <Button variant="ghost" size="sm" title="Quick Update Status" disabled={currentlyUpdatingThisSop}>
                                    <Edit3 size={14} />
                                </Button>
                            </QuickUpdateStatusPopover>
                        </div>
                    );
                }
                return <div className="h-[36px]"></div>; // Maintain row height for empty actions
            },
            size: 130,
        }
    ];

const ExceptionsTable: React.FC<ExceptionsTableProps> = (props) => {
    const {
        data,
        isLoading,
        // Destructure all action handlers and flags from props to pass to getColumns
        onViewDetails,
        onRequeueForRetry,
        onUpdateStatus,
        isSopInstanceUpdating,
        onBulkAction,
        isBulkUpdating
    } = props;

    // Pass all necessary props to getColumns
    const columns = useMemo(() => getColumns({
        onViewDetails,
        onRequeueForRetry,
        onUpdateStatus,
        isSopInstanceUpdating,
        onBulkAction,
        isBulkUpdating
    }),
        // Add all dependencies that getColumns relies on
        [onViewDetails, onRequeueForRetry, onUpdateStatus, isSopInstanceUpdating, onBulkAction, isBulkUpdating]
    );

    const tableData = useMemo(() => data as TableDisplayItem[] ?? [], [data]);

    const table = useReactTable<TableDisplayItem>({
        data: tableData,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        getSubRows: (originalRow: TableDisplayItem) => {
            if ('subRows' in originalRow && Array.isArray(originalRow.subRows) && originalRow.subRows.length > 0) {
                return originalRow.subRows as TableDisplayItem[];
            }
            return undefined; // Important: return undefined if no subrows, not empty array, for getCanExpand
        },
        getRowId: (originalRow: TableDisplayItem): string => String(originalRow.id), // Ensure ID is always string
        debugTable: process.env.NODE_ENV === 'development',
    });

    if (isLoading && (!tableData || tableData.length === 0)) {
        return <div className="text-center p-8 text-gray-500 dark:text-gray-400"><Loader2 className="inline animate-spin mr-2 h-5 w-5" />Loading exceptions data...</div>;
    }

    return (
        <div className="rounded-md border bg-card text-card-foreground shadow-sm">
            <Table>
                <TableHeader>
                    {table.getHeaderGroups().map(headerGroup => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map(header => (
                                <TableHead key={header.id} style={{ width: header.getSize() !== 150 ? `${header.getSize()}px` : undefined }} className="text-xs whitespace-nowrap">
                                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                </TableHead>
                            ))}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map(row => (
                            <TableRow
                                key={row.id}
                                data-state={row.getIsSelected() && "selected"}
                                className={
                                    row.depth === 0 ? "bg-slate-50 dark:bg-slate-900/70 hover:bg-slate-100 dark:hover:bg-slate-800/70"
                                        : row.depth === 1 ? "bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                                            : "hover:bg-slate-50 dark:hover:bg-slate-700/30"
                                }
                            >
                                {row.getVisibleCells().map(cell => (
                                    <TableCell
                                        key={cell.id}
                                        style={{
                                            width: cell.column.getSize() !== 150 ? `${cell.column.getSize()}px` : undefined,
                                        }}
                                        className={`py-1.5 px-2 text-xs`}
                                    >
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="h-24 text-center text-gray-500 dark:text-gray-400">
                                No exceptions found matching your criteria.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
};

export default ExceptionsTable;