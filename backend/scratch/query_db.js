const knex = require('knex');
const config = require('../knexfile');

const db = knex(config.supabase);

async function run() {
  try {
    const tenants = await db('tenants')
      .whereIn('tenant_id', [1001, 1002])
      .select('tenant_id', 'name');
    console.log('Tenants:', tenants);

    const templates = await db('biometric_templates')
      .whereIn('tenant_id', [1001, 1002]);
    console.log('Biometric Templates for these tenants:', templates.map(t => ({
      id: t.id,
      tenant_id: t.tenant_id,
      type: t.type,
      finger_index: t.finger_index,
      is_valid: t.is_valid
    })));

    // Let's run the exact raw count query
    for (const tid of [1001, 1002]) {
      const res = await db('biometric_templates')
        .where('tenant_id', tid)
        .count('* as count')
        .first();
      console.log(`Raw count for ${tid}:`, res);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.destroy();
  }
}

run();
