// frontend/src/components/orders/OrderDetailModal.tsx

import { ImagingOrder } from "@/schemas/orderSchema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useState } from "react";
import { CopyIcon, CheckIcon } from "lucide-react";

interface OrderDetailModalProps {
  order: ImagingOrder;
  onClose: () => void;
}

// A little helper component so I don't go insane writing the same Tailwind classes 50 times.
// This is how you stay sane in a sea of divs.
const DetailRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <>
    <div className="text-sm font-semibold text-muted-foreground">{label}</div>
    <div className="text-sm col-span-2">{children || <span className="text-xs text-slate-400">Not Provided</span>}</div>
  </>
);

export function OrderDetailModal({ order, onClose }: OrderDetailModalProps) {
  if (!order) return null;
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault(); // prevent details from toggling
    if (order.raw_hl7_message) {
      navigator.clipboard.writeText(order.raw_hl7_message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Order Details</DialogTitle>
          <DialogDescription>
            Accession Number: {order.accession_number}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto p-4 space-y-6">
          {/* Patient Information */}
          <div className="space-y-2">
            <h4 className="font-semibold text-lg">Patient Information</h4>
            <div className="grid grid-cols-3 gap-x-4 gap-y-2 p-4 border rounded-lg">
              <DetailRow label="Patient Name">{order.patient_name}</DetailRow>
              <DetailRow label="Patient ID (MRN)">{order.patient_id}</DetailRow>
              <DetailRow label="Date of Birth">
                {order.patient_dob ? format(new Date(order.patient_dob), "PPP") : null}
              </DetailRow>
              <DetailRow label="Sex">{order.patient_sex}</DetailRow>
              <DetailRow label="Address">{order.patient_address}</DetailRow>
              <DetailRow label="Phone">{order.patient_phone_number}</DetailRow>
              <DetailRow label="Patient Class">{order.patient_class}</DetailRow>
              <DetailRow label="Visit Number">{order.visit_number}</DetailRow>
            </div>
          </div>

          {/* Order & Scheduling Information */}
          <div className="space-y-2">
            <h4 className="font-semibold text-lg">Order & Scheduling</h4>
            <div className="grid grid-cols-3 gap-x-4 gap-y-2 p-4 border rounded-lg">
              <DetailRow label="Modality"><Badge variant="outline">{order.modality}</Badge></DetailRow>
              <DetailRow label="Status"><Badge>{order.order_status}</Badge></DetailRow>
              <DetailRow label="Scheduled At">
                {order.scheduled_procedure_step_start_datetime 
                  ? format(new Date(order.scheduled_procedure_step_start_datetime), "PPpp")
                  : null}
              </DetailRow>
              <DetailRow label="Scheduled AE Title">{order.scheduled_station_ae_title}</DetailRow>
              <DetailRow label="Scheduled Station Name">{order.scheduled_station_name}</DetailRow>
              <DetailRow label="Placer Order #">{order.placer_order_number}</DetailRow>
              <DetailRow label="Filler Order #">{order.filler_order_number}</DetailRow>
              <DetailRow label="Placer Group #">{order.placer_group_number}</DetailRow>
              <DetailRow label="Procedure Code">{order.requested_procedure_code}</DetailRow>
              <DetailRow label="Order Received">
                {order.order_received_at ? format(new Date(order.order_received_at), "PPpp") : null}
              </DetailRow>
              <DetailRow label="Last Updated">
                {order.updated_at ? format(new Date(order.updated_at), "PPpp") : null}
              </DetailRow>
            </div>
          </div>
          
          {/* Clinical Information */}
          <div className="space-y-2">
            <h4 className="font-semibold text-lg">Clinical Information</h4>
            <div className="grid grid-cols-3 gap-x-4 gap-y-2 p-4 border rounded-lg">
              <DetailRow label="Requesting Physician">{order.requesting_physician}</DetailRow>
              <DetailRow label="Referring Physician">{order.referring_physician}</DetailRow>
              <DetailRow label="Attending Physician">{order.attending_physician}</DetailRow>
              <DetailRow label="Requested Procedure">{order.requested_procedure_description}</DetailRow>
              <DetailRow label="Study Instance UID">{order.study_instance_uid}</DetailRow>
            </div>
          </div>

          {/* Source & Message Details */}
          <div className="space-y-2">
            <h4 className="font-semibold text-lg">Source & Message Details</h4>
            <div className="grid grid-cols-3 gap-x-4 gap-y-2 p-4 border rounded-lg">
              <DetailRow label="Source System">{order.source}</DetailRow>
              <DetailRow label="Sending Application">{order.source_sending_application}</DetailRow>
              <DetailRow label="Sending Facility">{order.source_sending_facility}</DetailRow>
              <DetailRow label="Receiving Application">{order.source_receiving_application}</DetailRow>
              <DetailRow label="Receiving Facility">{order.source_receiving_facility}</DetailRow>
              <DetailRow label="Message Control ID">{order.source_message_control_id}</DetailRow>
            </div>
          </div>

          {/* Raw HL7 - For the freaks */}
          {order.raw_hl7_message && (
            <div className="space-y-2">
              <h4 className="font-semibold text-lg flex justify-between items-center">
                <span>Raw HL7 Message</span>
                 <Button variant="ghost" size="sm" onClick={handleCopy}>
                  {copied ? (
                    <CheckIcon className="h-4 w-4 text-green-500" />
                  ) : (
                    <CopyIcon className="h-4 w-4" />
                  )}
                  <span className="ml-2">{copied ? "Copied!" : "Copy"}</span>
                </Button>
              </h4>
              <pre className="mt-2 p-2 border rounded-md bg-slate-100 dark:bg-slate-800 text-xs overflow-x-auto">
                {order.raw_hl7_message}
              </pre>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}