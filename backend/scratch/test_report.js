require('dotenv').config();
const knex = require('knex');
const config = require('../knexfile');
const db = knex(config.supabase);

async function check() {
  try {
    const userId = 15; // skyinc admin user id
    let tQuery = db('tenants').where('user_id', userId);
    const tenants = await tQuery.select('tenant_id');
    
    const logs = await db('attendance_logs')
      .whereIn('tenant_id', tenants.map(t => t.tenant_id))
      .orderBy('punch_time', 'desc')
      .limit(1);
      
    if (logs.length > 0) {
      console.log(`The latest attendance log for skyinc is on: ${logs[0].punch_time}`);
    } else {
      console.log("No logs found at all.");
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    db.destroy();
  }
}
check();
