// Test script to check API responses
const API_BASE_URL = 'https://axiom.trazen.org/api/v1';

async function testApiCall(endpoint, description) {
    console.log(`\n=== Testing ${description} ===`);
    console.log(`Endpoint: ${endpoint}`);
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Accept': 'application/json',
                'Api-Key': 'test-key' // Using Api-Key as mentioned by user
            }
        });
        
        console.log(`Status: ${response.status}`);
        console.log(`Content-Type: ${response.headers.get('content-type')}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.log(`Error Response: ${errorText}`);
            return null;
        }
        
        const data = await response.json();
        console.log(`Response:`, JSON.stringify(data, null, 2));
        return data;
    } catch (error) {
        console.error(`Error calling ${endpoint}:`, error);
        return null;
    }
}

async function testAllSources() {
    console.log('Testing API endpoints for source data...');
    
    await testApiCall('/config/dimse-qr-sources', 'DIMSE Q/R Sources');
    await testApiCall('/config/dicomweb-sources', 'DICOMweb Sources');
    await testApiCall('/config/google-healthcare-sources/', 'Google Healthcare Sources');
}

// Run the tests
testAllSources();
