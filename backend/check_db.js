const db = require('./db');

async function check() {
  try {
    const users = await db('users').select('*');
    console.log('Users:', JSON.stringify(users, null, 2));
    
    const licenses = await db('licenses').select('*');
    console.log('Licenses:', JSON.stringify(licenses, null, 2));
    
    const count = await db('tenants').count('tenant_id as count').first();
    console.log('Tenant Count:', count.count);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
