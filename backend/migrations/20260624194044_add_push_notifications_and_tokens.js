/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Add expo_push_token to tenants
  const hasPushToken = await knex.schema.hasColumn('tenants', 'expo_push_token');
  if (!hasPushToken) {
    await knex.schema.alterTable('tenants', table => {
      table.string('expo_push_token').nullable();
    });
  }

  // Create notifications table
  const hasNotifications = await knex.schema.hasTable('notifications');
  if (!hasNotifications) {
    await knex.schema.createTable('notifications', table => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable(); // The PG owner/admin ID
      table.integer('tenant_id').unsigned().references('tenant_id').inTable('tenants').onDelete('CASCADE');
      table.string('title').notNullable();
      table.text('body').notNullable();
      table.string('type').defaultTo('alert'); // payment, access, alert
      table.boolean('is_read').defaultTo(false);
      table.timestamps(true, true);
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('notifications');
  
  const hasPushToken = await knex.schema.hasColumn('tenants', 'expo_push_token');
  if (hasPushToken) {
    await knex.schema.alterTable('tenants', table => {
      table.dropColumn('expo_push_token');
    });
  }
};
