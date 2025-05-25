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
import { Button } from "@/components/ui/button"; // Assuming button.tsx is correct
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
import { 
    HierarchicalExceptionData, // This is StudyLevelExceptionItem[]
    StudyLevelExceptionItem, 
    SeriesLevelExceptionItem, 
    SopLevelExceptionItem 
} from '@/types/exceptions';
import { ExceptionStatus, ExceptionStatusEnum } from '@/schemas/dicomExceptionEnums';
import { format } from 'date-fns';

interface ExceptionsTableProps {
  data: HierarchicalExceptionData; // This is StudyLevelExceptionItem[]
  isLoading: boolean;
  onViewDetails: (exceptionUuid: string) => void;
  onRequeueForRetry: (exceptionUuid: string) => void;
  onUpdateStatus: (exceptionUuid: string, status: ExceptionStatus, notes?: string) => void;
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
  onUpdateStatus: ExceptionsTableProps['onUpdateStatus']
): ColumnDef<TableDisplayItem>[] => [ // <<<< Changed to the union type
  {
    id: 'expander',
    header: () => null,
    // `row` here will be Row<TableDisplayItem>
    cell: ({ row }: { row: Row<TableDisplayItem> }) => {
      const canExpand = row.getCanExpand(); // This should work if getSubRows is correct
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
    // Accessor needs to handle the union or target a common field like 'id'
    accessorFn: (row: TableDisplayItem): string => {
        if (row.itemType === 'study') {
            return row.studyInstanceUid;
        } else if (row.itemType === 'series') {
            return row.seriesInstanceUid;
        } else if (row.itemType === 'sop') {
            // Assuming SopLevelExceptionItem is now a valid type with 'id' and 'sop_instance_uid'
            if (!row.id) { // Add a check for id, though it should always exist
                console.error("SOP Level Item is missing an ID:", row);
                return row.sop_instance_uid || "sop-missing-id";
            }
            return row.sop_instance_uid || `sop-log-id-${row.id}`;
        }
        // This block is reached if `row.itemType` is none of the above,
        // which should be impossible if TableDisplayItem is correctly defined and data is clean.
        // `row` is `never` here due to exhaustive checks.
        const _exhaustiveCheck: never = row;
        console.error("Unreachable code: Unhandled itemType in accessorFn for 'identifier'", _exhaustiveCheck);
        // Fallback or throw, as this indicates a typing or data issue.
        // Throwing an error is often better for "impossible" states.
        throw new Error(`Unhandled itemType in accessorFn: ${(_exhaustiveCheck as any)?.itemType}`);
        // Or, if you must return a string:
        // return "unknown-identifier";
    },
    id: 'identifier',
    header: 'Study UID / Series UID / SOP UID',
    cell: ({ row, getValue }) => {
        const original = row.original as TableDisplayItem;
        const depth = row.depth; // depth is available on Row<T>

        if (depth === 0) {
            return <span className="font-semibold text-sky-700 dark:text-sky-400">{(original as StudyLevelExceptionItem).studyInstanceUid}</span>;
        }
        if (depth === 1) {
            return <span className="pl-4 text-indigo-600 dark:text-indigo-400">{(original as SeriesLevelExceptionItem).seriesInstanceUid}</span>;
        }
        if (depth === 2) {
            return <span className="pl-8 text-slate-500 dark:text-slate-400">{(original as SopLevelExceptionItem).sop_instance_uid}</span>;
        }
        return getValue<string>();
    },
    size: 350,
  },
  {
    id: 'patientInfo',
    header: 'Patient (ID / Name)',
    // AccessorFn should ideally return a value available for all items in TableDisplayItem,
    // or the column should only be relevant for a subset (handled in `cell`)
    accessorFn: (row) => {
        if (row.itemType === 'study') return { patientId: row.patientId, patientName: row.patientName };
        return null; // Or some default
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
    accessorFn: (row) => (row.itemType === 'study' ? row.accessionNumber : undefined),
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
    id: 'statusAndTimestamps',
    header: 'Status / Timestamps',
    cell: ({ row }) => {
        const original = row.original as TableDisplayItem; // original is the union type

        // Study Level Display
        if (original.itemType === 'study') {
            const study = original as StudyLevelExceptionItem; // More specific type for this block
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

        // Series Level Display
        if (original.itemType === 'series') {
             const series = original as SeriesLevelExceptionItem; // More specific type
             return (
                <div className="pl-4 text-xs">
                    <Badge variant="outline" className="text-xxs break-all whitespace-normal">
                        {series.statusSummary}
                    </Badge>
                </div>
             );
        }

        // SOP Instance Level Display - THIS IS THE PATCHED PART
        if (original.itemType === 'sop') {
            const sop = original as SopLevelExceptionItem; // More specific type
            let badgeVariant: "default" | "destructive" | "secondary" | "outline" = "default";
            let textColorClass = ""; // For additional text color control

            // Determine badge style based on SOP status
            switch (sop.status) {
                case ExceptionStatusEnum.Enum.FAILED_PERMANENTLY:
                    badgeVariant = "destructive";
                    break;
                case ExceptionStatusEnum.Enum.NEW:
                    badgeVariant = "secondary";
                    // Ensure good contrast for secondary badge in dark mode if its background is dark
                    // textColorClass = "dark:text-slate-100"; // Example, adjust as needed
                    break;
                case ExceptionStatusEnum.Enum.MANUAL_REVIEW_REQUIRED:
                    badgeVariant = "outline";
                    // Using Tailwind classes for yellow-ish warning, adjust to your theme
                    textColorClass = "text-yellow-600 border-yellow-500 dark:text-yellow-400 dark:border-yellow-600";
                    break;
                case ExceptionStatusEnum.Enum.RESOLVED_BY_RETRY:
                case ExceptionStatusEnum.Enum.RESOLVED_MANUALLY:
                    badgeVariant = "outline";
                    // Using Tailwind classes for green-ish success
                    textColorClass = "text-green-600 border-green-500 dark:text-green-400 dark:border-green-600";
                    break;
                case ExceptionStatusEnum.Enum.RETRY_PENDING:
                case ExceptionStatusEnum.Enum.RETRY_IN_PROGRESS:
                    badgeVariant = "default"; // Or "secondary"
                     // Using Tailwind classes for blue-ish info
                    textColorClass = "text-blue-600 border-blue-500 dark:text-blue-400 dark:border-blue-600";
                    if (badgeVariant === "default") { // Default usually has primary bg, ensure text is visible
                        textColorClass += " text-primary-foreground dark:text-primary-foreground";
                    }
                    break;
                case ExceptionStatusEnum.Enum.ARCHIVED:
                    badgeVariant = "outline";
                    textColorClass = "text-slate-500 border-slate-400 dark:text-slate-400 dark:border-slate-500";
                    break;
                default:
                    badgeVariant = "default";
                    // Ensure default has good contrast if not covered above
                    textColorClass = "text-primary-foreground dark:text-primary-foreground"; 
            }

            return (
                <div className="pl-8 text-xs"> {/* Keep existing SOP item layout */}
                    <Badge 
                        variant={badgeVariant}
                        // Apply computed textColorClass and ensure badge text doesn't break weirdly
                        className={`text-xxs whitespace-nowrap px-1.5 py-0.5 ${textColorClass}`} 
                    >
                        {/* Replace underscores with spaces for display */}
                        {sop.status.replace(/_/g, ' ')}
                    </Badge>
                    <div className="text-gray-500 dark:text-gray-400 pt-0.5">{formatDate(sop.failure_timestamp)}</div>
                </div>
            );
        }
        // Fallback if itemType is somehow not covered (shouldn't happen with proper types)
        return null;
    },
    size: 220, // Keep your existing size or adjust as needed
  },
  {
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => {
        const original = row.original as TableDisplayItem;
        if (original.itemType === 'sop') {
            return (
              <div className="flex space-x-1 justify-end">
                <Button variant="ghost" size="sm" onClick={() => onViewDetails(original.exception_uuid)} title="View Details"><Eye size={14}/></Button>
                <Button variant="ghost" size="sm" onClick={() => onRequeueForRetry(original.exception_uuid)} title="Re-queue for Retry"><RefreshCw size={14}/></Button>
                <Button variant="ghost" size="sm" onClick={() => {
                     const newStatusStr = prompt("New status (e.g., RESOLVED_MANUALLY, ARCHIVED):");
                     if (newStatusStr) {
                        const newStatus = newStatusStr as ExceptionStatus;
                        if (Object.values(ExceptionStatusEnum.Enum).includes(newStatus)) {
                            const notes = prompt("Resolution notes:");
                            onUpdateStatus(original.exception_uuid, newStatus, notes || undefined);
                        } else {
                            alert("Invalid status value entered.");
                        }
                     }
                }} title="Quick Update Status"><Edit3 size={14}/></Button>
              </div>
            );
        }
        return <div className="h-[36px]"></div>; // Maintain row height, 36px for "sm" button
    },
    size: 130,
  }
];

const ExceptionsTable: React.FC<ExceptionsTableProps> = ({
  data, // HierarchicalExceptionData which is StudyLevelExceptionItem[]
  isLoading,
  onViewDetails,
  onRequeueForRetry,
  onUpdateStatus,
}) => {
  const columns = useMemo(() => getColumns(onViewDetails, onRequeueForRetry, onUpdateStatus), [onViewDetails, onRequeueForRetry, onUpdateStatus]);

  // Cast the initial data to the broader union type for the table's generic.
  // TanStack Table will then use getSubRows to find children.
  const tableData = useMemo(() => data as TableDisplayItem[] ?? [], [data]);

  const table = useReactTable<TableDisplayItem>({ // <<<< EXPLICIT GENERIC FOR THE UNION TYPE
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSubRows: (originalRow: TableDisplayItem) => { // originalRow is now the union type
        // Check if subRows exists and is an array.
        if ('subRows' in originalRow && Array.isArray(originalRow.subRows)) {
            return originalRow.subRows as TableDisplayItem[]; // Cast subRows to the union type as well
        }
        return undefined; // No sub-rows
    },
    getRowId: (originalRow: TableDisplayItem): string => {
        // originalRow.id can be string (for Study/Series) or number (for SOP).
        // Convert to string to satisfy TanStack Table's expectation.
        return String(originalRow.id);
    },
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
            table.getRowModel().rows.map(row => ( // row is Row<TableDisplayItem>
              <TableRow 
                key={row.id} 
                data-state={row.getIsSelected() && "selected"}
                className={
                    row.depth === 0 ? "bg-slate-50 dark:bg-slate-900/70 hover:bg-slate-100 dark:hover:bg-slate-800/70" 
                  : row.depth === 1 ? "bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-700/50" 
                  : "hover:bg-slate-50 dark:hover:bg-slate-700/30"
                }
              >
                {row.getVisibleCells().map(cell => ( // cell is Cell<TableDisplayItem, unknown>
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