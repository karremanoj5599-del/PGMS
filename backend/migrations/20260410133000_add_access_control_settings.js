exports.up = function(knex) {
  return knex.schema
    .createTable('device_settings', table => {
        table.increments('id').primary();
        table.integer('device_id').unsigned().references('device_id').inTable('devices').onDelete('CASCADE');
        table.integer('lock_delay').defaultTo(5);
        table.string('sensor_type').defaultTo('NONE'); // NONE, NO (Normally Open), NC (Normally Closed)
        table.string('door_mode').defaultTo('NORMAL'); // NORMAL, OPEN, CLOSED
        table.boolean('anti_passback').defaultTo(false);
        table.timestamps(true, true);
    })
    .alterTable('access_groups', table => {
        table.integer('holiday_id').nullable();
    })
    .createTable('holidays', table => {
        table.increments('id').primary();
        table.string('name').notNullable();
        table.date('start_date').notNullable();
        table.date('end_date').notNullable();
        table.integer('timezone_id').notNullable(); // schedule to use during this holiday
        table.integer('user_id').unsigned().references('user_id').inTable('users').onDelete('CASCADE');
        table.timestamps(true, true);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('holidays')
    .alterTable('access_groups', table => {
        table.dropColumn('holiday_id');
    })
    .dropTableIfExists('device_settings');
};
