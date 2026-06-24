exports.up = function(knex) {
  return knex.schema.alterTable('tenants', table => {
    table.date('advance_vacate_date').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('tenants', table => {
    table.dropColumn('advance_vacate_date');
  });
};
