// src/pages/QuerySpanningLayout.tsx
import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
    Cog6ToothIcon, 
    ServerIcon, 
    ChartBarIcon,
    Square3Stack3DIcon 
} from '@heroicons/react/24/outline';

const QuerySpanningLayout: React.FC = () => {
    const location = useLocation();

    const navigation = [
        { 
            name: 'Configurations', 
            href: '/admin/query-spanning/configurations', 
            icon: Cog6ToothIcon,
            description: 'Manage spanner configurations and source mappings'
        },
        { 
            name: 'Services', 
            href: '/admin/query-spanning/services', 
            icon: ServerIcon,
            description: 'Monitor and control spanner services'
        },
        { 
            name: 'Analytics', 
            href: '/admin/query-spanning/analytics', 
            icon: ChartBarIcon,
            description: 'View performance metrics and system health'
        },
    ];

    const isActive = (href: string) => {
        return location.pathname.startsWith(href);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-5">
                <div className="flex items-center space-x-3">
                    <Square3Stack3DIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                    <div>
                        <h1 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
                            Query Spanning
                        </h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Enterprise DICOM query spanning system for multi-PACS environments
                        </p>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {navigation.map((tab) => {
                        const active = isActive(tab.href);
                        return (
                            <Link
                                key={tab.name}
                                to={tab.href}
                                className={`group inline-flex items-center border-b-2 py-4 px-1 text-sm font-medium ${
                                    active
                                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                                aria-current={active ? 'page' : undefined}
                            >
                                <tab.icon
                                    className={`-ml-0.5 mr-2 h-5 w-5 ${
                                        active 
                                            ? 'text-indigo-500 dark:text-indigo-400' 
                                            : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                                    }`}
                                    aria-hidden="true"
                                />
                                <span>{tab.name}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* Content Area */}
            <div className="flex-1">
                <Outlet />
            </div>
        </div>
    );
};

export default QuerySpanningLayout;
