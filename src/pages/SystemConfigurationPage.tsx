// src/pages/SystemConfigurationPage.tsx
import React from 'react';
import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WrenchScrewdriverIcon } from '@heroicons/react/24/outline'; // Use correct icon if needed elsewhere

interface SystemConfigTab {
    value: string;
    label: string;
    path: string; // Relative path within system-config
}

const systemConfigTabs: SystemConfigTab[] = [
    { value: 'info', label: 'Information', path: 'info' },
    { value: 'processing', label: 'Processing', path: 'processing' },
    { value: 'limits', label: 'Limits', path: 'limits' },
    { value: 'services', label: 'Services', path: 'services' },
    { value: 'admin-actions', label: 'Admin Actions', path: 'admin-actions' },
];

const SystemConfigurationPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Determine active tab based on the *relative* path segment
    const activeTabValue = location.pathname.split('/admin/system-config/')[1]?.split('/')[0]
                       || systemConfigTabs[0].value; // Default to first tab

    const handleTabChange = (value: string) => {
        const selectedTab = systemConfigTabs.find(tab => tab.value === value);
        if (selectedTab) {
            // Navigate to the full path
            navigate(`/admin/system-config/${selectedTab.path}`);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">System Configuration</h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    View and manage global system settings and parameters.
                </p>
            </div>

            <Tabs value={activeTabValue} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {systemConfigTabs.map((tab) => (
                        <TabsTrigger key={tab.value} value={tab.value} className="w-full">
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            <div className="mt-6">
                {/* Render the content for the selected tab */}
                <Outlet />
            </div>
        </div>
    );
};

export default SystemConfigurationPage;
