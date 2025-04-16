// src/pages/ApiKeysPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { PlusIcon } from '@heroicons/react/20/solid';
import { apiClient, ApiKey, ApiKeyCreateResponse } from '../services/api'; // Import types if defined in api.ts
import ApiKeyList from '../components/ApiKeyList'; // We will create this
import CreateApiKeyModal from '../components/CreateApiKeyModal'; // We will create this
import ShowApiKeyModal from '../components/ShowApiKeyModal'; // We will create this

// Define types locally if not exported from api.ts
// interface ApiKey { id: number; name: string; prefix: string; is_active: boolean; created_at: string; updated_at: string; last_used_at?: string; user_id: number;}
// interface ApiKeyCreateResponse extends ApiKey { full_key: string; }

const ApiKeysPage: React.FC = () => {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
    const [isShowKeyModalOpen, setIsShowKeyModalOpen] = useState<boolean>(false);
    const [newlyCreatedKey, setNewlyCreatedKey] = useState<ApiKeyCreateResponse | null>(null);

    const fetchKeys = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const fetchedKeys = await apiClient<ApiKey[]>('/apikeys/'); // Use GET endpoint
            setKeys(fetchedKeys);
        } catch (err: any) {
            setError(err.message || "Failed to fetch API keys.");
        } finally {
            setIsLoading(false);
        }
    }, []); // Empty dependency array means this function doesn't change

    useEffect(() => {
        fetchKeys();
    }, [fetchKeys]); // Fetch keys when the component mounts

    const handleCreateSuccess = (newKeyData: ApiKeyCreateResponse) => {
        setIsCreateModalOpen(false); // Close create modal
        setNewlyCreatedKey(newKeyData); // Store the new key data (including full_key)
        setIsShowKeyModalOpen(true); // Open the show key modal
        fetchKeys(); // Refresh the list in the background
    };

    const handleShowKeyModalClose = () => {
        setIsShowKeyModalOpen(false);
        setNewlyCreatedKey(null); // Clear the sensitive key data
    };

    const handleDeleteSuccess = () => {
        fetchKeys(); // Refresh the list after deletion
        // Optionally show a success message
    };

    return (
        <div>
            <div className="sm:flex sm:items-center sm:justify-between mb-6">
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">API Keys</h1>
                <div className="mt-3 sm:mt-0 sm:ml-4">
                     <button
                        type="button"
                        onClick={() => setIsCreateModalOpen(true)}
                        className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                    >
                        <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                        Create API Key
                    </button>
                </div>
            </div>

            {isLoading && <p className="text-gray-500 dark:text-gray-400">Loading API keys...</p>}
            {error && <p className="text-red-600 dark:text-red-400">Error: {error}</p>}

            {!isLoading && !error && (
                <ApiKeyList keys={keys} onDeleteSuccess={handleDeleteSuccess} />
            )}

            {/* Modals */}
            <CreateApiKeyModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={handleCreateSuccess}
            />

            {newlyCreatedKey && (
                 <ShowApiKeyModal
                    isOpen={isShowKeyModalOpen}
                    onClose={handleShowKeyModalClose}
                    apiKeyData={newlyCreatedKey}
                />
            )}
        </div>
    );
};

export default ApiKeysPage;
