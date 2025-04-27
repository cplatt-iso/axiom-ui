// src/pages/SchedulesConfigPage.tsx
import React, { useState, useCallback } from 'react'; // Added useState, useCallback
import { useQuery } from '@tanstack/react-query'; // Import useQuery
import { PlusCircle, CalendarClock } from 'lucide-react'; // Use CalendarClock icon
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';

import { ScheduleRead } from '@/schemas'; // Import ScheduleRead type
import { getSchedules } from '@/services/api'; // Import API function

import SchedulesTable from '@/components/SchedulesTable'; // Import the table component
import ScheduleFormModal from '@/components/ScheduleFormModal'; // Import the modal component

const SchedulesConfigPage: React.FC = () => {
    // --- State for Modal and Editing ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<ScheduleRead | null>(null);
    // --- End State ---

    // --- Data Fetching ---
    const { data: schedules, isLoading, error, refetch } = useQuery<ScheduleRead[], Error>({
        queryKey: ['schedules'], // Query key for fetching schedules
        queryFn: () => getSchedules(0, 500), // Fetch schedules
        // Optional: Add staleTime, gcTime etc. if desired
    });
    // --- End Data Fetching ---

    // --- Handlers ---
    const handleAdd = useCallback(() => {
        setEditingSchedule(null);
        setIsModalOpen(true);
    }, []); // Stable callback

    const handleEdit = useCallback((schedule: ScheduleRead) => {
        setEditingSchedule(schedule);
        setIsModalOpen(true);
    }, []); // Stable callback

    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        setEditingSchedule(null); // Clear editing state
    }, []); // Stable callback

    // Success handler for modal (refetch handled by mutations inside modal now)
    const handleSuccess = useCallback(() => {
        // Refetch is handled by query invalidation within the modal's mutation callbacks
        // refetch(); // Optionally force refetch here if needed, but invalidation is better
        closeModal();
    }, [closeModal]); // Depends only on stable closeModal
    // --- End Handlers ---

    // --- Render Logic ---
    const renderContent = () => {
        if (isLoading) {
            return <p className="text-center text-gray-500 dark:text-gray-400 py-10">Loading Schedules...</p>;
        }
        if (error) {
            return (
                <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error Loading Schedules</AlertTitle>
                    <AlertDescription>
                        Failed to load schedules: {error.message}
                        <Button variant="secondary" size="sm" onClick={() => refetch()} className="ml-4">Retry</Button>
                    </AlertDescription>
                </Alert>
             );
        }
        if (!schedules || schedules.length === 0) {
             return (
                 <div className="text-center py-10 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                     <CalendarClock className="mx-auto h-12 w-12 text-gray-400" />
                     <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No Schedules Found</h3>
                     <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by creating a reusable schedule.</p>
                     <div className="mt-6">
                         <Button size="sm" onClick={handleAdd}>
                             <PlusCircle className="mr-2 h-4 w-4" /> Add Schedule
                         </Button>
                     </div>
                 </div>
             );
        }
        // Pass schedules and stable handleEdit callback to the table
        return <SchedulesTable schedules={schedules} onEdit={handleEdit} />;
    };
    // --- End Render Logic ---

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Manage Schedules</h2>
                 {/* Show Add button only if not loading/error and data might exist */}
                 {!isLoading && !error && schedules && schedules.length > 0 && (
                     <Button size="sm" onClick={handleAdd}>
                         <PlusCircle className="mr-2 h-4 w-4" /> Add Schedule
                     </Button>
                 )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
                Define reusable time-based schedules that control when specific rules are active. Rules without a schedule are always active (if enabled).
            </p>

            {renderContent()}

            {/* --- Render Modal --- */}
            <ScheduleFormModal
                isOpen={isModalOpen}
                onClose={closeModal}
                onSuccess={handleSuccess} // Use the updated success handler
                existingSchedule={editingSchedule} // Pass the schedule being edited
            />
            {/* --- End Render Modal --- */}
        </div>
    );
};

export default SchedulesConfigPage;
