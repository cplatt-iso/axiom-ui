// src/components/SchedulesTable.tsx
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
import { MoreHorizontal, Edit, Trash2, ArrowUpDown, Loader2, Wifi, WifiOff } from 'lucide-react'; // Keep necessary icons
import { ScheduleRead } from '@/schemas'; // Import ScheduleRead type
// API function for delete - update will be handled by modal
import { deleteSchedule, updateSchedule } from '@/services/api';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Helper to format optional dates
const formatOptionalDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return formatDistanceToNowStrict(date, { addSuffix: true });
    } catch (e) { return 'Invalid Date'; }
};

// Helper to format TimeRanges for display
const formatTimeRanges = (ranges: ScheduleRead['time_ranges']): string => {
    if (!Array.isArray(ranges) || ranges.length === 0) {
        return 'No ranges defined';
    }
    const formatted = ranges.map(r => {
        const daysStr = Array.isArray(r.days) ? r.days.join(',') : 'InvalidDays';
        return `${daysStr}: ${r.start_time}-${r.end_time}`;
    }).slice(0, 2); // Show first 2 ranges max in table

    let result = formatted.join('; ');
    if (ranges.length > 2) {
        result += '...';
    }
    return result;
};

// Tooltip content for TimeRanges
const formatTimeRangesTooltip = (ranges: ScheduleRead['time_ranges']): string => {
     if (!Array.isArray(ranges) || ranges.length === 0) {
        return 'No time ranges defined for this schedule.';
    }
    return ranges.map(r => {
         const daysStr = Array.isArray(r.days) ? r.days.join(', ') : 'InvalidDays';
         return `${daysStr}: ${r.start_time} to ${r.end_time}`;
    }).join('\n'); // Use newline for tooltip readability
}

// SortableHeader component (reuse)
const SortableHeader = ({ column, title }: { column: any, title: string }) => (
    <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="-ml-4 h-8">
        {title}
        <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
);

interface SchedulesTableProps {
    schedules: ScheduleRead[];
    onEdit: (schedule: ScheduleRead) => void; // Callback to open edit modal
}

const SchedulesTable: React.FC<SchedulesTableProps> = ({ schedules, onEdit }) => {
    const queryClient = useQueryClient();
    const [sorting, setSorting] = useState<SortingState>([]);

    // --- Delete Mutation ---
    const deleteMutation = useMutation({
        mutationFn: deleteSchedule,
        onSuccess: (deletedData) => {
            toast.success(`Schedule "${deletedData.name}" deleted successfully.`);
            queryClient.invalidateQueries({ queryKey: ['schedules'] }); // Refetch schedules list
        },
        onError: (err: any, variables_id) => {
             // Check for specific constraint error first
            if (err?.detail && typeof err.detail === 'string' && err.detail.includes("still referenced by one or more rules")) {
                 toast.error("Delete Failed: Schedule is still in use by one or more rules.", { description: `Please remove schedule ID ${variables_id} from rules before deleting.`});
            } else {
                 const errorDetail = err?.detail || err.message || `Failed to delete Schedule (ID: ${variables_id})`;
                 toast.error(errorDetail);
            }
        },
    });

     // --- Toggle Status Mutation ---
     const toggleStatusMutation = useMutation({
        mutationFn: (data: { id: number, payload: { is_enabled: boolean } }) =>
            updateSchedule(data.id, data.payload),
        onSuccess: (updatedData) => {
            toast.success(`Schedule "${updatedData.name}" ${updatedData.is_enabled ? 'enabled' : 'disabled'}.`);
            queryClient.invalidateQueries({ queryKey: ['schedules'] });
        },
        onError: (err: any, variables) => {
            const action = variables.payload.is_enabled ? 'enable' : 'disable';
            const errorDetail = err?.detail || err.message || `Failed to ${action} Schedule (ID: ${variables.id})`;
            toast.error(`Failed to ${action} Schedule: ${errorDetail}`);
            // Optional: Add queryClient.invalidateQueries to revert optimistic update if implemented
        },
    });

    const handleDelete = (id: number, name: string) => {
        if (window.confirm(`Are you sure you want to delete Schedule "${name}" (ID: ${id})? This cannot be undone.`)) {
            deleteMutation.mutate(id);
        }
    };

    const handleToggleEnabled = (schedule: ScheduleRead) => {
         const newStatus = !schedule.is_enabled;
         const actionText = newStatus ? 'enable' : 'disable';
         if (window.confirm(`Are you sure you want to ${actionText} schedule "${schedule.name}"?`)) {
             toggleStatusMutation.mutate({ id: schedule.id, payload: { is_enabled: newStatus } });
         }
     };

    const columns: ColumnDef<ScheduleRead>[] = useMemo(() => [
        { accessorKey: "id", header: ({ column }) => <SortableHeader column={column} title="ID" />, cell: ({ row }) => <div className="w-10 font-mono text-xs">{row.getValue("id")}</div>, size: 50 },
        { accessorKey: "name", header: ({ column }) => <SortableHeader column={column} title="Name" />, cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>, size: 180 },
        { accessorKey: "description", header: "Description", cell: ({ row }) => <div className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-xs" title={row.original.description ?? ''}>{row.original.description || '-'}</div>, size: 250 },
        {
            accessorKey: "time_ranges",
            header: "Time Ranges",
            cell: ({ row }) => {
                const ranges = row.getValue("time_ranges") as ScheduleRead['time_ranges'];
                const displayString = formatTimeRanges(ranges);
                const tooltipString = formatTimeRangesTooltip(ranges);
                return (
                    <Tooltip>
                        <TooltipTrigger asChild>
                             <span className="font-mono text-xs truncate max-w-[250px]" title={tooltipString}>
                                {displayString}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent className="whitespace-pre-line max-w-xs">
                            <p>{tooltipString}</p>
                        </TooltipContent>
                    </Tooltip>
                );
            },
            enableSorting: false, size: 250
        },
        {
            accessorKey: "is_enabled",
            header: () => <div className="text-center">Enabled</div>,
            cell: ({ row }) => {
                const schedule = row.original;
                const isToggling = toggleStatusMutation.isPending && toggleStatusMutation.variables?.id === schedule.id;
                return (
                     <div className="flex justify-center">
                         <Button
                            variant="ghost" size="sm" className="p-1 h-auto"
                            onClick={() => handleToggleEnabled(schedule)}
                            disabled={isToggling || deleteMutation.isPending}
                            title={schedule.is_enabled ? "Disable Schedule" : "Enable Schedule"}
                            aria-label={schedule.is_enabled ? "Disable Schedule" : "Enable Schedule"}
                         >
                            {isToggling ? <Loader2 className="h-5 w-5 animate-spin" />
                                : schedule.is_enabled ? <Wifi className="h-5 w-5 text-green-500" />
                                : <WifiOff className="h-5 w-5 text-slate-400" />
                            }
                        </Button>
                    </div>
                );
            },
            enableSorting: false, size: 50
        },
        { accessorKey: "updated_at", header: ({ column }) => <SortableHeader column={column} title="Updated" />, cell: ({ row }) => <div className="text-xs">{formatOptionalDate(row.getValue("updated_at"))}</div>, size: 100 },
        {
             id: "actions", header: () => <div className="text-right">Actions</div>, enableHiding: false, size: 50,
             cell: ({ row }) => {
                 const schedule = row.original;
                 const isDeleting = deleteMutation.isPending && deleteMutation.variables === schedule.id;
                 const isToggling = toggleStatusMutation.isPending && toggleStatusMutation.variables?.id === schedule.id;
                 const busy = isDeleting || isToggling;

                 return (
                     <div className="text-right">
                         <DropdownMenu>
                             <DropdownMenuTrigger asChild><span><Button variant="ghost" className="h-8 w-8 p-0" disabled={busy}>
                                 <span className="sr-only">Open menu</span>
                                 {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                             </Button></span></DropdownMenuTrigger>
                             <DropdownMenuContent align="end">
                                 <DropdownMenuItem onClick={() => onEdit(schedule)} disabled={busy}>
                                     <Edit className="mr-2 h-4 w-4" /> Edit Schedule
                                 </DropdownMenuItem>
                                 <DropdownMenuItem className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-900/50" onClick={() => handleDelete(schedule.id, schedule.name)} disabled={busy}>
                                     <Trash2 className="mr-2 h-4 w-4" /> Delete Schedule {isDeleting && <Loader2 className="ml-auto h-4 w-4 animate-spin" />}
                                 </DropdownMenuItem>
                             </DropdownMenuContent>
                         </DropdownMenu>
                     </div>
                 );
             },
        },
    ], [deleteMutation, toggleStatusMutation, onEdit]); // Add toggleStatusMutation dependency

    const table = useReactTable({
        data: schedules || [], columns, getCoreRowModel: getCoreRowModel(), onSortingChange: setSorting, getSortedRowModel: getSortedRowModel(), state: { sorting },
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
                            <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No Schedules configured.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </TooltipProvider>
    );
};

export default SchedulesTable;
