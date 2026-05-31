require('dotenv').config();
const knex = require('knex');
const config = require('../knexfile');
const db = knex(config.supabase);

async function run() {
  try {
    // Only QJT3244100595 belongs to skyincolivingpg@gmail.com
    // Delete all UNEXECUTED commands that were wrongly queued to the other 4 devices
    const wrongDevices = ['JNP2254501106', 'JYK8234700224', 'NYU725501868', 'QJT3252700840'];

    for (const sn of wrongDevices) {
      const deleted = await db('device_commands')
        .where('device_sn', sn)
        .where('executed', false)
        .del();
      console.log(`[CLEANUP] Deleted ${deleted} unexecuted commands for device ${sn}`);
    }

    console.log('[CLEANUP] Done. Wrong commands removed.');
  } catch (err) {
    console.error('[CLEANUP] Error:', err.message);
  } finally {
    await db.destroy();
  }
}

run();
