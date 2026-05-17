const knex = require('knex');
const config = require('../knexfile');

async function check() {
  const sqliteDb = knex(config.development);
  try {
    const colInfo = await sqliteDb('tenants').columnInfo();
    console.log("SQLite tenants columns:", Object.keys(colInfo));
  } catch (err) {
    console.error("SQLite error:", err.message);
  } finally {
    sqliteDb.destroy();
  }

  if (process.env.SUPABASE_DATABASE_URL) {
    const pgDb = knex(config.supabase);
    try {
      const colInfo = await pgDb('tenants').columnInfo();
      console.log("Supabase tenants columns:", Object.keys(colInfo));
    } catch (err) {
      console.error("Supabase error:", err.message);
    } finally {
      pgDb.destroy();
    }
  }
}
check();
