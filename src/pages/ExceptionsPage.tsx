// frontend/src/pages/ExceptionsPage.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ListX, Loader2, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';
import { // Import AlertDialog components
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";



import { listExceptions, updateException, performBulkExceptionAction, triggerExceptionRetryCycle } from '@/services/exceptionService';
import type { ListExceptionsParams } from '@/services/exceptionService';
import { DicomExceptionLogRead, DicomExceptionLogUpdate, DicomExceptionBulkActionRequest, BulkActionScope, BulkActionSetStatusPayload, BulkActionRequeueRetryablePayload } from '@/schemas/dicomExceptionSchema';
import { ExceptionStatus, ExceptionStatusEnum } from '@/schemas/dicomExceptionEnums';
import {
    HierarchicalExceptionData,
    StudyLevelExceptionItem,
    SopLevelExceptionItem
} from '@/types/exceptions';

import ExceptionsTable from '@/components/exceptions/ExceptionsTable';
import ExceptionFilters from '@/components/exceptions/ExceptionFilters';
import ExceptionDetailModal from '@/components/exceptions/ExceptionDetailModal';

// --- transformExceptionsToHierarchy function (no changes from your last version) ---
const transformExceptionsToHierarchy = (flatLogs: DicomExceptionLogRead[]): HierarchicalExceptionData => {
    if (!flatLogs || flatLogs.length === 0) return [];
    const studiesMap = new Map<string, StudyLevelExceptionItem>();

    for (const log of flatLogs) {
        if (!log.study_instance_uid) {
            console.warn("Log without study_instance_uid, cannot group:", log);
            continue;
        }
        if (!studiesMap.has(log.study_instance_uid)) {
            studiesMap.set(log.study_instance_uid, {
                id: log.study_instance_uid, itemType: 'study', studyInstanceUid: log.study_instance_uid,
                patientName: log.patient_name, patientId: log.patient_id, accessionNumber: log.accession_number,
                seriesCount: 0, totalSopInstanceCount: 0, statusSummary: '',
                earliestFailure: log.failure_timestamp, latestFailure: log.failure_timestamp, subRows: [],
            });
        }
        const studyItem = studiesMap.get(log.study_instance_uid)!;
        studyItem.totalSopInstanceCount++;
        if (log.failure_timestamp < studyItem.earliestFailure!) studyItem.earliestFailure = log.failure_timestamp;
        if (log.failure_timestamp > studyItem.latestFailure!) studyItem.latestFailure = log.failure_timestamp;
        if (!studyItem.patientName && log.patient_name) studyItem.patientName = log.patient_name;
        if (!studyItem.patientId && log.patient_id) studyItem.patientId = log.patient_id;
        if (!studyItem.accessionNumber && log.accession_number) studyItem.accessionNumber = log.accession_number;

        if (log.series_instance_uid) {
            let seriesItem = studyItem.subRows?.find(s => s.seriesInstanceUid === log.series_instance_uid);
            if (!seriesItem) {
                seriesItem = {
                    id: `${log.study_instance_uid}_${log.series_instance_uid}`, itemType: 'series',
                    studyInstanceUid: log.study_instance_uid, seriesInstanceUid: log.series_instance_uid,
                    modality: log.modality, sopInstanceCount: 0, statusSummary: '', subRows: [],
                };
                studyItem.subRows!.push(seriesItem);
            }
            seriesItem.sopInstanceCount++;
            const sopItemData: SopLevelExceptionItem = {
                ...log, id: `sop_${log.id}`, itemType: 'sop',
            };
            seriesItem.subRows!.push(sopItemData);
        } else {
            console.warn("Log found under study but without series_instance_uid:", log);
        }
    }

    studiesMap.forEach(study => {
        study.seriesCount = study.subRows?.length || 0;
        const studySopStatuses: ExceptionStatus[] = [];
        study.subRows?.forEach(series => {
            const seriesSopStatuses: ExceptionStatus[] = [];
            series.subRows?.forEach(sop => {
                seriesSopStatuses.push(sop.status);
                studySopStatuses.push(sop.status);
            });
            const newSeriesCount = seriesSopStatuses.filter(s => s === ExceptionStatusEnum.Enum.NEW).length;
            const failedSeriesCount = seriesSopStatuses.filter(s => s === ExceptionStatusEnum.Enum.FAILED_PERMANENTLY).length;
            series.statusSummary = `${seriesSopStatuses.length} SOPs (${newSeriesCount} New, ${failedSeriesCount} Failed)`;
        });
        const newStudyCount = studySopStatuses.filter(s => s === ExceptionStatusEnum.Enum.NEW).length;
        const failedStudyCount = studySopStatuses.filter(s => s === ExceptionStatusEnum.Enum.FAILED_PERMANENTLY).length;
        study.statusSummary = `${studySopStatuses.length} Total SOPs (${newStudyCount} New, ${failedStudyCount} Failed)`;
    });
    return Array.from(studiesMap.values());
};
// --- END transformExceptionsToHierarchy function ---


const ExceptionsPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [filters, setFilters] = useState<ListExceptionsParams>({ limit: 50, sortBy: 'failure_timestamp', sortOrder: 'desc' });
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedExceptionUuidForDetail, setSelectedExceptionUuidForDetail] = useState<string | null>(null);
    const [updatingPopoverUuid, setUpdatingPopoverUuid] = useState<string | null>(null);
    const [isTriggeringRetryCycle, setIsTriggeringRetryCycle] = useState(false);

    // --- NEW STATE FOR BULK ACTIONS ---
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);
    const [bulkActionConfirmation, setBulkActionConfirmation] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        onConfirm: () => void;
    } | null>(null);
    // --- END NEW STATE ---

    const handleTriggerRetryCycle = async () => {
        setIsTriggeringRetryCycle(true);
        toast.info("Attempting to initiate manual exception retry cycle...");
        try {
            const response = await triggerExceptionRetryCycle();
            toast.success(`${response.message} Task ID: ${response.celery_task_id.slice(0, 8)}...`);
            // Optionally, you could refetch exceptions after a short delay,
            // but the worker will update them anyway.
            // setTimeout(() => queryClient.invalidateQueries({ queryKey: ['exceptions', filters] }), 5000); 
        } catch (err: any) {
            toast.error(`Failed to trigger retry cycle: ${err.message || 'Unknown server error'}`);
            console.error("Trigger retry cycle API call error:", err);
        } finally {
            setIsTriggeringRetryCycle(false);
        }
    };

    const { data: exceptionsResponse, isLoading, isFetching } = useQuery({
        queryKey: ['exceptions', filters],
        queryFn: () => listExceptions(filters),
        placeholderData: (previousData) => previousData, // Keep previous data while fetching
    });

    const hierarchicalData = useMemo(() => {
        return transformExceptionsToHierarchy(exceptionsResponse?.items || []);
    }, [exceptionsResponse?.items]);

    const updateExceptionMutation = useMutation({
        mutationFn: ({ uuid, data }: { uuid: string; data: DicomExceptionLogUpdate }) => {
            // Only set popover UUID if this is NOT part of a bulk update
            if (!isBulkUpdating) {
                setUpdatingPopoverUuid(uuid);
            }
            return updateException(uuid, data);
        },
        onSuccess: (updatedLog: DicomExceptionLogRead) => {
            // Only toast for individual updates, bulk actions will have their own summary toast
            if (!isBulkUpdating) {
                toast.success(`Exception ${updatedLog.exception_uuid} updated.`);
            }
            // Invalidate queries to refetch data
            // No need to invalidate 'exceptions' here if bulk action handles it after all promises.
            // But for individual updates, it's fine.
            if (!isBulkUpdating) {
                queryClient.invalidateQueries({ queryKey: ['exceptions', filters] });
            }
            queryClient.invalidateQueries({ queryKey: ['exceptionDetail', updatedLog.exception_uuid] });

            if (selectedExceptionUuidForDetail === updatedLog.exception_uuid && !isBulkUpdating) {
                setIsDetailModalOpen(false);
            }
        },
        onError: (err: any, variables) => {
            if (!isBulkUpdating) {
                toast.error(`Failed to update exception ${variables.uuid}: ${err.message || 'Unknown error'}`);
            }
            // Error handling for bulk will be part of Promise.allSettled
        },
        onSettled: (_data, _error, variables) => {
            if (updatingPopoverUuid === variables.uuid) {
                setUpdatingPopoverUuid(null);
            }
        }
    });

    // --- NEW BULK ACTION HANDLER ---
    const handleBulkAction = async (
        identifier: string, // studyId (studyInstanceUid) or seriesId (composite key from table)
        level: 'study' | 'series',
        action: 'ARCHIVE' | 'REQUEUE_RETRYABLE' | 'SET_STATUS_MANUAL_REVIEW',
        _newStatus?: ExceptionStatus,
        notes?: string
    ) => {
        // No need to fetch targetSopUuids here anymore, the backend will do it based on scope.

        let actionTypeForAPI: "SET_STATUS" | "REQUEUE_RETRYABLE";
        let payloadForAPI: DicomExceptionBulkActionRequest['payload'] = null;
        let scopeForAPI: BulkActionScope = {};

        let actionDescriptionToast = ""; // For the toast message

        // Determine scope
        if (level === 'study') {
            scopeForAPI.study_instance_uid = identifier; // identifier is studyInstanceUid
        } else if (level === 'series') {
            // Assuming series identifier passed from table is the composite studyUID_seriesUID
            // Or if it's just seriesUID, and your backend get_many_by_scope can handle ambiguity
            // For now, let's assume it's just seriesInstanceUID and studyInstanceUID might be needed if ambiguous
            // The backend scope allows just series_instance_uid, but it's better if study_instance_uid is also known
            // Let's find the studyUID for this series from hierarchicalData for a more precise scope.
            let studyUidForSeries: string | undefined = undefined;
            if (hierarchicalData) {
                for (const study of hierarchicalData) {
                    const foundSeries = study.subRows?.find(s => s.id === identifier); // Assuming series.id is the composite key
                    if (foundSeries) {
                        studyUidForSeries = study.studyInstanceUid;
                        scopeForAPI.series_instance_uid = foundSeries.seriesInstanceUid;
                        break;
                    }
                }
            }
            if (!scopeForAPI.series_instance_uid) { // Fallback if series not found in current view (should not happen)
                toast.error("Could not determine series details for bulk action.");
                return;
            }
            // If your backend 'get_many_by_scope' for series needs study_uid, add it here
            if (studyUidForSeries) {
                scopeForAPI.study_instance_uid = studyUidForSeries;
            }
        }


        switch (action) {
            case 'ARCHIVE':
                actionTypeForAPI = "SET_STATUS";
                payloadForAPI = {
                    new_status: ExceptionStatusEnum.Enum.ARCHIVED,
                    resolution_notes: notes || `Bulk archived (${level} level)`
                } as BulkActionSetStatusPayload; // Cast for type safety if using Zod discriminated union
                actionDescriptionToast = `archive all SOP(s) in this ${level}`;
                break;
            case 'REQUEUE_RETRYABLE':
                actionTypeForAPI = "REQUEUE_RETRYABLE";
                // Backend will filter for eligible SOPs.
                // Payload for REQUEUE_RETRYABLE is currently empty/None or BulkActionRequeueRetryablePayload
                payloadForAPI = {} as BulkActionRequeueRetryablePayload; // Empty or defined fields
                actionDescriptionToast = `re-queue all eligible SOP(s) in this ${level} for retry`;
                break;
            case 'SET_STATUS_MANUAL_REVIEW':
                actionTypeForAPI = "SET_STATUS";
                payloadForAPI = {
                    new_status: ExceptionStatusEnum.Enum.MANUAL_REVIEW_REQUIRED,
                    resolution_notes: notes || `Bulk set to manual review (${level} level)`
                } as BulkActionSetStatusPayload;
                actionDescriptionToast = `set SOP(s) in this ${level} to Manual Review`;
                break;
            default:
                toast.error("Unknown bulk action type requested by UI.");
                return;
        }

        setBulkActionConfirmation({
            isOpen: true,
            title: `Confirm Bulk ${action.replace(/_/g, ' ')}`,
            description: `Are you sure you want to ${actionDescriptionToast}? This may affect multiple records.`,
            onConfirm: async () => {
                setBulkActionConfirmation(null);
                setIsBulkUpdating(true);
                toast.info(`Processing bulk ${action.toLowerCase().replace(/_/g, ' ')}...`);

                try {
                    let requestBody: DicomExceptionBulkActionRequest;

                    if (actionTypeForAPI === "SET_STATUS") {
                        requestBody = {
                            action_type: "SET_STATUS",
                            scope: scopeForAPI,
                            // Ensure payloadForAPI is treated as BulkActionSetStatusPayload
                            // It was already cast as such in the switch, but this reinforces the type for this specific object structure.
                            payload: payloadForAPI as BulkActionSetStatusPayload,
                        };
                    } else if (actionTypeForAPI === "REQUEUE_RETRYABLE") {
                        requestBody = {
                            action_type: "REQUEUE_RETRYABLE",
                            scope: scopeForAPI,
                            // Ensure payloadForAPI is treated as BulkActionRequeueRetryablePayload
                            // It was already cast as such in the switch.
                            payload: payloadForAPI as BulkActionRequeueRetryablePayload,
                        };
                    } else {
                        // This case should ideally be unreachable given the preceding switch logic
                        // that sets actionTypeForAPI.
                        toast.error("Internal error: Unknown action type for bulk operation.");
                        setIsBulkUpdating(false);
                        return;
                    }

                    const response = await performBulkExceptionAction(requestBody);

                    if (response.successful_count > 0) {
                        toast.success(`Successfully processed ${response.successful_count} of ${response.processed_count} SOP(s). ${response.failed_count > 0 ? `${response.failed_count} failed.` : ''}`);
                    } else if (response.processed_count > 0 && response.successful_count === 0) {
                        toast.warning(`No SOPs were updated. ${response.failed_count} failed or none eligible. Message: ${response.message}`);
                    } else { // processed_count === 0
                        toast.info(response.message || "No SOPs found for the specified scope or action.");
                    }
                    if (response.details && response.details.length > 0) {
                        console.warn("Bulk action details/errors:", response.details);
                    }

                } catch (err: any) {
                    toast.error(`Bulk action failed: ${err.message || 'Unknown server error'}`);
                    console.error("Bulk action API call error:", err);
                } finally {
                    queryClient.invalidateQueries({ queryKey: ['exceptions', filters] });
                    setIsBulkUpdating(false);
                }
            }
        });
    };
    const handleFiltersChange = useCallback((newFilters: Partial<ListExceptionsParams>) => { /* ... no change ... */
        setFilters((prev: ListExceptionsParams) => ({ ...prev, ...newFilters, skip: 0 }));
    }, []);

    const handleViewDetails = useCallback((exceptionUuid: string) => { /* ... no change ... */
        setSelectedExceptionUuidForDetail(exceptionUuid);
        setIsDetailModalOpen(true);
    }, []);

    const handleRequeueForRetry = useCallback((exceptionUuid: string) => { /* ... no change ... */
        updateExceptionMutation.mutate({
            uuid: exceptionUuid,
            data: { status: ExceptionStatusEnum.Enum.RETRY_PENDING, next_retry_attempt_at: null }
        });
    }, [updateExceptionMutation]);

    const isEffectiveLoading = isLoading || (isFetching && (!exceptionsResponse || exceptionsResponse.items.length === 0));


    // This is the return statement for your ExceptionsPage React component.
    // Ensure all variables/functions used here (filters, handleFiltersChange, isEffectiveLoading, etc.)
    // are defined correctly within the ExceptionsPage component scope.
    // Also ensure Button, PlayCircle, Loader2 (for the new button) are imported.

    return (
        <div className="space-y-6">
            {/* --- MODIFIED: Added flex container for heading and new button --- */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold">DICOM Processing Exceptions</h1>
                <Button
                    onClick={handleTriggerRetryCycle} // Assumes handleTriggerRetryCycle is defined in your component
                    disabled={isTriggeringRetryCycle || isBulkUpdating || updateExceptionMutation.isPending || isEffectiveLoading} // Disable if any major operation is ongoing
                    size="sm"
                    variant="outline" // Or your preferred variant
                >
                    {isTriggeringRetryCycle ? ( // Assumes isTriggeringRetryCycle state is defined
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <PlayCircle className="mr-2 h-4 w-4" />
                    )}
                    Trigger Retry Cycle
                </Button>
            </div>
            {/* --- END MODIFICATION --- */}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><ListX className="mr-2 h-5 w-5" /> Exception Filters</CardTitle>
                    <CardDescription>Filter and sort the exceptions list.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ExceptionFilters
                        currentFilters={filters}
                        onFiltersChange={handleFiltersChange}
                        // Added isTriggeringRetryCycle to disabled condition
                        disabled={isEffectiveLoading || updateExceptionMutation.isPending || isBulkUpdating || isTriggeringRetryCycle}
                    />
                </CardContent>
            </Card>

            <Card> {/* ... Exceptions List Card ... */}
                <CardHeader>
                    <CardTitle>Exceptions List</CardTitle>
                    <CardDescription>
                        Found {exceptionsResponse?.total || 0} total exception logs.
                        {/* Show loader if fetching, bulk updating, or triggering retry cycle and not initial load */}
                        {(isFetching || isBulkUpdating || isTriggeringRetryCycle) && (!isLoading) && <Loader2 className="ml-2 h-4 w-4 animate-spin inline-block" />}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ExceptionsTable
                        data={hierarchicalData}
                        isLoading={isEffectiveLoading}
                        onViewDetails={handleViewDetails}
                        onRequeueForRetry={handleRequeueForRetry}
                        onUpdateStatus={(uuid: string, status: ExceptionStatus, notes?: string) => {
                            updateExceptionMutation.mutate({ uuid, data: { status, resolution_notes: notes } });
                        }}
                        isSopInstanceUpdating={(uuid: string) => updatingPopoverUuid === uuid && updateExceptionMutation.isPending}
                        onBulkAction={handleBulkAction}
                        isBulkUpdating={isBulkUpdating}
                    />
                    <div className="mt-4 flex justify-between items-center">
                        <span>Total items: {exceptionsResponse?.total ?? 0}</span>
                        {/* Pagination controls would go here */}
                    </div>
                </CardContent>
            </Card>

            {selectedExceptionUuidForDetail && (
                <ExceptionDetailModal
                    isOpen={isDetailModalOpen}
                    onClose={() => {
                        setIsDetailModalOpen(false);
                        setSelectedExceptionUuidForDetail(null);
                    }}
                    exceptionUuid={selectedExceptionUuidForDetail}
                    onUpdate={(uuid: string, data: DicomExceptionLogUpdate) => {
                        updateExceptionMutation.mutate({ uuid, data });
                    }}
                    isUpdating={updateExceptionMutation.isPending && selectedExceptionUuidForDetail === updateExceptionMutation.variables?.uuid && !isBulkUpdating}
                />
            )}

            {bulkActionConfirmation?.isOpen && (
                <AlertDialog open onOpenChange={() => setBulkActionConfirmation(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{bulkActionConfirmation.title}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {bulkActionConfirmation.description}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setBulkActionConfirmation(null)} disabled={isBulkUpdating}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={bulkActionConfirmation.onConfirm} disabled={isBulkUpdating}>
                                {isBulkUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirm
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    );
}
export default ExceptionsPage;