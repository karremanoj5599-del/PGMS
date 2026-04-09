/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('licenses', table => {
      table.increments('id').primary();
      table.string('license_key').notNullable().unique();
      table.integer('user_id').unsigned().references('user_id').inTable('users').onDelete('CASCADE');
      table.string('product_id').defaultTo('PGMS-PRO');
      table.string('status').defaultTo('active'); // active, expired, revoked
      table.datetime('expires_at').notNullable();
      table.integer('max_activations').defaultTo(1);
      table.integer('activation_count').defaultTo(0);
      table.json('hardware_fingerprints').defaultTo(JSON.stringify([]));
      table.timestamps(true, true);
    })
    .createTable('activation_logs', table => {
      table.increments('id').primary();
      table.integer('license_id').unsigned().references('id').inTable('licenses').onDelete('CASCADE');
      table.string('fingerprint');
      table.string('ip_address');
      table.string('action'); // activate, validate, fail
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('activation_logs')
    .dropTableIfExists('licenses');
};
