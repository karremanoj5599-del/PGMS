
exports.up = function(knex) {
  return knex.schema.alterTable('devices', table => {
    table.integer('port').defaultTo(4370);
    table.integer('machine_id').defaultTo(1); // Standard Machine Number / Device ID in SDK
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('devices', table => {
    table.dropColumn('port');
    table.dropColumn('machine_id');
  });
};
