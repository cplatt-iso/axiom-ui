// src/pages/ScrapersLayout.tsx
import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { cn } from "@/lib/utils";

// CORRECTED: Define the sub-navigation links for Scrapers
const scraperSubNavLinks = [
    { name: "DICOMweb", href: "/admin/routing-config/scrapers/dicomweb" },
    { name: "DIMSE Q/R", href: "/admin/routing-config/scrapers/dimse-qr" },
    // Add more scraper types here later (e.g., GCS)
];

const ScrapersLayout: React.FC = () => {
    const location = useLocation();

    return (
        <div className="space-y-4">
            {/* Sub-Navigation specific to Scrapers */}
            <nav className="flex space-x-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                {/* Map over the CORRECTED links */}
                {scraperSubNavLinks.map((link) => (
                    <Link
                        key={link.name}
                        to={link.href}
                        className={cn(
                            "px-3 py-1 rounded-md text-sm font-medium",
                            location.pathname.startsWith(link.href)
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
            <div className="mt-4">
                <Outlet />
            </div>
        </div>
    );
};

export default ScrapersLayout;
