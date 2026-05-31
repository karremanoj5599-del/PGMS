require('dotenv').config();
const knex = require('knex');
const config = require('../knexfile');

const db = knex(config.supabase);

async function run() {
  try {
    console.log('[RESYNC] Starting full biometric resync to all devices...');

    // Get all tenants that have biometric templates
    const tenantsWithTemplates = await db('biometric_templates')
      .distinct('tenant_id')
      .pluck('tenant_id');

    console.log(`[RESYNC] Found ${tenantsWithTemplates.length} tenants with templates in database`);

    // Get all active devices
    const devices = await db('devices').where('adms_status', true);
    console.log(`[RESYNC] Found ${devices.length} active device(s):`, devices.map(d => d.sn));

    if (devices.length === 0) {
      console.log('[RESYNC] No active devices found. Aborting.');
      return;
    }

    let totalCommandsQueued = 0;
    let successCount = 0;
    let failCount = 0;

    for (const tenantId of tenantsWithTemplates) {
      try {
        const tenant = await db('tenants').where('tenant_id', tenantId).first();
        if (!tenant) { failCount++; continue; }

        const templates = await db('biometric_templates').where({ tenant_id: tenantId, is_valid: true });
        if (templates.length === 0) continue;

        const pin = tenant.biometric_pin || tenant.tenant_id.toString();

        for (const device of devices) {
          if (!device.sn) continue;

          // First: re-queue USERINFO to ensure user exists on device
          const cleanName = tenant.name.replace(/[^\w]/g, '');
          await db('device_commands').insert({
            device_sn: device.sn,
            command: `DATA UPDATE USERINFO PIN=${pin}\tName=${cleanName}\tPri=0\tPass=\tCard=\tGrp=1\tTZ=0000000000000001\tPIN2=${pin}`,
            user_id: tenant.user_id
          });
          totalCommandsQueued++;

          // Then: re-queue BIODATA for each template
          for (const tpl of templates) {
            const major = tpl.major_ver ? `\tMajorVer=${tpl.major_ver}` : '';
            const minor = tpl.minor_ver ? `\tMinorVer=${tpl.minor_ver}` : '';
            const format = tpl.format ? `\tFormat=${tpl.format}` : '';
            const bioType = tpl.type === 'face' ? '9' : (tpl.type === 'palm' ? '8' : '1');

            await db('device_commands').insert({
              device_sn: device.sn,
              command: `DATA UPDATE BIODATA Pin=${pin}\tNo=0\tIndex=${tpl.finger_index}\tValid=1\tDuress=0\tType=${bioType}${major}${minor}${format}\tTmp=${tpl.template_data}`,
              user_id: tenant.user_id
            });
            totalCommandsQueued++;
          }

          // Finally: ensure user is enabled
          await db('device_commands').insert({
            device_sn: device.sn,
            command: `DATA UPDATE user Pin=${pin}\tEnabled=1`,
            user_id: tenant.user_id
          });
          totalCommandsQueued++;
        }

        successCount++;
        process.stdout.write(`\r[RESYNC] Progress: ${successCount}/${tenantsWithTemplates.length} tenants queued...`);
      } catch (err) {
        console.error(`\n[RESYNC] Failed for tenant ${tenantId}:`, err.message);
        failCount++;
      }
    }

    console.log(`\n\n[RESYNC] ✅ Done!`);
    console.log(`  Tenants processed: ${successCount}`);
    console.log(`  Tenants failed:    ${failCount}`);
    console.log(`  Total commands queued: ${totalCommandsQueued}`);
    console.log(`\n  The device will pick up these commands on its next heartbeat (usually within 30 seconds).`);

  } catch (err) {
    console.error('[RESYNC] Fatal error:', err.message);
  } finally {
    await db.destroy();
  }
}

run();
