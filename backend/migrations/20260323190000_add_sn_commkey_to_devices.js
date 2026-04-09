/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .alterTable('devices', table => {
      table.string('sn').nullable();          // Serial Number for ADMS handshake
      table.string('comm_key').defaultTo('0'); // Communication key
    })
    .then(() => {
      // Create attendance_logs table for ADMS punch data
      return knex.schema.createTable('attendance_logs', table => {
        table.increments('log_id').primary();
        table.string('user_id').notNullable();
        table.string('device_sn').notNullable();
        table.datetime('punch_time').notNullable();
        table.integer('verify_type').defaultTo(0); // 1=Finger, 15=Face
        table.integer('status').defaultTo(0);       // 0=Check-in, 1=Check-out
        table.timestamp('created_at').defaultTo(knex.fn.now());
      });
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('attendance_logs')
    .then(() => {
      return knex.schema.alterTable('devices', table => {
        table.dropColumn('sn');
        table.dropColumn('comm_key');
      });
    });
};
