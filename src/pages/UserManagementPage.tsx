// src/pages/UserManagementPage.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserWithRoles, Role, getUsers, getRoles, updateUser } from '../services/api';
import UserManagementTable from '../components/UserManagementTable';
import ManageUserRolesModal from '../components/ManageUserRolesModal';
import { UserCircleIcon } from '@heroicons/react/24/outline';

const UserManagementPage: React.FC = () => {
    const [users, setUsers] = useState<UserWithRoles[]>([]);
    const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true); // For initial load only
    const [error, setError] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
    const [isRolesModalOpen, setIsRolesModalOpen] = useState<boolean>(false);
    const isInitialLoad = useRef(true);

    // Fetch both users and roles - Stabilized useCallback
    const fetchData = useCallback(async () => {
        console.log("fetchData START");
        try {
            console.log("fetchData: Calling getUsers and getRoles...");
            const [fetchedUsers, fetchedRoles] = await Promise.all([ getUsers(), getRoles() ]);
            console.log("fetchData: API calls successful");
            setUsers(fetchedUsers);
            setAvailableRoles(fetchedRoles);
            setError(null); // Clear error on success
        } catch (err: any) {
            console.error("Failed to fetch user management data:", err);
            setError(err.message || "Failed to fetch users or roles.");
            setUsers([]); setAvailableRoles([]); // Clear data on error
        } finally {
            if (isInitialLoad.current) {
                console.log("fetchData FINALLY - Setting initial isLoading to false");
                setIsLoading(false);
                isInitialLoad.current = false;
            } else {
                console.log("fetchData FINALLY - Subsequent fetch, not changing isLoading");
            }
        }
    }, []); // Empty dependency array makes fetchData stable

    // Initial data fetch effect - Runs only ONCE
    useEffect(() => {
        console.log("UserManagementPage Mounted - Running initial fetch effect");
        setIsLoading(true);
        isInitialLoad.current = true;
        fetchData();
    }, [fetchData]); // Depend on stable fetchData

    // --- Handlers for Modal, Toggle, etc. ---
    const handleEditRoles = (user: UserWithRoles) => { setSelectedUser(user); setIsRolesModalOpen(true); };
    const handleCloseRolesModal = () => { setIsRolesModalOpen(false); setSelectedUser(null); };
    const handleRoleUpdateSuccess = () => { fetchData(); /* TODO: notify */ };
    const handleToggleActive = async (userToToggle: UserWithRoles) => {
        const originalUsers = [...users]; const newStatus = !userToToggle.is_active; const actionText = newStatus ? 'ACTIVATE' : 'DEACTIVATE';
        if (!window.confirm(`Are you sure you want to ${actionText} user ${userToToggle.email}?`)) return;
        setUsers(prevUsers => prevUsers.map(user => user.id === userToToggle.id ? { ...user, is_active: newStatus } : user )); setError(null);
        try { await updateUser(userToToggle.id, { is_active: newStatus }); console.log(`User ${userToToggle.email} status toggled successfully.`); /* TODO: notify */ }
        catch (err: any) { console.error(`Failed to toggle status for user ${userToToggle.email}:`, err); setError(err.message || `Failed to update user status.`); setUsers(originalUsers); /* TODO: notify */ }
    };


    // --- Render Logic ---
    let content;
    if (isLoading) {
        content = <p className="text-center text-gray-500 dark:text-gray-400 py-10">Loading users and roles...</p>;
    } else if (error) {
         // --- Replace comment with actual JSX ---
         content = (
            <div className="my-4 rounded-md bg-red-50 p-4 dark:bg-red-900">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">Error: {error}</p>
            </div>
         );
         // --- End Replace ---
    } else if (users.length === 0) {
         // --- Replace comment with actual JSX ---
         content = (
            <div className="text-center py-10">
                <UserCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No users found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">No users match the current criteria or exist in the system yet.</p>
            </div>
         );
          // --- End Replace ---
    }
    else {
        content = (
            <UserManagementTable
                users={users}
                onEditRoles={handleEditRoles}
                onToggleActive={handleToggleActive}
            />
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="sm:flex sm:items-center sm:justify-between mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                    User Management
                </h1>
            </div>
            {content}
            <ManageUserRolesModal
                isOpen={isRolesModalOpen && selectedUser !== null}
                onClose={handleCloseRolesModal}
                user={selectedUser}
                availableRoles={availableRoles}
                onUpdateSuccess={handleRoleUpdateSuccess}
            />
        </div>
    );
};

export default UserManagementPage;
