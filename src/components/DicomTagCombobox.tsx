// frontend/src/components/DicomTagCombobox.tsx
import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { Combobox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';
import { DicomTagInfo, findMatchingTags, getTagInfoByKeyword, getTagInfo } from '../dicom/dictionary';

interface DicomTagComboboxProps {
    value: string | undefined;
    onChange: (selectedTag: DicomTagInfo | null) => void;
    disabled?: boolean;
    required?: boolean;
    'aria-invalid'?: boolean;
    'aria-describedby'?: string;
    inputClassName?: string;
    inputId?: string;
}

const displayInputValue = (selectedTagObject: DicomTagInfo | null): string => {
    return selectedTagObject ? `${selectedTagObject.name} (${selectedTagObject.tag})` : '';
};

export const DicomTagCombobox: React.FC<DicomTagComboboxProps> = ({
    value: valueFromParent,
    onChange: informParentOfSelection,
    disabled = false,
    required = false,
    'aria-invalid': ariaInvalid,
    'aria-describedby': ariaDescribedby,
    inputClassName = '',
    inputId,
}) => {
    const [query, setQuery] = useState('');

    // This function is explicitly typed to return DicomTagInfo | null
    const resolveTagInfo = (val: string | undefined): DicomTagInfo | null => {
        if (!val || typeof val !== 'string' || val.trim() === '') {
            return null;
        }
        
        // Try by keyword. getTagInfoByKeyword returns DicomTagInfo | null
        const byKeyword = getTagInfoByKeyword(val);
        if (byKeyword !== null) { // If found (not null)
            return byKeyword;
        }
        
        // If not found by keyword (byKeyword is null), try by tag string.
        // getTagInfo returns DicomTagInfo | undefined
        const byTag: DicomTagInfo | undefined = getTagInfo(val);
        if (byTag !== undefined) { // If found (not undefined)
            return byTag;
        }
        
        return null; // If not found by either method
    };

    useEffect(() => {
        const selectedTagInfo = resolveTagInfo(valueFromParent); // result is DicomTagInfo | null
        const expectedDisplayForValue = displayInputValue(selectedTagInfo);
        if (query !== expectedDisplayForValue) {
            setQuery(expectedDisplayForValue);
        }
    }, [valueFromParent]);

    // Explicitly type selectedDicomTagObjectForCombobox to DicomTagInfo | null
    // The error message says line 45. Please adjust this line number based on your actual file.
    // This is where `selectedDicomTagObjectForCombobox` is defined.
    const selectedDicomTagObjectForCombobox: DicomTagInfo | null = useMemo(() => {
        // The result of resolveTagInfo is DicomTagInfo | null, which matches the explicit type.
        return resolveTagInfo(valueFromParent); 
    }, [valueFromParent]);

    const filteredTags = useMemo(() => {
        return findMatchingTags(query);
    }, [query]);

    const handleComboboxSelectionChange = (newlySelectedDicomTagObject: DicomTagInfo | null) => {
        informParentOfSelection(newlySelectedDicomTagObject);
    };

    return (
        <Combobox
            value={selectedDicomTagObjectForCombobox} // This is now explicitly DicomTagInfo | null
            onChange={handleComboboxSelectionChange}
            disabled={disabled}
            nullable // This tells Combobox to expect TValue | null for its value
        >
            {({ open }) => (
                <div className="relative">
                    <Combobox.Input
                        id={inputId}
                        className={`${inputClassName} pr-10 w-full`}
                        displayValue={(tag: DicomTagInfo | null) => displayInputValue(tag)}
                        onChange={(event) => {
                            const typedValue = event.target.value;
                            setQuery(typedValue);
                            if (typedValue === '' && selectedDicomTagObjectForCombobox !== null) {
                                informParentOfSelection(null); 
                            }
                        }}
                        placeholder="Type Tag Name or Number..."
                        autoComplete="off"
                        required={required}
                        aria-invalid={ariaInvalid}
                        aria-describedby={ariaDescribedby}
                        onBlur={() => {
                            const currentDisplayForParentValue = valueFromParent ? displayInputValue(resolveTagInfo(valueFromParent)) : "";
                            if (query !== currentDisplayForParentValue) {
                                setQuery(currentDisplayForParentValue);
                            }
                        }}
                    />
                    <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2" disabled={disabled}>
                        <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </Combobox.Button>
                    <Transition
                        as={Fragment}
                        show={open && (filteredTags.length > 0 || (query.length > 0 && filteredTags.length === 0))}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-700 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                            {filteredTags.length === 0 && query !== '' ? (
                                <div className="relative cursor-default select-none px-4 py-2 text-gray-700 dark:text-gray-300">
                                    Nothing found for "{query}".
                                </div>
                            ) : (
                                filteredTags.map((tag) => (
                                    <Combobox.Option
                                        key={tag.keyword} 
                                        value={tag} // tag is DicomTagInfo
                                        className={({ active }) =>
                                            `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                                active ? 'bg-indigo-600 text-white' : 'text-gray-900 dark:text-gray-100'
                                            }`
                                        }
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
            )}
        </Combobox>
    );
};

export default DicomTagCombobox;