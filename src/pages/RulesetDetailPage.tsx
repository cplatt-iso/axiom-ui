// src/pages/RulesetDetailPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, PlusIcon } from '@heroicons/react/24/solid';
// Import updateRule API function
import { getRulesetById, getRulesByRuleset, deleteRule, updateRule } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Ruleset, Rule } from '../schemas';
import RuleListTable from '../components/RuleListTable';
import RuleFormModal from '../components/RuleFormModal';

const RulesetDetailPage: React.FC = () => {
    const { rulesetId } = useParams<{ rulesetId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [ruleset, setRuleset] = useState<Ruleset | null>(null);
    const [rules, setRules] = useState<Rule[]>([]);
    const [isLoading, setIsLoading] = useState(true); // Loading for initial fetch
    const [isToggling, setIsToggling] = useState<number | null>(null); // Track which rule ID is being toggled
    const [error, setError] = useState<string | null>(null);
    const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<Rule | null>(null);

    const numericRulesetId = rulesetId ? parseInt(rulesetId, 10) : NaN;

    // --- Fetch Data (remains the same) ---
    const fetchData = useCallback(async () => {
        // ... (fetch implementation as before) ...
        if (isNaN(numericRulesetId)) { setError("Invalid Ruleset ID specified in URL."); setIsLoading(false); return; }
        if (!user) { setError("Please log in to view ruleset details."); setIsLoading(false); return; }
        setIsLoading(true); setError(null);
        try {
            const [rulesetData, rulesData] = await Promise.all([ getRulesetById(numericRulesetId), getRulesByRuleset(numericRulesetId) ]);
            setRuleset(rulesetData); setRules(rulesData);
        } catch (err: any) { console.error("Error fetching ruleset details or rules:", err); setError(err.message || "Failed to load ruleset data."); }
        finally { setIsLoading(false); }
    }, [numericRulesetId, user]);

    useEffect(() => {
        if (!isNaN(numericRulesetId)) { fetchData(); }
        else { setError("Invalid Ruleset ID specified in URL."); setIsLoading(false); }
    }, [fetchData, numericRulesetId]);

    // --- Modal Handlers (remain the same) ---
    const handleOpenCreateRuleModal = () => { setEditingRule(null); setIsRuleModalOpen(true); };
    const handleOpenEditRuleModal = (rule: Rule) => { setEditingRule(rule); setIsRuleModalOpen(true); };
    const handleCloseRuleModal = () => { setIsRuleModalOpen(false); setEditingRule(null); };
    const handleRuleSaveSuccess = () => { fetchData(); handleCloseRuleModal(); };

    // --- Rule Deletion Handler (remains the same) ---
    const handleDeleteRule = async (ruleId: number) => {
        // ... (delete implementation as before) ...
       if (!window.confirm(`Are you sure you want to delete rule ID ${ruleId}?`)) { return; } setError(null);
       try { await deleteRule(ruleId); fetchData(); }
       catch (err: any) { console.error(`Failed to delete rule ID ${ruleId}:`, err); setError(`Failed to delete rule ID ${ruleId}. ${err.message || 'Please try again.'}`); }
    };

    // --- Add Handler for Toggling Rule Status ---
    const handleToggleRuleStatus = async (ruleId: number, newStatus: boolean) => {
        const originalRules = [...rules]; // For potential rollback on error
        const ruleIndex = rules.findIndex(r => r.id === ruleId);
        if (ruleIndex === -1) return; // Rule not found

        // Optional: Confirmation
        const actionText = newStatus ? 'activate' : 'deactivate';
        if (!window.confirm(`Are you sure you want to ${actionText} rule "${rules[ruleIndex].name}"?`)) {
            return;
        }

        setIsToggling(ruleId); // Set loading state for this specific rule
        setError(null);

        // Optimistic UI Update
        setRules(prevRules =>
            prevRules.map(rule =>
                rule.id === ruleId ? { ...rule, is_active: newStatus } : rule
            )
        );

        try {
            // Call API to update the rule's active status
            await updateRule(ruleId, { is_active: newStatus });
            // Success: State is already updated optimistically
            console.log(`Rule ${ruleId} status toggled successfully to ${newStatus}.`);
            // Optionally show success toast
        } catch (err: any) {
            console.error(`Failed to toggle status for rule ID ${ruleId}:`, err);
            setError(`Failed to toggle status for rule ${ruleId}. ${err.message || 'Please try again.'}`);
            // Rollback UI on error
            setRules(originalRules);
        } finally {
            setIsToggling(null); // Clear loading state for this rule
        }
    };
    // --- End Add Handler ---


    // --- Render Logic ---
    if (isLoading) { return <div className="container mx-auto px-4 py-8 text-center text-gray-500 dark:text-gray-400">Loading ruleset details...</div>; }
    if (error) { /* ... error display ... */ return ( <div className="container mx-auto px-4 py-8"> <Link to="/rulesets" className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 mb-4"> <ArrowLeftIcon className="h-5 w-5 mr-1" /> Back to Rulesets </Link> <div className="my-4 rounded-md bg-red-50 p-4 dark:bg-red-900"> <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p> </div> </div> ); }
    if (!ruleset) { /* ... not found display ... */ return ( <div className="container mx-auto px-4 py-8"> <Link to="/rulesets" className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 mb-4"> <ArrowLeftIcon className="h-5 w-5 mr-1" /> Back to Rulesets </Link> <p className="text-center text-gray-500 dark:text-gray-400">Ruleset not found.</p> </div> ); }


    return (
        <div className="container mx-auto px-4 py-8">
             <Link to="/rulesets" className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 mb-4"> <ArrowLeftIcon className="h-5 w-5 mr-1" /> Back to Rulesets </Link>

            {/* Ruleset Header */}
             <div className="mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
                 <div className="flex justify-between items-center"> <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100"> {ruleset.name} </h1> </div>
                {ruleset.description && ( <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{ruleset.description}</p> )}
            </div>

            {/* Rules Section Header */}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200">Rules</h2>
                 <button onClick={handleOpenCreateRuleModal} className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800" > <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" /> Add Rule </button>
            </div>

            {/* Rule List Table - Pass the new handler */}
            <RuleListTable
                rules={rules}
                onEdit={handleOpenEditRuleModal}
                onDelete={handleDeleteRule}
                onToggleStatus={handleToggleRuleStatus} // <-- Pass the handler here
            />

            {/* Rule Form Modal Integration */}
            {!isNaN(numericRulesetId) && (
                <RuleFormModal
                    isOpen={isRuleModalOpen}
                    onClose={handleCloseRuleModal}
                    onSuccess={handleRuleSaveSuccess}
                    rulesetId={numericRulesetId}
                    existingRule={editingRule}
                />
            )}
        </div>
    );
};

export default RulesetDetailPage;
