const db = require('../db');

async function check() {
  try {
    const commands = await db('device_commands').orderBy('id', 'desc').limit(10);
    console.log("LAST 10 COMMANDS:");
    console.dir(commands, { depth: null });

    const templates = await db('biometric_templates');
    console.log(`TOTAL TEMPLATES: ${templates.length}`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
