// src/components/RuleListTable.tsx
import React from 'react';
import { Rule } from '../services/api';
import {
    PencilSquareIcon, TrashIcon, PlayIcon, PauseIcon, CheckCircleIcon, XCircleIcon,
    ClockIcon
} from '@heroicons/react/24/outline';
// --- ADDED: Lucide Icons for Destinations ---
import { Database, Server, Cloud, HardDrive } from 'lucide-react';
// --- END ADDED ---
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// --- ADDED BACK: Helper for Destination Styling ---
const getBackendTypeStyle = (backendType: string | undefined): { Icon: React.ElementType, textClass: string, bgClass: string, typeLabel: string } => {
    const typeLower = backendType?.toLowerCase() || 'unknown';
    switch (typeLower) {
        case 'filesystem': return { Icon: HardDrive, textClass: 'text-blue-700 dark:text-blue-300', bgClass: 'bg-blue-100 dark:bg-blue-900/30', typeLabel: 'Filesystem' };
        case 'cstore': return { Icon: Server, textClass: 'text-purple-700 dark:text-purple-300', bgClass: 'bg-purple-100 dark:bg-purple-900/30', typeLabel: 'C-STORE' };
        case 'gcs': return { Icon: Cloud, textClass: 'text-orange-700 dark:text-orange-300', bgClass: 'bg-orange-100 dark:bg-orange-900/30', typeLabel: 'GCS' };
        case 'google_healthcare': return { Icon: Cloud, textClass: 'text-red-700 dark:text-red-300', bgClass: 'bg-red-100 dark:bg-red-900/30', typeLabel: 'Google HC' };
        case 'stow_rs': return { Icon: Server, textClass: 'text-teal-700 dark:text-teal-300', bgClass: 'bg-teal-100 dark:bg-teal-900/30', typeLabel: 'STOW-RS' };
        default: return { Icon: Database, textClass: 'text-gray-600 dark:text-gray-400', bgClass: 'bg-gray-100 dark:bg-gray-700', typeLabel: 'Unknown' };
    }
};
// --- END ADDED ---

interface RuleListTableProps {
    rules: Rule[];
    onEdit: (rule: Rule) => void;
    onDelete: (ruleId: number) => void;
    onToggleStatus: (ruleId: number, newStatus: boolean) => void;
}

const RuleListTable: React.FC<RuleListTableProps> = ({ rules, onEdit, onDelete, onToggleStatus }) => {

//    const formatDate = (dateString: string | null | undefined, formatType: 'relative' | 'absolute' = 'relative'): string => {
//        // ... date formatting logic ...
//        if (!dateString) return 'N/A';
//        try { const date = new Date(dateString); if (isNaN(date.getTime())) return 'Invalid Date'; if (formatType === 'relative') return formatDistanceToNow(date) + ' ago'; else return format(date, 'PPpp'); }
//        catch (error) { console.error("Failed to format date:", dateString, error); return 'Invalid Date'; }
//   };

    if (!rules || rules.length === 0) {
        return <p className="text-center text-gray-500 dark:text-gray-400 py-4">No rules defined for this ruleset yet.</p>;
    }

    return (
         <TooltipProvider delayDuration={150}>
            <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6">Name</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white hidden md:table-cell">Priority</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white hidden lg:table-cell">Schedule</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white hidden sm:table-cell">Destinations</th>
                            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
                        {rules.map((rule) => (
                            <tr key={rule.id}>
                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6">{rule.name}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">{rule.priority}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ rule.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' }`} >
                                         {rule.is_active ? ( <CheckCircleIcon className="h-4 w-4 mr-1" /> ) : ( <XCircleIcon className="h-4 w-4 mr-1" /> )}
                                        {rule.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400 hidden lg:table-cell">
                                    {rule.schedule ? (
                                         <Tooltip>
                                             <TooltipTrigger asChild>
                                                <Badge variant={rule.schedule.is_enabled ? "outline" : "secondary"} className={`flex items-center gap-1 w-fit ${!rule.schedule.is_enabled ? 'text-gray-400 dark:text-gray-500 italic border-dashed' : ''}`}>
                                                     <ClockIcon className="h-3.5 w-3.5" />
                                                     {rule.schedule.name}
                                                     {!rule.schedule.is_enabled && (<span>(Disabled)</span>)}
                                                 </Badge>
                                             </TooltipTrigger>
                                             <TooltipContent>
                                                 <p>Uses schedule: [{rule.schedule.id}] {rule.schedule.name}{!rule.schedule.is_enabled ? ' (Currently Disabled)' : ''}</p>
                                             </TooltipContent>
                                         </Tooltip>
                                    ) : (
                                        <span className="text-xs italic text-gray-400">Always Active</span>
                                    )}
                                </td>
                                {/* --- UPDATED: Destinations Cell with Icons/Colors --- */}
                                <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                                    <div className="flex flex-wrap gap-1">
                                         {(rule.destinations && Array.isArray(rule.destinations) && rule.destinations.length > 0) ? rule.destinations.map((dest) => {
                                             // Get style info using the helper
                                             const { Icon, textClass, bgClass, typeLabel } = getBackendTypeStyle(dest.backend_type);
                                             return (
                                                 <Tooltip key={dest.id}>
                                                     <TooltipTrigger asChild>
                                                         <Badge
                                                             variant="outline"
                                                             className={`border-transparent ${textClass} ${bgClass} text-xs cursor-default`} // Add cursor-default
                                                         >
                                                             <Icon className={`mr-1 h-3.5 w-3.5 ${textClass}`} />
                                                             {dest.name}
                                                         </Badge>
                                                     </TooltipTrigger>
                                                     <TooltipContent>
                                                        <p>[{dest.id}] {dest.name} ({typeLabel})</p>
                                                     </TooltipContent>
                                                 </Tooltip>
                                             );
                                        }) : <span className="text-xs italic text-gray-400">No destinations</span>}
                                    </div>
                                </td>
                                {/* --- END UPDATED --- */}
                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                    <div className="flex items-center justify-end space-x-2">
                                        <button onClick={() => onToggleStatus(rule.id, !rule.is_active)} /* ... */ >
                                            {rule.is_active ? <PauseIcon className="h-5 w-5"/> : <PlayIcon className="h-5 w-5"/>}
                                            {/* ... */}
                                        </button>
                                        <button onClick={() => onEdit(rule)} /* ... */ >
                                            <PencilSquareIcon className="h-5 w-5" />
                                            {/* ... */}
                                        </button>
                                        <button onClick={() => onDelete(rule.id)} /* ... */ >
                                             <TrashIcon className="h-5 w-5"/>
                                             {/* ... */}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </TooltipProvider>
    );
};

export default RuleListTable;
