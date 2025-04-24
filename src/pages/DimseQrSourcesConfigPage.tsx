// src/pages/DimseQrSourcesConfigPage.tsx
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
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Trash2, Edit, ArrowUpDown, Wifi, WifiOff, Loader2, Search } from 'lucide-react'; // Added Search icon
import { DimseQueryRetrieveSourceRead } from '@/schemas'; // Import the Read schema
import { getDimseQrSources, deleteDimseQrSource } from '@/services/api'; // Import API functions
import { toast } from 'sonner';

// Import the Modal (We will create this next)
import DimseQrSourceFormModal from '@/components/DimseQrSourceFormModal';

// SortableHeader component (reusable)
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


const DimseQrSourcesConfigPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [sorting, setSorting] = useState<SortingState>([]);
    // State for Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSource, setEditingSource] = useState<DimseQueryRetrieveSourceRead | null>(null);

    // Data Fetching
    const { data: sources, isLoading, error } = useQuery<DimseQueryRetrieveSourceRead[], Error>({
        queryKey: ['dimseQrSources'], // Unique query key
        queryFn: () => getDimseQrSources(0, 500), // Use the correct API function
    });

    // Mutations
    const deleteMutation = useMutation({
        mutationFn: deleteDimseQrSource, // Use the correct API function
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

    // Event Handlers
    const handleAdd = () => {
        setEditingSource(null);
        setIsModalOpen(true);
    };

    const handleEdit = (source: DimseQueryRetrieveSourceRead) => {
        setEditingSource(source);
        setIsModalOpen(true);
    };

    const handleDelete = (id: number, name: string) => {
        if (window.confirm(`Are you sure you want to delete the DIMSE Q/R source configuration "${name}" (ID: ${id})?`)) {
            deleteMutation.mutate(id);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingSource(null);
    };

    // Table Definition
    const columns: ColumnDef<DimseQueryRetrieveSourceRead>[] = useMemo(() => [
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
            accessorKey: "remote_ae_title",
            header: ({ column }) => <SortableHeader column={column} title="Remote AE" />,
            cell: ({ row }) => <div className="font-mono text-sm">{row.getValue("remote_ae_title")}</div>,
            size: 120,
        },
        {
            accessorKey: "remote_host",
            header: "Remote Host",
            cell: ({ row }) => <div className="font-mono text-xs">{row.original.remote_host}:{row.original.remote_port}</div>, // Combine host/port
            size: 150,
        },
        {
            accessorKey: "local_ae_title",
            header: "Local AE",
            cell: ({ row }) => <div className="font-mono text-xs">{row.getValue("local_ae_title")}</div>,
            size: 120,
        },
        {
            accessorKey: "is_enabled",
            header: () => <div className="text-center">Enabled</div>,
            cell: ({ row }) => (
                <div className="flex justify-center" title={row.getValue("is_enabled") ? "Enabled" : "Disabled"}>
                    {row.getValue("is_enabled") ? <Wifi className="h-5 w-5 text-green-500" /> : <WifiOff className="h-5 w-5 text-slate-400" />}
                 </div>
             ),
             enableSorting: false,
             size: 50,
        },
        {
            accessorKey: "polling_interval_seconds",
            header: ({ column }) => <div className="text-center"><SortableHeader column={column} title="Interval (s)" /></div>,
            cell: ({ row }) => <div className="text-center">{row.getValue("polling_interval_seconds")}</div>,
             size: 80,
        },
        {
            accessorKey: "move_destination_ae_title",
            header: "Move Dest AE",
            cell: ({ row }) => <div className="font-mono text-xs">{row.getValue("move_destination_ae_title") || <span className="italic text-gray-400">None</span>}</div>,
            size: 120,
        },
        {
             id: "actions",
             header: () => <div className="text-right">Actions</div>,
             enableHiding: false,
             cell: ({ row }) => {
                 const source = row.original;
                 const isDeleting = deleteMutation.isPending && deleteMutation.variables === source.id;
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
             size: 50,
        },
    ], [deleteMutation]);

    const table = useReactTable({
        data: sources || [],
        columns,
        getCoreRowModel: getCoreRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        state: { sorting },
    });

    // Render Logic
    if (isLoading) {
        return <div className="p-4 text-center text-gray-500 dark:text-gray-400">Loading DIMSE Q/R Source configurations...</div>;
    }
    if (error) {
        return <div className="p-4 text-red-600 dark:text-red-400">Error loading configurations: {error.message}</div>;
    }

    return (
        <div className="space-y-4">
             <div className="flex justify-between items-center">
                 <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Manage DIMSE Q/R Sources</h2>
                 <Button size="sm" onClick={handleAdd}>
                     <PlusCircle className="mr-2 h-4 w-4" /> Add Q/R Source Config
                 </Button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
                 Configure remote DIMSE peers for querying (C-FIND) and optionally retrieving studies (C-MOVE). Polling tasks will run based on the interval for enabled sources.
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
                                         <TableCell key={cell.id} className="py-2">
                                             {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                         </TableCell>
                                     ))}
                                 </TableRow>
                             ))
                         ) : (
                             <TableRow>
                                 <TableCell colSpan={columns.length} className="h-24 text-center">
                                     No DIMSE Q/R Source configurations found. Click "Add Q/R Source Config" to create one.
                                 </TableCell>
                             </TableRow>
                         )}
                     </TableBody>
                 </Table>
             </div>

            {/* Render the Modal */}
            <DimseQrSourceFormModal
                isOpen={isModalOpen}
                onClose={closeModal}
                source={editingSource} // Pass the state variable
            />
        </div>
    );
};

export default DimseQrSourcesConfigPage;
