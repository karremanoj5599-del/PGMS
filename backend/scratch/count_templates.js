const knex = require('knex');
const config = require('../knexfile');

const db = knex(config.supabase);

async function run() {
  try {
    const totalTemplates = await db('biometric_templates').count('* as count').first();
    console.log('Total templates in database:', totalTemplates);

    const templatesByType = await db('biometric_templates')
      .select('type')
      .count('* as count')
      .groupBy('type');
    console.log('Templates by type in database:', templatesByType);

    const tenantsWithTemplates = await db('biometric_templates')
      .distinct('tenant_id')
      .count('tenant_id as count')
      .first();
    console.log('Distinct tenants with templates in database:', tenantsWithTemplates);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.destroy();
  }
}

run();
