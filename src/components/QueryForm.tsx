// src/components/QueryForm.tsx
import React, { useState } from 'react';
import { DataBrowserQueryParam } from '@/schemas/data_browser';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
// --- REMOVED DatePicker import ---
// import { DatePicker } from "@/components/ui/date-picker";
// --- END REMOVAL ---
import { Search, RotateCcw } from 'lucide-react';

interface QueryFormProps {
    onSubmit: (params: DataBrowserQueryParam[]) => void;
    isQuerying: boolean;
    disabled?: boolean;
}

const QueryForm: React.FC<QueryFormProps> = ({ onSubmit, isQuerying, disabled = false }) => {
    // State for each query field
    const [patientName, setPatientName] = useState('');
    const [patientId, setPatientId] = useState('');
    const [accessionNumber, setAccessionNumber] = useState('');
    // --- CHANGED studyDate state to string ---
    const [studyDate, setStudyDate] = useState<string>(
        // Default to today's date in YYYY-MM-DD format for input type="date"
        new Date().toISOString().split('T')[0]
    );
    // --- END CHANGE ---
    const [modalities, setModalities] = useState('');

    // --- REMOVED handleDateChange ---
    // const handleDateChange = (date: Date | undefined) => {
    //     setStudyDate(date);
    // };
    // --- END REMOVAL ---

    const buildQueryParams = (): DataBrowserQueryParam[] => {
        const params: DataBrowserQueryParam[] = [];
        if (patientName.trim()) params.push({ field: 'PatientName', value: patientName.trim() });
        if (patientId.trim()) params.push({ field: 'PatientID', value: patientId.trim() });
        if (accessionNumber.trim()) params.push({ field: 'AccessionNumber', value: accessionNumber.trim() });
        if (modalities.trim()) params.push({ field: 'ModalitiesInStudy', value: modalities.trim().toUpperCase() });
        // --- UPDATED: Use string date value ---
        if (studyDate) {
            // Backend expects YYYYMMDD, remove hyphens from YYYY-MM-DD input value
            const dateValue = studyDate.replace(/-/g, '');
            params.push({ field: 'StudyDate', value: dateValue });
        }
        // --- END UPDATE ---
        // Add other fields like ReferringPhysicianName, StudyDescription etc. here if needed
        return params;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(buildQueryParams());
    };

    const handleReset = () => {
        setPatientName('');
        setPatientId('');
        setAccessionNumber('');
        // Reset to today's date string
        setStudyDate(new Date().toISOString().split('T')[0]);
        setModalities('');
        // Optionally trigger an empty query or clear results in the parent?
        // onSubmit([]); // Uncomment to trigger empty query on reset
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-md bg-white dark:bg-gray-800 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                {/* Patient Name */}
                <div className="space-y-1">
                    <Label htmlFor="db-patientName">Patient Name</Label>
                    <Input
                        id="db-patientName"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        placeholder="Last^First* or *"
                        disabled={disabled || isQuerying}
                    />
                </div>

                {/* Patient ID */}
                <div className="space-y-1">
                    <Label htmlFor="db-patientId">Patient ID (MRN)</Label>
                    <Input
                        id="db-patientId"
                        value={patientId}
                        onChange={(e) => setPatientId(e.target.value)}
                        placeholder="Patient Identifier"
                        disabled={disabled || isQuerying}
                    />
                </div>

                {/* Accession Number */}
                <div className="space-y-1">
                    <Label htmlFor="db-accession">Accession Number</Label>
                    <Input
                        id="db-accession"
                        value={accessionNumber}
                        onChange={(e) => setAccessionNumber(e.target.value)}
                        placeholder="Accession #"
                        disabled={disabled || isQuerying}
                    />
                </div>

                 {/* --- UPDATED: Study Date Input --- */}
                <div className="space-y-1">
                    <Label htmlFor="db-studyDate">Study Date</Label>
                    <Input
                        id="db-studyDate"
                        type="date" // Use standard HTML5 date input
                        value={studyDate}
                        onChange={(e) => setStudyDate(e.target.value)}
                        disabled={disabled || isQuerying}
                        className="block w-full rounded-md shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:ring-indigo-500 focus:border-indigo-500" // Apply consistent styling
                    />
                </div>
                {/* --- END UPDATE --- */}

                {/* Modalities */}
                <div className="space-y-1">
                    <Label htmlFor="db-modalities">Modalities</Label>
                    <Input
                        id="db-modalities"
                        value={modalities}
                        onChange={(e) => setModalities(e.target.value)}
                        placeholder="e.g., CT or CT\\MR"
                        disabled={disabled || isQuerying}
                    />
                </div>

                {/* Add other fields here (Referring Physician, etc.) */}

            </div>
            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-2">
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                    disabled={disabled || isQuerying}
                    size="sm"
                >
                    <RotateCcw className="mr-1 h-4 w-4" />
                    Reset
                </Button>
                <Button
                    type="submit"
                    disabled={disabled || isQuerying}
                    size="sm"
                >
                    <Search className={`mr-1 h-4 w-4 ${isQuerying ? 'animate-spin' : ''}`} />
                    {isQuerying ? 'Querying...' : 'Query'}
                </Button>
            </div>
        </form>
    );
};

export default QueryForm;
