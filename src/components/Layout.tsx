// src/components/Layout.tsx
import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import UserMenu from './UserMenu';
import { Bars3Icon, XMarkIcon, Cog6ToothIcon, UsersIcon, CircleStackIcon, SquaresPlusIcon } from '@heroicons/react/24/outline';
import { Role } from '../schemas'; // Import the Role type if needed for casting

// Utility for conditional classes
function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

// Define navigation items with optional icons
interface NavItem {
    name: string;
    href: string;
    icon?: React.ForwardRefExoticComponent<React.PropsWithoutRef<React.SVGProps<SVGSVGElement>> & { title?: string, titleId?: string } & React.RefAttributes<SVGSVGElement>>;
}

const Layout: React.FC = () => {
    const { user } = useAuth(); // Only need user from context for the working isAdmin check
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();

    // --- Navigation Definitions ---
    const navigation: NavItem[] = [
        { name: 'Dashboard', href: '/', icon: SquaresPlusIcon },
        { name: 'Rulesets', href: '/rulesets', icon: CircleStackIcon },
    ];
    const adminNavigation: NavItem[] = [
         { name: 'User Management', href: '/admin/users', icon: UsersIcon },
         { name: 'Configuration', href: '/admin/config', icon: Cog6ToothIcon },
    ];
    // --- End Navigation Definitions ---

    // Determine if user is admin (Using the reverted logic that works with user.roles)
    const isAdmin = user?.roles?.some((role: Role | string) => { // Use Role type from schemas or string
        if (typeof role === 'string') {
            return role === 'Admin';
        } else if (typeof role === 'object' && role !== null && role.name) {
            // Assuming Role interface has a 'name' property based on schemas.ts
            return role.name === 'Admin';
        }
        return false;
    });

    // Corrected useEffect - Removed dependency on 'roles'
    useEffect(() => {
        console.log("Layout - User context:", user);
        // console.log("Layout - User roles:", user?.roles); // Optionally log user.roles here if needed
        console.log("Layout - isAdmin check result:", isAdmin);
    }, [user, isAdmin]); // Removed 'roles' from dependency array

    // Helper function to render navigation links
    const renderNavLink = (item: NavItem, isMobile: boolean) => {
        const current = item.href === '/' ? location.pathname === '/' : location.pathname.startsWith(item.href);
        return (
            <Link
                key={item.name}
                to={item.href}
                onClick={() => isMobile && setSidebarOpen(false)}
                className={classNames(
                    current ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-white',
                    'group flex items-center px-2 py-2 rounded-md',
                    isMobile ? 'text-base font-medium' : 'text-sm font-medium'
                )}
                aria-current={current ? 'page' : undefined}
            >
                {item.icon && (
                    <item.icon
                        className={classNames(
                            current ? 'text-gray-500 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-300',
                            'mr-3 flex-shrink-0 h-6 w-6'
                        )}
                        aria-hidden="true"
                    />
                )}
                {item.name}
            </Link>
        );
    };

    return (
        // Use flex layout for the main structure
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex">

             {/* --- Mobile Sidebar --- */}
             {sidebarOpen && (
                 <div className="fixed inset-0 z-40 flex md:hidden" role="dialog" aria-modal="true">
                     {/* Overlay */}
                     <div className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity duration-300 ease-linear" onClick={() => setSidebarOpen(false)}></div>
                     {/* Sidebar */}
                     <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white dark:bg-gray-800 pt-5 pb-4 transition-transform duration-300 ease-in-out transform">
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
                                 {navigation.map((item) => renderNavLink(item, true))}

                                 {/* Conditional Admin Section */}
                                 {isAdmin && (
                                     <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                                          <h3 className="px-2 mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider" id="admin-nav-headline-mobile">
                                             Admin
                                          </h3>
                                          <div className="space-y-1">
                                             {adminNavigation.map((item) => renderNavLink(item, true))}
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
                            {navigation.map((item) => renderNavLink(item, false))}

                            {/* Conditional Admin Section */}
                            {isAdmin && (
                                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                                    <h3 className="px-3 mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider" id="admin-nav-headline-desktop">
                                        Admin
                                    </h3>
                                    <div className="space-y-1">
                                        {adminNavigation.map((item) => renderNavLink(item, false))}
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
                        <div className="ml-4 flex items-center space-x-3 md:ml-6">
                            <ThemeToggle />
                            <UserMenu />
                        </div>
                    </div>
                </div>

                {/* Page Content */}
                <main className="flex-1">
                    <div className="py-6">
                        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
                            <Outlet key={location.pathname} />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
