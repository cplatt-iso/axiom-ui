// src/pages/FacilitiesConfigPage.tsx
import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getFacilities, deleteFacility, type FacilityRead } from '@/services/api';
import FacilityTable from '@/components/FacilityTable';
import FacilityFormModal from '@/components/FacilityFormModal';

const FacilitiesConfigPage: React.FC = () => {
    const [facilities, setFacilities] = useState<FacilityRead[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFacility, setEditingFacility] = useState<FacilityRead | null>(null);

    const fetchFacilities = async () => {
        try {
            setIsLoading(true);
            const data = await getFacilities();
            setFacilities(data);
        } catch (error) {
            console.error('Failed to fetch facilities:', error);
            toast.error('Failed to load facilities. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchFacilities();
    }, []);

    const handleCreateFacility = () => {
        setEditingFacility(null);
        setIsModalOpen(true);
    };

    const handleEditFacility = (facility: FacilityRead) => {
        setEditingFacility(facility);
        setIsModalOpen(true);
    };

    const handleDeleteFacility = async (facility: FacilityRead) => {
        if (!window.confirm(`Are you sure you want to delete facility "${facility.name}"?`)) {
            return;
        }

        try {
            await deleteFacility(facility.id);
            setFacilities(prev => prev.filter(f => f.id !== facility.id));
            toast.success('Facility deleted successfully.');
        } catch (error) {
            console.error('Failed to delete facility:', error);
            toast.error('Failed to delete facility. Please try again.');
        }
    };

    const handleModalSuccess = () => {
        setIsModalOpen(false);
        setEditingFacility(null);
        fetchFacilities();
    };

    const handleModalCancel = () => {
        setIsModalOpen(false);
        setEditingFacility(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Healthcare Facilities
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Manage healthcare facilities and their information.
                    </p>
                </div>
                <Button onClick={handleCreateFacility}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Facility
                </Button>
            </div>

            <FacilityTable
                facilities={facilities}
                isLoading={isLoading}
                onEdit={handleEditFacility}
                onDelete={handleDeleteFacility}
            />

            <FacilityFormModal
                isOpen={isModalOpen}
                facility={editingFacility}
                onSuccess={handleModalSuccess}
                onCancel={handleModalCancel}
            />
        </div>
    );
};

export default FacilitiesConfigPage;
