// src/pages/CrosswalkLayout.tsx
import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { cn } from "@/lib/utils";

// Define the links for sub-navigation within this layout
const crosswalkSubNavLinks = [
    { name: "Data Sources", href: "/admin/routing-config/crosswalk/data-sources" },
    { name: "Mappings", href: "/admin/routing-config/crosswalk/mappings" },
    // Add more crosswalk sub-sections here if needed later
];

const CrosswalkLayout: React.FC = () => {
    const location = useLocation();

    return (
        <div className="space-y-4">
            {/* Persistent Sub-Navigation */}
            <nav className="flex space-x-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                {crosswalkSubNavLinks.map((link) => (
                    <Link
                        key={link.name}
                        to={link.href}
                        className={cn(
                            "px-3 py-1 rounded-md text-sm font-medium",
                            location.pathname.startsWith(link.href) // Use startsWith for nested routes
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                        )}
                        aria-current={location.pathname.startsWith(link.href) ? 'page' : undefined}
                    >
                        {link.name}
                    </Link>
                ))}
            </nav>

            {/* Child Route Content */}
            <div className="mt-4"> {/* Added margin top */}
                <Outlet />
            </div>
        </div>
    );
};

export default CrosswalkLayout;
