// Test file to verify source conversion logic
// This simulates the data structures to ensure our conversion functions work correctly

const mockAvailableSources = [
    { id: 1, name: "AXIOM Spanner 01", type: "known" },
    { id: 2, name: "ISO PACS", type: "dimse_listener" },
    { id: 3, name: "Orthanc TLS Test Source", type: "dimse_listener" },
    { name: "api_json", type: "known" },
    { name: "dcm4che_1", type: "dimse_listener" },
    { name: "storescp_1", type: "dimse_listener" },
    { name: "storescp_2", type: "dimse_listener" },
    { name: "stow_rs", type: "dicomweb" }
];

// Mock the user's selection (frontend IDs)
const mockSelectedSources = [
    "dimse_listener-id-2",    // ISO PACS
    "dimse_listener-id-3",    // Orthanc TLS Test Source  
    "dimse_listener-name-storescp_1"  // storescp_1
];

// Mock the backend response (actual source names)
const mockBackendApplicableSources = [
    "ISO PACS",
    "Orthanc TLS Test Source",
    "storescp_1"
];

console.log("Mock Data:");
console.log("Available Sources:", mockAvailableSources);
console.log("Selected Frontend IDs:", mockSelectedSources);
console.log("Expected Backend Names:", mockBackendApplicableSources);
console.log();

// Simulate our conversion functions
function getSourceTypeFromSource(source) {
    if (source.type) {
        switch (source.type) {
            case 'dicomweb': return 'dicom_web';
            case 'dimse_listener': return 'dimse_listener';
            case 'dimse_qr': return 'dimse_qr';
            case 'known': 
                const nameString = String(source.name || '').toUpperCase();
                if (nameString.includes('ORTHANC') || nameString.includes('DICOMWEB')) return 'dicom_web';
                if (nameString.includes('DCM4CHE') || nameString.includes('LISTENER')) return 'dimse_listener';
                if (nameString.includes('DIMSE') || nameString.includes('SCP') || nameString.includes('C-STORE') || 
                    nameString.includes('TLS') || nameString.includes('PACS') || nameString.includes('SPANNER')) return 'dimse_qr';
                return 'file_system';
            default: return 'file_system';
        }
    }
    return 'file_system';
}

function createSourceFrontendId(source, index) {
    const sourceType = getSourceTypeFromSource(source);
    
    if (source.id !== undefined && source.id !== null) {
        return `${sourceType}-id-${source.id}`;
    } else if (source.name) {
        return `${sourceType}-name-${encodeURIComponent(source.name)}`;
    } else {
        return `${sourceType}-index-${index || 0}`;
    }
}

function convertFrontendIdsToSourceNames(frontendIds, availableSources) {
    return frontendIds.map(frontendId => {
        const matchingSource = availableSources.find(source => {
            const expectedId = createSourceFrontendId(source);
            return expectedId === frontendId;
        });
        
        return matchingSource ? matchingSource.name : frontendId;
    }).filter(Boolean);
}

function convertSourceNamesToFrontendIds(sourceNames, availableSources) {
    return sourceNames.map(sourceName => {
        const matchingSource = availableSources.find(source => source.name === sourceName);
        
        if (!matchingSource) {
            return sourceName;
        }
        
        return createSourceFrontendId(matchingSource);
    });
}

// Test the conversions
console.log("Testing Frontend IDs -> Backend Names:");
const convertedToBackend = convertFrontendIdsToSourceNames(mockSelectedSources, mockAvailableSources);
console.log("Result:", convertedToBackend);
console.log("Expected:", mockBackendApplicableSources);
console.log("Match:", JSON.stringify(convertedToBackend) === JSON.stringify(mockBackendApplicableSources));
console.log();

console.log("Testing Backend Names -> Frontend IDs:");
const convertedToFrontend = convertSourceNamesToFrontendIds(mockBackendApplicableSources, mockAvailableSources);
console.log("Result:", convertedToFrontend);
console.log("Expected:", mockSelectedSources);
console.log("Match:", JSON.stringify(convertedToFrontend) === JSON.stringify(mockSelectedSources));
console.log();

// Test frontend ID generation
console.log("Testing Frontend ID Generation:");
mockAvailableSources.forEach((source, index) => {
    const frontendId = createSourceFrontendId(source, index);
    console.log(`${source.name || source.id} -> ${frontendId}`);
});
