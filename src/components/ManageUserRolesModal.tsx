// src/components/ManageUserRolesModal.tsx
import React, { useState, useEffect, Fragment, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { UserWithRoles, Role, assignRoleToUser, removeRoleFromUser } from '../services/api'; // Import types and API calls

interface ManageUserRolesModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: UserWithRoles | null; // The user being edited
    availableRoles: Role[]; // All possible roles
    onUpdateSuccess: () => void; // Callback to refresh user list
}

const ManageUserRolesModal: React.FC<ManageUserRolesModalProps> = ({
    isOpen, onClose, user, availableRoles, onUpdateSuccess
}) => {
    const [selectedRoleIds, setSelectedRoleIds] = useState<Set<number>>(new Set());
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize selected roles when the user prop changes
    useEffect(() => {
        if (user) {
            setSelectedRoleIds(new Set(user.roles.map(role => role.id)));
        } else {
            setSelectedRoleIds(new Set()); // Reset if no user
        }
    }, [user]); // Re-run when the user object changes

    const handleRoleChange = (roleId: number, checked: boolean) => {
        setSelectedRoleIds(prev => {
            const newSet = new Set(prev);
            if (checked) {
                newSet.add(roleId);
            } else {
                newSet.delete(roleId);
            }
            return newSet;
        });
    };

    const handleSave = async () => {
        if (!user) return;

        setIsSaving(true);
        setError(null);

        const initialRoleIds = new Set(user.roles.map(role => role.id));
        const rolesToAdd = [...selectedRoleIds].filter(id => !initialRoleIds.has(id));
        const rolesToRemove = [...initialRoleIds].filter(id => !selectedRoleIds.has(id));

        console.log("Roles to add:", rolesToAdd);
        console.log("Roles to remove:", rolesToRemove);

        try {
            // Perform removals first
            for (const roleIdToRemove of rolesToRemove) {
                console.log(`Removing role ${roleIdToRemove} from user ${user.id}`);
                await removeRoleFromUser(user.id, roleIdToRemove);
            }

            // Then perform additions
            for (const roleIdToAdd of rolesToAdd) {
                 console.log(`Adding role ${roleIdToAdd} to user ${user.id}`);
                await assignRoleToUser(user.id, roleIdToAdd);
            }

            onUpdateSuccess(); // Call success callback to refresh list
            closeModal(); // Close modal on success

        } catch (err: any) {
            console.error("Failed to update roles:", err);
            setError(err.message || "Failed to update roles.");
        } finally {
            setIsSaving(false);
        }
    };

    // Reset state on close
    const closeModal = () => {
        if (isSaving) return;
        setError(null);
        // setSelectedRoleIds(new Set()); // Resetting happens via useEffect now
        onClose();
    }

    return (
         <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-10" onClose={closeModal}>
                {/* ... (Transition.Child for overlay) ... */}
                 <Transition.Child as={Fragment} /* ... */>
                    <div className="fixed inset-0 bg-black bg-opacity-25 dark:bg-opacity-50" />
                 </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child as={Fragment} /* ... */>
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                                    Manage Roles for {user?.email}
                                </Dialog.Title>

                                <div className="mt-4 space-y-2">
                                     {availableRoles.length > 0 ? availableRoles.map(role => (
                                        <div key={role.id} className="flex items-center">
                                             <input
                                                 id={`role-${role.id}`}
                                                 name="roles"
                                                 type="checkbox"
                                                 className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600"
                                                 checked={selectedRoleIds.has(role.id)}
                                                 onChange={(e) => handleRoleChange(role.id, e.target.checked)}
                                                 disabled={isSaving}
                                             />
                                             <label htmlFor={`role-${role.id}`} className="ml-3 block text-sm text-gray-900 dark:text-gray-200">
                                                 {role.name}
                                                 {role.description && <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">({role.description})</span>}
                                             </label>
                                         </div>
                                     )) : <p className="text-sm text-gray-500">No roles available.</p>}
                                </div>

                                {error && (
                                    <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
                                )}

                                <div className="mt-6 flex justify-end space-x-3">
                                    <button type="button" onClick={closeModal} disabled={isSaving} /* ... Cancel styling ... */
                                        className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 dark:bg-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50"
                                    > Cancel </button>
                                    <button type="button" onClick={handleSave} disabled={isSaving} /* ... Save styling ... */
                                        className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50"
                                    > {isSaving ? 'Saving...' : 'Save Roles'} </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default ManageUserRolesModal;
