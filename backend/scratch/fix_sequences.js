const knex = require('knex');
const config = require('../knexfile');

async function fixSequence() {
  const environment = process.env.SUPABASE_DATABASE_URL ? 'supabase' : 'development';
  console.log(`Checking environment: ${environment}`);
  const db = knex(config[environment]);

  try {
    if (environment === 'supabase') {
      const tablesAndSequences = [
        { table: 'tenants', seq: 'tenants_tenant_id_seq', idCol: 'tenant_id' },
        { table: 'beds', seq: 'beds_bed_id_seq', idCol: 'bed_id' },
        { table: 'rooms', seq: 'rooms_room_id_seq', idCol: 'room_id' },
        { table: 'floors', seq: 'floors_floor_id_seq', idCol: 'floor_id' },
        { table: 'payments', seq: 'payments_payment_id_seq', idCol: 'payment_id' },
        { table: 'devices', seq: 'devices_device_id_seq', idCol: 'device_id' },
        { table: 'access_control', seq: 'access_control_rule_id_seq', idCol: 'rule_id' }
      ];

      for (const { table, seq, idCol } of tablesAndSequences) {
        try {
          const maxVal = await db(table).max(`${idCol} as maxId`).first();
          const maxId = maxVal.maxId || 0;
          console.log(`Table: ${table}, Max ID: ${maxId}`);
          
          if (maxId > 0) {
            console.log(`Syncing ${seq} to ${maxId}...`);
            await db.raw(`SELECT setval('${seq}', ${maxId})`);
          } else {
            console.log(`Table ${table} is empty. Resetting sequence ${seq} to 1...`);
            await db.raw(`SELECT setval('${seq}', 1, false)`);
          }
        } catch (e) {
          console.error(`Failed to sync sequence for ${table} / ${seq}:`, e.message);
        }
      }
      console.log('All sequences successfully checked/synced.');
    } else {
      console.log('SQLite does not use PostgreSQL sequences.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await db.destroy();
  }
}

fixSequence();
