require('dotenv').config({ path: '../.env' });
const db = require('../src/config/database');

async function fixTimezone() {
  try {
    console.log('[Fix] Connected to database');
    const result = await db('attendance_logs')
      .whereNotNull('device_sn')
      .update({
        punch_time: db.raw("punch_time - INTERVAL '5 hours 30 minutes'")
      });
    console.log(`[Success] Corrected timezone offset for ${result} attendance logs.`);
  } catch (err) {
    console.error('[Error] Failed to fix timezone:', err.message);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

fixTimezone();
