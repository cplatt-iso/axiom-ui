// src/components/spanner/BulkActionsToolbar.tsx
import React from 'react';
import { 
    CheckCircleIcon, 
    StopIcon, 
    XMarkIcon 
} from '@heroicons/react/24/outline';

interface BulkActionsToolbarProps {
    selectedCount: number;
    onEnableAll: () => void;
    onDisableAll: () => void;
    onClearSelection: () => void;
    isLoading?: boolean;
}

const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
    selectedCount,
    onEnableAll,
    onDisableAll,
    onClearSelection,
    isLoading = false,
}) => {
    return (
        <div className="bg-indigo-50 dark:bg-indigo-900 border border-indigo-200 dark:border-indigo-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-indigo-800 dark:text-indigo-200">
                        {selectedCount} configuration{selectedCount !== 1 ? 's' : ''} selected
                    </span>
                </div>
                
                <div className="flex items-center space-x-3">
                    <button
                        type="button"
                        onClick={onEnableAll}
                        disabled={isLoading}
                        className="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:opacity-50"
                    >
                        <CheckCircleIcon className="-ml-0.5 mr-1.5 h-4 w-4" />
                        Enable All
                    </button>
                    
                    <button
                        type="button"
                        onClick={onDisableAll}
                        disabled={isLoading}
                        className="inline-flex items-center rounded-md bg-gray-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600 disabled:opacity-50"
                    >
                        <StopIcon className="-ml-0.5 mr-1.5 h-4 w-4" />
                        Disable All
                    </button>
                    
                    <button
                        type="button"
                        onClick={onClearSelection}
                        className="inline-flex items-center rounded-md bg-white dark:bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                        <XMarkIcon className="-ml-0.5 mr-1.5 h-4 w-4" />
                        Clear Selection
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkActionsToolbar;
