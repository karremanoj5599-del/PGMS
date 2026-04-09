const db = require('../db');

async function resetDatabase() {
  const tables = [
    'attendance_logs',
    'device_commands',
    'devices',
    'access_control',
    'access_groups',
    'access_schedules',
    'payments',
    'tenants',
    'beds',
    'rooms',
    'floors',
    'licenses',
    'users'
  ];

  console.log('--- Database Reset Initiated ---');

  try {
    // Disable foreign keys for SQLite
    await db.raw('PRAGMA foreign_keys = OFF');
    console.log('Foreign key constraints disabled.');

    for (const table of tables) {
      const exists = await db.schema.hasTable(table);
      if (exists) {
        await db(table).del();
        console.log(`Table '${table}' cleared.`);
      }
    }

    // Re-enable foreign keys
    await db.raw('PRAGMA foreign_keys = ON');
    console.log('Foreign key constraints re-enabled.');

    console.log('--- Database Reset Completed Successfully ---');
    process.exit(0);
  } catch (err) {
    console.error('FAILED TO RESET DATABASE:', err);
    process.exit(1);
  }
}

resetDatabase();
