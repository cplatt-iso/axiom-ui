// src/components/UserMenu.tsx
import React, { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon, Cog8ToothIcon, KeyIcon, ArrowLeftOnRectangleIcon } from '@heroicons/react/20/solid';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ');
}

const UserMenu: React.FC = () => {
    const { user, logout } = useAuth();

    if (!user) return null; // Don't render if not logged in

    return (
        <Menu as="div" className="relative ml-3">
            <div>
                <Menu.Button className="flex max-w-xs items-center rounded-full bg-gray-200 dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800">
                    <span className="sr-only">Open user menu</span>
                    {user.picture ? (
                         <img className="h-8 w-8 rounded-full" src={user.picture} alt="" />
                    ) : (
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-500 dark:bg-gray-600">
                            <span className="text-sm font-medium leading-none text-white">
                                {user.name ? user.name[0] : user.email ? user.email[0] : '?'}
                            </span>
                        </span>
                    )}
                </Menu.Button>
            </div>
            <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white dark:bg-gray-800 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                     <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                         <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.name || 'User'}</p>
                         <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                     </div>
                    <Menu.Item>
                        {({ active }) => (
                            <Link
                                to="/api-keys" // Link to API Keys page
                                className={classNames(active ? 'bg-gray-100 dark:bg-gray-700' : '', 'group flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200')}
                            >
                                 <KeyIcon className="mr-3 h-5 w-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-300" aria-hidden="true" />
                                API Keys
                            </Link>
                        )}
                    </Menu.Item>
                     <Menu.Item>
                        {({ active }) => (
                            <Link
                                to="/settings" // Example link
                                className={classNames(active ? 'bg-gray-100 dark:bg-gray-700' : '', 'group flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200')}
                            >
                                 <Cog8ToothIcon className="mr-3 h-5 w-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-300" aria-hidden="true" />
                                Settings
                            </Link>
                        )}
                    </Menu.Item>
                    <Menu.Item>
                        {({ active }) => (
                            <button
                                onClick={logout}
                                className={classNames(active ? 'bg-gray-100 dark:bg-gray-700' : '', 'group flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200')}
                            >
                                 <ArrowLeftOnRectangleIcon className="mr-3 h-5 w-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-300" aria-hidden="true" />
                                Sign out
                            </button>
                        )}
                    </Menu.Item>
                </Menu.Items>
            </Transition>
        </Menu>
    );
};

export default UserMenu;
