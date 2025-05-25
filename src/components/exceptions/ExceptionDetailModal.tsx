// frontend/src/components/exceptions/ExceptionDetailModal.tsx
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // For status dropdown
import { Loader2, AlertCircle } from 'lucide-react';
import { getException } from '@/services/exceptionService'; // Or your exceptionService
import { DicomExceptionLogRead, DicomExceptionLogUpdate } from '@/schemas/dicomExceptionSchema';
import { ExceptionStatusEnum, ExceptionStatus } from '@/schemas/dicomExceptionEnums';

interface ExceptionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  exceptionUuid: string | null;
  onUpdate: (uuid: string, data: DicomExceptionLogUpdate) => void;
  isUpdating?: boolean;
}

const ExceptionDetailModal: React.FC<ExceptionDetailModalProps> = ({
  isOpen,
  onClose,
  exceptionUuid,
  onUpdate,
  isUpdating,
}) => {
  const { data: exceptionLog, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['exceptionDetail', exceptionUuid],
    queryFn: () => {
      if (!exceptionUuid) throw new Error("No exception UUID provided");
      return getException(exceptionUuid);
    },
    enabled: !!exceptionUuid && isOpen, // Only fetch when modal is open and UUID is present
    staleTime: 5 * 60 * 1000, // Cache for 5 mins
  });

  const [status, setStatus] = useState<ExceptionStatus | undefined>(undefined);
  const [resolutionNotes, setResolutionNotes] = useState<string>('');

  useEffect(() => {
    if (isOpen && exceptionUuid) {
      refetch(); // Refetch when modal opens or UUID changes while open
    }
  }, [isOpen, exceptionUuid, refetch]);

  useEffect(() => {
    if (exceptionLog) {
      setStatus(exceptionLog.status);
      setResolutionNotes(exceptionLog.resolution_notes || '');
    } else {
      setStatus(undefined);
      setResolutionNotes('');
    }
  }, [exceptionLog]);


  const handleSaveChanges = () => {
    if (exceptionUuid && status !== undefined) { // Ensure status is set
      const updateData: DicomExceptionLogUpdate = {
        status: status,
        resolution_notes: resolutionNotes.trim() === '' ? null : resolutionNotes.trim(), // Send null if empty
      };
      // If status is being changed to a resolved/archived state, backend handles resolved_at, resolved_by_user_id
      onUpdate(exceptionUuid, updateData);
    } else {
        // This should ideally not happen if save button is disabled appropriately
        console.error("Cannot save: Exception UUID or status is missing.")
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Exception Details: {exceptionUuid ? `...${exceptionUuid.slice(-12)}` : 'N/A'}</DialogTitle>
          <DialogDescription>
            Review the details of the processing exception and update its status or add notes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto pr-2 space-y-4 py-4">
          {isLoading && (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Loading exception details...</p>
            </div>
          )}
          {isError && (
            <div className="text-red-600 p-4 border border-red-300 bg-red-50 rounded-md">
              <AlertCircle className="inline-block mr-2" />
              Error fetching details: {error?.message || 'Unknown error'}
            </div>
          )}
          {exceptionLog && !isLoading && !isError && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {/* Display various fields from exceptionLog here. Be creative, or just dump them. */}
                <p><strong>ID:</strong> {exceptionLog.id}</p>
                <p><strong>UUID:</strong> {exceptionLog.exception_uuid}</p>
                <p><strong>Failure Timestamp:</strong> {new Date(exceptionLog.failure_timestamp).toLocaleString()}</p>
                <p><strong>Processing Stage:</strong> {exceptionLog.processing_stage}</p>
                <p><strong>Patient Name:</strong> {exceptionLog.patient_name || 'N/A'}</p>
                <p><strong>Patient ID:</strong> {exceptionLog.patient_id || 'N/A'}</p>
                <p><strong>Accession #:</strong> {exceptionLog.accession_number || 'N/A'}</p>
                <p><strong>Study UID:</strong> {exceptionLog.study_instance_uid || 'N/A'}</p>
                <p><strong>Series UID:</strong> {exceptionLog.series_instance_uid || 'N/A'}</p>
                <p><strong>SOP UID:</strong> {exceptionLog.sop_instance_uid || 'N/A'}</p>
                <p><strong>Retry Count:</strong> {exceptionLog.retry_count}</p>
                <p><strong>Failed Filepath:</strong> {exceptionLog.failed_filepath || 'N/A'}</p>
                <p><strong>Target Destination:</strong> {exceptionLog.target_destination_name || `ID: ${exceptionLog.target_destination_id}` || 'N/A'}</p>
                {/* ... and so on for other fields ... */}
              </div>
              <div className="mt-2">
                <Label className="font-semibold">Error Message:</Label>
                <p className="p-2 bg-gray-100 dark:bg-gray-700/50 rounded text-xs whitespace-pre-wrap">{exceptionLog.error_message}</p>
              </div>
              {exceptionLog.error_details && (
                 <div className="mt-2">
                    <Label className="font-semibold">Error Details (Traceback):</Label>
                    <pre className="p-2 bg-gray-100 dark:bg-gray-700/50 rounded text-xs overflow-x-auto max-h-48">{exceptionLog.error_details}</pre>
                 </div>
              )}

              <hr className="my-4" />

              <div className="space-y-3">
                <div>
                  <Label htmlFor="status" className="font-semibold">Status</Label>
                  <Select
                    value={status}
                    onValueChange={(value: ExceptionStatus) => setStatus(value)}
                    disabled={isUpdating}
                  >
                    <SelectTrigger id="status" className="w-full mt-1">
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                      {ExceptionStatusEnum.options.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="resolutionNotes" className="font-semibold">Resolution Notes</Label>
                  <Textarea
                    id="resolutionNotes"
                    placeholder="Add any notes regarding the resolution or investigation..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    disabled={isUpdating}
                    rows={4}
                    className="mt-1"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="mt-auto pt-4 border-t">
          <DialogClose asChild>
            <Button variant="outline" onClick={onClose} disabled={isUpdating}>Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleSaveChanges}
            disabled={isUpdating || isLoading || isError || !status} // Disable if no status selected
          >
            {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExceptionDetailModal;