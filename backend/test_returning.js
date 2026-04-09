const db = require('./db');

async function testReturning() {
  try {
    const result = await db('users').insert({
      email: 'test_return@gmail.com',
      password: 'password',
      activation_code: 'TEST',
      trial_expiry: new Date().toISOString()
    }).returning('*');
    
    console.log('Result of returning(*):', JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

testReturning();
