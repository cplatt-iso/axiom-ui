import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, CheckCircle, XCircle, Clock, Send, Copy, Check } from "lucide-react";
import { format } from "date-fns";
import { getOrderEvidence } from "@/services/api";
import { DestinationResult } from "@/schemas/orderEvidenceSchema";
import { toast } from "sonner";
import { useState } from "react";

interface OrderEvidenceModalProps {
  accessionNumber: string;
  patientName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function OrderEvidenceModal({ 
  accessionNumber, 
  patientName, 
  isOpen, 
  onClose 
}: OrderEvidenceModalProps) {
  const [copiedValues, setCopiedValues] = useState<Record<string, boolean>>({});

  const {
    data: evidence,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['order-evidence', accessionNumber],
    queryFn: () => getOrderEvidence(accessionNumber),
    enabled: isOpen && !!accessionNumber,
  });

  // Copy to clipboard with visual feedback
  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedValues(prev => ({ ...prev, [key]: true }));
      toast.success('Copied to clipboard');
      setTimeout(() => {
        setCopiedValues(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  // Copy button component
  const CopyButton = ({ text, uniqueKey }: { text: string; uniqueKey: string }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => copyToClipboard(text, uniqueKey)}
      className="p-1 h-6 w-6 ml-1 hover:bg-muted"
      title={`Copy ${text} to clipboard`}
    >
      {copiedValues[uniqueKey] ? (
        <Check className="h-3 w-3 text-green-600" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </Button>
  );

  // Parse destination results JSON
  const parseDestinationResults = (resultsJson: string): DestinationResult => {
    try {
      return JSON.parse(resultsJson);
    } catch {
      return {};
    }
  };

  const getDestinationStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'batched':
      case 'processing':
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Send className="h-4 w-4 text-blue-500" />;
    }
  };

  const getDestinationStatusVariant = (status: string): 'default' | 'destructive' | 'secondary' | 'outline' => {
    switch (status.toLowerCase()) {
      case 'success':
        return 'default';
      case 'failed':
      case 'error':
        return 'destructive';
      case 'batched':
      case 'processing':
      case 'pending':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          className="max-w-none w-full h-full p-3 [&>*]:!max-w-none [&>*]:!w-full" 
          style={{ width: '80vw', maxWidth: '1600px', height: '95vh', maxHeight: '95vh' }}
        >
          <div className="w-full h-full flex flex-col overflow-hidden">
            <DialogHeader className="flex-shrink-0 pb-2">
              <DialogTitle className="text-xl font-semibold">
                DICOM Processing Evidence for {patientName}
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto w-full">
              <div className="space-y-4 w-full">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading evidence...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-8 text-destructive">
              <XCircle className="h-6 w-6 mr-2" />
              <span>Failed to load evidence</span>
            </div>
          )}

          {evidence && evidence.length === 0 && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <FileText className="h-6 w-6 mr-2" />
              <span>No processing evidence found</span>
            </div>
          )}

          {evidence && evidence.length > 0 && (
            <>
              <div className="flex items-center gap-2 mb-4 w-full">
                <Badge variant="outline" className="text-sm">
                  {evidence.length} DICOM objects processed
                </Badge>
                <Badge variant="secondary" className="text-sm">
                  Accession: {accessionNumber}
                </Badge>
              </div>

              <div className="space-y-1 w-full">
                {evidence.map((item, index) => {
                  const destinations = parseDestinationResults(item.destination_results);
                  
                  return (
                    <div key={`${item.id}-${index}`} className="border-b border-border/50 py-3 px-1 w-full last:border-b-0">
                      {/* Top line: SOP info and timestamp */}
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="font-mono text-xs">SOP #{index + 1}: {item.sop_instance_uid?.slice(-12)}</Badge>
                          {item.source_identifier && <span className="text-xs text-muted-foreground">Source: {item.source_identifier}</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{item.processed_at && format(new Date(item.processed_at), 'PPpp')}</span>
                          <Badge variant={item.processing_successful ? "default" : "destructive"}>{item.processing_successful ? "Success" : "Failed"}</Badge>
                        </div>
                      </div>

                      {/* Main grid */}
                      <div className="grid grid-cols-12 gap-x-4 text-xs">
                        {/* DICOM UIDs */}
                        <div className="col-span-5 space-y-1 font-mono">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center truncate">
                              <span className="text-muted-foreground w-16 shrink-0">Study:</span>
                              <span className="truncate" title={item.study_instance_uid}>{item.study_instance_uid}</span>
                            </div>
                            <CopyButton text={item.study_instance_uid} uniqueKey={`study-${item.id}`} />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center truncate">
                              <span className="text-muted-foreground w-16 shrink-0">Series:</span>
                              <span className="truncate" title={item.series_instance_uid}>{item.series_instance_uid}</span>
                            </div>
                            <CopyButton text={item.series_instance_uid} uniqueKey={`series-${item.id}`} />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center truncate">
                              <span className="text-muted-foreground w-16 shrink-0">SOP:</span>
                              <span className="truncate" title={item.sop_instance_uid}>{item.sop_instance_uid}</span>
                            </div>
                            <CopyButton text={item.sop_instance_uid} uniqueKey={`sop-${item.id}`} />
                          </div>
                        </div>

                        {/* Processing Rules */}
                        <div className="col-span-3 space-y-1">
                          <div>
                            <span className="font-semibold text-muted-foreground">Rules Applied:</span>
                            <p className="break-words">{item.applied_rule_names || 'None'}</p>
                          </div>
                          <div>
                            <span className="font-semibold text-muted-foreground">Matched On:</span>
                            <p>{item.match_rule || 'N/A'}</p>
                          </div>
                        </div>

                        {/* Destinations */}
                        <div className="col-span-4">
                          <span className="font-semibold text-muted-foreground">Destinations:</span>
                          {Object.keys(destinations).length > 0 ? (
                            <div className="space-y-1 mt-1">
                              {Object.entries(destinations).map(([destName, destInfo]) => (
                                <div key={destName} className="flex items-center justify-between">
                                  <Badge variant="outline" className="font-mono text-xs">{destName}</Badge>
                                  <div className="flex items-center gap-1">
                                    {getDestinationStatusIcon(destInfo.status)}
                                    <Badge variant={getDestinationStatusVariant(destInfo.status)} className="text-xs">{destInfo.status.toUpperCase()}</Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-muted-foreground">No destinations</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
