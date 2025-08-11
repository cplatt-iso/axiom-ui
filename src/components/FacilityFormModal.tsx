// src/components/FacilityFormModal.tsx
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
import { toast } from 'sonner';
import { 
    createFacility, 
    updateFacility
} from '@/services/api';
import { 
    type FacilityCreate,
    type FacilityUpdate,
    type FacilityRead 
} from '@/schemas/facilitySchema';

interface FacilityFormModalProps {
    isOpen: boolean;
    facility: FacilityRead | null;
    onSuccess: () => void;
    onCancel: () => void;
}

const FacilityFormModal: React.FC<FacilityFormModalProps> = ({
    isOpen,
    facility,
    onSuccess,
    onCancel,
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<FacilityCreate>({
        defaultValues: {
            name: '',
            description: '',
            address_line_1: '',
            address_line_2: '',
            city: '',
            state: '',
            postal_code: '',
            country: '',
            phone: '',
            email: '',
            is_active: true,
            facility_id: '',
        },
    });

    useEffect(() => {
        if (facility) {
            // Populate form with facility data for editing
            form.reset({
                name: facility.name,
                description: facility.description || '',
                address_line_1: facility.address_line_1 || '',
                address_line_2: facility.address_line_2 || '',
                city: facility.city || '',
                state: facility.state || '',
                postal_code: facility.postal_code || '',
                country: facility.country || '',
                phone: facility.phone || '',
                email: facility.email || '',
                is_active: facility.is_active,
                facility_id: facility.facility_id || '',
            });
        } else {
            // Reset to defaults for creating new facility
            form.reset({
                name: '',
                description: '',
                address_line_1: '',
                address_line_2: '',
                city: '',
                state: '',
                postal_code: '',
                country: '',
                phone: '',
                email: '',
                is_active: true,
                facility_id: '',
            });
        }
    }, [facility, form]);

    const onSubmit = async (data: FacilityCreate) => {
        try {
            setIsSubmitting(true);
            
            if (facility) {
                // Update existing facility
                await updateFacility(facility.id, data as FacilityUpdate);
                toast.success('Facility updated successfully.');
            } else {
                // Create new facility
                await createFacility(data);
                toast.success('Facility created successfully.');
            }
            
            onSuccess();
        } catch (error) {
            console.error('Failed to save facility:', error);
            toast.error('Failed to save facility. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={() => onCancel()}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {facility ? 'Edit Facility' : 'Create New Facility'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="name">
                                Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="name"
                                {...form.register('name')}
                                placeholder="Enter facility name"
                                className={form.formState.errors.name ? 'border-red-500' : ''}
                            />
                            {form.formState.errors.name && (
                                <p className="text-sm text-red-500 mt-1">
                                    {form.formState.errors.name.message}
                                </p>
                            )}
                        </div>

                        <div>
                            <Label htmlFor="facility_id">Facility ID</Label>
                            <Input
                                id="facility_id"
                                {...form.register('facility_id')}
                                placeholder="Enter facility ID"
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            {...form.register('description')}
                            placeholder="Enter facility description"
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="address_line_1">Address Line 1</Label>
                            <Input
                                id="address_line_1"
                                {...form.register('address_line_1')}
                                placeholder="Enter address line 1"
                            />
                        </div>

                        <div>
                            <Label htmlFor="address_line_2">Address Line 2</Label>
                            <Input
                                id="address_line_2"
                                {...form.register('address_line_2')}
                                placeholder="Enter address line 2"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="city">City</Label>
                            <Input
                                id="city"
                                {...form.register('city')}
                                placeholder="Enter city"
                            />
                        </div>

                        <div>
                            <Label htmlFor="state">State</Label>
                            <Input
                                id="state"
                                {...form.register('state')}
                                placeholder="Enter state"
                            />
                        </div>

                        <div>
                            <Label htmlFor="postal_code">Postal Code</Label>
                            <Input
                                id="postal_code"
                                {...form.register('postal_code')}
                                placeholder="Enter postal code"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="country">Country</Label>
                            <Input
                                id="country"
                                {...form.register('country')}
                                placeholder="Enter country"
                            />
                        </div>

                        <div>
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                                id="phone"
                                {...form.register('phone')}
                                placeholder="Enter phone number"
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            {...form.register('email')}
                            placeholder="Enter email address"
                            className={form.formState.errors.email ? 'border-red-500' : ''}
                        />
                        {form.formState.errors.email && (
                            <p className="text-sm text-red-500 mt-1">
                                {form.formState.errors.email.message}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center space-x-2">
                        <Switch
                            id="is_active"
                            checked={form.watch('is_active')}
                            onCheckedChange={(checked) => form.setValue('is_active', checked)}
                        />
                        <Label htmlFor="is_active">Active</Label>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Saving...' : facility ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export { FacilityFormModal };
export default FacilityFormModal;
