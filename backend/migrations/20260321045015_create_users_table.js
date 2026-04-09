/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('users', table => {
    table.increments('user_id').primary();
    table.string('email').notNullable().unique();
    table.string('password').notNullable();
    table.string('activation_code').notNullable().unique();
    table.string('license_key');
    table.datetime('trial_expiry').notNullable();
    table.datetime('license_expiry');
    table.boolean('is_activated').defaultTo(false);
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('users');
};
