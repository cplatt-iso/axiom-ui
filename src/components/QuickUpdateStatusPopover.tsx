// frontend/src/components/exceptions/QuickUpdateStatusPopover.tsx
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, Edit3, Loader2 } from 'lucide-react';
import { ExceptionStatus, ExceptionStatusEnum } from '@/schemas/dicomExceptionEnums';
import { SopLevelExceptionItem } from '@/types/exceptions'; // Assuming this is DicomExceptionLogRead + itemType + string id

interface QuickUpdateStatusPopoverProps {
  exceptionLog: SopLevelExceptionItem; // Pass the specific SOP log
  onUpdateStatus: (uuid: string, status: ExceptionStatus, notes?: string) => void;
  isUpdating?: boolean; // To show loading state on button
  children: React.ReactNode; // This will be the trigger button (Edit3 icon)
}

const QuickUpdateStatusPopover: React.FC<QuickUpdateStatusPopoverProps> = ({
  exceptionLog,
  onUpdateStatus,
  isUpdating,
  children, // Trigger element
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<ExceptionStatus>(exceptionLog.status);
  const [currentNotes, setCurrentNotes] = useState<string>(exceptionLog.resolution_notes || '');

  // Update local state if the underlying exceptionLog prop changes (e.g., after a successful update from parent)
  useEffect(() => {
    setCurrentStatus(exceptionLog.status);
    setCurrentNotes(exceptionLog.resolution_notes || '');
  }, [exceptionLog.status, exceptionLog.resolution_notes]);

  const handleSave = () => {
    onUpdateStatus(exceptionLog.exception_uuid, currentStatus, currentNotes.trim() === '' ? undefined : currentNotes.trim());
    // Optimistically close, or wait for parent to signal success and close via prop change
    // For now, let's close it. Parent refetch will update the row.
    setIsOpen(false); 
  };

  const handleCancel = () => {
    // Reset to original values from prop if user cancels
    setCurrentStatus(exceptionLog.status);
    setCurrentNotes(exceptionLog.resolution_notes || '');
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end" sideOffset={5}>
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Quick Update Status</h4>
            <p className="text-xs text-muted-foreground">
              SOP: ...{exceptionLog.sop_instance_uid ? exceptionLog.sop_instance_uid.slice(-20) : exceptionLog.id.slice(-12)}
            </p>
          </div>
          <div className="grid gap-2">
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor={`status-${exceptionLog.id}`} className="col-span-1 text-xs">Status</Label>
              <Select
                value={currentStatus}
                onValueChange={(value: ExceptionStatus) => setCurrentStatus(value)}
                disabled={isUpdating}
              >
                <SelectTrigger id={`status-${exceptionLog.id}`} className="col-span-2 h-8">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {ExceptionStatusEnum.options.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {s.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 items-start gap-4"> {/* items-start for label alignment with textarea */}
              <Label htmlFor={`notes-${exceptionLog.id}`} className="col-span-1 text-xs pt-1">Notes</Label>
              <Textarea
                id={`notes-${exceptionLog.id}`}
                value={currentNotes}
                onChange={(e) => setCurrentNotes(e.target.value)}
                placeholder="Resolution notes..."
                className="col-span-2 h-20 text-xs" // Adjusted height
                disabled={isUpdating}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={isUpdating}>
              <X className="mr-1 h-4 w-4" /> Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isUpdating || currentStatus === exceptionLog.status && currentNotes === (exceptionLog.resolution_notes || '')}>
              {isUpdating ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default QuickUpdateStatusPopover;