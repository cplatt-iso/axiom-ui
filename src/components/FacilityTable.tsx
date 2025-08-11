// src/components/FacilityTable.tsx
import React from 'react';
import { Edit, Trash2, Building, Phone, Mail, MapPin } from 'lucide-react';
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
import { FacilityRead } from '@/services/api';

interface FacilityTableProps {
    facilities: FacilityRead[];
    isLoading: boolean;
    onEdit: (facility: FacilityRead) => void;
    onDelete: (facility: FacilityRead) => void;
}

const FacilityTable: React.FC<FacilityTableProps> = ({
    facilities,
    isLoading,
    onEdit,
    onDelete,
}) => {
    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-center">
                        <div className="text-gray-500">Loading facilities...</div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (facilities.length === 0) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="text-center">
                        <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            No facilities configured
                        </h3>
                        <p className="text-gray-500">
                            Get started by adding your first healthcare facility.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const formatAddress = (facility: FacilityRead) => {
        const parts = [
            facility.address_line_1,
            facility.city,
            facility.state,
            facility.postal_code,
        ].filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : null;
    };

    return (
        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Facility</TableHead>
                            <TableHead>Address</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {facilities.map((facility) => (
                            <TableRow key={facility.id}>
                                <TableCell>
                                    <div>
                                        <div className="font-medium text-gray-900 dark:text-white">
                                            {facility.name}
                                        </div>
                                        {facility.description && (
                                            <div className="text-sm text-gray-500">
                                                {facility.description}
                                            </div>
                                        )}
                                        {facility.facility_id && (
                                            <div className="text-xs text-gray-400 mt-1">
                                                ID: {facility.facility_id}
                                            </div>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="space-y-1">
                                        {formatAddress(facility) && (
                                            <div className="flex items-center text-sm text-gray-600">
                                                <MapPin className="h-3 w-3 mr-1" />
                                                {formatAddress(facility)}
                                            </div>
                                        )}
                                        {facility.country && (
                                            <div className="text-xs text-gray-500">
                                                {facility.country}
                                            </div>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="space-y-1">
                                        {facility.phone && (
                                            <div className="flex items-center text-sm text-gray-600">
                                                <Phone className="h-3 w-3 mr-1" />
                                                {facility.phone}
                                            </div>
                                        )}
                                        {facility.email && (
                                            <div className="flex items-center text-sm text-gray-600">
                                                <Mail className="h-3 w-3 mr-1" />
                                                {facility.email}
                                            </div>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={facility.is_active ? 'default' : 'secondary'}>
                                        {facility.is_active ? 'Active' : 'Inactive'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end space-x-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onEdit(facility)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onDelete(facility)}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export { FacilityTable };
export default FacilityTable;
