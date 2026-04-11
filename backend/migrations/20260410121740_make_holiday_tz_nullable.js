
exports.up = function(knex) {
  return knex.schema.alterTable('holidays', table => {
    table.integer('timezone_id').unsigned().nullable().alter();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('holidays', table => {
    table.integer('timezone_id').notNullable().alter();
  });
};
