// src/components/RulesetListTable.tsx
import React from 'react';
import { Ruleset } from '../services/api'; // Ensure Ruleset type is imported
import { formatDistanceToNow, format } from 'date-fns';
import {
    PencilSquareIcon,
    TrashIcon,
    PlayIcon,
    PauseIcon,
    CheckCircleIcon,
    XCircleIcon,
    PencilIcon,
    // --- ADDED: Icons for Execution Mode ---
    ListBulletIcon, // For ALL_MATCHES
    ArrowRightCircleIcon // For FIRST_MATCH (or similar)
    // --- END ADDED ---
} from '@heroicons/react/24/outline';
// --- ADDED: Import Badge ---
import { Badge } from "@/components/ui/badge";
// --- END ADDED ---
import { Link } from 'react-router-dom';

interface RulesetListTableProps {
    rulesets: Ruleset[];
    onDelete: (rulesetId: number) => void;
    onStatusToggled: (rulesetId: number, newStatus: boolean) => void;
    onEditRuleset: (ruleset: Ruleset) => void;
}

const RulesetListTable: React.FC<RulesetListTableProps> = ({
    rulesets,
    onDelete,
    onStatusToggled,
    onEditRuleset
}) => {

    // Internal handlers (remain the same)
    const handleDelete = (ruleset: Ruleset) => {
        console.log('RulesetListTable: handleDelete clicked for ID:', ruleset.id);
        onDelete(ruleset.id);
    };
    const handleToggleActive = (ruleset: Ruleset) => {
        console.log('RulesetListTable: handleToggleActive clicked for ID:', ruleset.id);
        onStatusToggled(ruleset.id, !ruleset.is_active);
    };
    const handleEditRulesetClick = (ruleset: Ruleset) => {
         console.log('RulesetListTable: handleEditRulesetClick clicked for ID:', ruleset.id);
         onEditRuleset(ruleset);
    };

    // Date Formatting (remains the same)
    const formatDate = (dateString: string | null | undefined, formatType: 'relative' | 'absolute' = 'relative'): string => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) { console.warn("Invalid date string encountered:", dateString); return 'Invalid Date'; }
            if (formatType === 'relative') { return formatDistanceToNow(date) + ' ago'; }
            else { return format(date, 'PPpp'); }
        } catch (error) { console.error("Failed to format date:", dateString, error); return 'Invalid Date'; }
    };

    if (!rulesets || rulesets.length === 0) { return null; }

    return (
        <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 dark:ring-white dark:ring-opacity-10 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6">Name</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white hidden sm:table-cell">Description</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                        {/* --- ADDED: Execution Mode Header --- */}
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white hidden md:table-cell">Exec Mode</th>
                        {/* --- END ADDED --- */}
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
                            {/* --- ADDED: Execution Mode Cell --- */}
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">
                                 <Badge
                                     variant="secondary"
                                     className="flex items-center gap-1 w-fit"
                                     title={ruleset.execution_mode === 'FIRST_MATCH' ? 'Stop after first rule matches' : 'Evaluate all matching rules'}
                                 >
                                     {ruleset.execution_mode === 'FIRST_MATCH' ?
                                         <ArrowRightCircleIcon className="h-3.5 w-3.5" /> :
                                         <ListBulletIcon className="h-3.5 w-3.5" />
                                     }
                                     {ruleset.execution_mode === 'FIRST_MATCH' ? 'First Match' : 'All Matches'}
                                </Badge>
                            </td>
                            {/* --- END ADDED --- */}
                            {/* Updated Date Cell */}
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400 hidden lg:table-cell" title={formatDate(ruleset.updated_at, 'absolute')}>
                                {formatDate(ruleset.updated_at, 'relative')}
                            </td>
                            {/* Actions Cell (remains the same) */}
                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                <div className="flex items-center justify-end space-x-2">
                                    {/* Activate/Deactivate Button */}
                                    <button
                                        onClick={() => handleToggleActive(ruleset)}
                                        className={`p-1 rounded ${ruleset.is_active ? 'text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300' : 'text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300'}`}
                                        title={ruleset.is_active ? 'Deactivate Ruleset' : 'Activate Ruleset'}
                                    >
                                        {ruleset.is_active ? <PauseIcon className="h-5 w-5"/> : <PlayIcon className="h-5 w-5"/>}
                                        <span className="sr-only">{ruleset.is_active ? 'Deactivate' : 'Activate'}</span>
                                    </button>
                                    {/* Edit Ruleset Button */}
                                    <button
                                        onClick={() => handleEditRulesetClick(ruleset)}
                                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded"
                                        title="Edit Ruleset Properties"
                                    >
                                         <PencilIcon className="h-5 w-5"/>
                                         <span className="sr-only">Edit Ruleset {ruleset.name}</span>
                                    </button>
                                    {/* Edit Rules Button/Link */}
                                    <Link
                                        to={`/rulesets/${ruleset.id}`}
                                        className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 p-1 rounded"
                                        title="View/Edit Rules"
                                    >
                                         <PencilSquareIcon className="h-5 w-5"/>
                                         <span className="sr-only">Edit Rules for {ruleset.name}</span>
                                    </Link>
                                     {/* Delete Button */}
                                    <button
                                         onClick={() => handleDelete(ruleset)}
                                         className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded"
                                         title="Delete Ruleset"
                                    >
                                         <TrashIcon className="h-5 w-5"/>
                                         <span className="sr-only">Delete</span>
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

export default RulesetListTable;
