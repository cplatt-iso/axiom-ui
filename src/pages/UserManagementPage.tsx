// src/pages/UserManagementPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { UserWithRoles, Role, getUsers, getRoles, updateUser } from '../services/api';
import UserManagementTable from '../components/UserManagementTable';
import ManageUserRolesModal from '../components/ManageUserRolesModal';

const UserManagementPage: React.FC = () => {
    const [users, setUsers] = useState<UserWithRoles[]>([]);
    const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
    const [isRolesModalOpen, setIsRolesModalOpen] = useState<boolean>(false);

    // Fetch both users and roles
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Fetch in parallel
            const [fetchedUsers, fetchedRoles] = await Promise.all([
                getUsers(), // Add pagination params later if needed
                getRoles()
            ]);
            setUsers(fetchedUsers);
            setAvailableRoles(fetchedRoles);
        } catch (err: any) {
            setError(err.message || "Failed to fetch data.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handler for opening the roles modal
    const handleEditRoles = (user: UserWithRoles) => {
        setSelectedUser(user);
        setIsRolesModalOpen(true);
    };

    // Handler for closing the roles modal
    const handleCloseRolesModal = () => {
        setIsRolesModalOpen(false);
        setSelectedUser(null); // Clear selected user
    };

    // Handler for toggling user active status
    const handleToggleActive = async (user: UserWithRoles) => {
        // Optimistic UI update can be added later
         if (!window.confirm(`Are you sure you want to ${user.is_active ? 'DEACTIVATE' : 'ACTIVATE'} user ${user.email}?`)) {
             return;
         }

        try {
            await updateUser(user.id, { is_active: !user.is_active });
            // Refresh data after successful update
            fetchData();
             // Show success notification later
        } catch (err: any) {
             setError(err.message || `Failed to update user status.`);
              // Revert optimistic update if implemented
        }
    };

    // Callback for when roles are successfully updated in the modal
    const handleRoleUpdateSuccess = () => {
        fetchData(); // Refresh the user list
         // Show success notification later
    };

    return (
        <div>
            <div className="sm:flex sm:items-center sm:justify-between mb-6">
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">User Management</h1>
                {/* Add Create User button later if needed */}
            </div>

            {isLoading && <p className="text-gray-500 dark:text-gray-400">Loading users and roles...</p>}
            {error && <p className="text-red-600 dark:text-red-400">Error: {error}</p>}

            {!isLoading && !error && (
                <UserManagementTable
                    users={users}
                    onEditRoles={handleEditRoles}
                    onToggleActive={handleToggleActive}
                />
            )}

            {/* Render modal conditionally */}
            <ManageUserRolesModal
                isOpen={isRolesModalOpen}
                onClose={handleCloseRolesModal}
                user={selectedUser}
                availableRoles={availableRoles}
                onUpdateSuccess={handleRoleUpdateSuccess}
            />
        </div>
    );
};

export default UserManagementPage;
