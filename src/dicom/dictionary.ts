// src/dicom/dictionary.ts

export interface DicomTagInfo {
    tag: string; // Format: "GGGG,EEEE" e.g., "0010,0010"
    name: string;
    vr: string;
    keyword: string; // Added keyword for easier lookup
}

// A *very* small sample dictionary. Replace/expand with a more complete one.
// Consider finding a JS library or generating this from pydicom's dictionary.
export const dicomDictionary: DicomTagInfo[] = [
    { tag: "0008,0020", name: "Study Date", vr: "DA", keyword: "StudyDate" },
    { tag: "0008,0030", name: "Study Time", vr: "TM", keyword: "StudyTime" },
    { tag: "0008,0050", name: "Accession Number", vr: "SH", keyword: "AccessionNumber" },
    { tag: "0008,0060", name: "Modality", vr: "CS", keyword: "Modality" },
    { tag: "0008,0070", name: "Manufacturer", vr: "LO", keyword: "Manufacturer" },
    { tag: "0008,0080", name: "Institution Name", vr: "LO", keyword: "InstitutionName" },
    { tag: "0008,1030", name: "Study Description", vr: "LO", keyword: "StudyDescription" },
    { tag: "0008,103E", name: "Series Description", vr: "LO", keyword: "SeriesDescription" },

    { tag: "0010,0010", name: "Patient's Name", vr: "PN", keyword: "PatientName" },
    { tag: "0010,0020", name: "Patient ID", vr: "LO", keyword: "PatientID" },
    { tag: "0010,0030", name: "Patient's Birth Date", vr: "DA", keyword: "PatientBirthDate" },
    { tag: "0010,0040", name: "Patient's Sex", vr: "CS", keyword: "PatientSex" },
    { tag: "0010,1010", name: "Patient's Age", vr: "AS", keyword: "PatientAge" },
    { tag: "0010,2160", name: "Ethnic Group", vr: "SH", keyword: "EthnicGroup" },

    { tag: "0020,000D", name: "Study Instance UID", vr: "UI", keyword: "StudyInstanceUID" },
    { tag: "0020,000E", name: "Series Instance UID", vr: "UI", keyword: "SeriesInstanceUID" },
    { tag: "0020,0010", name: "Study ID", vr: "SH", keyword: "StudyID" },
    { tag: "0020,0011", name: "Series Number", vr: "IS", keyword: "SeriesNumber" },
    { tag: "0020,0013", name: "Instance Number", vr: "IS", keyword: "InstanceNumber" },

    // Add many more tags...
];

// Helper function to find tag info by tag number (or keyword/name later)
export const getTagInfo = (tagNumber: string): DicomTagInfo | undefined => {
    return dicomDictionary.find(entry => entry.tag === tagNumber);
};

// Helper to find tags matching a query (name, keyword, or tag number)
export const findMatchingTags = (query: string): DicomTagInfo[] => {
    if (!query) {
        return []; // Or return first N tags?
    }
    const lowerCaseQuery = query.toLowerCase();
    return dicomDictionary.filter(entry =>
        entry.name.toLowerCase().includes(lowerCaseQuery) ||
        entry.keyword.toLowerCase().includes(lowerCaseQuery) ||
        entry.tag.includes(lowerCaseQuery) // Allow searching by tag number too
    ).slice(0, 10); // Limit results for performance
};
