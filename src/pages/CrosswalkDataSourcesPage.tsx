// src/pages/CrosswalkDataSourcesPage.tsx
import React, { useState, useCallback } from 'react'; // Added useCallback
import { useQuery } from '@tanstack/react-query';
import { PlusCircle, Database } from 'lucide-react';
import { CrosswalkDataSourceRead } from '@/schemas';
import { getCrosswalkDataSources } from '@/services/api';
import CrosswalkDataSourceTable from '@/components/CrosswalkDataSourceTable'; // Import the table
import CrosswalkDataSourceFormModal from '@/components/CrosswalkDataSourceFormModal'; // Import the modal
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Import Alert
import { AlertCircle } from 'lucide-react'; // Import icon for Alert

// --- REMOVED Sub Navigation Component and its imports ---

const CrosswalkDataSourcesPage: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSource, setEditingSource] = useState<CrosswalkDataSourceRead | null>(null);

    const { data: dataSources, isLoading, error } = useQuery<CrosswalkDataSourceRead[], Error>({
        queryKey: ['crosswalkDataSources'],
        queryFn: () => getCrosswalkDataSources(0, 500),
    });

    // Use useCallback for stable function reference if passed down, good practice
    const handleAdd = useCallback(() => {
        setEditingSource(null);
        setIsModalOpen(true);
    }, []); // No dependencies, function is stable

    const handleEdit = useCallback((source: CrosswalkDataSourceRead) => {
        setEditingSource(source);
        setIsModalOpen(true);
    }, []); // No dependencies, function is stable

    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        setEditingSource(null);
    }, []); // No dependencies, function is stable

    const renderContent = () => {
        if (isLoading) {
            return <p className="text-center text-gray-500 dark:text-gray-400 py-10">Loading Data Sources...</p>;
        }
        if (error) {
            return (
                <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                        Failed to load Data Sources: {error.message}
                    </AlertDescription>
                </Alert>
             );
        }
        if (!dataSources || dataSources.length === 0) {
             return (
                 <div className="text-center py-10 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                     <Database className="mx-auto h-12 w-12 text-gray-400" />
                     <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No Data Sources Found</h3>
                     <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by adding a database connection.</p>
                     <div className="mt-6">
                         <Button size="sm" onClick={handleAdd}>
                             <PlusCircle className="mr-2 h-4 w-4" /> Add Data Source
                         </Button>
                     </div>
                 </div>
             );
        }
        // Pass stable handleEdit callback
        return <CrosswalkDataSourceTable dataSources={dataSources} onEdit={handleEdit} />;
    };

    return (
        <div className="space-y-4">
            {/* --- REMOVED Sub Navigation Usage --- */}

            <div className="flex justify-between items-center">
                {/* Title remains */}
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Manage Crosswalk Data Sources</h2>
                 {/* Show Add button only if not loading/error and data might exist */}
                 {!isLoading && !error && dataSources && dataSources.length > 0 && (
                     <Button size="sm" onClick={handleAdd}>
                         <PlusCircle className="mr-2 h-4 w-4" /> Add Data Source
                     </Button>
                 )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
                Configure connections to external databases used for crosswalking DICOM tags. Data is periodically synced to an internal cache.
            </p>

            {renderContent()}

            <CrosswalkDataSourceFormModal
                isOpen={isModalOpen}
                onClose={closeModal}
                dataSource={editingSource}
            />
        </div>
    );
};

export default CrosswalkDataSourcesPage;
