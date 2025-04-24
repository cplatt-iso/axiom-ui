// src/pages/StorageBackendsConfigPage.tsx
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
import { MoreHorizontal, PlusCircle, Trash2, Edit, ArrowUpDown, Database, Server, Cloud, HardDrive, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { StorageBackendConfigRead } from '@/schemas';
import { getStorageBackendConfigs, deleteStorageBackendConfig } from '@/services/api';
import { toast } from 'sonner';

// Import the Modal
import StorageBackendFormModal from '@/components/StorageBackendFormModal';

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

// Helper to get icon and color for backend type
// --- UPDATED: Returns text and background classes ---
const getBackendTypeStyle = (backendType: string): { Icon: React.ElementType, textClass: string, bgClass: string } => {
    switch (backendType?.toLowerCase()) {
        case 'filesystem': return { Icon: HardDrive, textClass: 'text-blue-700 dark:text-blue-300', bgClass: 'bg-blue-100 dark:bg-blue-900/30' };
        case 'cstore': return { Icon: Server, textClass: 'text-purple-700 dark:text-purple-300', bgClass: 'bg-purple-100 dark:bg-purple-900/30' };
        case 'gcs': return { Icon: Cloud, textClass: 'text-orange-700 dark:text-orange-300', bgClass: 'bg-orange-100 dark:bg-orange-900/30' };
        case 'google_healthcare': return { Icon: Cloud, textClass: 'text-red-700 dark:text-red-300', bgClass: 'bg-red-100 dark:bg-red-900/30' };
        case 'stow_rs': return { Icon: Server, textClass: 'text-teal-700 dark:text-teal-300', bgClass: 'bg-teal-100 dark:bg-teal-900/30' };
        default: return { Icon: Database, textClass: 'text-gray-600 dark:text-gray-400', bgClass: 'bg-gray-100 dark:bg-gray-700' };
    }
};
// --- END UPDATED ---


const StorageBackendsConfigPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [sorting, setSorting] = useState<SortingState>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBackend, setEditingBackend] = useState<StorageBackendConfigRead | null>(null);

    const { data: backends, isLoading, error } = useQuery<StorageBackendConfigRead[], Error>({
        queryKey: ['storageBackendConfigs'],
        queryFn: () => getStorageBackendConfigs(0, 500),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteStorageBackendConfig,
        onSuccess: (deletedData) => {
            toast.success(`Storage Backend "${deletedData.name}" (ID: ${deletedData.id}) deleted successfully.`);
            queryClient.invalidateQueries({ queryKey: ['storageBackendConfigs'] });
        },
        onError: (err: any, variables_id) => {
             const errorDetail = err?.detail || err.message || `Failed to delete Storage Backend (ID: ${variables_id})`;
             toast.error(errorDetail);
             console.error("Deletion error:", err);
        },
    });

    const handleAdd = () => {
        setEditingBackend(null);
        setIsModalOpen(true);
    };

    const handleEdit = (backend: StorageBackendConfigRead) => {
        setEditingBackend(backend);
        setIsModalOpen(true);
    };

    const handleDelete = (id: number, name: string) => {
        if (window.confirm(`Are you sure you want to delete the Storage Backend configuration "${name}" (ID: ${id})? This could affect existing rules.`)) {
            deleteMutation.mutate(id);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingBackend(null);
    };

    const columns: ColumnDef<StorageBackendConfigRead>[] = useMemo(() => [
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
            size: 200,
        },
        {
            accessorKey: "backend_type",
            header: ({ column }) => <SortableHeader column={column} title="Type" />,
            // --- UPDATED Cell Renderer ---
            cell: ({ row }) => {
                const type = row.getValue("backend_type") as string;
                const { Icon, textClass, bgClass } = getBackendTypeStyle(type);
                return (
                    // Render the badge directly, it will left-align by default in the cell
                    <Badge variant="outline" className={`border-transparent ${textClass} ${bgClass}`}>
                        <Icon className={`mr-1 h-3.5 w-3.5 ${textClass}`} />
                        {type}
                    </Badge>
                );
            },
            // --- END UPDATED ---
            size: 150,
        },
        {
            accessorKey: "description",
            header: "Description",
            cell: ({ row }) => <div className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-xs" title={row.getValue("description") || ''}>{row.getValue("description") || '-'}</div>,
            size: 250,
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
             id: "actions",
             header: () => <div className="text-right">Actions</div>,
             enableHiding: false,
             cell: ({ row }) => {
                 const backend = row.original;
                 const isDeleting = deleteMutation.isPending && deleteMutation.variables === backend.id;
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
                                 <DropdownMenuItem onClick={() => handleEdit(backend)}>
                                     <Edit className="mr-2 h-4 w-4" /> Edit Config
                                 </DropdownMenuItem>
                                 <DropdownMenuItem
                                     className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-900/50"
                                     onClick={() => handleDelete(backend.id, backend.name)}
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
        data: backends || [],
        columns,
        getCoreRowModel: getCoreRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        state: { sorting },
    });

    // Render Logic
    if (isLoading) {
        return <div className="p-4 text-center text-gray-500 dark:text-gray-400">Loading Storage Backend configurations...</div>;
    }
    if (error) {
        return <div className="p-4 text-red-600 dark:text-red-400">Error loading configurations: {error.message}</div>;
    }

    return (
        <div className="space-y-4">
             <div className="flex justify-between items-center">
                 <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Manage Storage Backends</h2>
                 <Button size="sm" onClick={handleAdd}>
                     <PlusCircle className="mr-2 h-4 w-4" /> Add Backend Config
                 </Button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
                 Define destinations where processed DICOM files can be stored (e.g., Filesystem, PACS via C-STORE, Cloud Storage). These configurations can be selected in Rule destinations.
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
                                     No Storage Backend configurations found. Click "Add Backend Config" to create one.
                                 </TableCell>
                             </TableRow>
                         )}
                     </TableBody>
                 </Table>
             </div>

            {/* Render the Modal */}
            <StorageBackendFormModal
                isOpen={isModalOpen}
                onClose={closeModal}
                backend={editingBackend} // Pass the state variable
            />
        </div>
    );
};

export default StorageBackendsConfigPage;
