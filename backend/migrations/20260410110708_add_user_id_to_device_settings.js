
exports.up = function(knex) {
  return knex.schema.alterTable('device_settings', table => {
    table.integer('user_id').unsigned().references('user_id').inTable('users').onDelete('CASCADE').index();
    table.integer('device_id').unsigned().nullable().alter();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('device_settings', table => {
    table.dropColumn('user_id');
    table.integer('device_id').unsigned().notNullable().alter();
  });
};
