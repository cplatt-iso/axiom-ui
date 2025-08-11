// src/pages/FacilityModalityConfigPage.tsx
import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ConfigTab {
    value: string;
    label: string;
    path: string;
}

const configTabs: ConfigTab[] = [
    { value: 'facilities', label: 'Facilities', path: '/admin/facility-modality-config/facilities' },
    { value: 'modalities', label: 'Modalities', path: '/admin/facility-modality-config/modalities' },
];

const FacilityModalityConfigPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Logic to find active tab
    const activeTab = configTabs.find(tab => location.pathname.startsWith(tab.path))?.value
                      || configTabs[0].value;

    const handleTabChange = (value: string) => {
        const selectedTab = configTabs.find(tab => tab.value === value);
        if (selectedTab) {
            navigate(selectedTab.path);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Facility & Modality Configuration</h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Manage healthcare facilities and their associated imaging modalities for DICOM routing and processing.
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    {configTabs.map((tab) => (
                        <TabsTrigger key={tab.value} value={tab.value}>
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            {/* Render nested routes */}
            <Outlet />
        </div>
    );
};

export default FacilityModalityConfigPage;
