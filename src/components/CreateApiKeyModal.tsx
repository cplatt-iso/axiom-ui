// src/components/CreateApiKeyModal.tsx
import React, { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { apiClient, ApiKeyCreateResponse } from '../services/api'; // Import types

// Define types locally if not exported from api.ts
// interface ApiKeyCreateResponse { id: number; name: string; prefix: string; is_active: boolean; created_at: string; updated_at: string; last_used_at?: string; user_id: number; full_key: string; }


interface CreateApiKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newKeyData: ApiKeyCreateResponse) => void;
}

const CreateApiKeyModal: React.FC<CreateApiKeyModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [keyName, setKeyName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

     const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault(); // Prevent default form submission
        if (!keyName.trim()) {
            setError("Key name cannot be empty.");
            return;
        }
        setIsCreating(true);
        setError(null);
        try {
            const newKeyData = await apiClient<ApiKeyCreateResponse>('/apikeys/', {
                method: 'POST',
                body: JSON.stringify({ name: keyName }),
            });
            setKeyName(''); // Clear name on success
            onSuccess(newKeyData);
        } catch (err: any) {
            setError(err.message || "Failed to create key.");
        } finally {
            setIsCreating(false);
        }
    };

    // Close modal and reset state
    const closeModal = () => {
        if (isCreating) return; // Prevent closing while submitting
        setKeyName('');
        setError(null);
        onClose();
    }

    return (
         <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-10" onClose={closeModal}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
                    leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-25 dark:bg-opacity-50" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                                    Create New API Key
                                </Dialog.Title>
                                 <form onSubmit={handleCreate}>
                                    <div className="mt-4">
                                        <label htmlFor="keyName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Key Name
                                        </label>
                                        <input
                                            type="text"
                                            name="keyName"
                                            id="keyName"
                                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                                            value={keyName}
                                            onChange={(e) => setKeyName(e.target.value)}
                                            placeholder="e.g., My Script Key"
                                            maxLength={100}
                                            required
                                            disabled={isCreating}
                                        />
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                             Give your key a descriptive name.
                                        </p>
                                    </div>

                                    {error && (
                                        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
                                    )}

                                    <div className="mt-6 flex justify-end space-x-3">
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 dark:bg-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50"
                                            onClick={closeModal}
                                            disabled={isCreating}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50"
                                            disabled={isCreating || !keyName.trim()}
                                        >
                                            {isCreating ? 'Creating...' : 'Create Key'}
                                        </button>
                                    </div>
                                 </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default CreateApiKeyModal;
