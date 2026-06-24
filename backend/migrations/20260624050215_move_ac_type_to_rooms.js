/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .alterTable('rooms', table => {
      table.string('ac_type').defaultTo('NON-AC');
    })
    .alterTable('beds', table => {
      table.dropColumn('ac_type');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .alterTable('beds', table => {
      table.string('ac_type').defaultTo('NON-AC');
    })
    .alterTable('rooms', table => {
      table.dropColumn('ac_type');
    });
};
