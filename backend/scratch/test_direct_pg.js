const { Client } = require('pg');
require('dotenv').config({ path: './backend/.env' });

async function test() {
  const connectionString = process.env.SUPABASE_DATABASE_URL;
  if (!connectionString) {
    console.error('SUPABASE_DATABASE_URL not found in .env');
    process.exit(1);
  }

  const client = new Client({
    connectionString: connectionString,
    connectionTimeoutMillis: 5000,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const host = connectionString.split('@')[1]?.split(':')[0];
    console.log('Attempting to connect to host:', host);
    await client.connect();
    console.log('Connected successfully!');
    const res = await client.query('SELECT NOW()');
    console.log('Server time:', res.rows[0].now);
    await client.end();
  } catch (err) {
    console.error('Connection failed:', err.message);
    if (err.message.includes('ETIMEDOUT') || err.message.includes('ECONNREFUSED')) {
      console.log('\n--- DIAGNOSIS ---');
      console.log('The database port (5432) is unreachable from your network.');
      console.log('Since port 443 (HTTPS) works, this is likely a firewall/ISP block.');
      console.log('Suggested Action: Use a VPN or check if your router/ISP blocks port 5432.');
    }
  }
}

test();
