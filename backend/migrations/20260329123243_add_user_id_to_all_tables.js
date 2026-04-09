exports.up = async function(knex) {
  const tables = [
    'floors', 'rooms', 'beds', 'tenants', 'payments', 
    'access_schedules', 'access_groups', 'access_control', 
    'devices', 'device_commands'
  ];

  for (const table of tables) {
    const hasColumn = await knex.schema.hasColumn(table, 'user_id');
    if (!hasColumn) {
      await knex.schema.table(table, (t) => {
        t.integer('user_id').unsigned().references('user_id').inTable('users').onDelete('CASCADE');
      });
      // Assign existing data to the first user as a default
      await knex(table).update({ user_id: 1 });
    }
  }
};

exports.down = async function(knex) {
  const tables = [
    'floors', 'rooms', 'beds', 'tenants', 'payments', 
    'access_schedules', 'access_groups', 'access_control', 
    'devices', 'device_commands'
  ];

  for (const table of tables) {
    const hasColumn = await knex.schema.hasColumn(table, 'user_id');
    if (hasColumn) {
      await knex.schema.table(table, (t) => {
        t.dropColumn('user_id');
      });
    }
  }
};
