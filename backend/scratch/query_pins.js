const knex = require('knex');
const config = require('../knexfile');

const db = knex(config.supabase);

async function run() {
  try {
    const tenants = await db('tenants')
      .whereIn('tenant_id', [1001, 1002, 9])
      .select('tenant_id', 'name', 'biometric_pin');
    console.log('Tenants details:', tenants);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.destroy();
  }
}

run();
