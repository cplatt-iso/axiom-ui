// Test transformation function
const transformSourceMappingForApi = (data) => {
    if (!data.source_id || data.source_id <= 0 || !data.source_type) {
        return data;
    }
    
    const { source_id, source_type, ...restData } = data;
    let apiData = { 
        ...restData, 
        source_type,
        // Initialize all source ID fields to null
        dimse_qr_source_id: null,
        dicomweb_source_id: null,
        google_healthcare_source_id: null,
    };
    
    // Set the appropriate field based on source_type
    switch (source_type) {
        case 'dimse_qr':
            apiData.dimse_qr_source_id = source_id;
            break;
        case 'dicomweb':
            apiData.dicomweb_source_id = source_id;
            break;
        case 'google_healthcare':
            apiData.google_healthcare_source_id = source_id;
            break;
        default:
            // Fallback to generic source_id if unknown type
            apiData.source_id = source_id;
    }
    
    return apiData;
};

// Test with Google Healthcare source
const testData = {
    priority: 50,
    is_enabled: true,
    weight: 1,
    enable_failover: true,
    max_retries: 2,
    retry_delay_seconds: 5,
    spanner_config_id: 2,
    source_type: "google_healthcare",
    source_id: 1
};

console.log('Input:', testData);
console.log('Output:', transformSourceMappingForApi(testData));
