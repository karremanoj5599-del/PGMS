const db = require('./db');

async function check() {
  try {
    const devices = await db('devices').select('sn', 'device_name', 'last_seen', 'adms_status');
    console.log("Devices:", devices);

    const pending = await db('device_commands')
      .where('executed', false)
      .select('id', 'device_sn', 'command', 'created_at');
    console.log("Pending Commands:", pending);
  } catch (err) {
    console.error(err);
  }
  process.exit();
}

check();
