// migrations/20260820000100_user_expiry_timestamp.js

exports.up = async (knex) => {
  // Convert existing date values to end-of-day UTC timestamps
  await knex('tenants')
    .whereNotNull('access_expiry_date')
    .update({
      access_expiry_date: knex.raw(
        "access_expiry_date::date + interval '23:59:59.999'"
      ),
    });

  // Alter column type to timestamp with time zone (PostgreSQL)
  await knex.schema.alterTable('tenants', (table) => {
    table.timestamp('access_expiry_date', { useTz: true }).nullable().alter();
  });
};

exports.down = async (knex) => {
  // Revert column back to plain date (drop time component)
  await knex.schema.alterTable('tenants', (table) => {
    table.date('access_expiry_date').nullable().alter();
  });

  // Strip time part from stored timestamps (keep only the date)
  await knex('tenants')
    .whereNotNull('access_expiry_date')
    .update({
      access_expiry_date: knex.raw('access_expiry_date::date'),
    });
};
