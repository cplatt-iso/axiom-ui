// src/pages/RulesetsPage.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PlusIcon } from '@heroicons/react/24/solid';
import RulesetListTable from '../components/RulesetListTable';
import CreateRulesetModal from '../components/CreateRulesetModal';
import { getRulesets, deleteRuleset, updateRuleset, Ruleset } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { BeakerIcon } from '@heroicons/react/24/outline'; // Use the icon for empty state

const RulesetsPage: React.FC = () => {
    const { user } = useAuth();
    const [rulesets, setRulesets] = useState<Ruleset[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const isInitialLoad = useRef(true);

    // Stabilized Fetch function
    const fetchData = useCallback(async () => {
        console.log("RulesetsPage: fetchData START");
        try {
            console.log("RulesetsPage: Calling getRulesets...");
            const fetchedRulesets = await getRulesets();
            console.log("RulesetsPage: API call successful");
            setRulesets(fetchedRulesets);
            setError(null);
        } catch (err: any) {
            console.error("Error fetching rulesets:", err);
            if (err.status === 401) { setError("Authentication error. Please log in again."); }
            else { setError(err.message || "Failed to fetch rulesets."); }
            setRulesets([]);
        } finally {
            if (isInitialLoad.current) {
                console.log("RulesetsPage: fetchData FINALLY - Setting initial isLoading to false");
                setIsLoading(false);
                isInitialLoad.current = false;
            } else {
                 console.log("RulesetsPage: fetchData FINALLY - Subsequent fetch");
            }
        }
    }, []); // Stable callback

    // Initial fetch effect
    useEffect(() => {
        console.log("RulesetsPage Mounted - Checking user and running initial fetch effect...");
        if (user) {
            setIsLoading(true);
            isInitialLoad.current = true;
            fetchData();
        } else {
            console.log("RulesetsPage: No user found on mount, setting error.");
            setIsLoading(false);
            isInitialLoad.current = false;
            setError("Please log in to view rulesets.");
            setRulesets([]);
        }
    }, [user, fetchData]); // Depend on user and stable fetchData

    // Create Handler
    const handleRulesetCreated = (newRuleset: Ruleset) => {
        console.log('New ruleset created:', newRuleset);
        setRulesets(prevRulesets => [newRuleset, ...prevRulesets]);
        setIsCreateModalOpen(false);
    };

    // Delete Handler
    const handleDeleteRuleset = async (id: number) => {
        const rulesetToDelete = rulesets.find(rs => rs.id === id); if (!rulesetToDelete) return;
        if (!window.confirm(`Are you sure you want to delete ruleset "${rulesetToDelete.name}" (ID: ${id})? ...`)) return;
        const originalRulesets = [...rulesets]; setRulesets(prev => prev.filter(rs => rs.id !== id)); setError(null);
        try { await deleteRuleset(id); console.log(`Ruleset ${id} deleted.`); /* Optionally fetchData(); */ }
        catch (err: any) { console.error(`Failed to delete ruleset ID ${id}:`, err); setRulesets(originalRulesets); setError(err.message || `Failed to delete ruleset ID ${id}.`); }
    };

    // Toggle Status Handler
    const handleStatusToggle = async (rulesetId: number, newStatus: boolean) => {
        const originalRulesets = [...rulesets]; const rulesetIndex = rulesets.findIndex(rs => rs.id === rulesetId); if (rulesetIndex === -1) return;
        const actionText = newStatus ? 'ACTIVATE' : 'DEACTIVATE'; if (!window.confirm(`Are you sure you want to ${actionText} ruleset "${rulesets[rulesetIndex].name}"?`)) return;
        setRulesets(prev => prev.map(rs => rs.id === rulesetId ? { ...rs, is_active: newStatus } : rs )); setError(null);
        try { await updateRuleset(rulesetId, { is_active: newStatus }); console.log(`Ruleset ${rulesetId} status toggled.`); /* Optionally fetchData(); */ }
        catch (err: any) { console.error(`Failed to toggle status for ruleset ${rulesetId}:`, err); setRulesets(originalRulesets); setError(err.message || `Failed to toggle ruleset status.`); }
    };

    // --- Render Logic ---
    let content;
    console.log("RulesetsPage Rendering - State:", { isLoading, error, rulesetsCount: rulesets.length, userExists: !!user });

    if (isLoading) {
        content = <p className="text-center text-gray-500 dark:text-gray-400 py-10">Loading rulesets...</p>;
    } else if (error) {
         content = ( <div className="my-4 rounded-md bg-red-50 p-4 dark:bg-red-900"> <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p> </div> );
    } else if (!user) {
        content = <p className="text-center text-gray-500 dark:text-gray-400 py-10">Please log in to view rulesets.</p>;
    } else if (rulesets.length === 0) {
        // --- Restore the empty state JSX ---
        content = (
             <div className="text-center py-10">
                <BeakerIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No rulesets found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by creating a new ruleset.</p>
                <div className="mt-6">
                     <button
                        type="button"
                        onClick={() => setIsCreateModalOpen(true)}
                        className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    >
                        <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                        Create Ruleset
                    </button>
                </div>
            </div>
        );
         // --- End Restore ---
    } else {
        content = (
             <RulesetListTable
                 rulesets={rulesets}
                 onDelete={handleDeleteRuleset}
                 onStatusToggled={handleStatusToggle}
             />
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="sm:flex sm:items-center sm:justify-between mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100"> Rule Sets </h1>
                 {user && rulesets.length > 0 && ( /* Header Create Button */
                     <div className="mt-3 sm:mt-0 sm:ml-4">
                          <button onClick={() => setIsCreateModalOpen(true)} className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800" >
                              <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" /> Create Ruleset
                          </button>
                      </div>
                 )}
            </div>

            {content}

            <CreateRulesetModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={handleRulesetCreated}
            />
        </div>
    );
};

export default RulesetsPage;
