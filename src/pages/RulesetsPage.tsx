// src/pages/RulesetsPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { PlusIcon } from '@heroicons/react/24/solid';
import RulesetListTable from '../components/RulesetListTable';
import CreateRulesetModal from '../components/CreateRulesetModal';
// Ensure API functions are correctly imported
import { getRulesets, deleteRuleset } from '../services/api';
import { useAuth } from '../context/AuthContext';
// Ensure schema type is correctly imported
import { Ruleset } from '../schemas'; // Or from '../services/api' if defined there

const RulesetsPage: React.FC = () => {
    // Still need auth context to check *if* logged in, but not for passing token
    const { user } = useAuth();
    const [rulesets, setRulesets] = useState<Ruleset[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Fetch data function - no token argument needed
    const fetchRulesetsData = useCallback(async () => {
        // No need to check for token here, apiClient handles it
        setIsLoading(true);
        setError(null);
        try {
            console.log("Fetching rulesets...");
            // Call getRulesets without token - apiClient handles auth
            const fetchedRulesets = await getRulesets(/* pass skip/limit if needed */);
            console.log("Fetched rulesets:", fetchedRulesets);
            setRulesets(fetchedRulesets);
        } catch (err: any) {
            console.error("Error fetching rulesets:", err);
            // Use error message from API call, check for specific statuses if needed
             if (err.status === 401) {
                // Although apiClient calls logout, setting error might still be useful
                setError("Authentication error. Please log in again.");
            } else {
                setError(err.message || "Failed to fetch rulesets.");
            }
        } finally {
            setIsLoading(false);
        }
    }, []); // No dependencies needed unless using pagination state

    // Fetch on component mount only if user is logged in
    useEffect(() => {
        if (user) { // Check if user object exists (means logged in)
            fetchRulesetsData();
        } else {
            // If not logged in, don't fetch, set appropriate state
            setIsLoading(false);
            setError("Please log in to view rulesets.");
            setRulesets([]); // Clear any potentially stale data
        }
    }, [fetchRulesetsData, user]); // Re-fetch if user logs in/out

    // Callback for successful creation from the modal
    const handleRulesetCreated = (newRuleset: Ruleset) => {
        console.log('New ruleset created:', newRuleset);
        // Optimistic UI update: add to the list
        setRulesets(prevRulesets => [newRuleset, ...prevRulesets]);
        // Optionally show a success notification
        // fetchRulesetsData(); // Or re-fetch the entire list if strict ordering/pagination matters
    };

    // Callback for deleting a ruleset - no token argument needed
    const handleDeleteRuleset = async (id: number) => {
        // Confirmation dialog
        if (!window.confirm(`Are you sure you want to delete ruleset ID ${id}? This action cannot be undone.`)) {
            return;
        }

        const originalRulesets = [...rulesets]; // Store for potential rollback
        // Optimistic UI update
        setRulesets(prev => prev.filter(rs => rs.id !== id));
        setError(null); // Clear previous errors

        try {
            console.log(`Attempting to delete ruleset ID: ${id}`);
            // Call deleteRuleset without token - apiClient handles auth
            await deleteRuleset(id);
            console.log(`Ruleset ${id} deleted successfully.`);
            // Optionally show a success notification
        } catch (err: any) {
            console.error(`Failed to delete ruleset ID ${id}:`, err);
            // Revert UI update on failure
            setRulesets(originalRulesets);
            // Set error message based on API response
            if (err.status === 401) {
                setError("Authentication error. Please log in again.");
            } else if (err.status === 404) {
                 setError(`Ruleset ID ${id} not found.`);
            }
            else {
                 setError(`Failed to delete ruleset ID ${id}. ${err.message || 'Please try again.'}`);
            }
        }
    };

    // Determine content based on state
    let content;
    if (isLoading) {
        content = <p className="text-center text-gray-500 dark:text-gray-400 py-4">Loading rulesets...</p>;
    } else if (error) {
         content = (
            <div className="my-4 rounded-md bg-red-50 p-4 dark:bg-red-900">
                 <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
             </div>
         );
    } else if (!user) {
        // This case should be covered by the error state set in useEffect, but as a fallback:
        content = <p className="text-center text-gray-500 dark:text-gray-400 py-4">Please log in to view rulesets.</p>;
    } else if (rulesets.length === 0) {
        content = <p className="text-center text-gray-500 dark:text-gray-400 py-4">No rulesets found.</p>;
    }
    else {
        content = (
             <RulesetListTable
                 rulesets={rulesets}
                 onDelete={handleDeleteRuleset} // Pass the delete handler
                 // Add onEdit prop later if needed
                 // onStatusToggle={handleStatusToggle} // Add status toggle later
             />
        );
    }


    return (
        <div className="container mx-auto px-4 py-8">
            {/* Page Header */}
            <div className="sm:flex sm:items-center sm:justify-between mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                    Rule Sets
                </h1>
                 {/* Only show Create button if logged in */}
                 {user && (
                     <div className="mt-3 sm:mt-0 sm:ml-4">
                         <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                        >
                            <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                            Create Ruleset
                        </button>
                    </div>
                 )}
            </div>

            {/* Render Content (Loading/Error/Table/Messages) */}
            {content}

            {/* Render the Create Ruleset Modal (conditionally rendered internally based on isOpen) */}
            <CreateRulesetModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={handleRulesetCreated}
            />
        </div>
    );
};

export default RulesetsPage;
