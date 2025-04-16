// src/components/Layout.tsx
import React, { Fragment, useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle'; // Assuming still in components
import UserMenu from './UserMenu'; // We will create this next
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'; // Example icons

const Layout: React.FC = () => {
    const { user } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Define navigation items based on user roles later
    const navigation = [
        { name: 'Dashboard', href: '/', current: true }, // Example
        { name: 'Rulesets', href: '/rulesets', current: false }, // Example
        // Add more links here
    ];
    const adminNavigation = [
         { name: 'User Management', href: '/admin/users', current: false },
    ];

    // Determine if user is admin (simple check for now)
    const isAdmin = user?.roles?.includes('Admin');

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            {/* --- Mobile Sidebar --- */}
            {/* Add transitionable sidebar using Headless UI Dialog later if needed */}
             {sidebarOpen && (
                 <div className="fixed inset-0 z-40 flex md:hidden">
                     {/* Overlay */}
                     <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>
                      {/* Sidebar Content */}
                     <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white dark:bg-gray-800 pt-5 pb-4">
                        <div className="absolute top-0 right-0 -mr-12 pt-2">
                             <button
                                 type="button"
                                 className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                                 onClick={() => setSidebarOpen(false)}
                             >
                                 <span className="sr-only">Close sidebar</span>
                                 <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                             </button>
                        </div>
                        {/* Sidebar Branding */}
                         <div className="flex flex-shrink-0 items-center px-4">
                             <img className="h-8 w-auto" src="/vite.svg" alt="Axiom Flow" /> {/* Replace with your logo */}
                             <span className="ml-3 text-xl font-semibold text-gray-900 dark:text-white">Axiom Flow</span>
                         </div>
                         {/* Navigation */}
                        <div className="mt-5 h-0 flex-1 overflow-y-auto">
                             <nav className="space-y-1 px-2">
                                 {navigation.map((item) => (
                                     <Link key={item.name} to={item.href} className="text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white group flex items-center px-2 py-2 text-base font-medium rounded-md">
                                         {item.name}
                                     </Link>
                                 ))}
                                  {isAdmin && (
                                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                          <h3 className="px-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider">Admin</h3>
                                           {adminNavigation.map((item) => (
                                               <Link key={item.name} to={item.href} className="text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white group flex items-center px-2 py-2 text-base font-medium rounded-md">
                                                  {item.name}
                                               </Link>
                                           ))}
                                      </div>
                                  )}
                             </nav>
                        </div>
                     </div>
                     <div className="w-14 flex-shrink-0" aria-hidden="true"></div>
                 </div>
             )}


            {/* --- Desktop Sidebar --- */}
            <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
                <div className="flex flex-grow flex-col overflow-y-auto border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 pt-5">
                     {/* Sidebar Branding */}
                     <div className="flex flex-shrink-0 items-center px-4">
                         <img className="h-8 w-auto" src="/vite.svg" alt="Axiom Flow" /> {/* Replace with your logo */}
                         <span className="ml-3 text-xl font-semibold text-gray-900 dark:text-white">Axiom Flow</span>
                     </div>
                     {/* Navigation */}
                    <div className="mt-5 flex flex-grow flex-col">
                        <nav className="flex-1 space-y-1 px-2 pb-4">
                            {navigation.map((item) => (
                                 <Link key={item.name} to={item.href} className="text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                                     {item.name}
                                 </Link>
                            ))}
                             {isAdmin && (
                                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                      <h3 className="px-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider">Admin</h3>
                                       {adminNavigation.map((item) => (
                                           <Link key={item.name} to={item.href} className="text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                                              {item.name}
                                           </Link>
                                       ))}
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
                    <button
                        type="button"
                        className="border-r border-gray-200 dark:border-gray-700 px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 md:hidden"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <span className="sr-only">Open sidebar</span>
                        <Bars3Icon className="h-6 w-6" aria-hidden="true" />
                    </button>
                    {/* Header Content */}
                    <div className="flex flex-1 justify-between px-4">
                        <div className="flex flex-1">
                            {/* Maybe Search Bar Later */}
                        </div>
                        <div className="ml-4 flex items-center">
	                     <ThemeToggle /> {/* Keep theme toggle accessible */}
                             <UserMenu /> {/* User profile dropdown */}
                        </div>
                    </div>
                </div>

                {/* Page Content */}
                <main className="flex-1">
                    <div className="py-6">
                        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
                            {/* Router Outlet - Renders the matched page component */}
                            <Outlet />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
