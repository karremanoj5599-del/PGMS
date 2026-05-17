require('dotenv').config();
const knex = require('knex');
const db = knex({ client: 'pg', connection: process.env.SUPABASE_DATABASE_URL });

async function check() {
  try {
    const hasTable = await db.schema.hasTable('unregistered_devices');
    console.log("has unregistered_devices:", hasTable);
    if (hasTable) {
      const colInfo = await db('unregistered_devices').columnInfo();
      console.log("Columns:", Object.keys(colInfo));
    }
  } catch (err) {
    console.error(err);
  } finally {
    db.destroy();
  }
}
check();
