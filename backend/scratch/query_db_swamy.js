const knex = require('knex');
const config = require('../knexfile');

const db = knex(config.supabase);

async function run() {
  try {
    const tenants = await db('tenants')
      .whereIn('tenant_id', [9])
      .select('tenant_id', 'name');
    console.log('Tenants:', tenants);

    const templates = await db('biometric_templates')
      .whereIn('tenant_id', [9]);
    console.log('Biometric Templates for these tenants:', templates.map(t => ({
      id: t.id,
      tenant_id: t.tenant_id,
      type: t.type,
      finger_index: t.finger_index,
      is_valid: t.is_valid
    })));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.destroy();
  }
}

run();
