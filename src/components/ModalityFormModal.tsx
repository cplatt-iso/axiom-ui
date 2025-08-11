// src/components/ModalityFormModal.tsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { 
    createModality, 
    updateModality, 
    checkAeTitleAvailability,
    type ModalityRead, 
    type ModalityCreate,
    type ModalityUpdate,
    type FacilityRead
} from '@/services/api';

interface ModalityFormModalProps {
    isOpen: boolean;
    modality?: ModalityRead | null;
    facilities: FacilityRead[];
    onSuccess: () => void;
    onCancel: () => void;
}

// Common modality types
const modalityTypes = [
    'CT', 'MR', 'US', 'XA', 'RF', 'DX', 'CR', 'MG', 'NM', 'PT', 'OT',
    'ES', 'XC', 'GM', 'IO', 'PX', 'AR', 'AS', 'AU', 'BDUS', 'BI',
    'BMD', 'DOC', 'DG', 'ECG', 'EPS', 'HD', 'HC', 'LS', 'MRI', 'OPM',
    'OP', 'OPR', 'OPT', 'OSS', 'PR', 'RT', 'SM', 'ST', 'TG', 'VA',
    'VF', 'VL', 'RTDOSE', 'RTIMAGE', 'RTPLAN', 'RTSTRUCT', 'SEG', 'REG'
];

const ModalityFormModal: React.FC<ModalityFormModalProps> = ({
    isOpen,
    modality,
    facilities,
    onSuccess,
    onCancel,
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [aeTitleError, setAeTitleError] = useState<string>('');

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        setValue,
        watch,
    } = useForm<ModalityCreate>({
        defaultValues: {
            name: '',
            facility_id: 0,
            ae_title: '',
            ip_address: '',
            modality_type: '',
            port: 104,
            description: '',
            is_active: true,
            is_dmwl_enabled: true,
            bypass_ip_validation: false,
            manufacturer: '',
            model: '',
            software_version: '',
            location: '',
        },
    });

    const watchIsActive = watch('is_active');
    const watchIsDmwlEnabled = watch('is_dmwl_enabled');
    const watchBypassIpValidation = watch('bypass_ip_validation');
    const watchAeTitle = watch('ae_title');
    const watchFacilityId = watch('facility_id');

    useEffect(() => {
        if (isOpen) {
            if (modality) {
                // Editing existing modality
                reset({
                    name: modality.name,
                    description: modality.description || '',
                    ae_title: modality.ae_title,
                    ip_address: modality.ip_address,
                    port: modality.port || 104,
                    modality_type: modality.modality_type,
                    is_active: modality.is_active,
                    is_dmwl_enabled: modality.is_dmwl_enabled,
                    bypass_ip_validation: modality.bypass_ip_validation || false,
                    facility_id: modality.facility_id,
                    manufacturer: modality.manufacturer || '',
                    model: modality.model || '',
                    software_version: modality.software_version || '',
                    station_name: modality.station_name || '',
                    department: modality.department || '',
                    location: modality.location || '',
                });
            } else {
                // Creating new modality
                reset({
                    name: '',
                    description: '',
                    ae_title: '',
                    ip_address: '',
                    port: 104,
                    modality_type: '',
                    is_active: true,
                    is_dmwl_enabled: true,
                    bypass_ip_validation: false,
                    facility_id: undefined,
                    manufacturer: '',
                    model: '',
                    software_version: '',
                    station_name: '',
                    department: '',
                    location: '',
                });
            }
            setAeTitleError('');
        }
    }, [isOpen, modality, reset]);

    // Check AE Title availability
    useEffect(() => {
        const checkAeTitle = async () => {
            if (watchAeTitle && watchAeTitle.length > 0) {
                try {
                    const excludeId = modality ? modality.id : undefined;
                    const result = await checkAeTitleAvailability(watchAeTitle, excludeId);
                    if (!result.available) {
                        setAeTitleError('AE Title is already in use by another modality');
                    } else {
                        setAeTitleError('');
                    }
                } catch {
                    // Ignore errors in AE title checking for now
                    setAeTitleError('');
                }
            } else {
                setAeTitleError('');
            }
        };

        const timeoutId = setTimeout(checkAeTitle, 500); // Debounce
        return () => clearTimeout(timeoutId);
    }, [watchAeTitle, modality]);

    const onSubmit = async (data: ModalityCreate) => {
        if (aeTitleError) {
            toast.error('Please fix the AE Title error before submitting.');
            return;
        }

        setIsSubmitting(true);
        try {
            if (modality) {
                await updateModality(modality.id, data as ModalityUpdate);
                toast.success('Modality updated successfully.');
            } else {
                await createModality(data);
                toast.success('Modality created successfully.');
            }
            onSuccess();
        } catch (error: unknown) {
            console.error('Failed to save modality:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to save modality. Please try again.';
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onCancel}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {modality ? 'Edit Modality' : 'Create New Modality'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Basic Information */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Basic Information</h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Modality Name *</Label>
                                <Input
                                    id="name"
                                    {...register('name')}
                                    placeholder="Enter modality name"
                                />
                                {errors.name && (
                                    <p className="text-sm text-red-600">{errors.name.message}</p>
                                )}
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="modality_type">Modality Type *</Label>
                                <Select 
                                    onValueChange={(value) => setValue('modality_type', value)}
                                    value={watch('modality_type') || ''}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select modality type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {modalityTypes.map((type) => (
                                            <SelectItem key={type} value={type}>
                                                {type}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.modality_type && (
                                    <p className="text-sm text-red-600">{errors.modality_type.message}</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="facility_id">Facility *</Label>
                            <Select 
                                onValueChange={(value) => setValue('facility_id', parseInt(value))}
                                value={watchFacilityId ? watchFacilityId.toString() : ''}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select facility" />
                                </SelectTrigger>
                                <SelectContent>
                                    {facilities.filter(f => f.is_active).map((facility) => (
                                        <SelectItem key={facility.id} value={facility.id.toString()}>
                                            {facility.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.facility_id && (
                                <p className="text-sm text-red-600">{errors.facility_id.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                {...register('description')}
                                placeholder="Optional description"
                                rows={2}
                            />
                            {errors.description && (
                                <p className="text-sm text-red-600">{errors.description.message}</p>
                            )}
                        </div>
                    </div>

                    {/* Network Configuration */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Network Configuration</h3>
                        
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="ae_title">AE Title *</Label>
                                <Input
                                    id="ae_title"
                                    {...register('ae_title')}
                                    placeholder="DICOM AE Title"
                                    className={aeTitleError ? 'border-red-500' : ''}
                                />
                                {errors.ae_title && (
                                    <p className="text-sm text-red-600">{errors.ae_title.message}</p>
                                )}
                                {aeTitleError && (
                                    <p className="text-sm text-red-600">{aeTitleError}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="ip_address">IP Address *</Label>
                                <Input
                                    id="ip_address"
                                    {...register('ip_address')}
                                    placeholder="192.168.1.100"
                                />
                                {errors.ip_address && (
                                    <p className="text-sm text-red-600">{errors.ip_address.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="port">Port</Label>
                                <Input
                                    id="port"
                                    type="number"
                                    {...register('port', { valueAsNumber: true })}
                                    placeholder="104"
                                />
                                {errors.port && (
                                    <p className="text-sm text-red-600">{errors.port.message}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Equipment Information */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Equipment Information</h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="manufacturer">Manufacturer</Label>
                                <Input
                                    id="manufacturer"
                                    {...register('manufacturer')}
                                    placeholder="Equipment manufacturer"
                                />
                                {errors.manufacturer && (
                                    <p className="text-sm text-red-600">{errors.manufacturer.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="model">Model</Label>
                                <Input
                                    id="model"
                                    {...register('model')}
                                    placeholder="Equipment model"
                                />
                                {errors.model && (
                                    <p className="text-sm text-red-600">{errors.model.message}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="software_version">Software Version</Label>
                                <Input
                                    id="software_version"
                                    {...register('software_version')}
                                    placeholder="Software version"
                                />
                                {errors.software_version && (
                                    <p className="text-sm text-red-600">{errors.software_version.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="station_name">Station Name</Label>
                                <Input
                                    id="station_name"
                                    {...register('station_name')}
                                    placeholder="DICOM station name"
                                />
                                {errors.station_name && (
                                    <p className="text-sm text-red-600">{errors.station_name.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="department">Department</Label>
                                <Input
                                    id="department"
                                    {...register('department')}
                                    placeholder="Department"
                                />
                                {errors.department && (
                                    <p className="text-sm text-red-600">{errors.department.message}</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="location">Location</Label>
                            <Input
                                id="location"
                                {...register('location')}
                                placeholder="Physical location"
                            />
                            {errors.location && (
                                <p className="text-sm text-red-600">{errors.location.message}</p>
                            )}
                        </div>
                    </div>

                    {/* Status Configuration */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Configuration</h3>
                        
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="is_active"
                                    checked={watchIsActive}
                                    onCheckedChange={(checked) => setValue('is_active', checked)}
                                />
                                <Label htmlFor="is_active">Active modality</Label>
                            </div>
                            <p className="text-sm text-gray-600">
                                Inactive modalities will not process DICOM data.
                            </p>

                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="is_dmwl_enabled"
                                    checked={watchIsDmwlEnabled}
                                    onCheckedChange={(checked) => setValue('is_dmwl_enabled', checked)}
                                />
                                <Label htmlFor="is_dmwl_enabled">Enable DICOM Modality Worklist (DMWL)</Label>
                            </div>
                            <p className="text-sm text-gray-600">
                                Allow this modality to query the modality worklist for patient/study information.
                            </p>

                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="bypass_ip_validation"
                                    checked={watchBypassIpValidation}
                                    onCheckedChange={(checked) => setValue('bypass_ip_validation', checked)}
                                />
                                <Label htmlFor="bypass_ip_validation">Bypass IP Address Validation</Label>
                            </div>
                            <p className="text-sm text-gray-600">
                                When enabled, the backend will ignore the IP address when this AE queries. Useful for modalities with dynamic IP addresses.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-6 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting || !!aeTitleError}>
                            {isSubmitting ? 'Saving...' : modality ? 'Update Modality' : 'Create Modality'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export { ModalityFormModal };
export default ModalityFormModal;
