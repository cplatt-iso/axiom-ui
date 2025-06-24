// frontend/src/components/orders/OrdersColumns.tsx

"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ImagingOrder, OrderStatus } from "@/schemas/orderSchema";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// This is a little helper to make the statuses look pretty.
// A lesser coder would put this logic right in the cell render. Not me.
const getStatusBadgeVariant = (status: OrderStatus) => {
  switch (status) {
    case "COMPLETED":
      return "default";
    case "SCHEDULED":
      return "secondary";
    case "CANCELED":
    case "DISCONTINUED":
      return "destructive";
    case "IN_PROGRESS":
      return "outline"; // Let's make this one stand out a bit
    default:
      return "outline";
  }
};

export const columns: ColumnDef<ImagingOrder>[] = [
  {
    accessorKey: "patient_name",
    header: "Patient Name",
    cell: ({ row }) => row.getValue("patient_name") || <span className="text-muted-foreground">N/A</span>,
  },
  {
    accessorKey: "patient_id",
    header: "Patient ID",
  },
  {
    accessorKey: "accession_number",
    header: "Accession #",
  },
  {
    accessorKey: "modality",
    header: "Modality",
    cell: ({ row }) => (
      <Badge variant="outline">{row.getValue("modality")}</Badge>
    ),
  },
  {
    accessorKey: "scheduled_procedure_step_start_datetime",
    header: "Scheduled At",
    cell: ({ row }) => {
      const value = row.getValue("scheduled_procedure_step_start_datetime") as string;
      if (!value) {
        return <span className="text-muted-foreground">Unscheduled</span>;
      }
      // "PPpp" is the "I want it all" format string from date-fns.
      // e.g., "Jun 23, 2025, 7:48:05 PM"
      return format(new Date(value), "PPpp");
    },
  },
  {
    accessorKey: "order_status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("order_status") as OrderStatus;
      return (
        <Badge variant={getStatusBadgeVariant(status)}>
          {status}
        </Badge>
      );
    },
  },
];