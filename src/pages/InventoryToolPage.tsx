// src/pages/InventoryToolPage.tsx
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArchiveBoxIcon } from '@heroicons/react/24/outline';

const InventoryToolPage: React.FC = () => {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Inventory Tool</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                 Tools for managing and migrating DICOM data inventory (future implementation).
            </p>

             <Card>
                 <CardHeader>
                     <CardTitle className="flex items-center">
                         <ArchiveBoxIcon className="mr-2 h-5 w-5" /> Inventory / Migration
                     </CardTitle>
                     <CardDescription>
                         Functionality related to inventory management and data migration will be implemented here.
                     </CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-4">
                     <div className="p-6 border border-dashed rounded text-center text-gray-500 dark:text-gray-400">
                        Inventory Tool Placeholder...
                     </div>
                     <div className="text-xs text-gray-500 dark:text-gray-400">
                         (Development Note: Specific features for inventory and migration are TBD.)
                     </div>
                 </CardContent>
             </Card>
        </div>
    );
};

export default InventoryToolPage;
