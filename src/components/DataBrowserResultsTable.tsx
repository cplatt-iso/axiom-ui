// src/components/DataBrowserResultsTable.tsx
import React, { useMemo, useState } from 'react';
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    SortingState,
    getSortedRowModel,
    getPaginationRowModel,
} from "@tanstack/react-table";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, Database, Search, Server, ArrowLeft, ArrowRight } from 'lucide-react';
import { StudyResultItem } from '@/schemas/data_browser'; // Type definition using keywords
import { format, parse } from 'date-fns'; // For date/time formatting

interface DataBrowserResultsTableProps {
    results: StudyResultItem[]; // This type describes the *intended* data structure, not the raw API one
    isLoading: boolean;
}

// Define the actual type received from the API (keys are tag numbers)
// We use this type within accessorFn
type RawStudyResult = {
    [key: string]: any; // Allow any tag number string as key
    source_id: number;
    source_name: string;
    source_type: string;
};


// Helper to format date/time
const formatDicomDateTime = (dateStr?: string | null, timeStr?: string | null): string => {
    if (!dateStr) return 'N/A';
    const datePart = dateStr.replace(/-/g, '');
    const timePart = timeStr?.replace(/:/g, '')?.split('.')[0] ?? '000000';

    try {
        const parsedDate = parse(`${datePart}${timePart}`, 'yyyyMMddHHmmss', new Date());
        if (!isNaN(parsedDate.getTime())) {
            return format(parsedDate, 'MMM d, yyyy HH:mm');
        }
    } catch (e) { } // Ignore parsing errors silently

    try {
        const parsedDateOnly = parse(datePart, 'yyyyMMdd', new Date());
         if (!isNaN(parsedDateOnly.getTime())) {
            return format(parsedDateOnly, 'MMM d, yyyy');
         }
    } catch (e) { }

    return `${dateStr ?? ''} ${timeStr ?? ''}`.trim() || 'Invalid Date';
};

// SortableHeader component
const SortableHeader = ({ column, title }: { column: any, title: string }) => (
  <Button
    variant="ghost"
    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    className="-ml-4 h-8"
  >
    {title}
    <ArrowUpDown className="ml-2 h-4 w-4" />
  </Button>
);

// Source Badge helper
const SourceBadge = ({ type, name }: { type: string, name: string }) => {
    const Icon = type === 'dicomweb' ? Search : type === 'dimse-qr' ? Server : Database;
    const variant = type === 'dicomweb' ? 'secondary' : 'outline';
    return <Badge variant={variant} className="w-fit"><Icon className="mr-1 h-3 w-3" />{name}</Badge>;
};


const DataBrowserResultsTable: React.FC<DataBrowserResultsTableProps> = ({ results, isLoading }) => {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 15 });

    // --- UPDATED: Use accessorFn ---
    const columns: ColumnDef<RawStudyResult>[] = useMemo(() => [ // Use RawStudyResult type here
        // --- Source Info (Uses direct keys, no change needed) ---
        {
            accessorKey: "source_name",
            id: "source_name", // Add unique ID
            header: "Source",
            cell: ({ row }) => <SourceBadge type={row.original.source_type} name={row.original.source_name} />,
            size: 120,
        },
        // --- Patient Info ---
        { id: "PatientName", accessorFn: row => row["00100010"] ?? 'N/A', header: ({ column }) => <SortableHeader column={column} title="Patient Name" />, size: 180 },
        { id: "PatientID", accessorFn: row => row["00100020"] ?? 'N/A', header: "Patient ID", size: 130 },
        { id: "PatientBirthDate", accessorFn: row => formatDicomDateTime(row["00100030"], null), header: "Birth Date", size: 110 },
        // --- Study Info ---
        { id: "StudyDateTime", accessorFn: row => formatDicomDateTime(row["00080020"], row["00080030"]), header: ({ column }) => <SortableHeader column={column} title="Study Date/Time" />, size: 150 },
        { id: "AccessionNumber", accessorFn: row => row["00080050"] ?? 'N/A', header: "Accession #", size: 120 },
        { id: "ModalitiesInStudy", accessorFn: row => row["00080061"]?.join(', ') ?? 'N/A', header: "Mods", size: 60 },
        { id: "StudyDescription", accessorFn: row => row["00081030"] ?? 'N/A', header: "Description", size: 200 },
        { id: "ReferringPhysicianName", accessorFn: row => row["00080090"] ?? 'N/A', header: "Referring Dr.", size: 160 },
        // --- Counts ---
        { id: "NumberOfStudyRelatedSeries", accessorFn: row => row["00201206"] ?? '?', header: () => <div className="text-right">Series</div>, cell: ({ getValue }) => <div className="text-right">{getValue<number | string>()}</div>, size: 60 },
        { id: "NumberOfStudyRelatedInstances", accessorFn: row => row["00201208"] ?? '?', header: () => <div className="text-right">Inst.</div>, cell: ({ getValue }) => <div className="text-right">{getValue<number | string>()}</div>, size: 60 },
        // --- Study UID ---
        { id: "StudyInstanceUID", accessorFn: row => row["0020000D"] ?? 'N/A', header: "Study UID", cell: ({ getValue }) => <div className="font-mono text-xs truncate max-w-[100px]" title={getValue<string>()}>{getValue<string>()}</div>, size: 120 },

    ], []);
    // --- END UPDATED ---

    const table = useReactTable({
        data: (results as RawStudyResult[]) ?? [], // Cast results to the raw type for the table
        columns,
        getCoreRowModel: getCoreRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onPaginationChange: setPagination,
        state: {
            sorting,
            pagination,
        },
    });

    return (
        <div className="space-y-2">
            <div className="rounded-md border bg-white dark:bg-gray-800 shadow-sm">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id} style={{ width: header.getSize() !== 150 ? `${header.getSize()}px` : undefined }}>
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={columns.length} className="h-24 text-center text-gray-500">Loading results...</TableCell></TableRow>
                        ) : table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="py-2 truncate" style={{ maxWidth: cell.column.getSize() !== 150 ? `${cell.column.getSize()}px` : undefined }}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={columns.length} className="h-24 text-center text-gray-500">No studies found matching your criteria.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            {/* Pagination Controls */}
             <div className="flex items-center justify-between space-x-2 py-2 text-sm text-muted-foreground">
                 <div className="flex-1">
                    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()} ({results?.length ?? 0} total results)
                 </div>
                 <div className="flex items-center space-x-2">
                     <Button
                         variant="outline"
                         size="sm"
                         onClick={() => table.previousPage()}
                         disabled={!table.getCanPreviousPage() || isLoading}
                     >
                         <ArrowLeft className="h-4 w-4 mr-1" /> Previous
                     </Button>
                     <Button
                         variant="outline"
                         size="sm"
                         onClick={() => table.nextPage()}
                         disabled={!table.getCanNextPage() || isLoading}
                     >
                         Next <ArrowRight className="h-4 w-4 ml-1" />
                     </Button>
                 </div>
            </div>
        </div>
    );
};

export default DataBrowserResultsTable;
