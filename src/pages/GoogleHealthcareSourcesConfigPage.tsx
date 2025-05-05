// frontend/src/pages/GoogleHealthcareSourcesConfigPage.tsx
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
    getPaginationRowModel,
} from '@tanstack/react-table';
import { format, isValid, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger, // Often needed with AlertDialog
} from "@/components/ui/alert-dialog";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { MoreHorizontal, ArrowUpDown, PlusCircle, Trash2, Edit } from "lucide-react";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

// Import the specific API functions and types
import {
    getGoogleHealthcareSources,
    deleteGoogleHealthcareSource,
} from '@/services/api';
import { GoogleHealthcareSourceRead } from '@/schemas'; // Read schema for table data
import GoogleHealthcareSourceFormModal from '@/components/GoogleHealthcareSourceFormModal'; // The modal we just created

const GoogleHealthcareSourcesConfigPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [sorting, setSorting] = useState<SortingState>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSource, setEditingSource] = useState<GoogleHealthcareSourceRead | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [sourceToDelete, setSourceToDelete] = useState<GoogleHealthcareSourceRead | null>(null);

    // Fetch data using TanStack Query
    const { data: sources = [], isLoading, error } = useQuery<GoogleHealthcareSourceRead[]>({
        queryKey: ['googleHealthcareSources'], // Unique query key for this source type
        queryFn: getGoogleHealthcareSources,
    });

     // Mutation for deleting a source
    const deleteMutation = useMutation({
        mutationFn: deleteGoogleHealthcareSource,
        onSuccess: (_, deletedId) => {
            toast.success(`Google Healthcare Source (ID: ${deletedId}) deleted successfully.`);
            queryClient.invalidateQueries({ queryKey: ['googleHealthcareSources'] });
        },
        onError: (err: any, deletedId) => {
            const errorMsg = err?.response?.data?.detail || err.message || "Failed to delete source.";
            toast.error(`Deletion failed for ID ${deletedId}: ${errorMsg}`);
            console.error(`Delete Google Healthcare Source error for ID ${deletedId}:`, err);
        },
         onSettled: () => {
             // Always close dialog regardless of outcome
             setIsDeleteDialogOpen(false);
             setSourceToDelete(null);
         }
    });

    const openModalForCreate = () => {
        setEditingSource(null);
        setIsModalOpen(true);
    };

    const openModalForEdit = (source: GoogleHealthcareSourceRead) => {
        setEditingSource(source);
        setIsModalOpen(true);
    };

     const openDeleteDialog = (source: GoogleHealthcareSourceRead) => {
         setSourceToDelete(source);
         setIsDeleteDialogOpen(true);
     };

     const confirmDelete = () => {
         if (sourceToDelete) {
             deleteMutation.mutate(sourceToDelete.id);
         }
     };

    // Define table columns
    const columns = useMemo<ColumnDef<GoogleHealthcareSourceRead>[]>(() => [
        { accessorKey: 'id', header: 'ID', cell: info => info.getValue() },
        {
            accessorKey: 'name',
            header: ({ column }) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Name <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: info => <span className="font-medium">{info.getValue<string>()}</span>
        },
        { accessorKey: 'description', header: 'Description', cell: info => info.getValue() || <span className="text-muted-foreground italic">N/A</span> },
        { accessorKey: 'gcp_project_id', header: 'Project ID', cell: info => info.getValue() },
        { accessorKey: 'gcp_location', header: 'Location', cell: info => info.getValue() },
        { accessorKey: 'gcp_dataset_id', header: 'Dataset ID', cell: info => info.getValue() },
        { accessorKey: 'gcp_dicom_store_id', header: 'DICOM Store ID', cell: info => info.getValue() },
        {
             accessorKey: 'is_enabled',
             header: 'Enabled',
             cell: info => <Checkbox checked={info.getValue<boolean>()} disabled className="block mx-auto" />
        },
        {
             accessorKey: 'is_active',
             header: 'Polling Active',
             cell: info => <Checkbox checked={info.getValue<boolean>()} disabled className="block mx-auto"/>
        },
         {
            accessorKey: 'polling_interval_seconds',
            header: 'Poll Interval (s)',
            cell: info => info.getValue()
        },
        {
             accessorKey: 'updated_at',
             header: ({ column }) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Last Updated <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
	    cell: info => {
                 const dateValue = info.getValue<string | null | undefined>();
                 if (!dateValue) {
                     return <span className="text-muted-foreground italic">N/A</span>; // Handle null/undefined
                 }
                 try {
                    // Use parseISO for better ISO 8601 parsing and check validity
                    const parsedDate = parseISO(dateValue);
                    if (isValid(parsedDate)) {
                         return format(parsedDate, 'yyyy-MM-dd HH:mm');
                    } else {
                         // Handle cases where the string is present but not valid ISO
                         console.warn(`Invalid date format received for updated_at: ${dateValue}`);
                         return <span className="text-destructive text-xs">Invalid Date</span>;
                    }
                 } catch (e) {
                    // Catch any unexpected errors during parsing/formatting
                     console.error(`Error formatting date: ${dateValue}`, e);
                     return <span className="text-destructive text-xs">Error</span>;
                 }
             }
        },
        {
            id: 'actions',
            cell: ({ row }) => {
                const source = row.original;
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openModalForEdit(source)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                             <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                onClick={() => openDeleteDialog(source)}
                             >
                                 <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ], []);

    const table = useReactTable({
        data: sources,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    if (error) {
        return <div className="text-destructive p-4">Error loading Google Healthcare sources: {error.message}</div>;
    }

    return (
        <div className="container mx-auto py-6 px-4">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-semibold">Google Healthcare DICOM Store Sources</h1>
                 <Button onClick={openModalForCreate}>
                     <PlusCircle className="mr-2 h-4 w-4" /> Add GHC Source
                 </Button>
            </div>
            <p className="text-muted-foreground mb-4">Configure Google Cloud Healthcare DICOM Stores as sources for polling.</p>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map(headerGroup => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map(header => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                             Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={`skeleton-${i}`}>
                                    {columns.map(column => (
                                        <TableCell key={column.id || i + '-cell-' + column.accessorKey}>
                                            <Skeleton className="h-6 w-full" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map(row => (
                                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                                    {row.getVisibleCells().map(cell => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    No Google Healthcare sources configured yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
             <div className="flex items-center justify-end space-x-2 py-4">
                 <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                >
                    Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                     Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                 </span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                >
                    Next
                </Button>
            </div>

            {/* Create/Edit Modal */}
            <GoogleHealthcareSourceFormModal
                 isOpen={isModalOpen}
                 onClose={() => setIsModalOpen(false)}
                 source={editingSource}
            />

             {/* Delete Confirmation Dialog */}
             <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                 <AlertDialogContent>
                     <AlertDialogHeader>
                         <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                         <AlertDialogDescription>
                             This action cannot be undone. This will permanently delete the Google Healthcare source configuration named "{sourceToDelete?.name}".
                         </AlertDialogDescription>
                     </AlertDialogHeader>
                     <AlertDialogFooter>
                         <AlertDialogCancel onClick={() => setSourceToDelete(null)}>Cancel</AlertDialogCancel>
                         <AlertDialogAction
                             onClick={confirmDelete}
                             disabled={deleteMutation.isPending}
                             className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                             {deleteMutation.isPending ? "Deleting..." : "Delete"}
                         </AlertDialogAction>
                     </AlertDialogFooter>
                 </AlertDialogContent>
             </AlertDialog>

        </div>
    );
};

export default GoogleHealthcareSourcesConfigPage;
