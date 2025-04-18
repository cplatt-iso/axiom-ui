// src/components/RuleFormModal.tsx
import React, { useState, useEffect, Fragment, FormEvent, useCallback } from 'react';
import { Dialog, Transition, Switch, Listbox } from '@headlessui/react';
import { XMarkIcon, PlusIcon, TrashIcon, CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline';
import {
    Rule,
    RuleBase, // Import RuleBase
    RuleCreate,
    RuleUpdate,
    MatchCriterion,
    TagModification,
    StorageDestination,
    createRule,
    updateRule,
    getKnownInputSources,
} from '../services/api';
import { DicomTagInfo, getTagInfo } from '../dicom/dictionary';
import DicomTagCombobox from './DicomTagCombobox';

// Define available options
const MATCH_OPERATORS = ['eq', 'ne', 'gt', 'lt', 'ge', 'le', 'contains', 'startswith', 'endswith', 'exists', 'not_exists', 'regex', 'in', 'not_in'];
const MODIFICATION_ACTIONS = ['set', 'delete'];
const DESTINATION_TYPES = ['dicom_cstore', 'filesystem'];

// Type for the destination state during editing
interface DestinationState extends Omit<StorageDestination, 'config'> {
    config: Record<string, any> | string;
}

// --- Define Base Input Styles ---
const baseInputStyles = "block w-full rounded-md shadow-sm sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 border focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed py-2 pl-3 px-3";
const errorInputStyles = "border-red-500 focus:border-red-500 focus:ring-red-500";
const normalInputStyles = "border-gray-300 dark:border-gray-600";

interface RuleFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (rule: Rule) => void;
    rulesetId: number;
    existingRule: Rule | null;
}

const RuleFormModal: React.FC<RuleFormModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    rulesetId,
    existingRule,
}) => {
    // --- Form State ---
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState(100);
    const [isActive, setIsActive] = useState(true);
    const [matchCriteria, setMatchCriteria] = useState<MatchCriterion[]>([]);
    const [tagModifications, setTagModifications] = useState<TagModification[]>([]);
    const [destinations, setDestinations] = useState<DestinationState[]>([]);
    const [availableSources, setAvailableSources] = useState<string[]>([]);
    const [selectedSources, setSelectedSources] = useState<string[]>([]);
    const [sourcesLoading, setSourcesLoading] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    // --- Fetch Available Sources ---
    const fetchSources = useCallback(async () => {
        if (isOpen) {
            setSourcesLoading(true);
            try {
                const sources = await getKnownInputSources();
                setAvailableSources(sources);
                console.log("Fetched available sources:", sources);
            } catch (err) {
                console.error("Failed to fetch input sources:", err);
                setError("Failed to load available input sources. Rule will apply to all sources if saved.");
                setAvailableSources([]);
            } finally {
                setSourcesLoading(false);
            }
        }
    }, [isOpen]);

    useEffect(() => {
        fetchSources();
    }, [fetchSources]);

    // --- Initialize form based on existingRule or reset ---
    useEffect(() => {
        if (isOpen) {
            setValidationErrors({});
            if (existingRule) {
                setName(existingRule.name);
                setDescription(existingRule.description ?? '');
                setPriority(existingRule.priority ?? 0);
                setIsActive(existingRule.is_active ?? true);
                setMatchCriteria(existingRule.match_criteria ? [...existingRule.match_criteria] : []);
                setTagModifications(existingRule.tag_modifications ? [...existingRule.tag_modifications] : []);
                setDestinations(existingRule.destinations?.map(d => ({
                    ...d,
                    config: typeof d.config === 'object' ? JSON.stringify(d.config, null, 2) : (d.config || '{}')
                })) || []);
                setSelectedSources(existingRule.applicable_sources ? [...existingRule.applicable_sources] : []);
            } else {
                setName(''); setDescription(''); setPriority(100); setIsActive(true);
                setMatchCriteria([]); setTagModifications([]); setDestinations([]);
                setSelectedSources([]);
            }
            setError(null); setIsLoading(false);
        }
    }, [isOpen, existingRule]);

    // --- Dialog Close Handler ---
    const handleDialogClose = () => {
        if (!isLoading && !sourcesLoading) {
            onClose();
        }
    };

    // --- Handlers for Array Fields ---

    // Match Criteria
    const addMatchCriterion = () => {
        // *** CONSOLE LOG ADDED ***
        console.log("ADD CRITERION CLICKED");
        // Use functional update form
        setMatchCriteria((prev) => [...prev, { tag: '', op: 'eq', value: '' }]);
    };
    const updateMatchCriterion = (index: number, field: keyof MatchCriterion | 'tagInfo', value: any) => {
        const updated = [...matchCriteria];
        if (field === 'tagInfo') {
            updated[index].tag = value ? value.tag : '';
        } else {
             (updated[index] as any)[field] = value;
             if (field === 'op' && (value === 'exists' || value === 'not_exists')) updated[index].value = undefined;
        }
        setMatchCriteria(updated);
        const key = `matchCriteria[${index}].${field === 'tagInfo' ? 'tag' : field}`;
        setValidationErrors(prev => { if (prev[key]) { const { [key]: _, ...rest } = prev; return rest; } return prev; });
    };
    const removeMatchCriterion = (index: number) => setMatchCriteria(matchCriteria.filter((_, i) => i !== index));

    // Tag Modifications
    const addTagModification = () => {
        // *** CONSOLE LOG ADDED ***
        console.log("ADD MODIFICATION CLICKED");
         // Use functional update form
        setTagModifications((prev) => [...prev, { action: 'set', tag: '', value: '', vr: '' }]);
    };
    const updateTagModification = (index: number, field: keyof TagModification | 'tagInfo', value: any) => {
        const updated = [...tagModifications];
        let vrUpdateNeeded = false;
        let selectedTagInfo: DicomTagInfo | null = null;
        if (field === 'tagInfo') {
            selectedTagInfo = value;
            updated[index].tag = selectedTagInfo ? selectedTagInfo.tag : '';
            if (selectedTagInfo && updated[index].action === 'set') { updated[index].vr = selectedTagInfo.vr; vrUpdateNeeded = true; }
            else if (!selectedTagInfo) { updated[index].vr = ''; vrUpdateNeeded = true; }
        } else {
            (updated[index] as any)[field] = value;
            if (field === 'action') {
                 if (value === 'delete') { updated[index].value = undefined; updated[index].vr = undefined; vrUpdateNeeded = true; }
                 else { const currentTagInfo = getTagInfo(updated[index].tag); if (currentTagInfo) { updated[index].vr = currentTagInfo.vr; vrUpdateNeeded = true; } }
            }
        }
        setTagModifications(updated);
        const fieldName = field === 'tagInfo' ? 'tag' : field;
        const keysToClear = [`tagModifications[${index}].${fieldName}`];
        if (vrUpdateNeeded) keysToClear.push(`tagModifications[${index}].vr`);
        setValidationErrors(prev => { let next = { ...prev }; keysToClear.forEach(key => { delete next[key]; }); return next; });
    };
    const removeTagModification = (index: number) => setTagModifications(tagModifications.filter((_, i) => i !== index));

     // Destinations
     const addDestination = () => {
         // *** CONSOLE LOG ADDED ***
         console.log("ADD DESTINATION CLICKED");
         // Use functional update form
         setDestinations((prev) => [...prev, { type: 'dicom_cstore', config: '{}' }]);
     };
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
            const tagKey = `matchCriteria[${index}].tag`; const opKey = `matchCriteria[${index}].op`; const valueKey = `matchCriteria[${index}].value`;
            if (!mc.tag || !/^\(?[0-9a-fA-F]{4},\s*[0-9a-fA-F]{4}\)?$|^[a-zA-Z0-9]+$/.test(mc.tag.trim())) { currentValidationErrors[tagKey] = 'Valid tag required.'; isValid = false; }
            if (!mc.op) { currentValidationErrors[opKey] = 'Operator required.'; isValid = false; }
            if (!['exists', 'not_exists'].includes(mc.op) && (mc.value === undefined || mc.value === null || String(mc.value).trim() === '')) { currentValidationErrors[valueKey] = 'Value required for this operator.'; isValid = false; }
        });
         tagModifications.forEach((tm, index) => {
             const tagKey = `tagModifications[${index}].tag`; const valueKey = `tagModifications[${index}].value`;
             if (!tm.tag || !/^\(?[0-9a-fA-F]{4},\s*[0-9a-fA-F]{4}\)?$|^[a-zA-Z0-9]+$/.test(tm.tag.trim())) { currentValidationErrors[tagKey] = 'Valid tag required.'; isValid = false; }
             if (tm.action === 'set' && (tm.value === undefined || tm.value === null || String(tm.value).trim() === '')) { currentValidationErrors[valueKey] = "'Set' action requires a value."; isValid = false; }
         });
        const parsedDestinations: StorageDestination[] = [];
        destinations.forEach((dest, index) => {
             if (!dest.type.trim()) { currentValidationErrors[`destinations[${index}].type`] = 'Type is required.'; isValid = false; }
            try {
                const configString = typeof dest.config === 'string' ? dest.config.trim() : '{}';
                 if (!configString) { parsedDestinations.push({ type: dest.type, config: {} }); }
                 else { const parsedConfig = JSON.parse(configString); if (typeof parsedConfig !== 'object' || parsedConfig === null) { throw new Error("Config must be a valid JSON object."); } parsedDestinations.push({ type: dest.type, config: parsedConfig }); }
            } catch (e: any) { currentValidationErrors[`destinations[${index}].config`] = e.message || 'Invalid JSON format.'; isValid = false; }
        });
        setValidationErrors(currentValidationErrors);
        if (!isValid) { setError("Please fix the validation errors marked below."); return; }

        setIsLoading(true);

        const commonPayload: RuleBase = {
            name: name.trim(), description: description.trim() || null, priority, is_active: isActive,
            match_criteria: matchCriteria, tag_modifications: tagModifications, destinations: parsedDestinations,
            applicable_sources: selectedSources.length > 0 ? selectedSources : null,
        };
        console.log('Submitting Payload:', JSON.stringify(commonPayload, null, 2));

        try {
            let savedRule: Rule;
            if (existingRule) { const payload: RuleUpdate = commonPayload; savedRule = await updateRule(existingRule.id, payload); }
            else { const payload: RuleCreate = { ...commonPayload, ruleset_id: rulesetId }; savedRule = await createRule(payload); }
            onSuccess(savedRule);
        } catch (err: any) {
            console.error('Failed to save rule:', err);
            if (err.status === 422 && err.detail?.detail && Array.isArray(err.detail.detail)) {
                 const backendErrors: Record<string, string> = {};
                 err.detail.detail.forEach((validationError: any) => {
                      if (validationError.loc && validationError.loc.length > 1) { const key = validationError.loc.slice(1).join('.'); backendErrors[key] = validationError.msg; }
                      else { backendErrors['general'] = validationError.msg; }
                 });
                 setValidationErrors(backendErrors); setError("Please fix validation errors from the server.");
            } else { setError(err.message || `Failed to ${existingRule ? 'update' : 'create'} rule.`); }
        } finally { setIsLoading(false); }
    };


    // --- Render Logic ---
    // *** CONSOLE LOG ADDED ***
    console.log("Rendering RuleFormModal with state:", { name, priority, isActive, matchCriteria: matchCriteria.length, tagModifications: tagModifications.length, destinations: destinations.length, selectedSources, isLoading, sourcesLoading });

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-20" onClose={handleDialogClose}>
                {/* Overlay */}
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0" >
                    <div className="fixed inset-0 bg-black bg-opacity-30 dark:bg-opacity-50" />
                </Transition.Child>

                {/* Modal Content */}
                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95" >
                            <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-0 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700" >
                                    <span>{existingRule ? 'Edit Rule' : 'Create New Rule'}</span>
                                    <button onClick={handleDialogClose} disabled={isLoading || sourcesLoading} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none disabled:opacity-50" >
                                        <XMarkIcon className="h-6 w-6" />
                                    </button>
                                </Dialog.Title>

                                <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto p-6">
                                    {error && ( <div className="rounded-md bg-red-50 p-4 dark:bg-red-900 border border-red-200 dark:border-red-800"> <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p> </div> )}

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

                                    {/* --- Applicable Sources Section --- */}
                                     <fieldset className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                        <legend className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">Applicable Input Sources</legend>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Select sources this rule applies to. If none selected, applies to ALL.</p>
                                        {sourcesLoading ? ( <div className="text-sm text-gray-500 dark:text-gray-400">Loading sources...</div> )
                                        : availableSources.length > 0 ? ( <Listbox value={selectedSources} onChange={setSelectedSources} multiple>
                                             <div className="relative mt-1">
                                                 <Listbox.Button className={`relative w-full cursor-default rounded-lg py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-300 sm:text-sm ${normalInputStyles} bg-white dark:bg-gray-700`}>
                                                     <span className="block truncate text-gray-900 dark:text-gray-100">
                                                         {selectedSources.length === 0 ? 'Applies to all sources' : selectedSources.join(', ')}
                                                     </span>
                                                     <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"> <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" /> </span>
                                                 </Listbox.Button>
                                                 <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0" >
                                                     <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-900 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-30">
                                                         {availableSources.map((source, sourceIdx) => ( <Listbox.Option key={sourceIdx} className={({ active }) => `relative cursor-default select-none py-2 pl-10 pr-4 ${ active ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900 dark:text-indigo-100' : 'text-gray-900 dark:text-gray-100' }`} value={source} > {({ selected }) => ( <> <span className={`block truncate ${ selected ? 'font-medium' : 'font-normal' }`} > {source} </span> {selected ? ( <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-600 dark:text-indigo-400"> <CheckIcon className="h-5 w-5" aria-hidden="true" /> </span> ) : null} </> )} </Listbox.Option> ))}
                                                     </Listbox.Options>
                                                 </Transition>
                                             </div>
                                            </Listbox> )
                                        : ( <div className="text-sm text-gray-500 dark:text-gray-400"> {error ? 'Could not load sources.' : 'No input sources configured.'} </div> )}
                                    </fieldset>

                                    {/* --- Match Criteria Section --- */}
                                     <fieldset className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                        <legend className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">Match Criteria (ALL must match)</legend>
                                         <div className="space-y-3 pr-2">
                                              {matchCriteria.map((criterion, index) => {
                                                 const tagError = validationErrors[`matchCriteria[${index}].tag`]; const opError = validationErrors[`matchCriteria[${index}].op`]; const valueError = validationErrors[`matchCriteria[${index}].value`];
                                                 return (
                                                     <div key={index} className="relative flex items-start space-x-2 p-2 border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700/50">
                                                         <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                             <div><DicomTagCombobox value={criterion.tag ?? ''} onChange={(tagInfo) => updateMatchCriterion(index, 'tagInfo', tagInfo)} disabled={isLoading} required aria-invalid={!!tagError} aria-describedby={`mc-tag-${index}-error`} inputClassName={`${baseInputStyles} ${tagError ? errorInputStyles : normalInputStyles}`}/> {tagError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`mc-tag-${index}-error`}>{tagError}</p>}</div>
                                                             <div><select value={criterion.op} onChange={(e) => updateMatchCriterion(index, 'op', e.target.value)} required disabled={isLoading} aria-invalid={!!opError} aria-describedby={`mc-op-${index}-error`} className={`${baseInputStyles} pr-10 ${opError ? errorInputStyles : normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}>{MATCH_OPERATORS.map(op=><option key={op} value={op}>{op}</option>)}</select> {opError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`mc-op-${index}-error`}>{opError}</p>}</div>
                                                             <div>{criterion.op!=='exists'&&criterion.op!=='not_exists'?(<><input type="text" placeholder="Value" value={criterion.value??''} onChange={(e)=>updateMatchCriterion(index,'value',e.target.value)} disabled={isLoading} aria-invalid={!!valueError} aria-describedby={`mc-value-${index}-error`} className={`${baseInputStyles} ${valueError?errorInputStyles:normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}/>{valueError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`mc-value-${index}-error`}>{valueError}</p>}</>):(<div className="text-sm text-gray-500 dark:text-gray-400 italic self-center pt-2">(No value needed)</div>)}</div>
                                                         </div>
                                                         <button type="button" onClick={()=>removeMatchCriterion(index)} disabled={isLoading} className="text-red-500 hover:text-red-700 p-1 mt-1 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed self-start"><TrashIcon className="h-5 w-5"/></button>
                                                     </div>
                                                 );
                                             })}
                                         </div>
                                        <button type="button" onClick={addMatchCriterion} disabled={isLoading} className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed"> <PlusIcon className="h-4 w-4 mr-1"/> Add Criterion </button>
                                     </fieldset>

                                    {/* --- Tag Modifications Section --- */}
                                     <fieldset className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                         <legend className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">Tag Modifications</legend>
                                         <div className="space-y-3 pr-2">
                                             {tagModifications.map((mod, index) => {
                                                 const actionError=validationErrors[`tagModifications[${index}].action`]; const tagError=validationErrors[`tagModifications[${index}].tag`]; const valueError=validationErrors[`tagModifications[${index}].value`]; const vrError=validationErrors[`tagModifications[${index}].vr`];
                                                 return (
                                                  <div key={index} className="relative flex items-start space-x-2 p-2 border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700/50">
                                                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                                                          <div><select value={mod.action} onChange={(e)=>updateTagModification(index,'action',e.target.value)} required disabled={isLoading} aria-invalid={!!actionError} aria-describedby={`tm-action-${index}-error`} className={`${baseInputStyles} pr-10 ${actionError?errorInputStyles:normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}>{MODIFICATION_ACTIONS.map(act=><option key={act} value={act}>{act}</option>)}</select>{actionError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-action-${index}-error`}>{actionError}</p>}</div>
                                                          <div><DicomTagCombobox value={mod.tag ?? ''} onChange={(tagInfo)=>updateTagModification(index,'tagInfo',tagInfo)} disabled={isLoading} required aria-invalid={!!tagError} aria-describedby={`tm-tag-${index}-error`} inputClassName={`${baseInputStyles} ${tagError?errorInputStyles:normalInputStyles}`}/>{tagError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-tag-${index}-error`}>{tagError}</p>}</div>
                                                          {mod.action==='set'?(<><div><input type="text" placeholder="Value" value={mod.value??''} onChange={(e)=>updateTagModification(index,'value',e.target.value)} required={mod.action==='set'} disabled={isLoading} aria-invalid={!!valueError} aria-describedby={`tm-value-${index}-error`} className={`${baseInputStyles} ${valueError?errorInputStyles:normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}/>{valueError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-value-${index}-error`}>{valueError}</p>}</div><div><input type="text" placeholder="VR (e.g., SH)" maxLength={2} value={mod.vr??''} onChange={(e)=>updateTagModification(index,'vr',e.target.value)} disabled={isLoading} aria-invalid={!!vrError} aria-describedby={`tm-vr-${index}-error`} className={`${baseInputStyles} ${vrError?errorInputStyles:normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}/>{vrError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`tm-vr-${index}-error`}>{vrError}</p>}</div></>):(<div className="col-span-2 text-sm text-gray-500 dark:text-gray-400 italic self-center pt-2">(No value/VR needed)</div>)}
                                                     </div>
                                                     <button type="button" onClick={()=>removeTagModification(index)} disabled={isLoading} className="text-red-500 hover:text-red-700 p-1 mt-1 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed self-start"><TrashIcon className="h-5 w-5"/></button>
                                                  </div>);
                                             })}
                                         </div>
                                         <button type="button" onClick={addTagModification} disabled={isLoading} className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed"><PlusIcon className="h-4 w-4 mr-1"/> Add Modification </button>
                                     </fieldset>

                                    {/* --- Destinations Section --- */}
                                     <fieldset className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                        <legend className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">Destinations</legend>
                                         <div className="space-y-3 pr-2">
                                             {destinations.map((dest, index) => {
                                                const typeError = validationErrors[`destinations[${index}].type`]; const configError = validationErrors[`destinations[${index}].config`];
                                                return (
                                                <div key={index} className="relative flex items-start space-x-2 p-2 border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700/50">
                                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        <div><select value={dest.type} onChange={(e)=>updateDestination(index,'type',e.target.value)} required disabled={isLoading} aria-invalid={!!typeError} aria-describedby={`dest-type-${index}-error`} className={`${baseInputStyles} pr-10 ${typeError?errorInputStyles:normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`}>{DESTINATION_TYPES.map(dtype=><option key={dtype} value={dtype}>{dtype}</option>)}</select>{typeError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`dest-type-${index}-error`}>{typeError}</p>}</div>
                                                        <div><textarea placeholder='Config (JSON object format, e.g., {"host":"...", "port":11112})' value={dest.config} onChange={(e)=>updateDestination(index,'config',e.target.value)} rows={3} disabled={isLoading} aria-invalid={!!configError} aria-describedby={`dest-config-${index}-error`} className={`font-mono ${baseInputStyles} ${configError?errorInputStyles:normalInputStyles} dark:bg-gray-900/50 dark:disabled:bg-gray-800`} spellCheck="false"/>{configError && <p className="mt-1 text-xs text-red-600 dark:text-red-400" id={`dest-config-${index}-error`}>{configError}</p>}</div>
                                                    </div>
                                                    <button type="button" onClick={()=>removeDestination(index)} disabled={isLoading} className="text-red-500 hover:text-red-700 p-1 mt-1 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed self-start"><TrashIcon className="h-5 w-5"/></button>
                                                </div>);
                                             })}
                                         </div>
                                        <button type="button" onClick={addDestination} disabled={isLoading} className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed"><PlusIcon className="h-4 w-4 mr-1"/> Add Destination </button>
                                    </fieldset>

                                    {/* --- Form Actions (Sticky Footer) --- */}
                                     <div className="flex justify-end space-x-3 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800 py-4 px-6 -mb-6 -ml-6 -mr-6 rounded-b-2xl">
                                        <button type="button" onClick={handleDialogClose} disabled={isLoading || sourcesLoading} className="inline-flex justify-center rounded-md border border-gray-300 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50" > Cancel </button>
                                        <button type="submit" disabled={isLoading || sourcesLoading} className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed" >
                                            {(isLoading || sourcesLoading) && ( <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg> )}
                                            {isLoading ? 'Saving...' : (sourcesLoading ? 'Loading...' : (existingRule ? 'Update Rule' : 'Create Rule'))}
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
