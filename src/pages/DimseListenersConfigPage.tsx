// src/pages/DimseListenersConfigPage.tsx
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Button } from '@/components/ui/button';
// Removed Checkbox import as we use icons now
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Trash2, Edit, ArrowUpDown, Wifi, WifiOff, Loader2 } from 'lucide-react'; // Added Loader2
import { DimseListenerConfigRead } from '@/schemas';
import { getDimseListenerConfigs, deleteDimseListenerConfig } from '@/services/api';
import { toast } from 'sonner';

// Import the Modal
import DimseListenerFormModal from '@/components/DimseListenerFormModal'; // Ensure path is correct

// SortableHeader component
const SortableHeader = ({ column, title }: { column: any, title: string }) => (
  <Button
    variant="ghost"
    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    className="-ml-4 h-8" // Reduced height slightly
  >
    {title}
    <ArrowUpDown className="ml-2 h-4 w-4" />
  </Button>
);


const DimseListenersConfigPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [sorting, setSorting] = useState<SortingState>([]);
    // State for Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingListener, setEditingListener] = useState<DimseListenerConfigRead | null>(null);

    // Data Fetching
    const { data: listeners, isLoading, error } = useQuery<DimseListenerConfigRead[], Error>({
        queryKey: ['dimseListenerConfigs'],
        queryFn: () => getDimseListenerConfigs(0, 500),
        // Optional: Add refetch options if needed
        // refetchInterval: 30000,
    });

    // Mutations
    const deleteMutation = useMutation({
        mutationFn: deleteDimseListenerConfig,
        onSuccess: (deletedData) => {
            toast.success(`DIMSE Listener "${deletedData.name}" (ID: ${deletedData.id}) deleted successfully.`);
            queryClient.invalidateQueries({ queryKey: ['dimseListenerConfigs'] });
        },
        onError: (err: any, variables_id) => { // variables for mutate is just the id
             const errorDetail = err?.detail || err.message || `Failed to delete DIMSE Listener (ID: ${variables_id})`;
             toast.error(errorDetail);
             console.error("Deletion error:", err);
        },
    });

    // Event Handlers
    const handleAdd = () => {
        setEditingListener(null);
        setIsModalOpen(true);
    };

    const handleEdit = (listener: DimseListenerConfigRead) => {
        setEditingListener(listener);
        setIsModalOpen(true);
    };

    const handleDelete = (id: number, name: string) => {
        if (window.confirm(`Are you sure you want to delete the DIMSE Listener configuration "${name}" (ID: ${id})? This does NOT stop a running listener process, only removes its config.`)) {
            deleteMutation.mutate(id);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingListener(null); // Clear editing state when modal closes
    };

    // Table Definition
    const columns: ColumnDef<DimseListenerConfigRead>[] = useMemo(() => [
         {
            accessorKey: "id",
             header: ({ column }) => <SortableHeader column={column} title="ID" />,
             cell: ({ row }) => <div className="w-10 font-mono text-xs">{row.getValue("id")}</div>,
             size: 50,
        },
        {
            accessorKey: "name",
            header: ({ column }) => <SortableHeader column={column} title="Name" />,
            cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
            size: 180,
        },
        {
            accessorKey: "ae_title",
            header: ({ column }) => <SortableHeader column={column} title="AE Title" />,
            cell: ({ row }) => <div className="font-mono text-sm">{row.getValue("ae_title")}</div>,
            size: 120,
        },
        {
            accessorKey: "port",
            header: ({ column }) => <SortableHeader column={column} title="Port" />,
            cell: ({ row }) => <div className="text-center">{row.getValue("port")}</div>,
            size: 60,
        },
        {
            accessorKey: "is_enabled",
            header: () => <div className="text-center">Enabled</div>,
            cell: ({ row }) => (
                <div className="flex justify-center" title={row.getValue("is_enabled") ? "Enabled" : "Disabled"}>
                    {/* Using icons instead of checkbox for read-only status */}
                    {row.getValue("is_enabled") ? <Wifi className="h-5 w-5 text-green-500" /> : <WifiOff className="h-5 w-5 text-slate-400" />}
                 </div>
             ),
             enableSorting: false,
             size: 50,
        },
        {
            accessorKey: "instance_id",
            header: ({ column }) => <SortableHeader column={column} title="Instance ID" />,
            cell: ({ row }) => {
                const instanceId = row.getValue("instance_id") as string | null;
                return (
                    <div className="font-mono text-xs truncate max-w-[150px]" title={instanceId ?? undefined}>
                        {instanceId || <span className="italic text-gray-400">Unassigned</span>}
                    </div>
                );
            },
             size: 150,
        },
        {
             id: "actions",
             header: () => <div className="text-right">Actions</div>,
             enableHiding: false,
             cell: ({ row }) => {
                 const listener = row.original;
                 const isDeleting = deleteMutation.isPending && deleteMutation.variables === listener.id;
                 return (
                     <div className="text-right">
                         <DropdownMenu>
                             <DropdownMenuTrigger asChild>
                                 <Button variant="ghost" className="h-8 w-8 p-0" disabled={isDeleting}>
                                     <span className="sr-only">Open menu</span>
                                      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                                 </Button>
                             </DropdownMenuTrigger>
                             <DropdownMenuContent align="end">
                                 <DropdownMenuItem onClick={() => handleEdit(listener)}>
                                     <Edit className="mr-2 h-4 w-4" /> Edit Config
                                 </DropdownMenuItem>
                                 <DropdownMenuItem
                                     className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-900/50"
                                     onClick={() => handleDelete(listener.id, listener.name)}
                                     disabled={isDeleting}
                                 >
                                     <Trash2 className="mr-2 h-4 w-4" /> Delete Config
                                 </DropdownMenuItem>
                             </DropdownMenuContent>
                         </DropdownMenu>
                     </div>
                 );
             },
             size: 50,
        },
    ], [deleteMutation]);

    const table = useReactTable({
        data: listeners || [],
        columns,
        getCoreRowModel: getCoreRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        state: { sorting },
    });

    // Render Logic
    if (isLoading) {
        return <div className="p-4 text-center text-gray-500 dark:text-gray-400">Loading DIMSE Listener configurations...</div>;
    }
    if (error) {
        return <div className="p-4 text-red-600 dark:text-red-400">Error loading configurations: {error.message}</div>;
    }

    return (
        <div className="space-y-4">
             <div className="flex justify-between items-center">
                 <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Manage DIMSE Listeners</h2>
                 <Button size="sm" onClick={handleAdd}>
                     <PlusCircle className="mr-2 h-4 w-4" /> Add Listener Config
                 </Button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
                 Define C-STORE SCP listeners. Each active configuration requires a corresponding listener container process running with a unique <code className="text-xs bg-gray-200 dark:bg-gray-700 p-1 rounded">AXIOM_INSTANCE_ID</code> environment variable matching the <span className="font-semibold">Assigned Instance ID</span> field below.
            </p>

             {/* Table Rendering */}
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
                                         <TableCell key={cell.id} className="py-2"> {/* Adjusted padding */}
                                             {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                         </TableCell>
                                     ))}
                                 </TableRow>
                             ))
                         ) : (
                             <TableRow>
                                 <TableCell colSpan={columns.length} className="h-24 text-center">
                                     No DIMSE Listener configurations found. Click "Add Listener Config" to create one.
                                 </TableCell>
                             </TableRow>
                         )}
                     </TableBody>
                 </Table>
             </div>

            {/* Render the Modal */}
            <DimseListenerFormModal
                isOpen={isModalOpen}
                onClose={closeModal} // Use the correct close handler
                listenerConfig={editingListener} // Pass the state variable
            />
        </div>
    );
};

export default DimseListenersConfigPage;
