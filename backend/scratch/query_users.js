const knex = require('knex');
const config = require('../knexfile');

async function queryUsers() {
  const db = knex(config.supabase);
  try {
    const users = await db('users').select('user_id', 'email', 'name');
    console.log('Users in production DB:', users);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await db.destroy();
  }
}
queryUsers();
