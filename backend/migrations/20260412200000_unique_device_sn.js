/**
 * Migration: Enforce unique device serial numbers
 * Prevents multiple users from registering the same device SN,
 * which causes command collisions in ADMS.
 */
exports.up = async function(knex) {
  // Check for any duplicates before applying constraint (safety)
  const duplicates = await knex('devices')
    .groupBy('sn')
    .count('sn')
    .having(knex.raw('count(sn) > 1'))
    .select('sn');

  if (duplicates.length > 0) {
    console.warn('[MIGRATION] Duplicate SNs found. Unique constraint might fail.');
  }

  return knex.schema.alterTable('devices', table => {
    // Note: We used a raw index or table.unique()
    // SQLite has some limitations with alterTable unique, so we use table.unique if supported
    table.unique('sn');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('devices', table => {
    table.dropUnique('sn');
  });
};
