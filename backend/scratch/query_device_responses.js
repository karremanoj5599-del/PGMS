const knex = require('knex');
const config = require('../knexfile');

const db = knex(config.supabase);

async function run() {
  try {
    const logs = await db('unknown_device_logs')
      .where('path', 'like', '%1373%')
      .orWhere('path', 'like', '%550%')
      .orderBy('id', 'desc');

    console.log('Device Cmd Responses:', logs.map(l => ({
      id: l.id,
      sn: l.sn,
      path: l.path,
      query: typeof l.query === 'string' ? l.query.substring(0, 300) : JSON.stringify(l.query).substring(0, 300)
    })));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.destroy();
  }
}

run();
