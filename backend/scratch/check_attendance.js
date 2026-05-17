require('dotenv').config();
const knex = require('knex');
const config = require('../knexfile');
const db = knex(config.supabase);

async function check() {
  try {
    // Get distinct tenant_id values from attendance_logs for user 15
    const logTenantIds = await db('attendance_logs')
      .where('admin_user_id', 15)
      .distinct('tenant_id')
      .select('tenant_id');
    console.log("Distinct tenant_ids in attendance_logs:", logTenantIds.map(r => r.tenant_id));

    // Get tenant_ids from tenants table
    const tenants = await db('tenants')
      .where('user_id', 15)
      .select('tenant_id', 'name', 'biometric_pin');
    console.log("\nTenants table:");
    tenants.forEach(t => console.log(`  ID: ${t.tenant_id} (${typeof t.tenant_id}), Name: ${t.name}, PIN: ${t.biometric_pin}`));

    // Show the mismatch
    const tenantIdInts = tenants.map(t => t.tenant_id);
    const logIds = logTenantIds.map(r => r.tenant_id);
    
    const matchingInt = logIds.filter(lid => tenantIdInts.includes(parseInt(lid)));
    const matchingStr = logIds.filter(lid => tenantIdInts.map(String).includes(lid));
    
    console.log("\nMatching by int parse:", matchingInt.length, "of", logIds.length);
    console.log("Matching by string:", matchingStr.length, "of", logIds.length);

  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    db.destroy();
  }
}
check();
