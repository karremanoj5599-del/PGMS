const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
const TEST_EMAIL = 'manojkkarre@gmail.com';
const FINGERPRINT = 'node_test_fingerprint_001';

async function testLicenseFlow() {
    try {
        console.log('--- Testing Node.js License System ---');

        // 1. Issue License (Admin)
        console.log('\n1. Issuing License...');
        const issueRes = await axios.post(`${BASE_URL}/licenses`, {
            email: TEST_EMAIL,
            product_id: 'PGMS-NODE-TEST',
            max_activations: 2,
            duration_days: 30
        });
        const key = issueRes.data.license_key;
        console.log('SUCCESS: Key issued:', key);

        // 2. Activate License
        console.log('\n2. Activating License...');
        const activateRes = await axios.post(`${BASE_URL}/auth/activate`, {
            email: TEST_EMAIL,
            license_key: key,
            hardware_fingerprint: FINGERPRINT
        });
        const token = activateRes.data.activation_token;
        console.log('SUCCESS: Activated. Token received.');

        // 3. Validate License
        console.log('\n3. Validating License...');
        const validateRes = await axios.post(`${BASE_URL}/auth/validate`, {
            email: TEST_EMAIL,
            license_key: key,
            hardware_fingerprint: FINGERPRINT
        });
        console.log('SUCCESS: Status:', validateRes.data.status);

        console.log('\n--- ALL TESTS PASSED ---');
    } catch (error) {
        console.error('\nTEST FAILED:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

testLicenseFlow();
