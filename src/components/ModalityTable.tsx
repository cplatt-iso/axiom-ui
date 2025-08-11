// src/components/ModalityTable.tsx
import React from 'react';
import { Edit, Trash2, Monitor, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { ModalityRead, FacilityRead } from '@/services/api';

interface ModalityTableProps {
    modalities: ModalityRead[];
    facilityMap: Record<number, FacilityRead>;
    isLoading: boolean;
    onEdit: (modality: ModalityRead) => void;
    onDelete: (modality: ModalityRead) => void;
}

const ModalityTable: React.FC<ModalityTableProps> = ({
    modalities,
    facilityMap,
    isLoading,
    onEdit,
    onDelete,
}) => {
    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-center">
                        <div className="text-gray-500">Loading modalities...</div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (modalities.length === 0) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="text-center">
                        <Monitor className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            No modalities configured
                        </h3>
                        <p className="text-gray-500">
                            Get started by adding your first imaging modality.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Modality</TableHead>
                            <TableHead>Facility</TableHead>
                            <TableHead>Network</TableHead>
                            <TableHead>Configuration</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {modalities.map((modality) => {
                            const facility = facilityMap[modality.facility_id];
                            
                            return (
                                <TableRow key={modality.id}>
                                    <TableCell>
                                        <div>
                                            <div className="font-medium text-gray-900 dark:text-white">
                                                {modality.name}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {modality.modality_type}
                                            </div>
                                            {modality.description && (
                                                <div className="text-xs text-gray-400 mt-1">
                                                    {modality.description}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center">
                                            <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-white">
                                                    {facility?.name || 'Unknown Facility'}
                                                </div>
                                                {modality.department && (
                                                    <div className="text-sm text-gray-500">
                                                        {modality.department}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <div className="text-sm font-mono">
                                                {modality.ae_title}
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                {modality.ip_address}:{modality.port || 104}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            {modality.manufacturer && (
                                                <div className="text-sm text-gray-600">
                                                    {modality.manufacturer}
                                                    {modality.model && ` ${modality.model}`}
                                                </div>
                                            )}
                                            {modality.station_name && (
                                                <div className="text-xs text-gray-500">
                                                    Station: {modality.station_name}
                                                </div>
                                            )}
                                            {modality.location && (
                                                <div className="text-xs text-gray-500">
                                                    Location: {modality.location}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <Badge variant={modality.is_active ? 'default' : 'secondary'}>
                                                {modality.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                            {modality.is_dmwl_enabled && (
                                                <Badge variant="outline" className="text-xs">
                                                    DMWL
                                                </Badge>
                                            )}
                                            {modality.bypass_ip_validation && (
                                                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                                    IP Bypass
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onEdit(modality)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onDelete(modality)}
                                                className="text-red-600 hover:text-red-700"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export { ModalityTable };
export default ModalityTable;
