const db = require('../db');

async function checkDevices() {
  try {
    const devices = await db('devices').select('*');
    console.log('--- Registered Devices ---');
    console.table(devices);
    
    const commands = await db('device_commands').where('executed', false);
    console.log('\n--- Pending Commands ---');
    console.table(commands);

    process.exit(0);
  } catch (err) {
    console.error('Error querying DB:', err.message);
    process.exit(1);
  }
}

checkDevices();
