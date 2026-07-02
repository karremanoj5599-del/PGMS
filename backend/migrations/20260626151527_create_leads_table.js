/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('leads', table => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('user_id').inTable('users').onDelete('CASCADE');
    table.string('name').notNullable();
    table.string('phone').notNullable();
    table.string('email');
    table.date('planned_visit_date');
    table.string('purpose');
    table.string('status').defaultTo('New'); // New, Contacted, Converted, Lost
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('leads');
};
