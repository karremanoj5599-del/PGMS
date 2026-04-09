/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('access_groups', table => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.integer('timezone1_id').unsigned().references('id').inTable('access_schedules').onDelete('SET NULL');
      table.integer('timezone2_id').unsigned().references('id').inTable('access_schedules').onDelete('SET NULL');
      table.integer('timezone3_id').unsigned().references('id').inTable('access_schedules').onDelete('SET NULL');
      table.timestamps(true, true);
    })
    .alterTable('access_control', table => {
      table.integer('access_group_id').unsigned().references('id').inTable('access_groups').onDelete('SET NULL');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .alterTable('access_control', table => {
      table.dropColumn('access_group_id');
    })
    .dropTableIfExists('access_groups');
};
