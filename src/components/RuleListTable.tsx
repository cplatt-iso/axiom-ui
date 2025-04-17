// src/components/RuleListTable.tsx
import React from 'react';
import { Rule } from '../schemas';
// Import necessary icons
import { PencilSquareIcon, TrashIcon, CheckCircleIcon, XCircleIcon, PlayIcon, PauseIcon } from '@heroicons/react/24/outline';

interface RuleListTableProps {
    rules: Rule[];
    onEdit: (rule: Rule) => void;
    onDelete: (ruleId: number) => void;
    // Add new prop for toggling status
    onToggleStatus: (ruleId: number, newStatus: boolean) => void;
}

const RuleListTable: React.FC<RuleListTableProps> = ({ rules, onEdit, onDelete, onToggleStatus }) => {

    // Helper to format criteria/modifications/destinations for display (simplified)
    const formatDetailSummary = (items: any[] | undefined, type: string): string => {
        if (!items || items.length === 0) {
            return `No ${type}`;
        }
        return `${items.length} ${type}${items.length > 1 ? 's' : ''}`;
    };

    if (!rules || rules.length === 0) {
        return <p className="text-center text-gray-500 dark:text-gray-400 py-4">No rules defined for this ruleset yet.</p>;
    }

    return (
        <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 sm:pl-6">Name</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 hidden sm:table-cell">Description</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Priority</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Status</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 hidden md:table-cell">Criteria</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 hidden md:table-cell">Modifications</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 hidden lg:table-cell">Destinations</th>
                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                            <span className="sr-only">Actions</span>
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
                    {rules.map((rule) => (
                        <tr key={rule.id}>
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-gray-100 sm:pl-6">{rule.name}</td>
                            <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 hidden sm:table-cell max-w-xs truncate" title={rule.description ?? undefined}>
                                {rule.description || '-'}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{rule.priority}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    rule.is_active
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                    }`}
                                >
                                     {rule.is_active ? ( <CheckCircleIcon className="h-4 w-4 mr-1" /> ) : ( <XCircleIcon className="h-4 w-4 mr-1" /> )}
                                    {rule.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">
                                {formatDetailSummary(rule.match_criteria, 'criterion')}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">
                                {formatDetailSummary(rule.tag_modifications, 'modification')}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400 hidden lg:table-cell">
                                {formatDetailSummary(rule.destinations, 'destination')}
                            </td>
                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-2">
                                {/* --- Add Toggle Button --- */}
                                <button
                                    onClick={() => onToggleStatus(rule.id, !rule.is_active)}
                                    className={`p-1 rounded ${rule.is_active
                                        ? 'text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300'
                                        : 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300'
                                    }`}
                                    title={rule.is_active ? 'Deactivate Rule' : 'Activate Rule'}
                                >
                                    {rule.is_active ? <PauseIcon className="h-5 w-5"/> : <PlayIcon className="h-5 w-5"/>}
                                    <span className="sr-only">{rule.is_active ? 'Deactivate' : 'Activate'}</span>
                                </button>
                                {/* --- End Add Toggle Button --- */}

                                <button
                                    onClick={() => onEdit(rule)}
                                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 p-1 rounded"
                                    title="Edit Rule"
                                >
                                    <PencilSquareIcon className="h-5 w-5" aria-hidden="true" />
                                    <span className="sr-only">Edit rule {rule.name}</span>
                                </button>
                                <button
                                    onClick={() => onDelete(rule.id)}
                                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 rounded"
                                    title="Delete Rule"
                                >
                                    <TrashIcon className="h-5 w-5" aria-hidden="true" />
                                     <span className="sr-only">Delete rule {rule.name}</span>
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default RuleListTable;
