/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('communication_settings', table => {
      table.increments('setting_id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.string('channel').notNullable(); // sms, whatsapp, voicecall
      table.boolean('enabled').defaultTo(false);
      table.string('trigger_type').notNullable(); // rent_reminder, rent_overdue
      table.timestamps(true, true);
      table.unique(['user_id', 'channel', 'trigger_type']);
    })
    .createTable('tenant_comm_preferences', table => {
      table.increments('pref_id').primary();
      table.integer('tenant_id').unsigned().references('tenant_id').inTable('tenants').onDelete('CASCADE');
      table.integer('user_id').unsigned().notNullable();
      table.string('channel').notNullable(); // sms, whatsapp, voicecall
      table.string('override').defaultTo('global'); // global, on, off
      table.timestamps(true, true);
      table.unique(['tenant_id', 'channel']);
    })
    .createTable('communication_queue', table => {
      table.increments('queue_id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.integer('tenant_id').unsigned().references('tenant_id').inTable('tenants').onDelete('CASCADE');
      table.string('channel').notNullable(); // sms, whatsapp, voicecall
      table.text('message_text').notNullable();
      table.string('recipient').notNullable(); // phone number
      table.string('trigger_type').notNullable(); // rent_reminder, rent_overdue
      table.string('status').defaultTo('pending'); // pending, sent, failed, skipped
      table.date('scheduled_date').notNullable();
      table.timestamp('sent_at');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('communication_queue')
    .dropTableIfExists('tenant_comm_preferences')
    .dropTableIfExists('communication_settings');
};
