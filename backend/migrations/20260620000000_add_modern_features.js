/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('expenses', table => {
      table.increments('expense_id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.string('category').notNullable(); // Electricity, Water, Maintenance, Salary, Supplies, Other
      table.float('amount').notNullable();
      table.string('description');
      table.date('expense_date').notNullable();
      table.string('payment_via').defaultTo('Cash'); // Cash, UPI, Bank Transfer, Card
      table.string('reference_number');
      table.boolean('is_recurring').defaultTo(false);
      table.timestamps(true, true);
    })
    .createTable('activity_logs', table => {
      table.increments('log_id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.string('event_type').notNullable(); // payment, tenant, expense, device, ticket, staff
      table.string('action').notNullable(); // created, updated, deleted
      table.string('title').notNullable();
      table.text('description');
      table.json('metadata'); // Additional data like IDs, amounts, etc.
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    .createTable('message_logs', table => {
      table.increments('message_id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.integer('tenant_id').unsigned().references('tenant_id').inTable('tenants').onDelete('SET NULL');
      table.string('channel').notNullable(); // whatsapp, sms
      table.string('recipient').notNullable(); // phone number
      table.text('message_text').notNullable();
      table.string('status').defaultTo('sent'); // sent, delivered, failed
      table.timestamp('sent_at').defaultTo(knex.fn.now());
    })
    .createTable('tenant_documents', table => {
      table.increments('document_id').primary();
      table.integer('tenant_id').unsigned().references('tenant_id').inTable('tenants').onDelete('CASCADE');
      table.integer('user_id').unsigned().notNullable();
      table.string('doc_type').notNullable(); // id_proof, agreement, police_verification, photo, other
      table.string('file_name').notNullable();
      table.text('file_data'); // Base64 or URL
      table.date('expiry_date');
      table.timestamps(true, true);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('tenant_documents')
    .dropTableIfExists('message_logs')
    .dropTableIfExists('activity_logs')
    .dropTableIfExists('expenses');
};
