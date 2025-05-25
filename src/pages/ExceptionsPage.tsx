// frontend/src/pages/ExceptionsPage.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ListX, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// MODIFIED: Import directly from the service file
import { listExceptions, updateException } from '@/services/exceptionService';
import type { ListExceptionsParams } from '@/services/exceptionService'; // Import type

import { DicomExceptionLogRead, DicomExceptionLogUpdate } from '@/schemas/dicomExceptionSchema';
import { ExceptionStatus, ExceptionStatusEnum } from '@/schemas/dicomExceptionEnums'; // Import type ExceptionStatus
import { HierarchicalExceptionData, StudyLevelExceptionItem, /* SeriesLevelExceptionItem, */ SopLevelExceptionItem } from '@/types/exceptions'; // SeriesLevelExceptionItem might be unused

// MODIFIED: Ensure these paths are correct and components are default exported
// If these files don't exist, you'll need to create them.
import ExceptionsTable from '@/components/exceptions/ExceptionsTable';
import ExceptionFilters from '@/components/exceptions/ExceptionFilters';
import ExceptionDetailModal from '@/components/exceptions/ExceptionDetailModal';


// FUCKING DATA TRANSFORMATION LOGIC - THIS IS THE CRUX, YOU IMBECILE
const transformExceptionsToHierarchy = (flatLogs: DicomExceptionLogRead[]): HierarchicalExceptionData => {
  if (!flatLogs || flatLogs.length === 0) return [];

  const studiesMap = new Map<string, StudyLevelExceptionItem>();

  for (const log of flatLogs) {
    if (!log.study_instance_uid) {
      console.warn("Log without study_instance_uid, cannot group:", log);
      continue;
    }

    // Ensure study entry exists
    if (!studiesMap.has(log.study_instance_uid)) {
      studiesMap.set(log.study_instance_uid, {
        id: log.study_instance_uid, // Use study UID as the unique ID for the table row
        itemType: 'study',
        studyInstanceUid: log.study_instance_uid,
        patientName: log.patient_name, // Simplistic: first one wins.
        patientId: log.patient_id,
        accessionNumber: log.accession_number,
        seriesCount: 0,
        totalSopInstanceCount: 0,
        statusSummary: '', // Will be calculated later
        earliestFailure: log.failure_timestamp, // Initialize with the first log's timestamp
        latestFailure: log.failure_timestamp,   // Initialize
        subRows: [], // This will hold SeriesLevelExceptionItem[]
      });
    }

    const studyItem = studiesMap.get(log.study_instance_uid)!;
    studyItem.totalSopInstanceCount++;

    // Update earliest/latest failure timestamps for the study
    if (log.failure_timestamp < studyItem.earliestFailure!) {
      studyItem.earliestFailure = log.failure_timestamp;
    }
    if (log.failure_timestamp > studyItem.latestFailure!) {
      studyItem.latestFailure = log.failure_timestamp;
    }
    // Update patient/accession if current ones are null/empty and new log has them
    if (!studyItem.patientName && log.patient_name) studyItem.patientName = log.patient_name;
    if (!studyItem.patientId && log.patient_id) studyItem.patientId = log.patient_id;
    if (!studyItem.accessionNumber && log.accession_number) studyItem.accessionNumber = log.accession_number;


    // Group by Series
    if (log.series_instance_uid) {
      let seriesItem = studyItem.subRows?.find(s => s.seriesInstanceUid === log.series_instance_uid);
      if (!seriesItem) {
        seriesItem = {
          id: `${log.study_instance_uid}_${log.series_instance_uid}`, // Composite ID for series row
          itemType: 'series',
          studyInstanceUid: log.study_instance_uid,
          seriesInstanceUid: log.series_instance_uid,
          modality: log.modality, // First log's modality for the series
          sopInstanceCount: 0,
          statusSummary: '', // Will be calculated later
          subRows: [], // This will hold SopLevelExceptionItem[] (which are DicomExceptionLogRead)
        };
        studyItem.subRows!.push(seriesItem);
      }
      seriesItem.sopInstanceCount++;
      seriesItem.subRows!.push({ ...log, itemType: 'sop', id: log.id } as SopLevelExceptionItem); // Ensure itemType: 'sop' is added
    } else {
      // Handle logs without series_instance_uid:
      // Option 1: Create a "Series Not Specified" group under the study
      // Option 2: Add them to a direct list of SOPs in the study (if your table design allows mixed subRow types)
      // For now, we'll assume most will have series. If not, this part needs more thought.
      console.warn("Log found under study but without series_instance_uid:", log);
    }
  }

  // Calculate summaries and update series counts
  studiesMap.forEach(study => {
    study.seriesCount = study.subRows?.length || 0;
    const studySopStatuses: ExceptionStatus[] = [];

    study.subRows?.forEach(series => {
      const seriesSopStatuses: ExceptionStatus[] = [];
      series.subRows?.forEach(sop => {
        seriesSopStatuses.push(sop.status);
        studySopStatuses.push(sop.status);
      });
      // Simple status summary for series (e.g., count of NEW)
      const newSeriesCount = seriesSopStatuses.filter(s => s === ExceptionStatusEnum.Enum.NEW).length;
      const failedSeriesCount = seriesSopStatuses.filter(s => s === ExceptionStatusEnum.Enum.FAILED_PERMANENTLY).length;
      series.statusSummary = `${seriesSopStatuses.length} SOPs (${newSeriesCount} New, ${failedSeriesCount} Failed)`;
    });
    // Simple status summary for study
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

  const { data: exceptionsResponse, isLoading, isError, error } = useQuery({
    queryKey: ['exceptions', filters],
    queryFn: () => listExceptions(filters),
    placeholderData: (previousData) => previousData, // MODIFIED: TanStack Query v5 syntax
  });

  const hierarchicalData = useMemo(() => {
    return transformExceptionsToHierarchy(exceptionsResponse?.items || []);
  }, [exceptionsResponse?.items]);

  const updateExceptionMutation = useMutation({
    mutationFn: ({ uuid, data }: { uuid: string; data: DicomExceptionLogUpdate }) => updateException(uuid, data),
    onSuccess: (updatedLog: DicomExceptionLogRead) => { // MODIFIED: Add type to updatedLog
      toast.success(`Exception ${updatedLog.exception_uuid} updated.`);
      queryClient.invalidateQueries({ queryKey: ['exceptions'] }); // Refetch list
      queryClient.invalidateQueries({ queryKey: ['exceptionDetail', updatedLog.exception_uuid] }); // Refetch detail if open
      setIsDetailModalOpen(false); // Close modal on success
    },
    onError: (err: any) => {
      toast.error(`Failed to update exception: ${err.message || 'Unknown error'}`);
    },
  });

  const handleFiltersChange = useCallback((newFilters: Partial<ListExceptionsParams>) => {
    setFilters((prev: ListExceptionsParams) => ({ ...prev, ...newFilters, skip: 0 })); // MODIFIED: Add type to prev
  }, []);

  const handleViewDetails = useCallback((exceptionUuid: string) => {
    setSelectedExceptionUuidForDetail(exceptionUuid);
    setIsDetailModalOpen(true);
  }, []);

  const handleRequeueForRetry = useCallback((exceptionUuid: string) => {
    // This is just a status update
    updateExceptionMutation.mutate({
      uuid: exceptionUuid,
      data: { status: 'RETRY_PENDING' as ExceptionStatus, next_retry_attempt_at: null } // MODIFIED: Use string literal
    });
  }, [updateExceptionMutation]);

  // ... other handlers for pagination, sorting (passed to table)

  if (isLoading && !exceptionsResponse) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /> Loading exceptions...</div>;
  if (isError) return <div className="text-red-600">Error fetching exceptions: {error?.message || 'Unknown error'}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">DICOM Processing Exceptions</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><ListX className="mr-2 h-5 w-5" /> Exception Filters</CardTitle>
          <CardDescription>Filter and sort the exceptions list.</CardDescription>
        </CardHeader>
        <CardContent>
          <ExceptionFilters currentFilters={filters} onFiltersChange={handleFiltersChange} disabled={isLoading || updateExceptionMutation.isPending} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exceptions List</CardTitle>
          <CardDescription>Found {exceptionsResponse?.total || 0} total exception logs. Displaying in a study-centric view.</CardDescription>
        </CardHeader>
        <CardContent>
          <ExceptionsTable
            data={hierarchicalData}
            isLoading={isLoading} // Or more granular loading state
            // Pass pagination/sorting state and handlers if table itself doesn't manage them via filters
            onViewDetails={handleViewDetails}
            onRequeueForRetry={handleRequeueForRetry}
            onUpdateStatus={(uuid: string, status: ExceptionStatus, notes?: string) => updateExceptionMutation.mutate({uuid, data: {status, resolution_notes: notes}})} // MODIFIED: Add types
          />
           {/* Basic Pagination Example - you'll want something better */}
          <div className="mt-4 flex justify-between items-center">
            <span>Total items: {exceptionsResponse?.total ?? 0}</span>
            {/* Add actual pagination controls here that modify 'skip' in filters */}
          </div>
        </CardContent>
      </Card>

      {selectedExceptionUuidForDetail && (
        <ExceptionDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          exceptionUuid={selectedExceptionUuidForDetail}
          onUpdate={(uuid: string, data: DicomExceptionLogUpdate) => updateExceptionMutation.mutate({ uuid, data })} // MODIFIED: Add types
          isUpdating={updateExceptionMutation.isPending}
        />
      )}
  </div>
  );
}
export default ExceptionsPage;