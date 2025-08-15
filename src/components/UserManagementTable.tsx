// src/components/UserManagementTable.tsx
import { UserWithRoles } from '../services/api'; // Import types
import { formatDistanceToNow } from 'date-fns';
import { PencilSquareIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface UserManagementTableProps {
    users: UserWithRoles[];
    onEditRoles: (user: UserWithRoles) => void; // Callback to open modal
    onToggleActive: (user: UserWithRoles) => void; // Callback to toggle active status
}

const UserManagementTable: React.FC<UserManagementTableProps> = ({ users, onEditRoles, onToggleActive }) => {

    const formatOptionalDate = (dateString?: string): string => {
        // ... (same date formatting function as in ApiKeyList) ...
        if (!dateString) return 'N/A';
         try { return `${formatDistanceToNow(new Date(dateString))} ago`; } catch { return 'Invalid Date'; }
    };
    const formatTimestamp = (dateString: string): string => {
         try { return new Date(dateString).toLocaleString(); } catch { return 'Invalid Date'; }
    };


    if (users.length === 0) {
        return <p className="text-center text-gray-500 dark:text-gray-400 py-4">No users found.</p>;
    }

    return (
        <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 dark:ring-white dark:ring-opacity-10 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6">User</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Roles</th>
                         <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white hidden sm:table-cell">Created</th>
                         <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white hidden lg:table-cell">Google ID</th>
                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                            <span className="sr-only">Actions</span>
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                    {users.map((user) => (
                        <tr key={user.id}>
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                                 <div className="flex items-center">
                                     <div className="h-10 w-10 flex-shrink-0">
                                        {user.picture ? (
                                            <img className="h-10 w-10 rounded-full" src={user.picture} alt="" />
                                         ) : (
                                             <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-500 dark:bg-gray-600">
                                                 <span className="text-sm font-medium leading-none text-white">
                                                    {(user.full_name ? user.full_name[0] : user.email ? user.email[0] : '?').toUpperCase()}
                                                 </span>
                                             </span>
                                         )}
                                     </div>
                                    <div className="ml-4">
                                        <div className="font-medium text-gray-900 dark:text-white">{user.full_name || '(No Name)'}</div>
                                        <div className="text-gray-500 dark:text-gray-400">{user.email}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                                {user.is_active ? (
                                    <span title="Active" className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:text-green-200">
                                         <CheckCircleIcon className="h-4 w-4 mr-1" /> Active
                                    </span>
                                ) : (
                                     <span title="Inactive" className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:text-red-200">
                                         <XCircleIcon className="h-4 w-4 mr-1" /> Inactive
                                    </span>
                                )}
                                {user.is_superuser && (
                                     <span title="Superuser" className="ml-2 inline-flex items-center rounded-full bg-yellow-100 dark:bg-yellow-900 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:text-yellow-300">S</span>
                                )}
                            </td>
                             <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                                 <div className="flex flex-wrap gap-1">
                                      {user.roles.length > 0 ? user.roles.map(role => (
                                          <span key={role.id} className="inline-block whitespace-nowrap rounded bg-indigo-100 dark:bg-indigo-900 px-2 py-0.5 text-xs font-medium text-indigo-800 dark:text-indigo-200">
                                            {role.name}
                                          </span>
                                      )) : <span className="text-xs italic">No roles</span>}
                                 </div>
                             </td>
                             <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400 hidden sm:table-cell" title={formatTimestamp(user.created_at)}>
                                {formatOptionalDate(user.created_at)}
                            </td>
                             <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400 font-mono hidden lg:table-cell">
                                {user.google_id ? `${user.google_id.substring(0, 10)}...` : 'N/A'}
                             </td>
                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-2">
                                 {/* Toggle Active Button */}
                                 <button
                                    onClick={() => onToggleActive(user)}
                                    className={`p-1 rounded ${user.is_active ? 'text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300' : 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300'}`}
                                    title={user.is_active ? 'Deactivate User' : 'Activate User'}
                                >
                                    {user.is_active ? <XCircleIcon className="h-5 w-5"/> : <CheckCircleIcon className="h-5 w-5"/>}
                                    <span className="sr-only">{user.is_active ? 'Deactivate' : 'Activate'}</span>
                                </button>
                                {/* Edit Roles Button */}
                                <button
                                    onClick={() => onEditRoles(user)}
                                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 p-1 rounded"
                                    title="Edit Roles"
                                >
                                    <PencilSquareIcon className="h-5 w-5"/>
                                    <span className="sr-only">Edit Roles</span>
                                </button>
                                {/* Add Delete User button later if needed */}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default UserManagementTable;
