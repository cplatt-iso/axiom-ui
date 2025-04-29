// src/pages/DicomWebSourcesConfigPage.tsx
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
import { MoreHorizontal, PlusCircle, Trash2, Edit, ArrowUpDown, Loader2, Globe, PowerOff, PauseCircle, PlayCircle, LinkIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Import Tooltip components

import { DicomWebSourceConfigRead } from '@/schemas';
import { getDicomWebSources, deleteDicomWebSource } from '@/services/api';
import { toast } from 'sonner';
import DicomWebSourceFormModal from '@/components/DicomWebSourceFormModal';
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

// --- Reuse Status Component (copied from DIMSE page, or move to shared utils) ---
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

const DicomWebSourcesConfigPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [sorting, setSorting] = useState<SortingState>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSource, setEditingSource] = useState<DicomWebSourceConfigRead | null>(null);

    const { data: sources, isLoading, error } = useQuery<DicomWebSourceConfigRead[], Error>({
        queryKey: ['dicomWebSources'],
        queryFn: () => getDicomWebSources(0, 500),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteDicomWebSource,
        // onSuccess uses ID directly now
        onSuccess: (_, deletedId) => {
            // Try finding name from cache for better message, fallback to ID
            const deletedSource = queryClient.getQueryData<DicomWebSourceConfigRead[]>(['dicomWebSources'])
                                    ?.find(s => s.id === deletedId);
            const sourceName = deletedSource?.name ?? deletedSource?.source_name ?? `ID ${deletedId}`;
            toast.success(`DICOMweb Source "${sourceName}" deleted successfully.`);
            queryClient.invalidateQueries({ queryKey: ['dicomWebSources'] });
        },
        onError: (err: any, deletedId) => {
             const errorDetail = err?.detail || err.message || `Failed to delete DICOMweb Source (ID: ${deletedId})`;
             toast.error(errorDetail);
             console.error("Deletion error:", err);
        },
    });

    const handleAdd = () => { setEditingSource(null); setIsModalOpen(true); };
    const handleEdit = (source: DicomWebSourceConfigRead) => { setEditingSource(source); setIsModalOpen(true); };
    const handleDelete = (id: number, name: string) => { if (window.confirm(`Are you sure you want to delete the DICOMweb source "${name}" (ID: ${id})?`)) { deleteMutation.mutate(id); } };
    const closeModal = () => { setIsModalOpen(false); setEditingSource(null); };

    // --- MODIFIED Table Definition ---
    const columns: ColumnDef<DicomWebSourceConfigRead>[] = useMemo(() => [
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
                const style = getScraperTypeStyle('dicomweb'); // Always dicomweb here
                 return (
                     <Tooltip>
                        <TooltipTrigger asChild={true}>
                            <div className="flex justify-center">
                                <style.Icon className={`h-5 w-5 ${style.textClass}`} />
                            </div>
                         </TooltipTrigger>
                         <TooltipContent><p>DICOMweb</p></TooltipContent>
                    </Tooltip>
                 );
            },
            size: 50,
        },
        {
            // Use 'name' from schema, fallback to 'source_name' if needed
            accessorKey: "name",
            header: ({ column }) => <SortableHeader column={column} title="Name" />,
            // Use resolved name if available
            cell: ({ row }) => <div className="font-medium truncate">{row.original.name ?? row.original.source_name}</div>,
            size: 200, // Give name reasonable space
        },
        { // Connection Info (Base URL)
            id: 'connectionInfo',
            header: "Connection Info (Base URL)",
            cell: ({ row }) => {
		 const url = row.original.base_url as string;
                 return (
                    <Tooltip>
                        <TooltipTrigger className="flex items-center space-x-1 cursor-default w-full">
                            <LinkIcon className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                            <span className="truncate font-mono text-xs text-muted-foreground">{url}</span>
                        </TooltipTrigger>
                        <TooltipContent><p className="max-w-md break-words">{url}</p></TooltipContent>
                    </Tooltip>
                 );
             },
            size: 250, // Give connection reasonable space
        },
        // REMOVED Separate Enabled Checkbox
        // REMOVED Interval Column
        // REMOVED Auth Type Column
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
                                     // Use resolved name for confirm prompt
                                     onClick={() => handleDelete(source.id, source.name ?? source.source_name)}
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
     if (isLoading) return <div className="p-4 text-center">Loading DICOMweb Sources...</div>;
     if (error) return <div className="p-4 text-red-600">Error: {error.message}</div>;

    return (
        <TooltipProvider delayDuration={150}> {/* Add TooltipProvider wrapper */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Manage DICOMweb Sources</h2>
                    <Button size="sm" onClick={handleAdd}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Source
                    </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                     Configure sources for polling via DICOMweb QIDO-RS. Status indicates if automatic polling is active.
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
                                        No DICOMweb sources configured yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <DicomWebSourceFormModal
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    source={editingSource}
                />
            </div>
        </TooltipProvider>
    );
};

export default DicomWebSourcesConfigPage;
