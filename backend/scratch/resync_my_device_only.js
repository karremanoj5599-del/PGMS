require('dotenv').config();
const knex = require('knex');
const config = require('../knexfile');
const db = knex(config.supabase);

// ✅ SAFE: Only targets the specific device and its owner
const MY_DEVICE_SN = 'QJT3244100595';

async function run() {
  try {
    // Step 1: Find the device and its owner (user_id)
    const device = await db('devices').where('sn', MY_DEVICE_SN).first();
    if (!device) {
      console.error(`[ERROR] Device ${MY_DEVICE_SN} not found in database`);
      return;
    }
    const userId = device.user_id;
    console.log(`[RESYNC] Device: ${MY_DEVICE_SN}, Owner user_id: ${userId}`);

    // Step 2: Get ONLY this PG's tenants that have templates
    const tenantsWithTemplates = await db('biometric_templates')
      .join('tenants', 'biometric_templates.tenant_id', 'tenants.tenant_id')
      .where('tenants.user_id', userId)
      .distinct('biometric_templates.tenant_id')
      .pluck('biometric_templates.tenant_id');

    console.log(`[RESYNC] Found ${tenantsWithTemplates.length} tenants with templates belonging to this PG`);

    let totalCommandsQueued = 0;
    let successCount = 0;

    for (const tenantId of tenantsWithTemplates) {
      const tenant = await db('tenants').where({ tenant_id: tenantId, user_id: userId }).first();
      if (!tenant) continue;

      const templates = await db('biometric_templates').where({ tenant_id: tenantId, is_valid: true });
      if (templates.length === 0) continue;

      const pin = tenant.biometric_pin || tenant.tenant_id.toString();
      const cleanName = tenant.name.replace(/[^\w]/g, '');

      // Re-queue USERINFO
      await db('device_commands').insert({
        device_sn: MY_DEVICE_SN,
        command: `DATA UPDATE USERINFO PIN=${pin}\tName=${cleanName}\tPri=0\tPass=\tCard=\tGrp=1\tTZ=0000000000000001\tPIN2=${pin}`,
        user_id: userId
      });
      totalCommandsQueued++;

      // Re-queue each template (BIODATA)
      for (const tpl of templates) {
        const major = tpl.major_ver ? `\tMajorVer=${tpl.major_ver}` : '';
        const minor = tpl.minor_ver ? `\tMinorVer=${tpl.minor_ver}` : '';
        const format = tpl.format ? `\tFormat=${tpl.format}` : '';
        const bioType = tpl.type === 'face' ? '9' : (tpl.type === 'palm' ? '8' : '1');

        await db('device_commands').insert({
          device_sn: MY_DEVICE_SN,
          command: `DATA UPDATE BIODATA Pin=${pin}\tNo=0\tIndex=${tpl.finger_index}\tValid=1\tDuress=0\tType=${bioType}${major}${minor}${format}\tTmp=${tpl.template_data}`,
          user_id: userId
        });
        totalCommandsQueued++;
      }

      // Ensure user is enabled
      await db('device_commands').insert({
        device_sn: MY_DEVICE_SN,
        command: `DATA UPDATE user Pin=${pin}\tEnabled=1`,
        user_id: userId
      });
      totalCommandsQueued++;

      successCount++;
      process.stdout.write(`\r[RESYNC] Progress: ${successCount}/${tenantsWithTemplates.length} tenants queued...`);
    }

    console.log(`\n\n[RESYNC] ✅ Done!`);
    console.log(`  Tenants processed: ${successCount}`);
    console.log(`  Total commands queued for ${MY_DEVICE_SN}: ${totalCommandsQueued}`);
    console.log(`  Device will pick up commands on next heartbeat (~30 seconds).`);

  } catch (err) {
    console.error('[RESYNC] Fatal error:', err.message);
  } finally {
    await db.destroy();
  }
}

run();
