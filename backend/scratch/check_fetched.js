require('dotenv').config();
const knex = require('knex');
const db = knex({ client: 'pg', connection: process.env.SUPABASE_DATABASE_URL });

async function check() {
  try {
    const cmd = await db('device_commands').where('device_sn', 'QJT3252700840').orderBy('id', 'desc').first();
    console.log("LAST COMMAND FOR QJT3252700840:", {
      id: cmd.id,
      command: cmd.command,
      executed: cmd.executed,
      exec_time: cmd.exec_time,
      attempts: cmd.attempts,
      last_fetched_at: cmd.last_fetched_at
    });

    const logs = await db('attendance_logs').where('device_sn', 'QJT3252700840').orderBy('punch_time', 'desc').limit(10);
    console.log("NEW ATTENDANCE LOGS FOR QJT3252700840:", logs);
  } catch (err) {
    console.error(err);
  } finally {
    db.destroy();
  }
}
check();
