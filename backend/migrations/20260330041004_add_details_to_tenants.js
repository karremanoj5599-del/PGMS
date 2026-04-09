/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('tenants', table => {
    table.string('photo').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.table('tenants', table => {
    table.dropColumn('photo');
  });
};
