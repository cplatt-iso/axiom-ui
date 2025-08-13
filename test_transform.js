// Test the transformation logic
const transformSourceMappingForApi = (data) => {
    if (!data.source_id || !data.source_type) {
        return data;
    }
    
    const { source_id, source_type, ...restData } = data;
    let apiData = { ...restData, source_type };
    
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
            apiData.source_id = source_id;
    }
    
    return apiData;
};

// Test data that matches the error case
const testData = {
    source_type: 'dimse_qr',
    source_id: 1,
    priority: 50,
    is_enabled: true,
    weight: 1,
    enable_failover: true,
    max_retries: 2,
    retry_delay_seconds: 5,
    spanner_config_id: 2
};

console.log('Input:', JSON.stringify(testData, null, 2));
console.log('Transformed:', JSON.stringify(transformSourceMappingForApi(testData), null, 2));
