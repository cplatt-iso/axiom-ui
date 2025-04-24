// src/pages/ConfigurationPage.tsx
import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Define the structure for configuration tabs
interface ConfigTab {
    value: string; // Corresponds to the last part of the URL path
    label: string; // Display text for the tab
    path: string;  // Full path for navigation
}

// --- UPDATED TABS LIST ---
const configTabs: ConfigTab[] = [
    { value: 'dicomweb-sources', label: 'DICOMweb Sources', path: '/admin/config/dicomweb-sources' },
    { value: 'dimse-listeners', label: 'DIMSE Listeners', path: '/admin/config/dimse-listeners' }, // <-- ADDED
    // Add future configuration sections here
    // { value: 'storage-backends', label: 'Storage Backends', path: '/admin/config/storage-backends' },
    // { value: 'general', label: 'General Settings', path: '/admin/config/general' },
];
// --- END UPDATED TABS LIST ---

const ConfigurationPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Determine the active tab based on the current URL path
    const activeTab = configTabs.find(tab => location.pathname.startsWith(tab.path))?.value
                      || configTabs[0].value; // Default to the first tab if no match

    const handleTabChange = (value: string) => {
        const selectedTab = configTabs.find(tab => tab.value === value);
        if (selectedTab) {
            navigate(selectedTab.path);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Configuration</h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Manage system configuration settings for inputs, outputs, and behaviour.
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                 {/* --- Adjusted grid columns for potential future tabs --- */}
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2"> {/* Changed default to 2 cols */}
                    {configTabs.map((tab) => (
                        <TabsTrigger key={tab.value} value={tab.value} className="w-full">
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            {/* Render the nested route component */}
            <div className="mt-6">
                <Outlet />
            </div>
        </div>
    );
};

export default ConfigurationPage;
