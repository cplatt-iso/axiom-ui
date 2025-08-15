// src/components/CrosswalkDataSourceTable.tsx
import { useMemo, useState, useCallback } from "react";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatDistanceToNowStrict } from 'date-fns';
import {
  Column,
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable
} from '@tanstack/react-table';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';

import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle,
  Clock,
  DatabaseZap,
  Edit,
  HelpCircle,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Trash2,
  Wifi,
  WifiOff
} from 'lucide-react';

import { CrosswalkDataSourceRead } from '@/schemas';
import { CrosswalkSyncStatus } from '@/schemas/crosswalkDataSourceSchema';

import {
  deleteCrosswalkDataSource,
  testCrosswalkDataSourceConnection,
  triggerCrosswalkDataSourceSync
} from '@/services/api';

// Helper to format optional dates (reuse from other components)
const formatOptionalDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Never';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return formatDistanceToNowStrict(date, { addSuffix: true });
    } catch { return 'Invalid Date'; }
};

// Helper for Sync Status Badge
const getSyncStatusBadge = (status: CrosswalkSyncStatus): { text: string; Icon: React.ElementType; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
    switch (status) {
        case 'SUCCESS': return { text: 'Success', Icon: CheckCircle, variant: 'default' };
        case 'RUNNING': return { text: 'Syncing', Icon: Loader2, variant: 'secondary' };
        case 'FAILED': return { text: 'Failed', Icon: AlertTriangle, variant: 'destructive' };
        case 'PENDING': return { text: 'Pending', Icon: Clock, variant: 'outline' };
        default: return { text: 'Unknown', Icon: HelpCircle, variant: 'outline' };
    }
};

// SortableHeader component (reuse)
const SortableHeader = ({ column, title }: { column: Column<CrosswalkDataSourceRead, unknown>, title: string }) => (
    <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="-ml-4 h-8">
        {title}
        <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
);

interface CrosswalkDataSourceTableProps {
    dataSources: CrosswalkDataSourceRead[];
    onEdit: (source: CrosswalkDataSourceRead) => void;
}

const CrosswalkDataSourceTable: React.FC<CrosswalkDataSourceTableProps> = ({ dataSources, onEdit }) => {
    const queryClient = useQueryClient();
    const [sorting, setSorting] = useState<SortingState>([]);
    const [testingConnectionId, setTestingConnectionId] = useState<number | null>(null);
    const [syncingId, setSyncingId] = useState<number | null>(null);

    const deleteMutation = useMutation({
        mutationFn: deleteCrosswalkDataSource,
        onSuccess: (deletedData: CrosswalkDataSourceRead) => {
            toast.success(`Data Source "${deletedData.name}" deleted successfully.`);
            queryClient.invalidateQueries({ queryKey: ['crosswalkDataSources'] });
        },
        onError: (err: Error, variables_id: number) => {
             const errorDetail = (err as { detail?: string }).detail || err.message || `Failed to delete Data Source (ID: ${variables_id})`;
             toast.error(errorDetail);
        },
    });

    const testConnectionMutation = useMutation({
        mutationFn: testCrosswalkDataSourceConnection,
        onSuccess: (data: { success: boolean; message: string }, sourceId: number) => {
            if (data.success) {
                toast.success(`Connection test successful for source ID ${sourceId}.`);
            } else {
                toast.error(`Connection test failed for source ID ${sourceId}: ${data.message}`);
            }
            setTestingConnectionId(null);
        },
        onError: (error: Error, sourceId: number) => {
            toast.error(`Error testing connection for source ID ${sourceId}: ${error.message || 'Unknown error'}`);
            setTestingConnectionId(null);
        },
    });

    const triggerSyncMutation = useMutation({
        mutationFn: triggerCrosswalkDataSourceSync,
        onSuccess: (data: { task_id: string }, sourceId: number) => {
            toast.info(`Sync task queued for source ID ${sourceId}. Task ID: ${data.task_id}`);
            setSyncingId(null);
            setTimeout(() => queryClient.invalidateQueries({ queryKey: ['crosswalkDataSources'] }), 500);
        },
        onError: (error: Error, sourceId: number) => {
            toast.error(`Failed to queue sync task for source ID ${sourceId}: ${error.message || 'Unknown error'}`);
            setSyncingId(null);
        },
    });

    const handleDelete = useCallback((id: number, name: string) => {
        if (window.confirm(`Are you sure you want to delete Data Source "${name}" (ID: ${id})? This will also delete associated mappings.`)) {
            deleteMutation.mutate(id);
        }
    }, [deleteMutation]);

    const handleTestConnection = useCallback((id: number) => {
        setTestingConnectionId(id);
        testConnectionMutation.mutate(id);
    }, [testConnectionMutation]);

    const handleTriggerSync = useCallback((id: number) => {
        setSyncingId(id);
        triggerSyncMutation.mutate(id);
    }, [triggerSyncMutation]);

    const columns: ColumnDef<CrosswalkDataSourceRead>[] = useMemo(() => [
        { accessorKey: "id", header: ({ column }) => <SortableHeader column={column} title="ID" />, cell: ({ row }) => <div className="w-10 font-mono text-xs">{row.getValue("id")}</div>, size: 50 },
        { accessorKey: "name", header: ({ column }) => <SortableHeader column={column} title="Name" />, cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>, size: 180 },
        { accessorKey: "db_type", header: ({ column }) => <SortableHeader column={column} title="DB Type" />, cell: ({ row }) => <Badge variant="secondary">{row.getValue("db_type")}</Badge>, size: 80 },
        { accessorKey: "target_table", header: "Target Table", cell: ({ row }) => <div className="font-mono text-xs truncate max-w-[150px]">{row.getValue("target_table")}</div>, size: 150 },
        {
            accessorKey: "last_sync_status",
            header: "Sync Status",
            cell: ({ row }) => {
                const status = row.getValue("last_sync_status") as CrosswalkSyncStatus;
                const { text, Icon, variant } = getSyncStatusBadge(status);
                const tooltipText = status === 'FAILED'
                    ? `Failed: ${row.original.last_sync_error || 'Unknown error'}`
                    : status === 'RUNNING'
                    ? 'Currently syncing...'
                    : status === 'SUCCESS'
                    ? `Synced ${row.original.last_sync_row_count ?? '?'} rows ${formatOptionalDate(row.original.last_sync_time)}`
                    : `Sync pending. Last attempt: ${formatOptionalDate(row.original.last_sync_time)}`;

                 const isSyncing = status === 'RUNNING' || syncingId === row.original.id;

                 const badgeNode = (
                    <Badge variant={variant} className="flex items-center gap-1 w-fit">
                        <Icon className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true" />
                        {text}
                    </Badge>
                 );

                 return (
                     <Tooltip>
                         {/* --- Wrap badgeNode in a span --- */}
                        <TooltipTrigger asChild><span>{badgeNode}</span></TooltipTrigger>
                         {/* --- End Wrap --- */}
                        <TooltipContent><p>{tooltipText}</p></TooltipContent>
                    </Tooltip>
                 )
            },
            size: 100,
        },
        { accessorKey: "last_sync_time", header: ({ column }) => <SortableHeader column={column} title="Last Sync" />, cell: ({ row }) => <div className="text-xs">{formatOptionalDate(row.getValue("last_sync_time"))}</div>, size: 100 },
        {
            accessorKey: "is_enabled",
            header: () => <div className="text-center">Enabled</div>,
            cell: ({ row }) => <div className="flex justify-center" title={row.getValue("is_enabled") ? "Enabled" : "Disabled"}>{row.getValue("is_enabled") ? <Wifi className="h-5 w-5 text-green-500" /> : <WifiOff className="h-5 w-5 text-slate-400" />}</div>,
            enableSorting: false, size: 50
        },
        {
             id: "actions", header: () => <div className="text-right">Actions</div>, enableHiding: false, size: 80,
             cell: ({ row }) => {
                 const source = row.original;
                 const isDeleting = deleteMutation.isPending && deleteMutation.variables === source.id;
                 const isTesting = testingConnectionId === source.id;
                 const isSyncingManual = syncingId === source.id;
                 const isSyncingStatus = source.last_sync_status === 'RUNNING';
                 const busy = isDeleting || isTesting || isSyncingManual || isSyncingStatus;

                 return (
                     <div className="text-right">
                         <DropdownMenu>
                             {/* --- Wrap Button in a span --- */}
                             <DropdownMenuTrigger asChild><span><Button variant="ghost" className="h-8 w-8 p-0" disabled={busy}>
                                 <span className="sr-only">Open menu</span>
                                 {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                             </Button></span></DropdownMenuTrigger>
                             {/* --- End Wrap --- */}
                             <DropdownMenuContent align="end">
                                 <DropdownMenuItem onClick={() => handleTestConnection(source.id)} disabled={busy}>
                                     <DatabaseZap className="mr-2 h-4 w-4" /> Test Connection {isTesting && <Loader2 className="ml-auto h-4 w-4 animate-spin" />}
                                 </DropdownMenuItem>
                                 <DropdownMenuItem onClick={() => handleTriggerSync(source.id)} disabled={busy || !source.is_enabled}>
                                     <RefreshCw className="mr-2 h-4 w-4" /> Trigger Sync {(isSyncingManual || isSyncingStatus) && <Loader2 className="ml-auto h-4 w-4 animate-spin" />}
                                 </DropdownMenuItem>
                                 <DropdownMenuItem onClick={() => onEdit(source)} disabled={busy}>
                                     <Edit className="mr-2 h-4 w-4" /> Edit Config
                                 </DropdownMenuItem>
                                 <DropdownMenuItem className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-900/50" onClick={() => handleDelete(source.id, source.name)} disabled={busy}>
                                     <Trash2 className="mr-2 h-4 w-4" /> Delete Config {isDeleting && <Loader2 className="ml-auto h-4 w-4 animate-spin" />}
                                 </DropdownMenuItem>
                             </DropdownMenuContent>
                         </DropdownMenu>
                     </div>
                 );
             },
        },
    ], [deleteMutation, testingConnectionId, syncingId, onEdit, handleDelete, handleTestConnection, handleTriggerSync]);

    const table = useReactTable({
        data: dataSources || [], columns, getCoreRowModel: getCoreRowModel(), onSortingChange: setSorting, getSortedRowModel: getSortedRowModel(), state: { sorting },
    });

    return (
        <TooltipProvider delayDuration={150}> {/* Moved TooltipProvider to wrap the whole table */}
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
                            <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No Data Sources configured.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </TooltipProvider>
    );
};

export default CrosswalkDataSourceTable;
