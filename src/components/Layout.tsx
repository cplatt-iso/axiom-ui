// src/components/Layout.tsx
import React, { useEffect, Fragment, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom'; // Import useLocation
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import UserMenu from './UserMenu';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

// Utility for conditional classes
function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

const Layout: React.FC = () => {
    const { user } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation(); // Get current location

    useEffect(() => {
        console.log("Layout - User context:", user);
    }, [user]);

    // Standard navigation items
    const navigation = [
        { name: 'Dashboard', href: '/' },
        { name: 'Rulesets', href: '/rulesets' },
    ];
    // Admin-specific navigation items
    const adminNavigation = [
         { name: 'User Management', href: '/admin/users' },
         // Add more admin links here (e.g., System Settings, Audit Logs)
    ];

    // Determine if user is admin
    const isAdmin = user?.roles?.some(role => role === 'Admin');
    useEffect(() => {
        console.log("Layout - isAdmin check result:", isAdmin);
    }, [isAdmin]); // Log when isAdmin changes

    return (
        // Use flex layout for the main structure
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex">

             {/* --- Mobile Sidebar --- */}
             {/* (Using simple conditional rendering for brevity, add transitions back if needed) */}
             {sidebarOpen && (
                 <div className="fixed inset-0 z-40 flex md:hidden" role="dialog" aria-modal="true">
                     {/* Overlay */}
                     <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>
                     {/* Sidebar */}
                     <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white dark:bg-gray-800 pt-5 pb-4">
                         {/* Close Button */}
                         <div className="absolute top-0 right-0 -mr-12 pt-2">
                             <button type="button" className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white" onClick={() => setSidebarOpen(false)}>
                                 <span className="sr-only">Close sidebar</span>
                                 <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                             </button>
                         </div>
                         {/* Branding */}
                         <div className="flex flex-shrink-0 items-center px-4">
                             <img className="h-8 w-auto" src="/vite.svg" alt="Axiom Flow" />
                             <span className="ml-3 text-xl font-semibold text-gray-900 dark:text-white">Axiom Flow</span>
                         </div>
                         {/* Navigation */}
                         <div className="mt-5 h-0 flex-1 overflow-y-auto">
                             <nav className="space-y-1 px-2">
                                 {/* Standard Links */}
                                 {navigation.map((item) => {
                                     const current = location.pathname === item.href;
                                     return (
                                         <Link
                                             key={item.name}
                                             to={item.href}
                                             onClick={() => setSidebarOpen(false)} // Close on click
                                             className={classNames(
                                                 current ? 'bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white',
                                                 'group flex items-center px-2 py-2 text-base font-medium rounded-md' // Use text-base for mobile
                                             )}
                                             aria-current={current ? 'page' : undefined}
                                         >
                                             {item.name}
                                         </Link>
                                     );
                                 })}

                                 {/* Conditional Admin Section */}
                                 {isAdmin && (
                                     <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700"> {/* Added border */}
                                          <h3 className="px-2 mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider" id="admin-nav-headline-mobile">
                                             Admin
                                          </h3>
                                          <div className="space-y-1">
                                             {adminNavigation.map((item) => {
                                                 const current = location.pathname === item.href;
                                                 return (
                                                     <Link
                                                         key={item.name}
                                                         to={item.href}
                                                         onClick={() => setSidebarOpen(false)} // Close on click
                                                         className={classNames(
                                                             current ? 'bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white',
                                                             'group flex items-center px-2 py-2 text-base font-medium rounded-md'
                                                         )}
                                                         aria-current={current ? 'page' : undefined}
                                                     >
                                                         {item.name}
                                                     </Link>
                                                 );
                                             })}
                                         </div>
                                     </div>
                                 )}
                             </nav>
                         </div>
                     </div>
                     <div className="w-14 flex-shrink-0" aria-hidden="true"></div> {/* Dummy element */}
                 </div>
             )}

            {/* --- Desktop Sidebar (Fixed) --- */}
            <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
                <div className="flex flex-grow flex-col overflow-y-auto border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 pt-5">
                    {/* Branding */}
                    <div className="flex flex-shrink-0 items-center px-4">
                        <img className="h-8 w-auto" src="/vite.svg" alt="Axiom Flow" />
                        <span className="ml-3 text-xl font-semibold text-gray-900 dark:text-white">Axiom Flow</span>
                    </div>
                    {/* Navigation */}
                    <div className="mt-5 flex flex-grow flex-col">
                        <nav className="flex-1 space-y-1 px-2 pb-4">
                            {/* Standard Links */}
                            {navigation.map((item) => {
                                const current = location.pathname === item.href;
                                return (
                                    <Link
                                        key={item.name}
                                        to={item.href}
                                        className={classNames(
                                            current ? 'bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white',
                                            'group flex items-center px-2 py-2 text-sm font-medium rounded-md' // Use text-sm for desktop
                                        )}
                                        aria-current={current ? 'page' : undefined}
                                    >
                                        {item.name}
                                    </Link>
                                );
                             })}

                            {/* Conditional Admin Section */}
                            {isAdmin && (
                                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700"> {/* Added border and spacing */}
                                    <h3 className="px-3 mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider" id="admin-nav-headline-desktop">
                                        Admin
                                    </h3>
                                    <div className="space-y-1">
                                        {adminNavigation.map((item) => {
                                            const current = location.pathname === item.href;
                                            return (
                                                <Link
                                                    key={item.name}
                                                    to={item.href}
                                                    className={classNames(
                                                        current ? 'bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white',
                                                        'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
                                                    )}
                                                    aria-current={current ? 'page' : undefined}
                                                >
                                                    {item.name}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </nav>
                    </div>
                </div>
            </div>

            {/* --- Main Content Area --- */}
            <div className="flex flex-1 flex-col md:pl-64">
                {/* Header */}
                <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 bg-white dark:bg-gray-800 shadow dark:shadow-slate-700">
                    {/* Mobile Sidebar Toggle */}
                    <button type="button" className="border-r border-gray-200 dark:border-gray-700 px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 md:hidden" onClick={() => setSidebarOpen(true)} >
                        <span className="sr-only">Open sidebar</span>
                        <Bars3Icon className="h-6 w-6" aria-hidden="true" />
                    </button>
                    {/* Header Content */}
                    <div className="flex flex-1 justify-between px-4">
                        <div className="flex flex-1"> {/* Spacer */} </div>
                        <div className="ml-4 flex items-center space-x-3 md:ml-6"> {/* Keep space-x for right items */}
                            <ThemeToggle />
                            <UserMenu />
                        </div>
                    </div>
                </div>

                {/* Page Content */}
                <main className="flex-1">
                    <div className="py-6">
                        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
                            <Outlet /> {/* Renders the active page */}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
