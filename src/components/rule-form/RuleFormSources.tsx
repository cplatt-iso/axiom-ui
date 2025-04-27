// src/components/rule-form/RuleFormSources.tsx
import React, { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';
import { Label } from '@/components/ui/label';
import { Server, Search, Code, HelpCircle } from 'lucide-react';
// Import SourceInfo from parent modal where it's defined
import { SourceInfo } from '../RuleFormModal';

interface RuleFormSourcesProps {
    selectedSources: string[];
    availableSources: SourceInfo[];
    onSelectionChange: (selectedNames: string[]) => void;
    isLoading: boolean;
    validationErrors: Record<string, string>;
    normalInputStyles: string;
}

const getSourceTypeIcon = (type: SourceInfo['type']): React.ElementType => {
    switch (type) {
        case 'listener':
            return Server;
        case 'scraper':
            return Search;
        case 'api':
            return Code;
        default:
            return HelpCircle;
    }
};

const RuleFormSources: React.FC<RuleFormSourcesProps> = ({
    selectedSources,
    availableSources,
    onSelectionChange,
    isLoading,
    validationErrors,
    normalInputStyles,
}) => {

    const handleSelectionChange = (selectedItems: SourceInfo[]) => {
        const selectedNames = selectedItems.map(item => item.name);
        onSelectionChange(selectedNames);
    };

    const selectedSourceObjects = Array.isArray(availableSources)
        ? availableSources.filter(source => selectedSources.includes(source.name))
        : [];

    const availableSourcesList = Array.isArray(availableSources) ? availableSources : [];

    return (
        <fieldset className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <legend className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
                Applicable Input Sources
            </legend>
            <div className="mb-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Select sources this rule applies to. If none selected, applies to ALL sources.
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-medium">Key:</span>
                    <span className="inline-flex items-center gap-1">
                        <Server className="h-3 w-3 flex-shrink-0" /> Listener
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <Search className="h-3 w-3 flex-shrink-0" /> Scraper/Poller
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <Code className="h-3 w-3 flex-shrink-0" /> API/Direct
                    </span>
                </div>
            </div>

            {isLoading ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">Loading sources...</div>
            ) : availableSourcesList.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    No specific input sources found or configured. Rule will apply globally if no sources are selected.
                </div>
            ) : (
                <Listbox
                    value={selectedSourceObjects}
                    onChange={handleSelectionChange}
                    multiple
                    disabled={isLoading}
                    by="name"
                >
                    <div className="relative mt-1">
                        <Listbox.Button className={`relative w-full cursor-default rounded-lg py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-300 sm:text-sm ${normalInputStyles} bg-white dark:bg-gray-700`}>
                            <span className="block truncate text-gray-900 dark:text-white">
                                {selectedSources.length === 0
                                    ? 'Applies to all sources'
                                    : selectedSources.length > 3
                                    ? `${selectedSources.length} sources selected`
                                    : selectedSources.join(', ')}
                            </span>
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                            </span>
                        </Listbox.Button>
                        <Transition
                            as={Fragment}
                            leave="transition ease-in duration-100"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                        >
                            <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-30">
                                {availableSourcesList.map((source, sourceIdx) => {
                                    const Icon = getSourceTypeIcon(source.type);
                                    return (
                                        <Listbox.Option
                                            key={sourceIdx}
                                            className={({ active }) =>
                                                `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-700 dark:text-white' : 'text-gray-900 dark:text-white'}`
                                            }
                                            value={source}
                                        >
                                            {({ selected }) => (
                                                <>
                                                    <span className={`flex items-center truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                                         <Icon
                                                            className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400 flex-shrink-0"
                                                            aria-hidden="true"
                                                            title={`Type: ${source.type}`}
                                                        />
                                                        {source.name}
                                                    </span>
                                                    {selected ? (
                                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-600 dark:text-indigo-400">
                                                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                                        </span>
                                                    ) : null}
                                                </>
                                            )}
                                        </Listbox.Option>
                                    );
                                })}
                            </Listbox.Options>
                        </Transition>
                    </div>
                </Listbox>
            )}
            {validationErrors?.['applicable_sources'] && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400" id="applicable_sources-error">
                    {validationErrors['applicable_sources']}
                </p>
            )}
        </fieldset>
    );
};

export default RuleFormSources;
