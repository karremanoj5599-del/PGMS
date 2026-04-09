/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('access_schedules', table => {
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    days.forEach(day => {
      table.string(`${day}_start`).defaultTo('00:00');
      table.string(`${day}_end`).defaultTo('00:00');
    });
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('access_schedules', table => {
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    days.forEach(day => {
      table.dropColumn(`${day}_start`);
      table.dropColumn(`${day}_end`);
    });
  });
};
