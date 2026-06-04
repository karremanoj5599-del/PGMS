exports.up = function(knex) {
  return knex.schema.alterTable('tenants', table => {
    table.string('email');
    table.string('country_code').defaultTo('+91');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('tenants', table => {
    table.dropColumn('email');
    table.dropColumn('country_code');
  });
};
