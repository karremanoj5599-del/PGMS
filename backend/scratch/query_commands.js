const knex = require('knex');
const config = require('../knexfile');

const db = knex(config.supabase);

async function run() {
  try {
    // Check commands for jitendra 515 (pin: 1002 or tenant_id: 1002) and swamy (pin: 9 or tenant_id: 9)
    const commands = await db('device_commands')
      .where(function() {
        this.where('command', 'like', '%Pin=1002%')
            .orWhere('command', 'like', '%PIN=1002%')
            .orWhere('command', 'like', '%Pin=9%')
            .orWhere('command', 'like', '%PIN=9%');
      })
      .orderBy('id', 'desc')
      .limit(20);

    console.log('Recent Device Commands for these users:', commands.map(c => ({
      id: c.id,
      device_sn: c.device_sn,
      command: c.command.substring(0, 100) + '...',
      executed: c.executed,
      execute_time: c.execute_time,
      response: c.response
    })));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.destroy();
  }
}

run();
