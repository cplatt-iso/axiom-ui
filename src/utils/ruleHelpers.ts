// src/utils/ruleHelpers.ts
import { MatchOperation, MatchOperationSchema } from '@/schemas';

export const isValueRequired = (op: MatchOperation | undefined | null): boolean => {
    if (!op) return false;
    return !(op === MatchOperationSchema.enum.exists || op === MatchOperationSchema.enum.not_exists);
};

export const isValueList = (op: MatchOperation | undefined | null): boolean => {
    if (!op) return false;
    return op === MatchOperationSchema.enum.in || op === MatchOperationSchema.enum.not_in;
};

export const isIpOperator = (op: MatchOperation | undefined | null): boolean => {
    if (!op) return false;
    return (
        op === MatchOperationSchema.enum.ip_eq ||
        op === MatchOperationSchema.enum.ip_startswith ||
        op === MatchOperationSchema.enum.ip_in_subnet
    );
};

// Source type constants for UI consistency
export const SOURCE_TYPE_ICONS = {
    dicom_web: 'CloudIcon',
    dimse_listener: 'RadioIcon',
    dimse_qr: 'CircleStackIcon',
    file_system: 'ServerIcon',
} as const;

export const SOURCE_TYPE_LABELS = {
    dicom_web: 'DICOM Web',
    dimse_listener: 'DIMSE Listener',
    dimse_qr: 'DIMSE Query/Retrieve',
    file_system: 'File System',
} as const;

export type SourceTypeKey = keyof typeof SOURCE_TYPE_ICONS;

// Helper to determine source type from a source object
export const getSourceTypeFromSource = (source: any): SourceTypeKey => {
    // Use the type field added by the normalized data, fall back to name-based detection
    if (source.type) {
        switch (source.type) {
            case 'dicomweb': return 'dicom_web';
            case 'dimse_listener': return 'dimse_listener';
            case 'dimse_qr': return 'dimse_qr';
            case 'known': 
                // For known sources, detect from the name
                const nameString = String(source.name || '').toUpperCase();
                if (nameString.includes('ORTHANC') || nameString.includes('DICOMWEB')) return 'dicom_web';
                if (nameString.includes('DCM4CHE') || nameString.includes('LISTENER')) return 'dimse_listener';
                if (nameString.includes('DIMSE') || nameString.includes('SCP') || nameString.includes('C-STORE') || 
                    nameString.includes('TLS') || nameString.includes('PACS') || nameString.includes('SPANNER')) return 'dimse_qr';
                return 'file_system';
            default: return 'file_system';
        }
    }
    
    // Fallback to name-based detection for backward compatibility
    const nameString = String(source.name || source.id || '').toUpperCase();
    if (nameString.includes('DICOMWEB') || nameString.includes('ORTHANC')) return 'dicom_web';
    if (nameString.includes('DCM4CHE') || nameString.includes('LISTENER')) return 'dimse_listener';
    if (nameString.includes('DIMSE') || nameString.includes('SCP') || nameString.includes('C-STORE') || 
        nameString.includes('TLS') || nameString.includes('PACS') || nameString.includes('SPANNER')) return 'dimse_qr';
    
    return 'file_system';
};

// Helper to create a unique frontend ID for a source
export const createSourceFrontendId = (source: any, index?: number): string => {
    const sourceType = getSourceTypeFromSource(source);
    
    if (source.id !== undefined && source.id !== null) {
        return `${sourceType}-id-${source.id}`;
    } else if (source.name) {
        return `${sourceType}-name-${encodeURIComponent(source.name)}`;
    } else {
        return `${sourceType}-index-${index || 0}`;
    }
};

// Helper to convert actual source names to frontend identifiers
export const convertSourceNamesToFrontendIds = (sourceNames: string[], availableSources: any[]): string[] => {
    return sourceNames.map(sourceName => {
        // Find the source that matches this source name
        const matchingSource = availableSources.find(source => source.name === sourceName);
        
        if (!matchingSource) {
            // If no matching source found, return the name as-is (backward compatibility)
            return sourceName;
        }
        
        return createSourceFrontendId(matchingSource);
    });
};

// Helper to convert frontend source IDs back to actual source names
export const convertFrontendIdsToSourceNames = (frontendIds: string[], availableSources: any[]): string[] => {
    return frontendIds.map(frontendId => {
        // Find the source that matches this frontend ID
        const matchingSource = availableSources.find(source => {
            const expectedId = createSourceFrontendId(source);
            return expectedId === frontendId;
        });
        
        // Return the actual source name that the backend expects
        return matchingSource ? matchingSource.name : frontendId;
    }).filter(Boolean); // Filter out any undefined values
};