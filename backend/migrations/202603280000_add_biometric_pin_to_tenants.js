/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('tenants', table => {
    table.string('biometric_pin').nullable();
    table.string('device_sn').nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('tenants', table => {
    table.dropColumn('biometric_pin');
    table.dropColumn('device_sn');
  });
};
