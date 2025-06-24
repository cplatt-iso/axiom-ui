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
            </div>
          </div>
          
          {/* Clinical Information */}
          <div className="space-y-2">
            <h4 className="font-semibold text-lg">Clinical Information</h4>
            <div className="grid grid-cols-3 gap-x-4 gap-y-2 p-4 border rounded-lg">
              <DetailRow label="Requesting Physician">{order.requesting_physician}</DetailRow>
              <DetailRow label="Referring Physician">{order.referring_physician}</DetailRow>
              <DetailRow label="Requested Procedure">{order.requested_procedure_description}</DetailRow>
              <DetailRow label="Study Instance UID">{order.study_instance_uid}</DetailRow>
            </div>
          </div>

          {/* Raw HL7 - For the freaks */}
          {order.raw_hl7_message && (
            <details>
              <summary className="cursor-pointer font-semibold text-lg">Raw HL7 Message</summary>
              <pre className="mt-2 p-2 border rounded-md bg-slate-50 text-xs overflow-x-auto">
                {order.raw_hl7_message}
              </pre>
            </details>
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