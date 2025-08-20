// frontend/src/components/orders/OrderEvidenceAccordion.tsx

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDownIcon, ChevronRightIcon, CheckIcon, XIcon, ClockIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { getOrderEvidence } from "@/services/api";
import { OrderEvidence, DestinationResult } from "@/schemas/orderEvidenceSchema";

interface OrderEvidenceAccordionProps {
  accessionNumber: string;
}

export function OrderEvidenceAccordion({ accessionNumber }: OrderEvidenceAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Only fetch evidence when accordion is opened
  const { data: evidence, isLoading, error } = useQuery({
    queryKey: ["order-evidence", accessionNumber],
    queryFn: () => getOrderEvidence(accessionNumber),
    enabled: isOpen, // This prevents API calls until user clicks
  });

  // Parse destination results JSON for a cleaner display
  const parseDestinationResults = (resultsJson: string): DestinationResult => {
    try {
      return JSON.parse(resultsJson);
    } catch {
      return {};
    }
  };

  // Get status icon and color based on processing success and destination results
  const getStatusInfo = (evidence: OrderEvidence) => {
    if (!evidence.processing_successful) {
      return { icon: <XIcon className="h-4 w-4" />, variant: "destructive" as const, text: "Failed" };
    }

    const destinations = parseDestinationResults(evidence.destination_results);
    const hasAnyFailure = Object.values(destinations).some(dest => 
      dest.status === "failed" || dest.status === "error"
    );

    if (hasAnyFailure) {
      return { icon: <XIcon className="h-4 w-4" />, variant: "destructive" as const, text: "Partial" };
    }

    const hasAnyPending = Object.values(destinations).some(dest => 
      dest.status === "pending" || dest.status === "batched" || dest.status === "processing"
    );

    if (hasAnyPending) {
      return { icon: <ClockIcon className="h-4 w-4" />, variant: "secondary" as const, text: "Processing" };
    }

    return { icon: <CheckIcon className="h-4 w-4" />, variant: "default" as const, text: "Success" };
  };

  // Count evidence records and get summary status
  const evidenceSummary = evidence ? {
    totalObjects: evidence.length,
    successfulObjects: evidence.filter(e => e.processing_successful).length,
    failedObjects: evidence.filter(e => !e.processing_successful).length,
  } : null;

  return (
    <div className="border rounded-lg">
      <Button
        variant="ghost"
        className="w-full justify-between p-4 h-auto font-normal"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDownIcon className="h-4 w-4" />
          ) : (
            <ChevronRightIcon className="h-4 w-4" />
          )}
          <span className="font-medium">DICOM Processing Evidence</span>
          {evidenceSummary && (
            <Badge variant="outline">
              {evidenceSummary.totalObjects} objects processed
            </Badge>
          )}
        </div>
        {evidenceSummary && (
          <div className="flex gap-1">
            {evidenceSummary.successfulObjects > 0 && (
              <Badge variant="default">
                <CheckIcon className="h-3 w-3 mr-1" />
                {evidenceSummary.successfulObjects}
              </Badge>
            )}
            {evidenceSummary.failedObjects > 0 && (
              <Badge variant="destructive">
                <XIcon className="h-3 w-3 mr-1" />
                {evidenceSummary.failedObjects}
              </Badge>
            )}
          </div>
        )}
      </Button>

      {isOpen && (
        <div className="border-t p-4 bg-muted/20">
          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}

          {error && (
            <div className="text-red-500 text-sm p-2 bg-red-50 rounded">
              Error loading processing evidence: {(error as Error).message}
            </div>
          )}

          {evidence && evidence.length === 0 && (
            <div className="text-muted-foreground text-sm text-center py-4">
              No DICOM processing evidence found for this order.
            </div>
          )}

          {evidence && evidence.length > 0 && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Found {evidence.length} processed DICOM objects for accession {accessionNumber}
              </div>

              <div className="space-y-3">
                {evidence.map((item) => {
                  const statusInfo = getStatusInfo(item);
                  const destinations = parseDestinationResults(item.destination_results);

                  return (
                    <div key={item.id} className="border rounded p-3 bg-background">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={statusInfo.variant} className="gap-1">
                            {statusInfo.icon}
                            {statusInfo.text}
                          </Badge>
                          <span className="text-sm font-mono">
                            SOP: ...{item.sop_instance_uid.slice(-12)}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(item.processed_at), "MMM dd, HH:mm:ss")}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="font-medium text-muted-foreground mb-1">Rule Applied</div>
                          <div>{item.applied_rule_names}</div>
                          <div className="text-xs text-muted-foreground">
                            Match: {item.match_rule} | Source: {item.source_identifier}
                          </div>
                        </div>

                        <div>
                          <div className="font-medium text-muted-foreground mb-1">Destinations</div>
                          <div className="space-y-1">
                            {Object.entries(destinations).map(([destName, destInfo]) => (
                              <div key={destName} className="flex items-center gap-2">
                                <span className="font-medium">{destName}:</span>
                                <Badge 
                                  variant={
                                    destInfo.status === "success" ? "default" :
                                    destInfo.status === "failed" || destInfo.status === "error" ? "destructive" :
                                    "secondary"
                                  }
                                  className="text-xs"
                                >
                                  {destInfo.status}
                                </Badge>
                                {destInfo.batch_id && (
                                  <span className="text-xs text-muted-foreground">
                                    Batch #{destInfo.batch_id}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
