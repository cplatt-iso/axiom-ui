// src/components/DicomTagCombobox.tsx
import React, { useState } from 'react';
import { Combobox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';
import { DicomTagInfo, findMatchingTags, getTagInfo } from '../dicom/dictionary';

interface DicomTagComboboxProps {
    value: string | undefined;
    onChange: (selectedTag: DicomTagInfo | null) => void;
    disabled?: boolean;
    required?: boolean;
    'aria-invalid'?: boolean;
    'aria-describedby'?: string;
    inputClassName?: string;
    inputId?: string; // <-- ADDED: ID prop for the input element
}

const DicomTagCombobox: React.FC<DicomTagComboboxProps> = ({
    value,
    onChange,
    disabled = false,
    required = false,
    'aria-invalid': ariaInvalid,
    'aria-describedby': ariaDescribedby,
    inputClassName = '',
    inputId, // <-- Destructure the new prop
}) => {
    const [query, setQuery] = useState('');

    const selectedTagInfo = value ? getTagInfo(value) : null;
    const filteredTags = findMatchingTags(query);

    const displayValue = (tagInfo: DicomTagInfo | null) => {
        return tagInfo ? `${tagInfo.name} (${tagInfo.tag})` : '';
    };

    return (
        <Combobox value={selectedTagInfo} onChange={onChange} disabled={disabled} nullable>
            <div className="relative">
                <div className="relative w-full">
                    <Combobox.Input
                        id={inputId} // <-- APPLY the id prop here
                        className={` ${inputClassName} pr-10 w-full `}
                        displayValue={displayValue}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Type Tag Name or Number..."
                        required={required}
                        aria-invalid={ariaInvalid}
                        aria-describedby={ariaDescribedby}
                        autoComplete="off"
                    />
                    <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2" disabled={disabled}>
                        <ChevronUpDownIcon
                            className="h-5 w-5 text-gray-400"
                            aria-hidden="true"
                        />
                    </Combobox.Button>
                </div>
                <Transition
                    as={React.Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                    afterLeave={() => setQuery('')}
                >
                    <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-700 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                        {filteredTags.length === 0 && query !== '' ? (
                            <div className="relative cursor-default select-none px-4 py-2 text-gray-700 dark:text-gray-300">
                                Nothing found.
                            </div>
                        ) : (
                            filteredTags.map((tag) => (
                                <Combobox.Option
                                    key={tag.tag}
                                    className={({ active }) =>
                                        `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                            active ? 'bg-indigo-600 text-white' : 'text-gray-900 dark:text-gray-100'
                                        }`
                                    }
                                    value={tag}
                                >
                                    {({ selected, active }) => (
                                        <>
                                            <span
                                                className={`block truncate ${
                                                    selected ? 'font-medium' : 'font-normal'
                                                }`}
                                            >
                                                {tag.name} ({tag.tag}) <span className="text-xs opacity-70">VR:{tag.vr}</span>
                                            </span>
                                            {selected ? (
                                                <span
                                                    className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                                        active ? 'text-white' : 'text-indigo-600'
                                                    }`}
                                                >
                                                    <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                                </span>
                                            ) : null}
                                        </>
                                    )}
                                </Combobox.Option>
                            ))
                        )}
                    </Combobox.Options>
                </Transition>
            </div>
        </Combobox>
    );
};

export default DicomTagCombobox;
