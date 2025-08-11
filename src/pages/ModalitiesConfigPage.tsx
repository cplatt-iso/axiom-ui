// src/pages/ModalitiesConfigPage.tsx
import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getModalities, getFacilities, deleteModality, type ModalityRead, type FacilityRead } from '@/services/api';
import ModalityTable from '@/components/ModalityTable';
import ModalityFormModal from '@/components/ModalityFormModal';

const ModalitiesConfigPage: React.FC = () => {
    const [modalities, setModalities] = useState<ModalityRead[]>([]);
    const [facilities, setFacilities] = useState<FacilityRead[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingModality, setEditingModality] = useState<ModalityRead | null>(null);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [modalitiesData, facilitiesData] = await Promise.all([
                getModalities(),
                getFacilities({ is_active: true })
            ]);
            setModalities(modalitiesData);
            setFacilities(facilitiesData);
        } catch (error) {
            console.error('Failed to fetch data:', error);
            toast.error('Failed to load data. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateModality = () => {
        setEditingModality(null);
        setIsModalOpen(true);
    };

    const handleEditModality = (modality: ModalityRead) => {
        setEditingModality(modality);
        setIsModalOpen(true);
    };

    const handleDeleteModality = async (modality: ModalityRead) => {
        if (!window.confirm(`Are you sure you want to delete modality "${modality.name}"?`)) {
            return;
        }

        try {
            await deleteModality(modality.id);
            setModalities(prev => prev.filter(m => m.id !== modality.id));
            toast.success('Modality deleted successfully.');
        } catch (error) {
            console.error('Failed to delete modality:', error);
            toast.error('Failed to delete modality. Please try again.');
        }
    };

    const handleModalSuccess = () => {
        setIsModalOpen(false);
        setEditingModality(null);
        fetchData();
    };

    const handleModalCancel = () => {
        setIsModalOpen(false);
        setEditingModality(null);
    };

    // Create a map of facilities for easier lookup
    const facilityMap = facilities.reduce((acc, facility) => {
        acc[facility.id] = facility;
        return acc;
    }, {} as Record<number, FacilityRead>);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Imaging Modalities
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Manage imaging modalities and their configuration for DICOM routing.
                    </p>
                </div>
                <Button onClick={handleCreateModality}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Modality
                </Button>
            </div>

            <ModalityTable
                modalities={modalities}
                facilityMap={facilityMap}
                isLoading={isLoading}
                onEdit={handleEditModality}
                onDelete={handleDeleteModality}
            />

            <ModalityFormModal
                isOpen={isModalOpen}
                modality={editingModality}
                facilities={facilities}
                onSuccess={handleModalSuccess}
                onCancel={handleModalCancel}
            />
        </div>
    );
};

export default ModalitiesConfigPage;
