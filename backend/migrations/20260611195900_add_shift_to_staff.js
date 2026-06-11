/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.alterTable('staff', table => {
    table.time('shift_start_time').nullable(); // e.g. '09:00:00'
    table.time('shift_end_time').nullable();   // e.g. '18:00:00'
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.alterTable('staff', table => {
    table.dropColumn('shift_start_time');
    table.dropColumn('shift_end_time');
  });
};
