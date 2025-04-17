// src/components/RuleFormModal.tsx
import React, { useState, useEffect, Fragment, FormEvent } from 'react';
import { Dialog, Transition, Switch } from '@headlessui/react';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import {
    Rule,
    RuleCreate,
    RuleUpdate,
    MatchCriterion,
    TagModification,
    StorageDestination,
    createRule,
    updateRule,
} from '../services/api';
import { DicomTagInfo, getTagInfo } from '../dicom/dictionary'; // Import tag info type and helper
import DicomTagCombobox from './DicomTagCombobox'; // Import the combobox component

// Define available options
const MATCH_OPERATORS = ['eq', 'ne', 'gt', 'lt', 'ge', 'le', 'contains', 'startswith', 'endswith', 'exists', 'notexists'];
const MODIFICATION_ACTIONS = ['set', 'delete'];
const DESTINATION_TYPES = ['dicom_cstore', 'filesystem'];

// Type for the destination state during editing, allowing config to be string
interface DestinationState extends Omit<StorageDestination, 'config'> {
    config: Record<string, any> | string;
}

// --- Define Base Input Styles ---
const baseInputStyles = "block w-full rounded-md shadow-sm sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 border focus:ring-indigo-500 disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed py-2 pl-3 px-3";
const errorInputStyles = "border-red-500 focus:border-red-500 focus:ring-red-500";
const normalInputStyles = "border-gray-300 dark:border-gray-600 focus:border-indigo-500";

interface RuleFormModalProps {
    isOpen: boolean;
    onClose: () => void; // Prop function from parent
    onSuccess: (rule: Rule) => void;
    rulesetId: number;
    existingRule: Rule | null;
}

const RuleFormModal: React.FC<RuleFormModalProps> = ({
    isOpen,
    onClose, // Receive from parent
    onSuccess,
    rulesetId,
    existingRule,
}) => {
    // --- Form State ---
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState(100);
    const [isActive, setIsActive] = useState(true);
    // State stores the GGGG,EEEE format for tags
    const [matchCriteria, setMatchCriteria] = useState<MatchCriterion[]>([]);
    const [tagModifications, setTagModifications] = useState<TagModification[]>([]);
    const [destinations, setDestinations] = useState<DestinationState[]>([]);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    // --- Initialize form ---
    useEffect(() => {
        if (isOpen) {
            setValidationErrors({});
            if (existingRule) {
                // Load data from existing rule
                setName(existingRule.name);
                setDescription(existingRule.description ?? '');
                setPriority(existingRule.priority);
                setIsActive(existingRule.is_active);
                // Load arrays, ensuring tags are GGGG,EEEE strings
                setMatchCriteria(JSON.parse(JSON.stringify(existingRule.match_criteria || [])));
                setTagModifications(JSON.parse(JSON.stringify(existingRule.tag_modifications || [])));
                setDestinations(existingRule.destinations?.map(d => ({
                    ...d,
                    config: typeof d.config === 'object' ? JSON.stringify(d.config, null, 2) : '{}'
                })) || []);
            } else {
                // Reset form for creating new rule
                setName(''); setDescription(''); setPriority(100); setIsActive(true);
                setMatchCriteria([]); setTagModifications([]); setDestinations([]);
            }
            setError(null); setIsLoading(false);
        }
    }, [isOpen, existingRule]);

    // --- Define a local close handler ---
    const handleDialogClose = () => {
        if (!isLoading) { // Prevent closing if loading
            onClose(); // Call the parent's onClose function
        }
    };

    // --- Handlers for Array Fields ---

    // Match Criteria
    const addMatchCriterion = () => setMatchCriteria([...matchCriteria, { tag: '', op: 'eq', value: '' }]);
    const updateMatchCriterion = (index: number, field: keyof MatchCriterion | 'tagInfo', value: any) => {
        const updated = [...matchCriteria];
        if (field === 'tagInfo') {
            // Value is DicomTagInfo | null from combobox onChange
            updated[index].tag = value ? value.tag : ''; // Store the "GGGG,EEEE" string
        } else {
             (updated[index] as any)[field] = value;
             if (field === 'op' && (value === 'exists' || value === 'notexists')) updated[index].value = undefined;
        }
        setMatchCriteria(updated);
        // Clear validation error for the specific field updated
        const key = `matchCriteria[${index}].${field === 'tagInfo' ? 'tag' : field}`;
        setValidationErrors(prev => { if (prev[key]) { const { [key]: _, ...rest } = prev; return rest; } return prev; });
    };
    const removeMatchCriterion = (index: number) => setMatchCriteria(matchCriteria.filter((_, i) => i !== index));

    // Tag Modifications
    const addTagModification = () => setTagModifications([...tagModifications, { action: 'set', tag: '', value: '', vr: '' }]);
    const updateTagModification = (index: number, field: keyof TagModification | 'tagInfo', value: any) => {
        const updated = [...tagModifications];
        let vrUpdateNeeded = false;
        let selectedTagInfo: DicomTagInfo | null = null;
        if (field === 'tagInfo') {
            selectedTagInfo = value; // Value is DicomTagInfo | null
            updated[index].tag = selectedTagInfo ? selectedTagInfo.tag : ''; // Store GGGG,EEEE string
            // Auto-populate VR if action is 'set' and a tag was selected
            if (selectedTagInfo && updated[index].action === 'set') { updated[index].vr = selectedTagInfo.vr; vrUpdateNeeded = true; }
            // Clear VR if tag is cleared
            else if (!selectedTagInfo) { updated[index].vr = ''; vrUpdateNeeded = true; }
        } else {
            (updated[index] as any)[field] = value;
            // Handle VR changes based on action
            if (field === 'action') {
                 if (value === 'delete') { updated[index].value = undefined; updated[index].vr = undefined; vrUpdateNeeded = true; }
                 else { const currentTagInfo = getTagInfo(updated[index].tag); if (currentTagInfo) { updated[index].vr = currentTagInfo.vr; vrUpdateNeeded = true; } }
            }
        }
        setTagModifications(updated);
        // Clear relevant validation errors
        const fieldName = field === 'tagInfo' ? 'tag' : field;
        const keysToClear = [`tagModifications[${index}].${fieldName}`];
        if (vrUpdateNeeded) keysToClear.push(`tagModifications[${index}].vr`);
        setValidationErrors(prev => { let next = { ...prev }; keysToClear.forEach(key => { delete next[key]; }); return next; });
    };
    const removeTagModification = (index: number) => setTagModifications(tagModifications.filter((_, i) => i !== index));

     // Destinations
     const addDestination = () => setDestinations([...destinations, { type: 'dicom_cstore', config: '{}' }]);
     const updateDestination = (index: number, field: keyof DestinationState, value: any) => {
         const updated = [...destinations]; (updated[index] as any)[field] = value; setDestinations(updated);
         const key = `destinations[${index}].${field}`;
         setValidationErrors(prev => { if (prev[key]) { const { [key]: _, ...rest } = prev; return rest; } return prev; });
     };
     const removeDestination = (index: number) => setDestinations(destinations.filter((_, i) => i !== index));

    // --- Form Submission ---
    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError(null); setValidationErrors({});
        let isValid = true;
        const currentValidationErrors: Record<string, string> = {};

        // --- Client-Side Validation ---
        if (!name.trim()) { currentValidationErrors['name'] = 'Rule name is required.'; isValid = false; }
        matchCriteria.forEach((mc, index) => {
            // Use GGGG,EEEE format check
            if (!mc.tag || !/^\d{4},\d{4}$/.test(mc.tag)) { currentValidationErrors[`matchCriteria[${index}].tag`] = 'Valid tag (GGGG,EEEE) is required.'; isValid = false; }
            if (!mc.op.trim()) { currentValidationErrors[`matchCriteria[${index}].op`] = 'Operator is required.'; isValid = false; }
            if (mc.op !== 'exists' && mc.op !== 'notexists' && (mc.value === undefined || mc.value === null || String(mc.value).trim() === '')) { currentValidationErrors[`matchCriteria[${index}].value`] = 'Value is required for this operator.'; isValid = false; }
        });
        tagModifications.forEach((tm, index) => {
            // Use GGGG,EEEE format check
             if (!tm.tag || !/^\d{4},\d{4}$/.test(tm.tag)) { currentValidationErrors[`tagModifications[${index}].tag`] = 'Valid tag (GGGG,EEEE) is required.'; isValid = false; }
            if (tm.action === 'set' && (tm.value === undefined || tm.value === null || String(tm.value).trim() === '')) { currentValidationErrors[`tagModifications[${index}].value`] = "'Set' action requires a value."; isValid = false; }
        });
        const parsedDestinations: StorageDestination[] = [];
        destinations.forEach((dest, index) => {
             if (!dest.type.trim()) { currentValidationErrors[`destinations[${index}].type`] = 'Type is required.'; isValid = false; }
            try {
                const configString = typeof dest.config === 'string' ? dest.config.trim() : '{}';
                 if (!configString) { currentValidationErrors[`destinations[${index}].config`] = 'Config JSON cannot be empty.'; isValid = false; parsedDestinations.push({ type: dest.type, config: {} }); }
                 else { const parsedConfig = JSON.parse(configString); if (typeof parsedConfig !== 'object' || parsedConfig === null) { throw new Error("Config must be a valid JSON object."); } parsedDestinations.push({ type: dest.type, config: parsedConfig }); }
            } catch (e: any) { currentValidationErrors[`destinations[${index}].config`] = e.message || 'Invalid JSON format.'; isValid = false; parsedDestinations.push({ type: dest.type, config: dest.config }); }
        });
        setValidationErrors(currentValidationErrors);
        if (!isValid) { setError("Please fix the validation errors marked below."); return; }
        // --- End Validation ---

        setIsLoading(true);

        // --- Construct final payload ensuring correct tag format ---
        // State should already hold the correct GGGG,EEEE strings due to handlers
        const commonPayload = {
            name: name.trim(),
            description: description.trim() || null,
            priority,
            is_active: isActive,
            match_criteria: matchCriteria, // Pass state directly
            tag_modifications: tagModifications, // Pass state directly
            destinations: parsedDestinations, // Use parsed destinations
        };

        console.log('Submitting Payload:', JSON.stringify(commonPayload, null, 2)); // Debug log

        try {
            let savedRule: Rule;
            if (existingRule) { const payload: RuleUpdate = commonPayload; savedRule = await updateRule(existingRule.id, payload); }
            else { const payload: RuleCreate = { ...commonPayload, ruleset_id: rulesetId }; savedRule = await createRule(payload); }
            onSuccess(savedRule);
        } catch (err: any) { console.error('Failed to save rule:', err); setError(err.message || `Failed to ${existingRule ? 'update' : 'create'} rule.`); }
        finally { setIsLoading(false); }
    };

    // --- Render Logic ---
    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-20" onClose={handleDialogClose}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0" >
                    <div className="fixed inset-0 bg-black bg-opacity-30 dark:bg-opacity-50" />
                </Transition.Child>
                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95" >
                            <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 flex justify-between items-center mb-4" >
                                    {existingRule ? 'Edit Rule' : 'Create New Rule'}
                                    <button onClick={handleDialogClose} disabled={isLoading} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none disabled:opacity-50" > <XMarkIcon className="h-6 w-6" /> </button>
                                </Dialog.Title>

                                <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto pr-4">
                                    {error && ( <div className="rounded-md bg-red-50 p-4 dark:bg-red-900"> <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p> </div> )}

                                    {/* --- Basic Rule Fields --- */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="ruleName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name <span className="text-red-500">*</span></label>
                                            <input type="text" id="ruleName" value={name} onChange={(e) => setName(e.target.value)} required disabled={isLoading} aria-invalid={!!validationErrors['name']} aria-describedby="ruleName-error" className={`mt-1 ${baseInputStyles} ${validationErrors['name'] ? errorInputStyles : normalInputStyles} dark:bg-gray-700 `} />
                                            {validationErrors['name'] && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id="ruleName-error">{validationErrors['name']}</p>}
                                        </div>
                                        <div>
                                            <label htmlFor="rulePriority" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
                                            <input type="number" id="rulePriority" value={priority} onChange={(e) => setPriority(parseInt(e.target.value, 10) || 0)} disabled={isLoading} className={`mt-1 ${baseInputStyles} ${validationErrors['priority'] ? errorInputStyles : normalInputStyles} dark:bg-gray-700 `} />
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="ruleDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                                        <textarea id="ruleDescription" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} disabled={isLoading} className={`mt-1 ${baseInputStyles} ${validationErrors['description'] ? errorInputStyles : normalInputStyles} dark:bg-gray-700 `} />
                                    </div>
                                    <div className="flex items-center">
                                        <Switch checked={isActive} onChange={isLoading ? () => {} : setIsActive} disabled={isLoading} className={`${isActive ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed`} > <span className={`${isActive ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} /> </Switch>
                                        <span className={`ml-3 text-sm font-medium ${isLoading ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>Active</span>
                                    </div>

                                    {/* --- Match Criteria Section --- */}
                                    <fieldset className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                        <legend className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">Match Criteria</legend>
                                        <div className="space-y-3 pr-2"> {/* Removed max-h/overflow */}
                                            {matchCriteria.map((criterion, index) => {
                                                const tagError = validationErrors[`matchCriteria[${index}].tag`]; const opError = validationErrors[`matchCriteria[${index}].op`]; const valueError = validationErrors[`matchCriteria[${index}].value`];
                                                return (
                                                <div key={index} className="relative flex items-start space-x-2 p-2 border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700/50">
                                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                        <div><DicomTagCombobox value={criterion.tag ?? ''} onChange={(tagInfo) => updateMatchCriterion(index, 'tagInfo', tagInfo)} disabled={isLoading} required aria-invalid={!!tagError} aria-describedby={`mc-tag-${index}-error`} inputClassName={`${baseInputStyles} ${tagError ? errorInputStyles : normalInputStyles}`}/> {tagError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`mc-tag-${index}-error`}>{tagError}</p>}</div>
                                                        <div><select value={criterion.op} onChange={(e) => updateMatchCriterion(index, 'op', e.target.value)} required disabled={isLoading} aria-invalid={!!opError} aria-describedby={`mc-op-${index}-error`} className={`${baseInputStyles} pr-10 ${opError ? errorInputStyles : normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}>{MATCH_OPERATORS.map(op=><option key={op} value={op}>{op}</option>)}</select> {opError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`mc-op-${index}-error`}>{opError}</p>}</div>
                                                        <div>{criterion.op!=='exists'&&criterion.op!=='notexists'?(<><input type="text" placeholder="Value" value={criterion.value??''} onChange={(e)=>updateMatchCriterion(index,'value',e.target.value)} disabled={isLoading} aria-invalid={!!valueError} aria-describedby={`mc-value-${index}-error`} className={`${baseInputStyles} ${valueError?errorInputStyles:normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}/>{valueError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`mc-value-${index}-error`}>{valueError}</p>}</>):(<div className="text-sm text-gray-500 dark:text-gray-400 italic self-center">(No value needed)</div>)}</div>
                                                    </div>
                                                    <button type="button" onClick={()=>removeMatchCriterion(index)} disabled={isLoading} className="text-red-500 hover:text-red-700 p-1 mt-1 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"><TrashIcon className="h-5 w-5"/></button>
                                                </div>);
                                            })}
                                        </div>
                                        <button type="button" onClick={addMatchCriterion} disabled={isLoading} className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed"> <PlusIcon className="h-4 w-4 mr-1"/> Add Criterion </button>
                                    </fieldset>

                                    {/* --- Tag Modifications Section --- */}
                                    <fieldset className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                         <legend className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">Tag Modifications</legend>
                                         <div className="space-y-3 pr-2"> {/* Removed max-h/overflow */}
                                             {tagModifications.map((mod, index) => {
                                                 const actionError=validationErrors[`tagModifications[${index}].action`]; const tagError=validationErrors[`tagModifications[${index}].tag`]; const valueError=validationErrors[`tagModifications[${index}].value`]; const vrError=validationErrors[`tagModifications[${index}].vr`];
                                                 return (
                                                  <div key={index} className="relative flex items-start space-x-2 p-2 border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700/50">
                                                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                                                          <div><select value={mod.action} onChange={(e)=>updateTagModification(index,'action',e.target.value)} required disabled={isLoading} aria-invalid={!!actionError} aria-describedby={`tm-action-${index}-error`} className={`${baseInputStyles} pr-10 ${actionError?errorInputStyles:normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}>{MODIFICATION_ACTIONS.map(act=><option key={act} value={act}>{act}</option>)}</select>{actionError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-action-${index}-error`}>{actionError}</p>}</div>
                                                          <div><DicomTagCombobox value={mod.tag ?? ''} onChange={(tagInfo)=>updateTagModification(index,'tagInfo',tagInfo)} disabled={isLoading} required aria-invalid={!!tagError} aria-describedby={`tm-tag-${index}-error`} inputClassName={`${baseInputStyles} ${tagError?errorInputStyles:normalInputStyles}`}/>{tagError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-tag-${index}-error`}>{tagError}</p>}</div>
                                                          {mod.action==='set'?(<><div><input type="text" placeholder="Value" value={mod.value??''} onChange={(e)=>updateTagModification(index,'value',e.target.value)} required={mod.action==='set'} disabled={isLoading} aria-invalid={!!valueError} aria-describedby={`tm-value-${index}-error`} className={`${baseInputStyles} ${valueError?errorInputStyles:normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}/>{valueError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-value-${index}-error`}>{valueError}</p>}</div><div><input type="text" placeholder="VR (e.g., SH)" value={mod.vr??''} onChange={(e)=>updateTagModification(index,'vr',e.target.value)} disabled={isLoading} aria-invalid={!!vrError} aria-describedby={`tm-vr-${index}-error`} className={`${baseInputStyles} ${vrError?errorInputStyles:normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}/>{vrError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-vr-${index}-error`}>{vrError}</p>}</div></>):(<div className="col-span-2 text-sm text-gray-500 dark:text-gray-400 italic self-center">(No value/VR needed)</div>)}
                                                     </div>
                                                     <button type="button" onClick={()=>removeTagModification(index)} disabled={isLoading} className="text-red-500 hover:text-red-700 p-1 mt-1 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"><TrashIcon className="h-5 w-5"/></button>
                                                  </div>);
                                             })}
                                         </div>
                                         <button type="button" onClick={addTagModification} disabled={isLoading} className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed"><PlusIcon className="h-4 w-4 mr-1"/> Add Modification </button>
                                     </fieldset>

                                    {/* --- Destinations Section --- */}
                                    <fieldset className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                        <legend className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">Destinations</legend>
                                        <div className="space-y-3 pr-2"> {/* Removed max-h/overflow */}
                                            {destinations.map((dest, index) => {
                                                const typeError = validationErrors[`destinations[${index}].type`]; const configError = validationErrors[`destinations[${index}].config`];
                                                return (
                                                <div key={index} className="relative flex items-start space-x-2 p-2 border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700/50">
                                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        <div><select value={dest.type} onChange={(e)=>updateDestination(index,'type',e.target.value)} required disabled={isLoading} aria-invalid={!!typeError} aria-describedby={`dest-type-${index}-error`} className={`${baseInputStyles} pr-10 ${typeError?errorInputStyles:normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}>{DESTINATION_TYPES.map(dtype=><option key={dtype} value={dtype}>{dtype}</option>)}</select>{typeError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`dest-type-${index}-error`}>{typeError}</p>}</div>
                                                        <div><textarea placeholder='Config (JSON object format, e.g., {"host":"...", "port":11112})' value={dest.config} onChange={(e)=>updateDestination(index,'config',e.target.value)} rows={3} disabled={isLoading} aria-invalid={!!configError} aria-describedby={`dest-config-${index}-error`} className={`font-mono ${baseInputStyles} ${configError?errorInputStyles:normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`} spellCheck="false"/>{configError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`dest-config-${index}-error`}>{configError}</p>}</div>
                                                    </div>
                                                    <button type="button" onClick={()=>removeDestination(index)} disabled={isLoading} className="text-red-500 hover:text-red-700 p-1 mt-1 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"><TrashIcon className="h-5 w-5"/></button>
                                                </div>);
                                            })}
                                        </div>
                                        <button type="button" onClick={addDestination} disabled={isLoading} className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed"><PlusIcon className="h-4 w-4 mr-1"/> Add Destination </button>
                                    </fieldset>

                                    {/* --- Form Actions --- */}
                                    <div className="mt-6 flex justify-end space-x-3 border-t border-gray-200 dark:border-gray-700 pt-4 sticky bottom-0 bg-white dark:bg-gray-800 py-3 -mx-6 px-6"> {/* Sticky Footer */}
                                        <button type="button" onClick={handleDialogClose} disabled={isLoading} className="inline-flex justify-center rounded-md border border-gray-300 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50" > Cancel </button>
                                        <button type="submit" disabled={isLoading} className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed" >
                                            {isLoading && ( <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg> )}
                                            {isLoading ? 'Saving...' : (existingRule ? 'Update Rule' : 'Create Rule')}
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

export default RuleFormModal;
