const knex = require('knex');
const config = require('../knexfile');

// Force IPv4 as we did in the main code
require('dns').setDefaultResultOrder('ipv4first');

console.log('Testing connection to Supabase...');

const db = knex(config.supabase);

async function test() {
  try {
    const result = await db.raw('SELECT current_database(), current_user, version()');
    console.log('✅ Connection Successful!');
    console.log('Database Info:', result.rows[0]);
    
    // Check if migrations table exists
    const migrationsExist = await db.schema.hasTable('knex_migrations');
    if (migrationsExist) {
        const migrations = await db('knex_migrations').select('*');
        console.log(`Found ${migrations.length} completed migrations.`);
    } else {
        console.log('⚠️ knex_migrations table NOT found. Deep migrations might not have been run yet.');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Connection Failed!');
    console.error(err);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

test();
