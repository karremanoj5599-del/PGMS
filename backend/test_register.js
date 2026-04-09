const db = require('./db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function testRegister() {
  const email = 'manojkkarre@gmail.com';
  const password = 'password123';
  
  try {
    const existingUser = await db('users').where('email', email).first();
    console.log('Existing count for this email:', !!existingUser);

    const hashedPassword = await bcrypt.hash(password, 10);
    const activationCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    const trialExpiry = new Date();
    trialExpiry.setDate(trialExpiry.getDate() + 3);

    console.log('Attempting insert into users table...');
    const result = await db('users').insert({
      email,
      password: hashedPassword,
      activation_code: activationCode,
      trial_expiry: trialExpiry.toISOString(),
      is_activated: false
    });
    
    console.log('Insert Result:', result);
    
    const check = await db('users').where('email', email).first();
    console.log('User found after insert:', !!check);
    
    process.exit(0);
  } catch (err) {
    console.error('Error during registration test:', err);
    process.exit(1);
  }
}

testRegister();
