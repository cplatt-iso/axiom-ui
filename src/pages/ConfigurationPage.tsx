// src/pages/ConfigurationPage.tsx
import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ConfigTab {
    value: string;
    label: string;
    path: string;
}

const configTabs: ConfigTab[] = [
    { value: 'scrapers', label: 'Scrapers', path: '/admin/config/scrapers' },
    { value: 'listeners', label: 'Listeners', path: '/admin/config/listeners' },
    { value: 'storage-backends', label: 'Storage Backends', path: '/admin/config/storage-backends' },
    { value: 'crosswalk', label: 'Crosswalk', path: '/admin/config/crosswalk' },
];

const ConfigurationPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

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
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-2"> {/* Updated grid columns */}
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
