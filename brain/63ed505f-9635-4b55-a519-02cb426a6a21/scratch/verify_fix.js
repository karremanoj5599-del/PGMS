const axios = require('axios');

async function testFix() {
  try {
    const res = await axios.get('http://localhost:5000/api/devices/5/test', {
      headers: { 'x-user-id': '1' } // Assuming admin user_id is 1
    });
    console.log('Result:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

testFix();
