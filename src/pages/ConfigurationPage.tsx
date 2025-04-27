// src/pages/ConfigurationPage.tsx
import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ConfigTab {
    value: string;
    label: string;
    path: string;
}

// --- UPDATED configTabs ---
const configTabs: ConfigTab[] = [
    { value: 'scrapers', label: 'Scrapers', path: '/admin/config/scrapers' },
    { value: 'listeners', label: 'Listeners', path: '/admin/config/listeners' },
    { value: 'schedules', label: 'Schedules', path: '/admin/config/schedules' }, // Added Schedules
    { value: 'storage-backends', label: 'Storage Backends', path: '/admin/config/storage-backends' },
    { value: 'crosswalk', label: 'Crosswalk', path: '/admin/config/crosswalk' },
];
// --- END UPDATED ---

const ConfigurationPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Default to first tab if no match (remains the same)
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
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Configuration</h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Manage system configuration settings for inputs, outputs, rules and crosswalks.
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                 {/* --- UPDATED Grid Columns --- */}
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5 gap-2">
                {/* --- END UPDATED --- */}
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

export default ConfigurationPage;
