require('dotenv').config();
const knex = require('knex');
const db = knex({ client: 'pg', connection: process.env.SUPABASE_DATABASE_URL });

async function run() {
  try {
    const sn = 'QJT3252700840';
    const userId = 13;
    
    // Clear any old DATA QUERY ATTLOG commands that might be executed
    await db('device_commands')
      .where({ device_sn: sn, command: 'DATA QUERY ATTLOG StartTime=\tEndTime=' })
      .del();

    // Insert new command
    const [idObj] = await db('device_commands').insert({
      device_sn: sn,
      command: 'DATA QUERY ATTLOG StartTime=\tEndTime=',
      user_id: userId
    }).returning('id');
    const cmdId = typeof idObj === 'object' ? idObj.id : idObj;
    console.log(`QUEUED NEW DATA QUERY ATTLOG command with ID: ${cmdId}`);

    console.log("Waiting 30 seconds for the device to poll and upload the logs...");
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Check if command is executed
    const cmd = await db('device_commands').where('id', cmdId).first();
    console.log("COMMAND STATUS:", {
      id: cmd.id,
      executed: cmd.executed,
      attempts: cmd.attempts,
      last_fetched_at: cmd.last_fetched_at
    });

    // Check if logs are saved
    const logs = await db('attendance_logs').where('device_sn', sn).orderBy('punch_time', 'desc');
    console.log(`FOUND ${logs.length} ATTENDANCE LOGS FOR ${sn}!`);
    console.log("LATEST LOGS:", logs.slice(0, 5));

  } catch (err) {
    console.error(err);
  } finally {
    db.destroy();
  }
}
run();
