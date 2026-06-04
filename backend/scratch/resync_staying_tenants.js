require('dotenv').config();
const knex = require('knex');
const config = require('../knexfile');
const accessService = require('../src/modules/access-control/access.service');

const db = knex(config.supabase);

async function run() {
  try {
    console.log('[RESYNC] Updating all tenants to clear EndDatetime and push fixed size templates...');

    // Get all 'Staying' tenants
    const tenants = await db('tenants')
      .where('status', 'Staying')
      .select('tenant_id', 'name');

    let successCount = 0;
    
    for (const tenant of tenants) {
      try {
        await accessService.syncTenantAccess(tenant.tenant_id);
        successCount++;
        process.stdout.write(`\r[RESYNC] Progress: ${successCount}/${tenants.length} tenants queued...`);
      } catch (err) {
        console.error(`\nFailed to sync tenant ${tenant.tenant_id}: ${err.message}`);
      }
    }

    console.log(`\n[RESYNC] ✅ Done! Resynced ${successCount} tenants.`);
    console.log(`The devices will now fetch these commands and fix the overnight deletion issue.`);

  } catch (err) {
    console.error('[RESYNC] Fatal error:', err.message);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

run();
