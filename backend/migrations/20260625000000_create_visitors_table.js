/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('visitors', table => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.string('tenant_id').references('tenant_id').inTable('tenants').onDelete('CASCADE'); // Can be null if admin creates it for someone not in DB, but normally linked to tenant
    table.string('name').notNullable();
    table.string('phone');
    table.date('visit_date').notNullable();
    table.string('purpose');
    table.string('pass_code');
    table.string('status').defaultTo('Pending'); // Pending, Entered, Expired
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('visitors');
};
