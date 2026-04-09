exports.up = function(knex) {
  return knex.schema.alterTable('payments', table => {
    table.string('utr_number');
    table.string('payment_via').defaultTo('Cash'); // Cash, UPI, Bank Transfer, Card
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('payments', table => {
    table.dropColumn('utr_number');
    table.dropColumn('payment_via');
  });
};
