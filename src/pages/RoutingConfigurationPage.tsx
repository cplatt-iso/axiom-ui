// src/pages/RoutingConfigurationPage.tsx // Renamed file
import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ConfigTab {
    value: string;
    label: string;
    path: string; // This path will now be relative to the parent layout
}

// --- UPDATED configTabs with new base path ---
const configTabs: ConfigTab[] = [
    { value: 'scrapers', label: 'Scrapers', path: '/admin/routing-config/scrapers' },
    { value: 'listeners', label: 'Listeners', path: '/admin/routing-config/listeners' },
    { value: 'schedules', label: 'Schedules', path: '/admin/routing-config/schedules' },
    { value: 'storage-backends', label: 'Storage Backends', path: '/admin/routing-config/storage-backends' },
    { value: 'crosswalk', label: 'Crosswalk', path: '/admin/routing-config/crosswalk' },
];
// --- END UPDATED ---

// --- UPDATED Component Name ---
const RoutingConfigurationPage: React.FC = () => {
// --- END UPDATED ---
    const location = useLocation();
    const navigate = useNavigate();

    // Logic to find active tab remains the same, but uses updated paths
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
                 {/* --- UPDATED Title/Description --- */}
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Routing Configuration</h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Manage inputs (scrapers, listeners), outputs (storage, crosswalk), and timing (schedules) for processing DICOM data.
                </p>
                {/* --- END UPDATED --- */}
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5 gap-2">
                    {configTabs.map((tab) => (
                        <TabsTrigger key={tab.value} value={tab.value} className="w-full">
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            <div className="mt-6">
                <Outlet />
            </div>
        </div>
    );
};

// --- UPDATED Export Name ---
export default RoutingConfigurationPage;
// --- END UPDATED ---
