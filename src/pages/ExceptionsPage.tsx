// frontend/src/pages/ExceptionsPage.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ListX, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { listExceptions, updateException } from '@/services/exceptionService'; // Corrected import
import type { ListExceptionsParams } from '@/services/exceptionService';

import { DicomExceptionLogRead, DicomExceptionLogUpdate } from '@/schemas/dicomExceptionSchema';
import { ExceptionStatus, ExceptionStatusEnum } from '@/schemas/dicomExceptionEnums';
import { 
    HierarchicalExceptionData, 
    StudyLevelExceptionItem, 
    SeriesLevelExceptionItem, // Keep if used in transform logic, even if not directly in props
    SopLevelExceptionItem 
} from '@/types/exceptions';

import ExceptionsTable from '@/components/exceptions/ExceptionsTable';
import ExceptionFilters from '@/components/exceptions/ExceptionFilters';
import ExceptionDetailModal from '@/components/exceptions/ExceptionDetailModal';

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
        id: log.study_instance_uid,
        itemType: 'study',
        studyInstanceUid: log.study_instance_uid,
        patientName: log.patient_name,
        patientId: log.patient_id,
        accessionNumber: log.accession_number,
        seriesCount: 0,
        totalSopInstanceCount: 0,
        statusSummary: '',
        earliestFailure: log.failure_timestamp,
        latestFailure: log.failure_timestamp,
        subRows: [],
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
          id: `${log.study_instance_uid}_${log.series_instance_uid}`,
          itemType: 'series',
          studyInstanceUid: log.study_instance_uid,
          seriesInstanceUid: log.series_instance_uid,
          modality: log.modality,
          sopInstanceCount: 0,
          statusSummary: '',
          subRows: [],
        };
        studyItem.subRows!.push(seriesItem);
      }
      seriesItem.sopInstanceCount++;
      // Ensure the pushed SOP item conforms to SopLevelExceptionItem (with string id and itemType)
      const sopItemData: SopLevelExceptionItem = {
          ...log, // DicomExceptionLogRead
          id: `sop_${log.id}`, // String ID
          itemType: 'sop',
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

const ExceptionsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<ListExceptionsParams>({ limit: 50, sortBy: 'failure_timestamp', sortOrder: 'desc' });
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedExceptionUuidForDetail, setSelectedExceptionUuidForDetail] = useState<string | null>(null);
  
  // State to track the UUID of the SOP instance being updated via popover
  const [updatingPopoverUuid, setUpdatingPopoverUuid] = useState<string | null>(null);


  const { data: exceptionsResponse, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['exceptions', filters],
    queryFn: () => listExceptions(filters),
    placeholderData: (previousData) => previousData,
  });

  const hierarchicalData = useMemo(() => {
    return transformExceptionsToHierarchy(exceptionsResponse?.items || []);
  }, [exceptionsResponse?.items]);

  const updateExceptionMutation = useMutation({
    mutationFn: ({ uuid, data }: { uuid: string; data: DicomExceptionLogUpdate }) => {
      // If this mutation is triggered from the popover, set its UUID
      // This assumes the popover calls this mutation.
      // If detail modal also calls it, this simple tracking might not be enough.
      setUpdatingPopoverUuid(uuid); 
      return updateException(uuid, data);
    },
    onSuccess: (updatedLog: DicomExceptionLogRead) => {
      toast.success(`Exception ${updatedLog.exception_uuid} updated.`);
      queryClient.invalidateQueries({ queryKey: ['exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['exceptionDetail', updatedLog.exception_uuid] });
      if (selectedExceptionUuidForDetail === updatedLog.exception_uuid) { // Only close if it was the detail modal's update
          setIsDetailModalOpen(false);
      }
    },
    onError: (err: any, variables) => {
      toast.error(`Failed to update exception ${variables.uuid}: ${err.message || 'Unknown error'}`);
    },
    onSettled: () => {
      setUpdatingPopoverUuid(null); // Clear the popover updating UUID
    }
  });

  const handleFiltersChange = useCallback((newFilters: Partial<ListExceptionsParams>) => {
    setFilters((prev: ListExceptionsParams) => ({ ...prev, ...newFilters, skip: 0 }));
  }, []);

  const handleViewDetails = useCallback((exceptionUuid: string) => {
    setSelectedExceptionUuidForDetail(exceptionUuid);
    setIsDetailModalOpen(true);
  }, []);

  const handleRequeueForRetry = useCallback((exceptionUuid: string) => {
    updateExceptionMutation.mutate({
      uuid: exceptionUuid,
      data: { status: ExceptionStatusEnum.Enum.RETRY_PENDING, next_retry_attempt_at: null }
    });
  }, [updateExceptionMutation]);
  
  const isEffectiveLoading = isLoading || (isFetching && (!exceptionsResponse || exceptionsResponse.items.length === 0));


  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">DICOM Processing Exceptions</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><ListX className="mr-2 h-5 w-5" /> Exception Filters</CardTitle>
          <CardDescription>Filter and sort the exceptions list.</CardDescription>
        </CardHeader>
        <CardContent>
          <ExceptionFilters 
            currentFilters={filters} 
            onFiltersChange={handleFiltersChange} 
            disabled={isEffectiveLoading || updateExceptionMutation.isPending} 
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exceptions List</CardTitle>
          <CardDescription>
            Found {exceptionsResponse?.total || 0} total exception logs. 
            {isFetching && exceptionsResponse?.items && <Loader2 className="ml-2 h-4 w-4 animate-spin inline-block" />}
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
            // Pass a function to check if a specific row's popover should be in loading state
            isRowUpdating={(uuid: string) => updatingPopoverUuid === uuid && updateExceptionMutation.isPending}
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
            setSelectedExceptionUuidForDetail(null); // Clear selected UUID when closing
          }}
          exceptionUuid={selectedExceptionUuidForDetail}
          onUpdate={(uuid: string, data: DicomExceptionLogUpdate) => {
            updateExceptionMutation.mutate({ uuid, data });
          }}
          isUpdating={updateExceptionMutation.isPending && selectedExceptionUuidForDetail === updateExceptionMutation.variables?.uuid}
        />
      )}
  </div>
  );
}
export default ExceptionsPage;