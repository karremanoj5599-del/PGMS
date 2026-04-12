const axios = require('axios');

async function testFetch() {
  console.log('Sending request to https://pgms-umber.vercel.app/api/auth/login...');
  const start = Date.now();
  try {
    const res = await axios.post('https://pgms-umber.vercel.app/api/auth/login', {
      email: 'test001@gmail.com',
      password: '999999'
    });
    const time = Date.now() - start;
    console.log(`Success! Time: ${time}ms`);
    console.log(res.data);
  } catch (err) {
    const time = Date.now() - start;
    console.log(`Failed! Time: ${time}ms`);
    if (err.response) {
      console.log('Status:', err.response.status);
      console.log('Data:', err.response.data);
    } else {
      console.log('Message:', err.message);
    }
  }
}

testFetch();
