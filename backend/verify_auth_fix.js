const axios = require('axios');

async function verifyAuth() {
  const BASE_URL = 'http://localhost:5000/api/auth';
  const testEmail = `manoj_${Date.now()}@gmail.com`;
  const testPassword = 'password123';

  console.log(`--- Starting Verification for ${testEmail} ---`);

  try {
    // 1. Test Registration
    console.log('Testing Registration...');
    const regRes = await axios.post(`${BASE_URL}/register`, {
      email: `  ${testEmail}  `, // Test trimming
      password: testPassword
    });
    console.log('Registration Success:', regRes.data.message);
    if (!regRes.data.user_id) throw new Error('No user_id returned');

    // 2. Test Login
    console.log('Testing Login...');
    const loginRes = await axios.post(`${BASE_URL}/login`, {
      email: testEmail,
      password: testPassword
    });
    console.log('Login Success:', loginRes.data.user.message);
    if (loginRes.data.user.email !== testEmail) throw new Error('Email mismatch in login response');

    // 3. Test duplicate registration
    console.log('Testing Duplicate Registration (should fail)...');
    try {
      await axios.post(`${BASE_URL}/register`, { email: testEmail, password: testPassword });
      throw new Error('Duplicate registration should have failed');
    } catch (e) {
      if (e.response?.status === 400 && e.response?.data?.error === 'User already exists') {
        console.log('Duplicate check passed.');
      } else {
        throw e;
      }
    }

    console.log('--- Verification SUCCESSFUL ---');
    process.exit(0);
  } catch (err) {
    console.error('--- Verification FAILED ---');
    console.error(err.response?.data || err.message);
    process.exit(1);
  }
}

verifyAuth();
