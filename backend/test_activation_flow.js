const axios = require('axios');
const crypto = require('crypto');

const BASE_URL = 'http://localhost:5000/api';
const TEST_EMAIL = `test_user_${crypto.randomBytes(2).toString('hex')}@example.com`;
const TEST_PASSWORD = 'password123';

async function testActivationFlow() {
    try {
        console.log('--- Testing License Activation Flow ---');
        console.log(`Using email: ${TEST_EMAIL}`);

        // 1. Register a new user
        console.log('\n1. Registering user...');
        const regRes = await axios.post(`${BASE_URL}/auth/register`, {
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        });
        const activationCode = regRes.data.activation_code;
        console.log(`SUCCESS: User registered. Activation Code: ${activationCode}`);

        // 2. Claim license using activation code
        console.log('\n2. Claiming license...');
        const claimRes = await axios.post(`${BASE_URL}/auth/claim-license`, {
            email: TEST_EMAIL,
            activation_code: activationCode
        });
        const licenseKey = claimRes.data.license_key;
        console.log(`SUCCESS: License claimed. Key: ${licenseKey}`);

        // 3. Activate the license (client-side simulation)
        console.log('\n3. Activating license...');
        const activateRes = await axios.post(`${BASE_URL}/auth/activate`, {
            email: TEST_EMAIL,
            license_key: licenseKey,
            hardware_fingerprint: 'test_device_fp_999'
        });
        console.log('SUCCESS: License activated. Token received.');

        console.log('\n--- ALL FLOW TESTS PASSED ---');
    } catch (error) {
        console.error('\nFLOW TEST FAILED:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

testActivationFlow();
