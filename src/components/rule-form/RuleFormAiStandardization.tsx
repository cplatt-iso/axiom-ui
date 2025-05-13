// frontend/src/components/rule-form/RuleFormAiStandardization.tsx
import React from 'react';
import { DicomTagCombobox } from '@/components/DicomTagCombobox';
import { DicomTagInfo } from '@/dicom/dictionary';
import { Button } from '@/components/ui/button'; // Assuming you have a Button component
import { XCircleIcon } from '@heroicons/react/20/solid'; // For remove icon
// import { Alert, AlertDescription } from "@/components/ui/alert"; // For validation errors

interface RuleFormAiStandardizationProps {
    tags: string[]; // The current list of AI standardization tags (DICOM keywords)
    onTagsChange: (updatedTags: string[]) => void; // Callback to update the parent's state
    isLoading?: boolean;
    validationErrors?: Record<string, string | undefined>; // e.g., { "ai_standardization_tags": "Error message" }
}

export const RuleFormAiStandardization: React.FC<RuleFormAiStandardizationProps> = ({
    tags,
    onTagsChange,
    isLoading = false,
    validationErrors = {},
}) => {
    const handleAddTag = (selectedDicomTag: DicomTagInfo | null) => {
        if (selectedDicomTag) {
            // We'll store the DICOM Keyword (e.g., "PatientName")
            // as per our previous discussion and schema design for ai_standardization_tags
            const tagToAdd = selectedDicomTag.name; 

            if (!tags.includes(tagToAdd)) {
                onTagsChange([...tags, tagToAdd]);
            } else {
                // Optionally, provide feedback if the tag is already added (e.g., via toast)
                console.warn(`Tag "${tagToAdd}" is already in the AI standardization list.`);
                // toast.info(`Tag "${tagToAdd}" is already added.`); // If you use toast here
            }
        }
        // The DicomTagCombobox will clear itself because its `value` is `undefined`
    };

    const handleRemoveTag = (tagToRemove: string) => {
        onTagsChange(tags.filter(tag => tag !== tagToRemove));
    };

    const fieldError = validationErrors?.['ai_standardization_tags'];

    return (
        <div className="space-y-4 rounded-lg border p-4 dark:border-gray-700">
            <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-1">
                AI Vocabulary Standardization
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Select DICOM tags whose values should be standardized using AI.
                For example, standardizing "BodyPartExamined" from "CERVICAL" to "NECK".
            </p>
            
            <div>
                <label htmlFor="ai-tag-combobox-standardization" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Add DICOM Tag
                </label>
                <DicomTagCombobox
                    inputId="ai-tag-combobox-standardization"
                    value={undefined} // Always undefined to keep it as an "add new" field
                    onChange={handleAddTag}
                    disabled={isLoading}
                    inputClassName={`
                        ${fieldError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500'}
                    `}
                />
                {fieldError && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400" id="ai_standardization_tags-error">
                        {fieldError}
                    </p>
                )}
            </div>

            {tags.length > 0 && (
                <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Selected Tags for Standardization:
                    </h4>
                    <ul className="space-y-2">
                        {tags.map((tagString, index) => (
                            <li 
                                key={`${index}-${tagString}`} 
                                className="flex items-center justify-between p-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                <span className="font-mono text-gray-800 dark:text-gray-200">{tagString}</span>
                                <Button
                                    type="button"
                                    variant="ghost" // More subtle remove button
                                    size="icon"
                                    onClick={() => handleRemoveTag(tagString)}
                                    disabled={isLoading}
                                    aria-label={`Remove tag ${tagString}`}
                                    className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 h-6 w-6 p-0"
                                >
                                    <XCircleIcon className="h-5 w-5" />
                                </Button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
             {tags.length === 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-2">
                    No tags selected for AI standardization. If added, the AI will attempt to normalize values found in these tags.
                </p>
            )}
        </div>
    );
};

export default RuleFormAiStandardization;