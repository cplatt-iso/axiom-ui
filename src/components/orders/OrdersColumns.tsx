// frontend/src/components/orders/OrdersColumns.tsx

"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ImagingOrder, OrderStatus } from "@/schemas/orderSchema";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

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
    accessorKey: "referring_physician",
    header: "Referring MD",
    cell: ({ row }) => row.getValue("referring_physician") || <span className="text-muted-foreground">N/A</span>,
  },
  {
    accessorKey: "modality",
    header: "Modality",
    cell: ({ row }) => (
      <Badge variant="outline">{row.getValue("modality")}</Badge>
    ),
  },
  {
    accessorKey: "requested_procedure_description",
    header: "Procedure",
    cell: ({ row }) => {
        const description = row.getValue("requested_procedure_description") as string;
        return (
            <div className="truncate max-w-xs" title={description}>
                {description || <span className="text-muted-foreground">N/A</span>}
            </div>
        )
    }
  },
  {
    accessorKey: "scheduled_station_ae_title",
    header: "Scheduled AE",
    cell: ({ row }) => row.getValue("scheduled_station_ae_title") || <span className="text-muted-foreground">N/A</span>,
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
  {
    accessorKey: "source_sending_facility",
    header: "Sending Facility",
    cell: ({ row }) => row.getValue("source_sending_facility") || <span className="text-muted-foreground">N/A</span>,
  },
  {
    accessorKey: "source_receiving_facility",
    header: "Receiving Facility",
    cell: ({ row }) => row.getValue("source_receiving_facility") || <span className="text-muted-foreground">N/A</span>,
  },
];