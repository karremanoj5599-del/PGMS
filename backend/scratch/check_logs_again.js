require('dotenv').config();
const knex = require('knex');
const db = knex({ client: 'pg', connection: process.env.SUPABASE_DATABASE_URL });

async function check() {
  try {
    const devices = await db('devices');
    console.log("DEVICES:", devices.map(d => ({
      sn: d.sn,
      adms_status: d.adms_status,
      last_seen: d.last_seen,
      user_id: d.user_id
    })));

    const logs = await db('attendance_logs').orderBy('punch_time', 'desc').limit(5);
    console.log("LATEST ATTENDANCE LOGS:", logs);
  } catch (err) {
    console.error(err);
  } finally {
    db.destroy();
  }
}
check();
