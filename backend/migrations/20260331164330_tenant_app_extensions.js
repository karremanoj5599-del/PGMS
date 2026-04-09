/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Alter tenants table
  const hasPasswordHash = await knex.schema.hasColumn('tenants', 'password_hash');
  const hasAccessStatus = await knex.schema.hasColumn('tenants', 'access_status');
  
  await knex.schema.alterTable('tenants', table => {
    if (!hasPasswordHash) table.string('password_hash').nullable();
    if (!hasAccessStatus) table.string('access_status').defaultTo('active');
  });

  // Create billing table
  const hasBilling = await knex.schema.hasTable('billing');
  if (!hasBilling) {
    await knex.schema.createTable('billing', table => {
      table.increments('id').primary();
      table.integer('tenant_id').notNullable().references('tenant_id').inTable('tenants').onDelete('CASCADE');
      table.string('month').notNullable();
      table.integer('year').notNullable();
      table.float('fixed_rent').notNullable();
      table.float('previous_balance').defaultTo(0);
      table.float('total_due').notNullable();
      table.float('amount_paid').defaultTo(0);
      table.float('current_balance').defaultTo(0);
      table.string('due_date');
      table.integer('user_id').references('user_id').inTable('users').onDelete('CASCADE');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // Create tickets table
  const hasTickets = await knex.schema.hasTable('tickets');
  if (!hasTickets) {
    await knex.schema.createTable('tickets', table => {
      table.increments('id').primary();
      table.integer('tenant_id').notNullable().references('tenant_id').inTable('tenants').onDelete('CASCADE');
      table.string('category').notNullable();
      table.text('description').notNullable();
      table.string('status').defaultTo('Pending');
      table.text('admin_notes');
      table.integer('user_id').references('user_id').inTable('users').onDelete('CASCADE');
      table.timestamps(true, true);
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('tickets')
    .dropTableIfExists('billing')
    .alterTable('tenants', table => {
      table.dropColumn('password_hash');
      table.dropColumn('access_status');
    });
};
