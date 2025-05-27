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
    RefreshCw,
    Edit3,
    Info, 
    ListChecks, 
    AlertTriangle, 
    Loader2 
} from 'lucide-react';
import QuickUpdateStatusPopover from '@/components/QuickUpdateStatusPopover'; // Ensure this import is correct
import { 
    HierarchicalExceptionData,
    StudyLevelExceptionItem, 
    SeriesLevelExceptionItem, 
    SopLevelExceptionItem 
} from '@/types/exceptions';
import { ExceptionStatus, ExceptionStatusEnum } from '@/schemas/dicomExceptionEnums';
import { format } from 'date-fns';

interface ExceptionsTableProps {
  data: HierarchicalExceptionData;
  isLoading: boolean;
  onViewDetails: (exceptionUuid: string) => void;
  onRequeueForRetry: (exceptionUuid: string) => void;
  onUpdateStatus: (exceptionUuid: string, status: ExceptionStatus, notes?: string) => void;
  isRowUpdating?: (uuid: string) => boolean; // Function to check if a specific row is updating
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
  onViewDetails: ExceptionsTableProps['onViewDetails'],
  onRequeueForRetry: ExceptionsTableProps['onRequeueForRetry'],
  onUpdateStatus: ExceptionsTableProps['onUpdateStatus'],
  isRowUpdating?: (uuid: string) => boolean // Accept the function here
): ColumnDef<TableDisplayItem>[] => [
  {
    id: 'expander',
    header: () => null,
    cell: ({ row }: { row: Row<TableDisplayItem> }) => {
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
    accessorFn: (row: TableDisplayItem): string => {
        // Relies on itemType and specific UID fields existing
        if (row.itemType === 'study') return row.studyInstanceUid;
        if (row.itemType === 'series') return row.seriesInstanceUid;
        if (row.itemType === 'sop') return row.sop_instance_uid || row.id; // Fallback to id if sop_instance_uid is missing
        // Should be unreachable if types are correct
        console.error("Unhandled itemType in identifier accessorFn:", row);
        return (row as any).id || "unknown-id"; // Last resort fallback
    },
    id: 'identifier',
    header: 'Study UID / Series UID / SOP UID',
    cell: ({ row }) => { // Removed getValue as we directly use original with itemType
        const original = row.original as TableDisplayItem;
        const depth = row.depth;

        if (depth === 0) { // Study
            return <span className="font-semibold text-sky-700 dark:text-sky-400">{(original as StudyLevelExceptionItem).studyInstanceUid}</span>;
        }
        if (depth === 1) { // Series
            return <span className="pl-4 text-indigo-600 dark:text-indigo-400">{(original as SeriesLevelExceptionItem).seriesInstanceUid}</span>;
        }
        if (depth === 2) { // SOP
            return <span className="pl-8 text-slate-500 dark:text-slate-400">{(original as SopLevelExceptionItem).sop_instance_uid}</span>;
        }
        return null; // Should not happen
    },
    size: 350,
  },
  {
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
  {
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
  {
    id: 'detailsAndCounts',
    header: 'Details',
    cell: ({ row }) => {
        const original = row.original as TableDisplayItem;
        if (original.itemType === 'study') {
            return (
                <div className='flex flex-col text-xs'>
                    <span><ListChecks className="inline h-3 w-3 mr-1 text-blue-500"/> {original.seriesCount} Series</span>
                    <span><Info className="inline h-3 w-3 mr-1 text-gray-500"/> {original.totalSopInstanceCount} Total SOPs</span>
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
    id: 'statusAndTimestamps', // This column was patched in the previous step, ensure it's correct
    header: 'Status / Timestamps',
    cell: ({ row }) => {
        const original = row.original as TableDisplayItem; // original is the union type

        if (original.itemType === 'study') { /* ... your existing study display ... */ 
            const study = original as StudyLevelExceptionItem;
            const hasNew = study.statusSummary.includes("New");
            const hasFailed = study.statusSummary.includes("Failed");
            return (
              <div className="text-xs">
                <Badge variant={hasFailed ? "destructive" : (hasNew ? "secondary" : "outline")} className="mb-1 text-xxs break-all whitespace-normal">
                    {hasFailed && <AlertTriangle className="inline h-3 w-3 mr-1"/>}
                    {study.statusSummary || "No SOPs"}
                </Badge>
                <div>First Err: {formatDate(study.earliestFailure)}</div>
                <div>Last Err: {formatDate(study.latestFailure)}</div>
              </div>
            );
        }
        if (original.itemType === 'series') { /* ... your existing series display ... */
             const series = original as SeriesLevelExceptionItem;
             return (
                <div className="pl-4 text-xs">
                    <Badge variant="outline" className="text-xxs break-all whitespace-normal">
                        {series.statusSummary}
                    </Badge>
                </div>
             );
        }
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
                    <Badge variant={badgeVariant} className={`text-xxs whitespace-nowrap px-1.5 py-0.5 ${textColorClass}`}>
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
        if (original.itemType === 'sop') {
            const sop = original as SopLevelExceptionItem;
            const currentlyUpdating = isRowUpdating ? isRowUpdating(sop.exception_uuid) : false;
            return (
              <div className="flex space-x-1 justify-end">
                <Button variant="ghost" size="sm" onClick={() => onViewDetails(sop.exception_uuid)} title="View Details" disabled={currentlyUpdating}>
                    <Eye size={14}/>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onRequeueForRetry(sop.exception_uuid)} title="Re-queue for Retry" disabled={currentlyUpdating}>
                    <RefreshCw size={14}/>
                </Button>
                <QuickUpdateStatusPopover
                  exceptionLog={sop}
                  onUpdateStatus={onUpdateStatus}
                  isUpdating={currentlyUpdating}
                >
                  <Button variant="ghost" size="sm" title="Quick Update Status" disabled={currentlyUpdating}>
                    <Edit3 size={14}/>
                  </Button>
                </QuickUpdateStatusPopover>
              </div>
            );
        }
        return <div className="h-[36px]"></div>;
    },
    size: 130,
  }
];

const ExceptionsTable: React.FC<ExceptionsTableProps> = ({
  data,
  isLoading,
  onViewDetails,
  onRequeueForRetry,
  onUpdateStatus,
  isRowUpdating, // Accept the new prop
}) => {
  // Pass isRowUpdating to getColumns
  const columns = useMemo(() => getColumns(onViewDetails, onRequeueForRetry, onUpdateStatus, isRowUpdating), [onViewDetails, onRequeueForRetry, onUpdateStatus, isRowUpdating]);

  const tableData = useMemo(() => data as TableDisplayItem[] ?? [], [data]);

  const table = useReactTable<TableDisplayItem>({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSubRows: (originalRow: TableDisplayItem) => {
        if ('subRows' in originalRow && Array.isArray(originalRow.subRows)) {
            return originalRow.subRows as TableDisplayItem[];
        }
        return undefined;
    },
    getRowId: (originalRow: TableDisplayItem): string => String(originalRow.id),
    debugTable: process.env.NODE_ENV === 'development',
  });

  if (isLoading && (!tableData || tableData.length === 0)) {
    return <div className="text-center p-8 text-gray-500 dark:text-gray-400"><Loader2 className="inline animate-spin mr-2 h-5 w-5" />Loading exceptions data...</div>;
  }

  return (
    // ... rest of your table rendering (Table, TableHeader, TableBody, etc.) ...
    // This part should be mostly unchanged from your last working version
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