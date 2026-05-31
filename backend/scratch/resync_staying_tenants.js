require('dotenv').config();
const knex = require('knex');
const config = require('../knexfile');
const accessService = require('../src/modules/access-control/access.service');

const db = knex(config.supabase);

async function run() {
  try {
    console.log('[RESYNC] Fetching all Staying tenants...');
    
    // Get all tenants who are 'Staying'
    const tenants = await db('tenants').where('status', 'Staying').select('tenant_id', 'name');
    
    console.log(`[RESYNC] Found ${tenants.length} staying tenants. Triggering access sync (which pushes templates)...`);
    
    let successCount = 0;
    
    for (const tenant of tenants) {
      try {
        await accessService.syncTenantAccess(tenant.tenant_id);
        successCount++;
        process.stdout.write(`\r[RESYNC] Progress: ${successCount}/${tenants.length} tenants queued...`);
      } catch (err) {
        console.error(`\n[RESYNC] Failed to sync tenant ${tenant.tenant_id} (${tenant.name}): ${err.message}`);
      }
    }
    
    console.log(`\n\n[RESYNC] ✅ Done! All staying tenants have been queued for biometric sync.`);
    console.log(`The device will pick up these commands on its next heartbeat (usually within 30 seconds).`);
    
  } catch (err) {
    console.error('[RESYNC] Fatal error:', err.message);
  } finally {
    await db.destroy();
    // Force exit in case there are lingering open handles
    process.exit(0);
  }
}

run();
