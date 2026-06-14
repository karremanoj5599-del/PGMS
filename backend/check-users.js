const db = require('./src/config/database');

async function checkUsers() {
  try {
    const users = await db('users').select('email');
    console.log('Users in database:', users);
  } catch (err) {
    console.error('Error fetching users:', err);
  } finally {
    db.destroy();
  }
}

checkUsers();
