/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('tenants', table => {
    table.text('photo').alter();
    table.text('proof_doc_url').alter();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('tenants', table => {
    table.string('photo', 255).alter();
    table.string('proof_doc_url', 255).alter();
  });
};
