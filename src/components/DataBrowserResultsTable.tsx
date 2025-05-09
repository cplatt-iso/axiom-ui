// frontend/src/components/DataBrowserResultsTable.tsx
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
import { ArrowUpDown, Database, Search, Server, ArrowLeft, ArrowRight, Cloud } from 'lucide-react';
import { StudyResultItem } from '@/schemas/data_browser';
import { format, parse, isValid } from 'date-fns';

interface DataBrowserResultsTableProps {
    results: StudyResultItem[];
    isLoading: boolean;
}

const formatDicomDateTime = (dateStr?: string | null, timeStr?: string | null): string => {
    if (!dateStr) return 'N/A';
    const datePart: string = dateStr.replace(/-/g, '');
    const timePart: string = timeStr?.replace(/:/g, '')?.split('.')[0] ?? '000000';
    try {
        const parsedDate: Date = parse(`${datePart}${timePart}`, 'yyyyMMddHHmmss', new Date());
        if (isValid(parsedDate)) { return format(parsedDate, 'MMM d, yyyy HH:mm'); }
    } catch (e) {}
    try {
        const parsedDateOnly: Date = parse(datePart, 'yyyyMMdd', new Date());
         if (isValid(parsedDateOnly)) { return format(parsedDateOnly, 'MMM d, yyyy'); }
    } catch (e) {}
    return `${dateStr ?? ''} ${timeStr ?? ''}`.trim() || 'Invalid Date';
};

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

const SourceBadge = ({ type, name }: { type: string, name: string }) => {
    let Icon = Database;
    let variant: "secondary" | "outline" | "default" = 'default';
    if (type === 'dicomweb') { Icon = Search; variant = 'secondary'; }
    else if (type === 'dimse-qr') { Icon = Server; variant = 'outline'; }
    else if (type === 'google_healthcare') { Icon = Cloud; variant = 'default'; }
    const displayName = name.length > 25 ? `${name.substring(0, 22)}...` : name;
    return <Badge variant={variant} className="w-fit" title={name}><Icon className="mr-1 h-3 w-3" />{displayName}</Badge>;
};


const DataBrowserResultsTable: React.FC<DataBrowserResultsTableProps> = ({ results, isLoading }) => {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 15 });

    const columns: ColumnDef<StudyResultItem>[] = useMemo(() => [
        {
            accessorKey: "source_name",
            id: "source_name",
            header: "Source",
            cell: ({ row }) => <SourceBadge type={row.original.source_type} name={row.original.source_name} />,
            size: 150,
        },
        { id: "PatientName", accessorFn: row => row["00100010"] ?? 'N/A', header: ({ column }) => <SortableHeader column={column} title="Patient Name" />, size: 180 },
        { id: "PatientID", accessorFn: row => row["00100020"] ?? 'N/A', header: "Patient ID", size: 130 },
        { id: "PatientBirthDate", accessorFn: row => formatDicomDateTime(row["00100030"], null), header: "Birth Date", size: 110 },
        { id: "StudyDateTime", accessorFn: row => formatDicomDateTime(row["00080020"], row["00080030"]), header: ({ column }) => <SortableHeader column={column} title="Study Date/Time" />, size: 140 },
        { id: "AccessionNumber", accessorFn: row => row["00080050"] ?? 'N/A', header: "Accession #", size: 130 },
        { id: "InstitutionName", accessorFn: row => row["00080080"] ?? 'N/A', header: "Institution", size: 180 }, // <-- ADDED COLUMN
        { id: "ModalitiesInStudy", accessorFn: row => row["00080061"]?.join(', ') ?? 'N/A', header: "Mods", size: 70 },
        { id: "StudyDescription", accessorFn: row => row["00081030"] ?? 'N/A', header: "Description", size: 200 }, // Reduced size slightly
        { id: "ReferringPhysicianName", accessorFn: row => row["00080090"] ?? 'N/A', header: "Referring Dr.", size: 160 },
        { id: "NumberOfStudyRelatedSeries", accessorFn: row => row["00201206"] ?? '?', header: () => <div className="text-right">Series</div>, cell: ({ getValue }) => <div className="text-right">{getValue<number | string>()}</div>, size: 60 },
        { id: "NumberOfStudyRelatedInstances", accessorFn: row => row["00201208"] ?? '?', header: () => <div className="text-right">Inst.</div>, cell: ({ getValue }) => <div className="text-right">{getValue<number | string>()}</div>, size: 60 },

    ], []);

    const table = useReactTable({
        data: results ?? [],
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
                <Table style={{ tableLayout: 'fixed', width: '100%' }}>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id} style={{ width: `${header.getSize()}px` }}>
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
                                        <TableCell key={cell.id} className="py-2 truncate" style={{ maxWidth: `${cell.column.getSize()}px` }}>
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
