// src/pages/DimseQrSourcesConfigPage.tsx
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ColumnDef, flexRender, getCoreRowModel, useReactTable, SortingState, getSortedRowModel,
} from "@tanstack/react-table";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
// Updated Icons
import { MoreHorizontal, PlusCircle, Trash2, Edit, ArrowUpDown, Loader2, Network, PowerOff, PauseCircle, PlayCircle, LinkIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Import Tooltip components

import { DimseQueryRetrieveSourceRead } from '@/schemas';
import { getDimseQrSources, deleteDimseQrSource } from '@/services/api';
import { toast } from 'sonner';
import DimseQrSourceFormModal from '@/components/DimseQrSourceFormModal';
import { getScraperTypeStyle } from '@/utils/styleHelpers'; // Import helper for type icon

// SortableHeader component (reuse if not already in a shared util)
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

// --- New Status Component ---
const SourceStatusBadge: React.FC<{ isEnabled: boolean; isActive: boolean }> = ({ isEnabled, isActive }) => {
    let status: { text: string; Icon: React.ElementType; variant: 'default' | 'destructive' | 'secondary' | 'outline'; tooltip: string };

    if (!isEnabled) {
        status = { text: 'Disabled', Icon: PowerOff, variant: 'secondary', tooltip: 'Source is disabled globally.' };
    } else if (!isActive) {
        status = { text: 'Inactive', Icon: PauseCircle, variant: 'outline', tooltip: 'Automatic polling is inactive.' };
    } else {
        status = { text: 'Active', Icon: PlayCircle, variant: 'default', tooltip: 'Automatic polling is active.' };
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild={true}>
                <Badge variant={status.variant} className="cursor-default">
                    <status.Icon className="mr-1 h-3 w-3" />
                    {status.text}
                </Badge>
            </TooltipTrigger>
            <TooltipContent>
                <p>{status.tooltip}</p>
            </TooltipContent>
        </Tooltip>
    );
};
// --- End Status Component ---


const DimseQrSourcesConfigPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [sorting, setSorting] = useState<SortingState>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSource, setEditingSource] = useState<DimseQueryRetrieveSourceRead | null>(null);

    const { data: sources, isLoading, error } = useQuery<DimseQueryRetrieveSourceRead[], Error>({
        queryKey: ['dimseQrSources'],
        queryFn: () => getDimseQrSources(0, 500), // Fetch a reasonable limit
    });

    const deleteMutation = useMutation({
        mutationFn: deleteDimseQrSource,
        onSuccess: (deletedData) => {
            toast.success(`DIMSE Q/R Source "${deletedData.name}" (ID: ${deletedData.id}) deleted successfully.`);
            queryClient.invalidateQueries({ queryKey: ['dimseQrSources'] });
        },
        onError: (err: any, variables_id) => {
             const errorDetail = err?.detail || err.message || `Failed to delete DIMSE Q/R Source (ID: ${variables_id})`;
             toast.error(errorDetail);
             console.error("Deletion error:", err);
        },
    });

    const handleAdd = () => { setEditingSource(null); setIsModalOpen(true); };
    const handleEdit = (source: DimseQueryRetrieveSourceRead) => { setEditingSource(source); setIsModalOpen(true); };
    const handleDelete = (id: number, name: string) => { if (window.confirm(`Are you sure you want to delete the DIMSE Q/R source configuration "${name}" (ID: ${id})?`)) { deleteMutation.mutate(id); } };
    const closeModal = () => { setIsModalOpen(false); setEditingSource(null); };

    // --- MODIFIED Table Definition ---
    const columns: ColumnDef<DimseQueryRetrieveSourceRead>[] = useMemo(() => [
         {
            accessorKey: "id",
             header: ({ column }) => <SortableHeader column={column} title="ID" />,
             cell: ({ row }) => <div className="w-10 font-mono text-xs">{row.getValue("id")}</div>,
             size: 50,
        },
        { // Type Icon
            id: 'type',
            header: () => <div className="px-2 text-center">Type</div>,
            cell: ({ row }) => {
                const style = getScraperTypeStyle('dimse-qr'); // Always dimse-qr here
                return (
                     <Tooltip>
                        <TooltipTrigger asChild={true}>
                             <div className="flex justify-center">
                                <style.Icon className={`h-5 w-5 ${style.textClass}`} />
                             </div>
                         </TooltipTrigger>
                         <TooltipContent><p>DIMSE Q/R</p></TooltipContent>
                    </Tooltip>
                 );
            },
            size: 50,
        },
        {
            accessorKey: "name",
            header: ({ column }) => <SortableHeader column={column} title="Name" />,
            cell: ({ row }) => <div className="font-medium truncate">{row.getValue("name")}</div>, // Allow truncate
            size: 200, // Give name reasonable space
        },
        { // Combined Connection Info
            id: 'connectionInfo',
            header: "Connection Info",
            cell: ({ row }) => {
                 const ae = row.original.remote_ae_title ?? '?AE?';
                 const host = row.original.remote_host ?? '?HOST?';
                 const port = row.original.remote_port ?? '?PORT?';
                 const details = `${ae}@${host}:${port}`;
                 return (
                    <Tooltip>
                        <TooltipTrigger className="flex items-center space-x-1 cursor-default w-full">
                            <LinkIcon className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                            <span className="truncate font-mono text-xs text-muted-foreground">{details}</span>
                        </TooltipTrigger>
                        <TooltipContent><p className="max-w-md break-words">{details}</p></TooltipContent>
                    </Tooltip>
                 );
            },
            size: 250, // Give connection reasonable space
        },
        // REMOVED Separate Enabled Column
        // REMOVED Interval Column (can be seen in Edit)
        // REMOVED Move Dest AE Column (can be seen in Edit)
        { // --- NEW STATUS COLUMN ---
            id: "status",
            header: () => <div className="text-center">Status</div>,
            cell: ({ row }) => (
                <div className="flex justify-center">
                    <SourceStatusBadge isEnabled={row.original.is_enabled} isActive={row.original.is_active} />
                </div>
             ),
             enableSorting: false,
             size: 100, // Size for badge
        }, // --- END STATUS COLUMN ---
        { // Actions (Keep as is)
             id: "actions",
             header: () => <div className="text-right pr-4">Actions</div>,
             enableHiding: false,
             cell: ({ row }) => {
                 const source = row.original;
                 const isDeleting = deleteMutation.isPending && deleteMutation.variables === source.id;
                 return (
                     <div className="text-right pr-1">
                         <DropdownMenu>
                             <DropdownMenuTrigger asChild>
                                 <Button variant="ghost" className="h-8 w-8 p-0" disabled={isDeleting}>
                                     <span className="sr-only">Open menu</span>
                                      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                                 </Button>
                             </DropdownMenuTrigger>
                             <DropdownMenuContent align="end">
                                 <DropdownMenuItem onClick={() => handleEdit(source)}>
                                     <Edit className="mr-2 h-4 w-4" /> Edit Config
                                 </DropdownMenuItem>
                                 <DropdownMenuItem
                                     className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-900/50"
                                     onClick={() => handleDelete(source.id, source.name)}
                                     disabled={isDeleting}
                                 >
                                     <Trash2 className="mr-2 h-4 w-4" /> Delete Config
                                 </DropdownMenuItem>
                             </DropdownMenuContent>
                         </DropdownMenu>
                     </div>
                 );
             },
             size: 60, // Keep actions narrow
        },
    ], [deleteMutation]);
    // --- END MODIFIED Table Definition ---

    const table = useReactTable({
        data: sources || [],
        columns,
        getCoreRowModel: getCoreRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        state: { sorting },
    });

    // --- Loading/Error/Render Logic (Keep as is) ---
    if (isLoading) return <div className="p-4 text-center">Loading DIMSE Q/R Sources...</div>;
    if (error) return <div className="p-4 text-red-600">Error: {error.message}</div>;

    return (
        <TooltipProvider delayDuration={150}> {/* Add TooltipProvider wrapper */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Manage DIMSE Q/R Sources</h2>
                    <Button size="sm" onClick={handleAdd}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Q/R Source
                    </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                    Configure remote DIMSE peers for Query/Retrieve operations. Status indicates if automatic polling is active.
                </p>

                <div className="rounded-md border">
                    {/* Apply table-fixed layout */}
                    <Table className="table-fixed w-full">
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id} style={{ width: header.getSize() ? `${header.getSize()}px` : undefined }}>
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
                                            <TableCell key={cell.id} className="py-2 truncate"> {/* Add truncate globally? */}
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="h-24 text-center">
                                        No DIMSE Q/R Source configurations found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <DimseQrSourceFormModal
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    source={editingSource}
                />
            </div>
        </TooltipProvider>
    );
};

export default DimseQrSourcesConfigPage;
