require('dotenv').config();
const knex = require('knex');
const config = require('./knexfile');

const environment = process.env.SUPABASE_DATABASE_URL ? 'supabase' : 'development';
console.log(`Testing connection to: ${environment}`);

const db = knex(config[environment]);

async function test() {
  const tables = ['users', 'floors', 'rooms', 'beds', 'tenants', 'payments', 'access_control', 'devices'];
  for (const table of tables) {
    try {
      const count = await db(table).count('* as count').first();
      console.log(`Table ${table}: SUCCESS (${count.count} rows)`);
    } catch (err) {
      console.error(`Table ${table}: FAILED - ${err.message}`);
    }
  }
  process.exit(0);
}

test();
