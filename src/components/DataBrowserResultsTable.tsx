// src/components/DataBrowserResultsTable.tsx
import React, { useMemo } from 'react';
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    SortingState,
    getSortedRowModel,
} from "@tanstack/react-table";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDicomDateTime } from '../utils/dicom';

// Helper component for sortable headers
const SortableHeader = ({ column, title }: { column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => string | false }, title: string }) => (
    <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="p-0 hover:bg-transparent"
    >
        {title}
        <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
);

interface DataBrowserResultsTableProps {
    data: Record<string, unknown>[];
    isFetching: boolean;
    error: Error | null;
    sourceName: string;
    sourceType: string;
}

const DataBrowserResultsTable: React.FC<DataBrowserResultsTableProps> = ({
    data,
    isFetching,
    error,
    sourceName,
    sourceType
}) => {
    const [sorting, setSorting] = React.useState<SortingState>([]);

    // Memoize columns
    const columns: ColumnDef<Record<string, unknown>>[] = useMemo(() => [
        { id: "PatientName", accessorFn: row => String(row["00100010"] ?? 'UNKNOWN'), header: ({ column }) => <SortableHeader column={column} title="Patient Name" />, size: 150 },
        { id: "PatientID", accessorFn: row => String(row["00100020"] ?? 'N/A'), header: "Patient ID", size: 120 },
        { id: "PatientBirthDate", accessorFn: row => formatDicomDateTime(row["00100030"] as string | null, null), header: "Birth Date", size: 110 },
        { id: "StudyDateTime", accessorFn: row => formatDicomDateTime(row["00080020"] as string | null, row["00080030"] as string | null), header: ({ column }) => <SortableHeader column={column} title="Study Date/Time" />, size: 140 },
        { id: "AccessionNumber", accessorFn: row => String(row["00080050"] ?? 'N/A'), header: "Accession", size: 110 },
        { id: "StudyDescription", accessorFn: row => String(row["00081030"] ?? 'N/A'), header: "Description", size: 200 },
        { id: "ModalitiesInStudy", accessorFn: row => (Array.isArray(row["00080061"]) ? (row["00080061"] as string[]).join(', ') : String(row["00080061"] ?? 'N/A')), header: "Mods", size: 70 },
        { id: "ReferringPhysicianName", accessorFn: row => String(row["00080090"] ?? 'N/A'), header: "Referring MD", size: 150 },
        { id: "StudyInstanceUID", accessorFn: row => String(row["0020000D"] ?? 'N/A'), header: "Study UID", size: 300 },
    ], []);

    const table = useReactTable({
        data,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

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
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map(headerGroup => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map(header => (
                                    <TableHead key={header.id} style={{ width: `${header.getSize()}px` }}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows.map(row => (
                            <TableRow key={row.id}>
                                {row.getVisibleCells().map(cell => (
                                    <TableCell key={cell.id} className="font-mono text-xs truncate" style={{ maxWidth: `${cell.column.getSize()}px` }}>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span>
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{String(cell.getValue())}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default DataBrowserResultsTable;
