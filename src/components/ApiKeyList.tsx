// src/components/ApiKeyList.tsx
import React from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';
import { apiClient, ApiKey } from '../services/api'; // Import types
import { formatDistanceToNow } from 'date-fns'; // For relative time

// Define types locally if not exported from api.ts
// interface ApiKey { id: number; name: string; prefix: string; is_active: boolean; created_at: string; updated_at: string; last_used_at?: string; user_id: number;}

interface ApiKeyListProps {
    keys: ApiKey[];
    onDeleteSuccess: (keyId: number) => void;
}

const ApiKeyList: React.FC<ApiKeyListProps> = ({ keys, onDeleteSuccess }) => {

    const handleDelete = async (keyId: number, keyName: string) => {
        // Simple confirmation for now
        if (window.confirm(`Are you sure you want to delete the key "${keyName}"? This action cannot be undone.`)) {
            try {
                await apiClient(`/apikeys/${keyId}`, { method: 'DELETE' });
                onDeleteSuccess(keyId);
                // Optionally add a success toast notification here
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : "An unknown error occurred";
                alert(`Failed to delete key: ${message}`); // Simple alert for now
            }
        }
    };

    const formatOptionalDate = (dateString?: string): string => {
        if (!dateString) return 'Never';
        try {
            return `${formatDistanceToNow(new Date(dateString))} ago`;
        } catch {
            return 'Invalid Date';
        }
    };

     const formatTimestamp = (dateString: string): string => {
        try {
            return new Date(dateString).toLocaleString();
        } catch {
            return 'Invalid Date';
        }
    };

    if (keys.length === 0) {
        return <p className="text-gray-500 dark:text-gray-400">You haven't created any API keys yet.</p>;
    }

    return (
        <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 dark:ring-white dark:ring-opacity-10 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6">Name</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Prefix</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Created</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Last Used</th>
                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                            <span className="sr-only">Actions</span>
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                    {keys.map((key) => (
                        <tr key={key.id}>
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6">{key.name}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400 font-mono">{key.prefix}...</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                                {key.is_active ? (
                                    <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:text-green-200">Active</span>
                                ) : (
                                     <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:text-red-200">Inactive</span>
                                )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400" title={formatTimestamp(key.created_at)}>
                                {formatOptionalDate(key.created_at)}
                            </td>
                             <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400" title={typeof key.last_used_at === 'string' ? formatTimestamp(key.last_used_at) : 'Never'}>
                                {formatOptionalDate(key.last_used_at ?? undefined)}
                            </td>
                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                <button
                                     onClick={() => handleDelete(key.id, key.name)}
                                     className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                                     aria-label={`Delete key ${key.name}`}
                                >
                                    <TrashIcon className="h-5 w-5" />
                                </button>
                                {/* Add Edit button later if needed */}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ApiKeyList;
