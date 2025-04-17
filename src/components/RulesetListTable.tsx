// src/components/RulesetListTable.tsx
import React from 'react';
import { Ruleset, deleteRuleset, updateRuleset } from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import { EyeIcon, TrashIcon, PlayIcon, PauseIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

interface RulesetListTableProps {
    rulesets: Ruleset[];
    onDelete: (rulesetId: number) => void;
    onStatusToggled: (rulesetId: number, newStatus: boolean) => void;
}

const RulesetListTable: React.FC<RulesetListTableProps> = ({
    rulesets,
    onDelete,
    onStatusToggled
}) => {

    // --- Handlers (remain the same) ---
    const handleDelete = async (ruleset: Ruleset) => { /* ... */ };
    const handleToggleActive = async (ruleset: Ruleset) => { /* ... */ };

    // --- Date Formatting (remain the same) ---
    const formatOptionalDate = (dateString?: string): string => { /* ... */ };
    const formatTimestamp = (dateString: string): string => { /* ... */ };


    if (!rulesets || rulesets.length === 0) { return null; }

    return (
        <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 dark:ring-white dark:ring-opacity-10 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                 <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6">Name</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white hidden sm:table-cell">Description</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th> {/* Added Status */}
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white hidden lg:table-cell">Updated</th>
                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                    {rulesets.map((ruleset) => (
                        <tr key={ruleset.id}>
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6">{ruleset.name}</td>
                            <td className="whitespace-normal px-3 py-4 text-sm text-gray-500 dark:text-gray-400 hidden sm:table-cell truncate max-w-xs" title={ruleset.description ?? undefined}>{ruleset.description || '-'}</td>
                             {/* Status Cell */}
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ ruleset.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' }`} >
                                     {ruleset.is_active ? ( <CheckCircleIcon className="h-4 w-4 mr-1" /> ) : ( <XCircleIcon className="h-4 w-4 mr-1" /> )}
                                    {ruleset.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400 hidden lg:table-cell" title={formatTimestamp(ruleset.updated_at)}>{formatOptionalDate(ruleset.updated_at)}</td>

                            {/* --- Actions Cell - Re-check styles and layout --- */}
                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                {/* Use a flex container for alignment and spacing */}
                                <div className="flex items-center justify-end space-x-2">
                                    {/* Activate/Deactivate Button */}
                                    <button
                                        onClick={() => handleToggleActive(ruleset)}
                                         // Restore explicit text/icon colors
                                        className={`p-1 rounded ${ruleset.is_active
                                            ? 'text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300'
                                            : 'text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300'
                                        }`}
                                        title={ruleset.is_active ? 'Deactivate Ruleset' : 'Activate Ruleset'}
                                    >
                                        {ruleset.is_active ? <PauseIcon className="h-5 w-5"/> : <PlayIcon className="h-5 w-5"/>}
                                        <span className="sr-only">{ruleset.is_active ? 'Deactivate' : 'Activate'}</span>
                                    </button>

                                    {/* View/Manage Rules Button/Link */}
                                    <Link
                                        to={`/rulesets/${ruleset.id}`}
                                         // Restore explicit text/icon colors
                                        className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 p-1 rounded"
                                        title="View/Manage Rules"
                                    >
                                         <EyeIcon className="h-5 w-5"/>
                                         <span className="sr-only">View/Manage Rules</span>
                                    </Link>

                                     {/* Delete Button */}
                                    <button
                                         onClick={() => handleDelete(ruleset)}
                                          // Restore explicit text/icon colors
                                         className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded"
                                         title="Delete Ruleset"
                                    >
                                         <TrashIcon className="h-5 w-5"/>
                                         <span className="sr-only">Delete</span>
                                    </button>
                                </div>
                            </td>
                             {/* --- End Actions Cell --- */}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default RulesetListTable;
