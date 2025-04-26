// src/pages/CrosswalkMappingsPage.tsx
import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PlusCircle, Map } from 'lucide-react'; // Use Map icon
import { CrosswalkMapRead } from '@/schemas'; // Import schema type
import { getCrosswalkMaps } from '@/services/api'; // Import API function
import CrosswalkMappingTable from '@/components/CrosswalkMappingTable'; // Import the table component (we created this)
import CrosswalkMappingFormModal from '@/components/CrosswalkMappingFormModal'; // Import the modal component (we created this)
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Import Alert
import { AlertCircle } from 'lucide-react'; // Import icon for Alert

const CrosswalkMappingsPage: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMap, setEditingMap] = useState<CrosswalkMapRead | null>(null);

    // Fetch all mappings initially - might add filtering later if needed
    const { data: mappings, isLoading, error } = useQuery<CrosswalkMapRead[], Error>({
        queryKey: ['crosswalkMaps'], // Query key for fetching all maps
        queryFn: () => getCrosswalkMaps(undefined, 0, 500), // Fetch all mappings
    });

    const handleAdd = () => {
        setEditingMap(null);
        setIsModalOpen(true);
    };

    // Edit handler passed to the table
    const handleEdit = useCallback((map: CrosswalkMapRead) => {
        setEditingMap(map);
        setIsModalOpen(true);
    }, []); // Empty dependency array - function is stable

    // Close handler passed to the modal
    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        setEditingMap(null); // Clear editing state
    }, []); // Empty dependency array

    // Success handler (currently just closes modal, refetch done by mutation)
    const handleSuccess = useCallback(() => {
        closeModal();
    }, [closeModal]);

    // Render Logic
    const renderContent = () => {
        if (isLoading) {
            return <p className="text-center text-gray-500 dark:text-gray-400 py-10">Loading Mappings...</p>;
        }
        if (error) {
            return (
                <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                        Failed to load mappings: {error.message}
                    </AlertDescription>
                </Alert>
            );
        }
        if (!mappings || mappings.length === 0) {
             return (
                 <div className="text-center py-10 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                     <Map className="mx-auto h-12 w-12 text-gray-400" />
                     <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No Crosswalk Mappings Found</h3>
                     <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Define how data sources should map to DICOM tags.</p>
                     <div className="mt-6">
                         <Button size="sm" onClick={handleAdd}>
                             <PlusCircle className="mr-2 h-4 w-4" /> Add Mapping
                         </Button>
                     </div>
                 </div>
             );
        }
        // Pass stable handleEdit callback
        return <CrosswalkMappingTable mappings={mappings} onEdit={handleEdit} />;
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Manage Crosswalk Mappings</h2>
                 {/* Show Add button only if not loading and no error and potentially if data exists */}
                 {!isLoading && !error && mappings && mappings.length > 0 && (
                     <Button size="sm" onClick={handleAdd}>
                         <PlusCircle className="mr-2 h-4 w-4" /> Add Mapping
                     </Button>
                 )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
                Define how data fetched from external sources should be used to modify DICOM tags based on matching criteria. Mappings are linked to Data Sources and used within Rule modifications.
            </p>

            {renderContent()}

            {/* Ensure modal is rendered and receives stable callbacks */}
            <CrosswalkMappingFormModal
                isOpen={isModalOpen}
                onClose={closeModal}
                existingMap={editingMap}
                // onSuccess={handleSuccess} // onSuccess is handled internally by mutation now
            />
        </div>
    );
};

export default CrosswalkMappingsPage;
