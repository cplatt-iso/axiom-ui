// frontend/src/components/rule-form/RuleFormAiStandardization.tsx
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { XIcon, PlusCircleIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import DicomTagCombobox from '../DicomTagCombobox'; // Import the existing combobox
import { DicomTagInfo } from '@/dicom/dictionary'; // Import the type
import { cn } from "@/lib/utils";

interface RuleFormAiStandardizationProps {
    tags: string[]; // These will be normalized tag strings (e.g., "0010,0010" or "PATIENTNAME")
    onTagsChange: (tags: string[]) => void;
    isLoading: boolean;
    validationErrors: Record<string, string>;
}

const RuleFormAiStandardization: React.FC<RuleFormAiStandardizationProps> = ({
    tags,
    onTagsChange,
    isLoading,
    validationErrors,
}) => {
    // No local state for currentTagInput needed if DicomTagCombobox handles its own input
    // and calls onChange with the selected/entered tag string.

    const handleAddTagFromCombobox = useCallback((tagInfo: DicomTagInfo | null) => {
        if (tagInfo && tagInfo.tag) {
            const newTag = tagInfo.tag.toUpperCase(); // Normalize to uppercase for consistency
            // Zod schema on submission will handle proper GGGG,EEEE normalization and de-duplication
            if (!tags.includes(newTag)) { // Simple client-side check to avoid immediate visual duplicates
                onTagsChange([...tags, newTag]);
            }
        }
        // DicomTagCombobox should ideally clear itself after selection or allow a clear button.
        // If not, this component might need a way to tell DicomTagCombobox to reset.
        // For now, assume DicomTagCombobox handles its input state.
    }, [tags, onTagsChange]);

    const handleRemoveTag = useCallback((tagToRemove: string) => {
        onTagsChange(tags.filter(tag => tag !== tagToRemove));
    }, [tags, onTagsChange]);

    const mainError = validationErrors['ai_standardization_tags'];
    const hasTagSpecificErrors = Object.keys(validationErrors).some(key => key.startsWith('ai_standardization_tags['));

    return (
        <Card>
            <CardHeader>
                <CardTitle>AI Vocabulary Standardization</CardTitle>
                <CardDescription>
                    Specify DICOM tags whose values should be standardized using AI.
                    Select from the list or type keywords (e.g., StudyDescription) or GGGG,EEEE format.
                    This feature is experimental.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label htmlFor="ai-tag-combobox-input">Add DICOM Tag for AI Standardization</Label>
                    <DicomTagCombobox
                        inputId="ai-tag-combobox-input" // Pass an ID for the label
                        value={null} // Combobox is for adding, not reflecting a single current value from the list
                        onChange={handleAddTagFromCombobox}
                        disabled={isLoading}
                        required={false} // Not intrinsically required, the array can be empty
                        // We might need to adjust DicomTagCombobox to not show 'required' styling
                        // or to accept a placeholder.
                        placeholder="Select or type tag..."
                        inputClassName={cn("mt-1", validationErrors['ai_standardization_tags.new'] ? 'border-red-500' : '')}
                        // Pass containerRef from parent if DicomTagCombobox uses portals for its dropdown
                        // containerRef={/* panelRef from RuleFormModal if needed by DicomTagCombobox */}
                    />
                    {(mainError || hasTagSpecificErrors) && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                            {mainError || "One or more tags are invalid. Please check format and uniqueness."}
                        </p>
                    )}
                </div>

                {tags.length > 0 && (
                    <div className="space-y-2">
                        <Label>Tags to be Standardized:</Label>
                        <div className="flex flex-wrap gap-2 pt-1">
                            {tags.map((tag, index) => {
                                const tagError = validationErrors[`ai_standardization_tags[${index}]`];
                                return (
                                    <Badge
                                        key={`${tag}-${index}`} // Use tag + index for a more stable key if tags can be reordered (though they are not here)
                                        variant={tagError ? "destructive" : "secondary"}
                                        className="flex items-center gap-1 py-1 px-2 text-sm"
                                    >
                                        <span>{tag}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveTag(tag)}
                                            disabled={isLoading}
                                            className="ml-1 rounded-full hover:bg-gray-500/20 disabled:opacity-50"
                                            aria-label={`Remove ${tag}`}
                                        >
                                            <XIcon className="h-3.5 w-3.5" />
                                        </button>
                                    </Badge>
                                );
                            })}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default RuleFormAiStandardization;
