// src/components/CreateRulesetModal.tsx
import React, { useState, useEffect, Fragment, FormEvent } from 'react'; // Added useEffect
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
// --- Import updateRuleset ---
import { createRuleset, updateRuleset } from '../services/api';
// --- Import Ruleset, RulesetCreate, AND RulesetUpdate schemas ---
import { Ruleset, RulesetCreate, RulesetUpdate } from '../schemas';

interface CreateRulesetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedRuleset: Ruleset) => void; // Callback after successful creation OR update
  existingRuleset: Ruleset | null; // <-- Prop to receive the ruleset for editing
}

const CreateRulesetModal: React.FC<CreateRulesetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  existingRuleset, // <-- Use the prop
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  // --- ADDED: State for priority and execution_mode (for edit mode) ---
  const [priority, setPriority] = useState(0);
  const [executionMode, setExecutionMode] = useState<"FIRST_MATCH" | "ALL_MATCHES">("FIRST_MATCH");
  // --- END ADDED ---
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!existingRuleset; // Determine mode based on prop

  // --- useEffect to populate form when editing ---
  useEffect(() => {
    if (isOpen) {
        if (existingRuleset) {
            // Populate form with existing data
            setName(existingRuleset.name);
            setDescription(existingRuleset.description ?? '');
            setPriority(existingRuleset.priority ?? 0); // Use existing priority
            setExecutionMode(existingRuleset.execution_mode ?? "FIRST_MATCH"); // Use existing mode
            // Note: is_active is handled in the parent page, not usually edited here directly
        } else {
            // Reset form for creation
            setName('');
            setDescription('');
            setPriority(0); // Default priority for create
            setExecutionMode("FIRST_MATCH"); // Default mode for create
        }
        setError(null); // Clear errors when opening/switching mode
        setIsLoading(false);
    }
  }, [isOpen, existingRuleset]); // Re-run when modal opens or the ruleset changes
  // --- End useEffect ---

  const resetForm = () => {
    // Reset internal state (already handled by useEffect)
    setError(null);
    setIsLoading(false);
  };

  const handleClose = () => {
    resetForm(); // Keep internal reset logic if needed elsewhere
    onClose();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
        setError('Ruleset name is required.');
        return;
    }
    setIsLoading(true);
    setError(null);

    // --- Choose payload based on mode ---
    if (isEditMode && existingRuleset) {
        // Prepare update payload
        const rulesetUpdateData: RulesetUpdate = {
            name: name.trim(),
            description: description.trim() || null,
            priority: priority,
            execution_mode: executionMode,
            // is_active is handled by the toggle button on the main page table
        };
        try {
            const updatedRuleset = await updateRuleset(existingRuleset.id, rulesetUpdateData);
            onSuccess(updatedRuleset);
            handleClose();
        } catch (err: any) {
             console.error('Failed to update ruleset:', err);
             setError(err.message || 'Failed to update ruleset. Please try again.');
             setIsLoading(false);
        }

    } else {
        // Prepare create payload
        const rulesetCreateData: RulesetCreate = {
            name: name.trim(),
            description: description.trim() || null,
            priority: priority,
            execution_mode: executionMode,
            is_active: true, // Default to active on creation? Or make it a form field?
        };
        try {
          const newRuleset = await createRuleset(rulesetCreateData);
          onSuccess(newRuleset);
          handleClose();
        } catch (err: any) {
          console.error('Failed to create ruleset:', err);
          setError(err.message || 'Failed to create ruleset. Please try again.');
          setIsLoading(false);
        }
    }
    // --- End Payload Choice ---
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={handleClose}>
        {/* Modal backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25 dark:bg-opacity-50" />
        </Transition.Child>

        {/* Modal content */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 flex justify-between items-center"
                >
                  {/* --- Dynamic Title --- */}
                  {isEditMode ? 'Edit Ruleset' : 'Create New Ruleset'}
                  {/* --- End Dynamic Title --- */}
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none"
                    aria-label="Close"
                    disabled={isLoading} // Disable close button while loading
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </Dialog.Title>
                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                   {error && (
                    <div className="rounded-md bg-red-50 p-4 dark:bg-red-900">
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
                    </div>
                  )}
                  {/* Name Input */}
                  <div>
                    <label
                      htmlFor="rulesetName"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="rulesetName"
                      id="rulesetName"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                      placeholder="e.g., Research Study XYZ"
                      disabled={isLoading}
                    />
                  </div>
                  {/* Description Input */}
                  <div>
                    <label
                      htmlFor="rulesetDescription"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Description
                    </label>
                    <textarea
                      id="rulesetDescription"
                      name="rulesetDescription"
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                      placeholder="Optional description of the ruleset's purpose"
                      disabled={isLoading}
                    ></textarea>
                  </div>
                  {/* --- ADDED: Priority and Execution Mode for Edit --- */}
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label htmlFor="rulesetPriority" className="block text-sm font-medium text-gray-700 dark:text-gray-300"> Priority </label>
                         <input id="rulesetPriority" type="number" value={priority} onChange={(e) => setPriority(parseInt(e.target.value, 10) || 0)} disabled={isLoading} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm" />
                      </div>
                      <div>
                          <label htmlFor="rulesetExecMode" className="block text-sm font-medium text-gray-700 dark:text-gray-300"> Execution Mode </label>
                          <select id="rulesetExecMode" value={executionMode} onChange={(e) => setExecutionMode(e.target.value as "FIRST_MATCH" | "ALL_MATCHES")} disabled={isLoading} className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm" >
                              <option value="FIRST_MATCH">First Match</option>
                              <option value="ALL_MATCHES">All Matches</option>
                          </select>
                      </div>
                   </div>
                  {/* --- END ADDED --- */}

                  {/* Footer buttons */}
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isLoading}
                      className="inline-flex justify-center rounded-md border border-transparent bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || !name.trim()}
                      className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {/* --- Dynamic Button Text --- */}
                      {isLoading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Ruleset' : 'Create Ruleset')}
                      {/* --- End Dynamic Text --- */}
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

export default CreateRulesetModal; // Keep name for now, or rename to RulesetFormModal
