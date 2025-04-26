// src/components/CrosswalkMappingTable.tsx
import React, { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatDistanceToNowStrict } from 'date-fns';
import {
    ColumnDef, flexRender, getCoreRowModel, useReactTable, SortingState, getSortedRowModel
} from "@tanstack/react-table";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, ArrowUpDown, Loader2, Wifi, WifiOff } from 'lucide-react';
import { CrosswalkMapRead } from '@/schemas'; // Import types
import { deleteCrosswalkMap } from '@/services/api'; // Import API functions
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Helper to format optional dates (reuse)
const formatOptionalDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return formatDistanceToNowStrict(date, { addSuffix: true });
    } catch (e) { return 'Invalid Date'; }
};

// SortableHeader component (reuse)
const SortableHeader = ({ column, title }: { column: any, title: string }) => (
    <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="-ml-4 h-8">
        {title}
        <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
);

interface CrosswalkMappingTableProps {
    mappings: CrosswalkMapRead[];
    onEdit: (map: CrosswalkMapRead) => void;
}

const CrosswalkMappingTable: React.FC<CrosswalkMappingTableProps> = ({ mappings, onEdit }) => {
    const queryClient = useQueryClient();
    const [sorting, setSorting] = useState<SortingState>([]);

    const deleteMutation = useMutation({
        mutationFn: deleteCrosswalkMap,
        onSuccess: (deletedData) => {
            toast.success(`Mapping "${deletedData.name}" deleted successfully.`);
            // Refetch maps, potentially filtered by source if applicable
            queryClient.invalidateQueries({ queryKey: ['crosswalkMaps'] });
            // Also refetch the specific source's maps if filtered view exists
            queryClient.invalidateQueries({ queryKey: ['crosswalkMaps', deletedData.data_source_id] });
        },
        onError: (err: any, variables_id) => {
             const errorDetail = err?.detail || err.message || `Failed to delete Mapping (ID: ${variables_id})`;
             toast.error(errorDetail);
        },
    });

    const handleDelete = (id: number, name: string) => {
        if (window.confirm(`Are you sure you want to delete Mapping "${name}" (ID: ${id})?`)) {
            deleteMutation.mutate(id);
        }
    };

    // Truncate helper
    const truncateJson = (jsonArray: any[] | null | undefined, maxLength: number = 3) => {
         if (!Array.isArray(jsonArray)) return 'N/A';
         const items = jsonArray.slice(0, maxLength).map(item => JSON.stringify(item));
         let result = items.join(', ');
         if (jsonArray.length > maxLength) {
             result += ', ...';
         }
         return `[${result}]`;
    }

    const columns: ColumnDef<CrosswalkMapRead>[] = useMemo(() => [
        { accessorKey: "id", header: ({ column }) => <SortableHeader column={column} title="ID" />, cell: ({ row }) => <div className="w-10 font-mono text-xs">{row.getValue("id")}</div>, size: 50 },
        { accessorKey: "name", header: ({ column }) => <SortableHeader column={column} title="Name" />, cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>, size: 180 },
        {
            accessorKey: "data_source.name", // Access nested data source name
            header: ({ column }) => <SortableHeader column={column} title="Data Source" />,
            cell: ({ row }) => <Badge variant="outline">{row.original.data_source?.name ?? 'N/A'}</Badge>, // Display name in badge
            size: 150
        },
        {
             accessorKey: "match_columns",
             header: "Match Columns",
             cell: ({ row }) => <div className="font-mono text-xs truncate max-w-[200px]" title={JSON.stringify(row.getValue("match_columns"))}>{truncateJson(row.getValue("match_columns"))}</div>,
             enableSorting: false, size: 200
        },
        {
            accessorKey: "replacement_mapping",
            header: "Replacement Mapping",
            cell: ({ row }) => <div className="font-mono text-xs truncate max-w-[200px]" title={JSON.stringify(row.getValue("replacement_mapping"))}>{truncateJson(row.getValue("replacement_mapping"))}</div>,
             enableSorting: false, size: 200
         },
        {
            accessorKey: "is_enabled",
            header: () => <div className="text-center">Enabled</div>,
            cell: ({ row }) => <div className="flex justify-center" title={row.getValue("is_enabled") ? "Enabled" : "Disabled"}>{row.getValue("is_enabled") ? <Wifi className="h-5 w-5 text-green-500" /> : <WifiOff className="h-5 w-5 text-slate-400" />}</div>,
            enableSorting: false, size: 50
        },
        {
             id: "actions", header: () => <div className="text-right">Actions</div>, enableHiding: false, size: 50,
             cell: ({ row }) => {
                 const mapping = row.original;
                 const isDeleting = deleteMutation.isPending && deleteMutation.variables === mapping.id;

                 return (
                     <div className="text-right">
                         <DropdownMenu>
                             <DropdownMenuTrigger asChild>
                                  <span> {/* Wrap for asChild */}
                                     <Button variant="ghost" className="h-8 w-8 p-0" disabled={isDeleting}>
                                         <span className="sr-only">Open menu</span>
                                         {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                                     </Button>
                                  </span>
                             </DropdownMenuTrigger>
                             <DropdownMenuContent align="end">
                                 <DropdownMenuItem onClick={() => onEdit(mapping)} disabled={isDeleting}>
                                     <Edit className="mr-2 h-4 w-4" /> Edit Mapping
                                 </DropdownMenuItem>
                                 <DropdownMenuItem className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-900/50" onClick={() => handleDelete(mapping.id, mapping.name)} disabled={isDeleting}>
                                     <Trash2 className="mr-2 h-4 w-4" /> Delete Mapping
                                 </DropdownMenuItem>
                             </DropdownMenuContent>
                         </DropdownMenu>
                     </div>
                 );
             },
        },
    ], [deleteMutation, onEdit]); // Include dependencies

    const table = useReactTable({
        data: mappings || [], columns, getCoreRowModel: getCoreRowModel(), onSortingChange: setSorting, getSortedRowModel: getSortedRowModel(), state: { sorting },
    });

    return (
         <TooltipProvider delayDuration={150}>
            <div className="rounded-md border">
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
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="py-2">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No Crosswalk Mappings configured.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </TooltipProvider>
    );
};

export default CrosswalkMappingTable;
