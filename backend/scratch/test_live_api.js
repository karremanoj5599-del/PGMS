const https = require('https');

const req = https.request('https://pgms-nu.vercel.app/api/reports/tenant-attendance?startDate=2026-04-30&endDate=2026-05-17', {
  headers: {
    'x-user-id': '13'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Response: ${data}`);
  });
});

req.on('error', console.error);
req.end();
