// src/pages/RulesetDetailPage.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react'; // Added useRef
import { useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon, PlusIcon } from '@heroicons/react/24/solid';
// Import updateRule API function for status toggle
import { getRulesetById, getRulesByRuleset, deleteRule, updateRule, Ruleset, Rule } from '../services/api'; // Import types
import { useAuth } from '../context/AuthContext';
import RuleListTable from '../components/RuleListTable';
import RuleFormModal from '../components/RuleFormModal';

const RulesetDetailPage: React.FC = () => {
    const { rulesetId } = useParams<{ rulesetId: string }>();
    useAuth();

    const [ruleset, setRuleset] = useState<Ruleset | null>(null);
    const [rules, setRules] = useState<Rule[]>([]);
    const [isLoading, setIsLoading] = useState(true); // For initial load only
    const [error, setError] = useState<string | null>(null);
    const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<Rule | null>(null);
    const isInitialLoad = useRef(true); // Ref for initial load

    const numericRulesetId = rulesetId ? parseInt(rulesetId, 10) : NaN;

    // Stabilized Fetch Data Function
    const fetchData = useCallback(async () => {
        if (isNaN(numericRulesetId)) return; // Guard against invalid ID

        console.log("RulesetDetailPage: fetchData START");
        // Don't set isLoading=true here for refetches
        // setError(null); // Optional clear error

        try {
            console.log("RulesetDetailPage: Calling getRulesetById and getRulesByRuleset...");
            const [rulesetData, rulesData] = await Promise.all([
                getRulesetById(numericRulesetId),
                getRulesByRuleset(numericRulesetId)
            ]);
            console.log("RulesetDetailPage: API calls successful", { rulesetData, rulesData });
            setRuleset(rulesetData);
            setRules(rulesData);
            setError(null); // Clear error on success
        } catch (err: any) {
            console.error("Error fetching ruleset details or rules:", err);
            setError(err.message || "Failed to load ruleset data.");
            setRuleset(null); setRules([]); // Clear data on error
        } finally {
            // Only set initial isLoading to false ONCE
            if (isInitialLoad.current) {
                console.log("RulesetDetailPage: fetchData FINALLY - Setting initial isLoading to false");
                setIsLoading(false);
                isInitialLoad.current = false;
            } else {
                 console.log("RulesetDetailPage: fetchData FINALLY - Subsequent fetch");
            }
        }
    }, [numericRulesetId]); // Depend only on ID - if ID changes, refetch

    // Initial fetch effect - run only once per valid ID
    useEffect(() => {
        console.log("RulesetDetailPage Mounted - Checking ID and running initial fetch effect...");
        if (!isNaN(numericRulesetId)) {
             setIsLoading(true); // Set loading true only for the very first fetch for this ID
             isInitialLoad.current = true;
            fetchData();
        } else {
            console.log("RulesetDetailPage: Invalid ID on mount.");
            setError("Invalid Ruleset ID specified in URL.");
            setIsLoading(false);
            isInitialLoad.current = false;
             setRuleset(null); setRules([]);
        }
    // Depend on fetchData (stable) and numericRulesetId
    }, [numericRulesetId, fetchData]);

    // --- Stabilized Handlers ---
    const handleOpenCreateRuleModal = useCallback(() => { setEditingRule(null); setIsRuleModalOpen(true); }, []);
    const handleOpenEditRuleModal = useCallback((rule: Rule) => { setEditingRule(rule); setIsRuleModalOpen(true); }, []);
    const handleCloseRuleModal = useCallback(() => { setIsRuleModalOpen(false); setEditingRule(null); }, []);
    const handleRuleSaveSuccess = useCallback(() => { fetchData(); handleCloseRuleModal(); /* TODO: Notify */ }, [fetchData, handleCloseRuleModal]);

    const handleDeleteRule = useCallback(async (ruleId: number) => {
       const ruleToDelete = rules.find(r => r.id === ruleId); if (!ruleToDelete) return;
       if (!window.confirm(`Are you sure you want to delete rule "${ruleToDelete.name}" (ID: ${ruleId})?`)) return;
       const originalRules = [...rules]; setRules(prev => prev.filter(r => r.id !== ruleId)); setError(null);
       try { await deleteRule(ruleId); console.log(`Rule ${ruleId} deleted.`); fetchData(); /* Refresh */ /* TODO: Notify */ }
       catch (err: any) { console.error(`Failed to delete rule ID ${ruleId}:`, err); setError(`Failed to delete rule ID ${ruleId}. ${err.message || 'Please try again.'}`); setRules(originalRules); /* TODO: Notify */ }
    }, [rules, fetchData]); // Depend on rules (for confirm message) and fetchData

    const handleToggleRuleStatus = useCallback(async (ruleId: number, newStatus: boolean) => {
        const originalRules = [...rules]; const ruleIndex = rules.findIndex(r => r.id === ruleId); if (ruleIndex === -1) return;
        const actionText = newStatus ? 'activate' : 'deactivate'; if (!window.confirm(`Are you sure you want to ${actionText} rule "${rules[ruleIndex].name}"?`)) return;
        setError(null);
        setRules(prevRules => prevRules.map(rule => rule.id === ruleId ? { ...rule, is_active: newStatus } : rule )); // Optimistic UI
        try { await updateRule(ruleId, { is_active: newStatus }); console.log(`Rule ${ruleId} status toggled.`); /* Optionally fetchData(); */ /* TODO: Notify */ }
        catch (err: any) { console.error(`Failed to toggle status for rule ID ${ruleId}:`, err); setError(`Failed to toggle status for rule ${ruleId}. ${err.message || 'Please try again.'}`); setRules(originalRules); /* TODO: Notify */ }
    }, [rules, fetchData]); // Depend on rules (for confirm) and fetchData
    // --- End Stabilized Handlers ---

    // --- Render Logic ---
    let pageContent; // Use a different variable name than table content
    if (isLoading) { pageContent = <p className="text-center text-gray-500 dark:text-gray-400 py-10">Loading ruleset details...</p>; }
    else if (error) { pageContent = ( <div className="my-4 rounded-md bg-red-50 p-4 dark:bg-red-900"> <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p> </div> ); }
    else if (!ruleset) { pageContent = <p className="text-center text-gray-500 dark:text-gray-400 py-10">Ruleset not found.</p>; }
    else {
        // Render table and modal only if ruleset loaded without error
        pageContent = (
            <>
                {/* Rules Section Header */}
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200">Rules</h2>
                    <button onClick={handleOpenCreateRuleModal} className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800" > <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" /> Add Rule </button>
                </div>
                {/* Rule List Table */}
                <RuleListTable
                    rules={rules}
                    onEdit={handleOpenEditRuleModal}
                    onDelete={handleDeleteRule}
                    onToggleStatus={handleToggleRuleStatus}
                />
                {/* Rule Form Modal */}
                {!isNaN(numericRulesetId) && (
                    <RuleFormModal
                        isOpen={isRuleModalOpen}
                        onClose={handleCloseRuleModal}
                        onSuccess={handleRuleSaveSuccess}
                        rulesetId={numericRulesetId}
                        existingRule={editingRule}
                    />
                 )}
            </>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
             <Link to="/rulesets" className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 mb-4"> <ArrowLeftIcon className="h-5 w-5 mr-1" /> Back to Rulesets </Link>

            {/* Ruleset Header - Render even if content is loading/error */}
            {ruleset && !isLoading && !error && ( // Only show header if ruleset loaded ok
                 <div className="mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
                     <div className="flex justify-between items-center"> <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100"> {ruleset.name} </h1> </div>
                    {ruleset.description && ( <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{ruleset.description}</p> )}
                </div>
            )}
             {/* Show placeholder or loading state for header if needed */}
             {(isLoading || error || !ruleset) && (
                  <div className="mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
                      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse"></div> {/* Placeholder for title */}
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mt-2 animate-pulse"></div> {/* Placeholder for description */}
                  </div>
             )}

            {/* Render Loading/Error/Content */}
            {pageContent}

        </div>
    );
};

export default RulesetDetailPage;
