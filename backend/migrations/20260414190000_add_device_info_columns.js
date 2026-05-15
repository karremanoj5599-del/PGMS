/**
 * Add device info columns for storing firmware, capacity, and options data
 * received from device via INFO command and querydata endpoint.
 */
exports.up = function(knex) {
  return knex.schema.alterTable('devices', table => {
    table.string('firmware_ver').nullable();
    table.string('platform').nullable();
    table.integer('user_count').defaultTo(0);
    table.integer('fp_count').defaultTo(0);
    table.integer('face_count').defaultTo(0);
    table.integer('att_log_count').defaultTo(0);
    table.integer('user_capacity').defaultTo(0);
    table.integer('fp_capacity').defaultTo(0);
    table.integer('face_capacity').defaultTo(0);
    table.integer('att_log_capacity').defaultTo(0);
    table.text('device_options_json').nullable();
    table.timestamp('info_updated_at').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('devices', table => {
    table.dropColumn('firmware_ver');
    table.dropColumn('platform');
    table.dropColumn('user_count');
    table.dropColumn('fp_count');
    table.dropColumn('face_count');
    table.dropColumn('att_log_count');
    table.dropColumn('user_capacity');
    table.dropColumn('fp_capacity');
    table.dropColumn('face_capacity');
    table.dropColumn('att_log_capacity');
    table.dropColumn('device_options_json');
    table.dropColumn('info_updated_at');
  });
};
