const db = require('../db');

async function rebootDevice() {
  try {
    await db('device_commands').insert({
      device_sn: 'NYU7255201868',
      command: 'REBOOT',
      user_id: 9
    });
    console.log("REBOOT command inserted!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
rebootDevice();
