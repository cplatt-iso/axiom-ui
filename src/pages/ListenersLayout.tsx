// src/pages/ListenersLayout.tsx
import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { cn } from "@/lib/utils";

const listenerSubNavLinks = [
    { name: "DIMSE Listeners", href: "/admin/routing-config/listeners/dimse" },
    { name: "STOW-RS Endpoint", href: "/admin/routing-config/listeners/stow-rs" },
    { name: "JSON API Endpoint", href: "/admin/routing-config/listeners/json-api" },
];

const ListenersLayout: React.FC = () => {
    const location = useLocation();

    return (
        <div className="space-y-4">
            <nav className="flex flex-wrap space-x-4 border-b border-gray-200 dark:border-gray-700 pb-2"> {/* Added flex-wrap */}
                {listenerSubNavLinks.map((link) => (
                    <Link
                        key={link.name}
                        to={link.href}
                        className={cn(
                            "px-3 py-1 rounded-md text-sm font-medium whitespace-nowrap mb-1", // Added whitespace-nowrap and mb-1 for wrapping
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

            <div className="mt-4">
                <Outlet />
            </div>
        </div>
    );
};

export default ListenersLayout;
