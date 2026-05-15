exports.up = function(knex) {
  return knex.schema
    .alterTable('tenants', table => {
        table.date('access_expiry_date').nullable();
        table.integer('punch_limit').nullable();
    })
    .alterTable('device_settings', table => {
        table.integer('expire_action').defaultTo(0); // 0=Stop saving logs, 1=Retain, 2=Delete
        table.boolean('auto_block_enabled').defaultTo(false);
        table.integer('auto_block_days').defaultTo(4);
        table.boolean('auto_delete_enabled').defaultTo(false);
        table.integer('auto_delete_days').defaultTo(30);
    });
};

exports.down = function(knex) {
  return knex.schema
    .alterTable('device_settings', table => {
        table.dropColumns('expire_action', 'auto_block_enabled', 'auto_block_days', 'auto_delete_enabled', 'auto_delete_days');
    })
    .alterTable('tenants', table => {
        table.dropColumn('access_expiry_date');
        table.dropColumn('punch_limit');
    });
};
