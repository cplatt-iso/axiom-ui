// src/components/RuleListTable.tsx
import React from 'react';
// --- Import Schema for Rule and StorageBackendConfigRead ---
import { Rule, StorageBackendConfigRead } from '../schemas'; // Adjusted path if needed
// --- END Import ---
// Import necessary icons from heroicons outline
import { PencilSquareIcon, TrashIcon, CheckCircleIcon, XCircleIcon, PlayIcon, PauseIcon } from '@heroicons/react/24/outline';
// --- Import icons from lucide-react ---
import { Database, Server, Cloud, HardDrive } from 'lucide-react'; // Moved Cloud here
// --- Import Badge Component ---
import { Badge } from "@/components/ui/badge";
// --- END Import ---
import { Link } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns'; // Import format

interface RuleListTableProps {
    rules: Rule[];
    onEdit: (rule: Rule) => void;
    onDelete: (ruleId: number) => void;
    onToggleStatus: (ruleId: number, newStatus: boolean) => void;
}

// --- HELPER: Get style and Icon for backend type ---
// (Copied/adapted from StorageBackendsConfigPage for consistency)
const getBackendTypeStyle = (backendType: string): { Icon: React.ElementType, textClass: string, bgClass: string } => {
    switch (backendType?.toLowerCase()) {
        case 'filesystem': return { Icon: HardDrive, textClass: 'text-blue-700 dark:text-blue-300', bgClass: 'bg-blue-100 dark:bg-blue-900/30' };
        case 'cstore': return { Icon: Server, textClass: 'text-purple-700 dark:text-purple-300', bgClass: 'bg-purple-100 dark:bg-purple-900/30' };
        case 'gcs': return { Icon: Cloud, textClass: 'text-orange-700 dark:text-orange-300', bgClass: 'bg-orange-100 dark:bg-orange-900/30' };
        case 'google_healthcare': return { Icon: Cloud, textClass: 'text-red-700 dark:text-red-300', bgClass: 'bg-red-100 dark:bg-red-900/30' };
        case 'stow_rs': return { Icon: Server, textClass: 'text-teal-700 dark:text-teal-300', bgClass: 'bg-teal-100 dark:bg-teal-900/30' };
        default: return { Icon: Database, textClass: 'text-gray-600 dark:text-gray-400', bgClass: 'bg-gray-100 dark:bg-gray-700' };
    }
};
// --- END HELPER ---

const RuleListTable: React.FC<RuleListTableProps> = ({ rules, onEdit, onDelete, onToggleStatus }) => {

    // --- Date Formatting ---
    const formatDate = (dateString: string | null | undefined, formatType: 'relative' | 'absolute' = 'relative'): string => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) { console.warn("Invalid date string encountered:", dateString); return 'Invalid Date'; }
            if (formatType === 'relative') { return formatDistanceToNow(date) + ' ago'; }
            else { return format(date, 'PPpp'); } // Absolute format
        } catch (error) { console.error("Failed to format date:", dateString, error); return 'Invalid Date'; }
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
                        {/* --- Keep Destinations column visible more often --- */}
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 hidden md:table-cell">Destinations</th>
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
                            {/* --- UPDATED Destinations Cell --- */}
                            <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">
                                <div className="flex flex-wrap gap-1">
                                     {/* Check if destinations is an array and has elements */}
                                     {(rule.destinations && Array.isArray(rule.destinations) && rule.destinations.length > 0) ? rule.destinations.map((dest) => {
                                         // Ensure dest is a valid object before accessing properties
                                         if (typeof dest !== 'object' || dest === null) {
                                            console.warn(`Invalid destination object found in rule ${rule.id}:`, dest);
                                            return null; // Skip rendering invalid destinations
                                         }
                                         const { Icon, textClass, bgClass } = getBackendTypeStyle(dest.backend_type);
                                         return (
                                             <Badge
                                                 key={dest.id}
                                                 variant="outline"
                                                 title={`${dest.name} (${dest.backend_type})`}
                                                 // Apply border-transparent AFTER variant="outline" to override
                                                 className={`border-transparent ${textClass} ${bgClass} text-xs`}
                                             >
                                                 <Icon className={`mr-1 h-3.5 w-3.5 ${textClass}`} />
                                                 {dest.name}
                                             </Badge>
                                         );
                                    }) : <span className="text-xs italic text-gray-400">No destinations</span>}
                                </div>
                            </td>
                            {/* --- END UPDATED Destinations Cell --- */}

                            {/* Actions */}
                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                <div className="flex items-center justify-end space-x-2">
                                    {/* Toggle Button */}
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
                                    {/* Edit Button */}
                                    <button
                                        onClick={() => onEdit(rule)}
                                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 p-1 rounded"
                                        title="Edit Rule"
                                    >
                                        <PencilSquareIcon className="h-5 w-5" aria-hidden="true" />
                                        <span className="sr-only">Edit rule {rule.name}</span>
                                    </button>
                                    {/* Delete Button */}
                                    <button
                                        onClick={() => onDelete(rule.id)}
                                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 rounded"
                                        title="Delete Rule"
                                    >
                                        <TrashIcon className="h-5 w-5" aria-hidden="true" />
                                         <span className="sr-only">Delete rule {rule.name}</span>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default RuleListTable;
