/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('tenants', table => {
    table.float('custom_rent').nullable();
    table.float('custom_advance').nullable();
    table.float('discount_amount').defaultTo(0);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('tenants', table => {
    table.dropColumn('custom_rent');
    table.dropColumn('custom_advance');
    table.dropColumn('discount_amount');
  });
};
