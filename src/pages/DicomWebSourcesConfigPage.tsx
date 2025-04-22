// src/pages/DicomWebSourcesConfigPage.tsx
import React, { useState, useMemo } from 'react'; // Keep imports
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Trash2, Edit, ArrowUpDown } from 'lucide-react';
import { DicomWebSourceConfigRead } from '@/schemas';
import { getDicomWebSources, deleteDicomWebSource } from '@/services/api';
import { toast } from 'sonner';

// --- Import the Modal ---
import DicomWebSourceFormModal from '@/components/DicomWebSourceFormModal'; // Adjust path if needed

// SortableHeader component remains the same...
const SortableHeader = ({ column, title }: { column: any, title: string }) => (
  <Button
    variant="ghost"
    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    className="-ml-4" // Adjust alignment
  >
    {title}
    <ArrowUpDown className="ml-2 h-4 w-4" />
  </Button>
);


const DicomWebSourcesConfigPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [sorting, setSorting] = useState<SortingState>([]);
    // --- State for Modal ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSource, setEditingSource] = useState<DicomWebSourceConfigRead | null>(null);
    // --- End Modal State ---

    // --- Data Fetching (remains the same) ---
    const { data: sources, isLoading, error } = useQuery<DicomWebSourceConfigRead[], Error>({
        queryKey: ['dicomWebSources'],
        queryFn: () => getDicomWebSources(0, 500),
    });

    // --- Mutations (remains the same) ---
    const deleteMutation = useMutation({
        mutationFn: deleteDicomWebSource,
        onSuccess: (_, deletedId) => {
            toast.success(`DICOMweb Source (ID: ${deletedId}) deleted successfully.`);
            queryClient.invalidateQueries({ queryKey: ['dicomWebSources'] });
        },
        onError: (err: any, deletedId) => {
             const errorDetail = err?.detail || err.message || `Failed to delete DICOMweb Source (ID: ${deletedId})`;
             toast.error(errorDetail);
             console.error("Deletion error:", err);
        },
    });

    // --- Event Handlers ---
    const handleAdd = () => {
        setEditingSource(null); // Set to null for create mode
        setIsModalOpen(true);
    };

    const handleEdit = (source: DicomWebSourceConfigRead) => {
        setEditingSource(source); // Set the source to edit
        setIsModalOpen(true);
    };

    const handleDelete = (id: number, name: string) => {
        // Confirmation logic remains the same
        if (window.confirm(`Are you sure you want to delete the DICOMweb source "${name}" (ID: ${id})?`)) {
            deleteMutation.mutate(id);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingSource(null); // Clear editing state when closing
    };

    // --- Table Definition (remains the same, using source_name) ---
    const columns: ColumnDef<DicomWebSourceConfigRead>[] = useMemo(() => [
         {
            accessorKey: "id",
             header: ({ column }) => <SortableHeader column={column} title="ID" />,
             cell: ({ row }) => <div className="w-10 font-mono text-xs">{row.getValue("id")}</div>, // Fixed width
        },
        {
            accessorKey: "name", // Corrected accessor
            header: ({ column }) => <SortableHeader column={column} title="Name" />,
            cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>, // Corrected value access
        },
        {
            accessorKey: "base_url",
            header: "Base URL",
            cell: ({ row }) => <div className="truncate max-w-[250px] font-mono text-xs">{row.getValue("base_url")}</div>, // Adjusted max-w
        },
        {
            accessorKey: "is_enabled",
            header: () => <div className="text-center">Enabled</div>, // Centered header
            cell: ({ row }) => (
                <div className="flex justify-center"> {/* Center checkbox */}
                    <Checkbox
                        checked={row.getValue("is_enabled")}
                        disabled
                        aria-label={row.getValue("is_enabled") ? "Enabled" : "Disabled"}
                    />
                 </div>
             ),
             enableSorting: false,
             size: 50, // Example size control
        },
        {
            accessorKey: "polling_interval_seconds",
            header: ({ column }) => <div className="text-center"><SortableHeader column={column} title="Interval (s)" /></div>,
            cell: ({ row }) => <div className="text-center">{row.getValue("polling_interval_seconds")}</div>,
             size: 80,
        },
        {
            accessorKey: "auth_type",
            header: () => <div className="text-center">Auth</div>, // Centered header
            cell: ({ row }) => {
                const authType = row.getValue("auth_type") as string;
                let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
                if (authType !== 'none') variant = 'default';
                return <div className="flex justify-center"><Badge variant={variant}>{authType}</Badge></div>; // Center badge
            },
            size: 60,
        },
        {
             id: "actions",
             header: () => <div className="text-right">Actions</div>,
             enableHiding: false,
             cell: ({ row }) => {
                 const source = row.original;
                 return (
                     <div className="text-right">
                         <DropdownMenu>
                             <DropdownMenuTrigger asChild>
                                 <Button variant="ghost" className="h-8 w-8 p-0">
                                     <span className="sr-only">Open menu</span>
                                     <MoreHorizontal className="h-4 w-4" />
                                 </Button>
                             </DropdownMenuTrigger>
                             <DropdownMenuContent align="end">
                                 <DropdownMenuItem onClick={() => handleEdit(source)}>
                                     <Edit className="mr-2 h-4 w-4" /> Edit
                                 </DropdownMenuItem>
                                 <DropdownMenuItem
                                     className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-900/50"
                                     onClick={() => handleDelete(source.id, source.source_name)} // Use source_name
                                     disabled={deleteMutation.isPending && deleteMutation.variables === source.id}
                                 >
                                     <Trash2 className="mr-2 h-4 w-4" /> Delete
                                 </DropdownMenuItem>
                             </DropdownMenuContent>
                         </DropdownMenu>
                     </div>
                 );
             },
             size: 50,
        },
    ], [deleteMutation]); // Re-memoize based on deleteMutation state

    const table = useReactTable({
        data: sources || [],
        columns,
        getCoreRowModel: getCoreRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        state: {
          sorting,
        },
    });

    // --- Render Logic (remains similar) ---
    if (isLoading) {
        return <div>Loading DICOMweb sources...</div>; // TODO: Use a proper spinner/skeleton component
    }

    if (error) {
        return <div className="text-red-600 dark:text-red-400">Error loading DICOMweb sources: {error.message}</div>;
    }

    return (
        <div className="space-y-4">
             <div className="flex justify-between items-center">
                 <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Manage DICOMweb Sources</h2>
                 <Button size="sm" onClick={handleAdd}> {/* Updated handler */}
                     <PlusCircle className="mr-2 h-4 w-4" /> Add Source
                 </Button>
            </div>

             {/* --- Table Rendering (remains the same) --- */}
             <div className="rounded-md border">
                 <Table>
                     <TableHeader>
                         {table.getHeaderGroups().map((headerGroup) => (
                             <TableRow key={headerGroup.id}>
                                 {headerGroup.headers.map((header) => (
                                     <TableHead key={header.id} style={{ width: header.getSize() !== 150 ? `${header.getSize()}px` : undefined }}> {/* Apply size */}
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
                         {table.getRowModel().rows?.length ? (
                             table.getRowModel().rows.map((row) => (
                                 <TableRow
                                     key={row.id}
                                     data-state={row.getIsSelected() && "selected"}
                                 >
                                     {row.getVisibleCells().map((cell) => (
                                         <TableCell key={cell.id}>
                                             {flexRender(
                                                 cell.column.columnDef.cell,
                                                 cell.getContext()
                                             )}
                                         </TableCell>
                                     ))}
                                 </TableRow>
                             ))
                         ) : (
                             <TableRow>
                                 <TableCell
                                     colSpan={columns.length}
                                     className="h-24 text-center"
                                 >
                                     No DICOMweb sources configured yet.
                                 </TableCell>
                             </TableRow>
                         )}
                     </TableBody>
                 </Table>
             </div>

            {/* --- Render the Modal --- */}
            <DicomWebSourceFormModal
                isOpen={isModalOpen}
                onClose={closeModal} // Pass the close handler
                source={editingSource} // Pass null for create, source object for edit
            />
        </div>
    );
};

export default DicomWebSourcesConfigPage;
