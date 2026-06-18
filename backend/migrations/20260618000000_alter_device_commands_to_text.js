exports.up = function(knex) {
  return knex.schema.alterTable('device_commands', table => {
    table.text('command').alter();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('device_commands', table => {
    table.string('command').alter();
  });
};
