// frontend/src/components/orders/OrdersColumns.tsx

"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ImagingOrder, OrderStatus } from "@/schemas/orderSchema";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { EvidenceIcon } from "./EvidenceIcon";

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
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <EvidenceIcon 
          accessionNumber={row.original.accession_number}
          patientName={row.original.patient_name || undefined}
        />
        <span>
          {row.getValue("patient_name") || <span className="text-muted-foreground">N/A</span>}
        </span>
      </div>
    ),
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
    accessorKey: "scheduled_exam_datetime",
    header: "Scheduled At",
    cell: ({ row }) => {
      const value = row.getValue("scheduled_exam_datetime") as string;
      if (!value) {
        return <span className="text-muted-foreground">Unscheduled</span>;
      }
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