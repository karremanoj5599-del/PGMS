const knex = require('knex');
const config = require('../knexfile');

const db = knex(config.supabase);

async function run() {
  try {
    const commands = await db('device_commands')
      .where(function() {
        this.where('command', 'like', '%Pin=5%')
            .orWhere('command', 'like', '%PIN=5%')
            .orWhere('command', 'like', '%Pin=4%')
            .orWhere('command', 'like', '%PIN=4%');
      })
      .orderBy('id', 'desc')
      .limit(30);

    console.log('Recent Device Commands for PIN 4 and 5:', commands.map(c => ({
      id: c.id,
      device_sn: c.device_sn,
      command: c.command.substring(0, 100) + '...',
      executed: c.executed,
      execute_time: c.execute_time
    })));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.destroy();
  }
}

run();
